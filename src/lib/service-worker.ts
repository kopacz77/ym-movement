/**
 * Service Worker Registration and Management
 *
 * Handles service worker registration, updates, and offline functionality
 *
 * @version 3.0.0
 * @since Phase 2 Priority 3 Optimizations
 */

interface SwRegistrationResult {
  success: boolean;
  registration?: ServiceWorkerRegistration;
  error?: Error;
}

interface OfflineAction {
  id: string;
  type: "lesson-booking" | "payment-update" | "student-update" | "analytics-update";
  data: any;
  timestamp: number;
  retryCount?: number;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;
  private offlineActionsQueue: OfflineAction[] = [];

  /**
   * Register the service worker
   */
  async register(): Promise<SwRegistrationResult> {
    if (!("serviceWorker" in navigator)) {
      console.warn("[SW Manager] Service Worker not supported");
      return { success: false, error: new Error("Service Worker not supported") };
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none", // Always check for updates
      });

      this.registration = registration;

      console.log("[SW Manager] Service Worker registered successfully");

      // Setup event listeners
      this.setupEventListeners(registration);

      return { success: true, registration };
    } catch (error) {
      console.error("[SW Manager] Service Worker registration failed:", error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Setup service worker event listeners
   */
  private setupEventListeners(registration: ServiceWorkerRegistration) {
    // Listen for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log("[SW Manager] New service worker found, installing...");

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[SW Manager] New service worker installed, update available");
            this.updateAvailable = true;
            this.notifyUpdateAvailable();
          }
        });
      }
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[SW Manager] Service worker controller changed");
      window.location.reload();
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      this.handleServiceWorkerMessage(event);
    });

    // Listen for online/offline events
    window.addEventListener("online", () => this.handleOnlineStatus(true));
    window.addEventListener("offline", () => this.handleOnlineStatus(false));
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent) {
    const { data } = event;

    switch (data?.type) {
      case "CACHE_UPDATED":
        console.log("[SW Manager] Cache updated:", data.cacheName);
        break;
      case "SYNC_COMPLETE":
        console.log("[SW Manager] Background sync completed:", data.syncTag);
        this.removeSyncedActions(data.syncTag);
        break;
      case "SYNC_FAILED":
        console.error("[SW Manager] Background sync failed:", data.syncTag, data.error);
        break;
      default:
        console.log("[SW Manager] Unknown message from service worker:", data);
    }
  }

  /**
   * Handle online/offline status changes
   */
  private handleOnlineStatus(isOnline: boolean) {
    console.log("[SW Manager] Network status changed:", isOnline ? "online" : "offline");

    if (isOnline && this.offlineActionsQueue.length > 0) {
      // Trigger background sync for pending actions
      this.triggerBackgroundSync();
    }
  }

  /**
   * Notify user about available update
   */
  private notifyUpdateAvailable() {
    // You can integrate this with your notification system
    const event = new CustomEvent("sw-update-available", {
      detail: { updateAvailable: this.updateAvailable },
    });
    window.dispatchEvent(event);
  }

  /**
   * Apply service worker update
   */
  async applyUpdate(): Promise<void> {
    if (!this.registration || !this.updateAvailable) {
      return;
    }

    const waitingWorker = this.registration.waiting;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  }

  /**
   * Queue action for offline sync
   */
  async queueOfflineAction(action: Omit<OfflineAction, "id" | "timestamp">): Promise<string> {
    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateActionId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.offlineActionsQueue.push(offlineAction);

    // Store in IndexedDB for persistence
    await this.storeOfflineAction(offlineAction);

    // If online, try to sync immediately
    if (navigator.onLine) {
      await this.triggerBackgroundSync();
    }

    return offlineAction.id;
  }

  /**
   * Store offline action in IndexedDB
   */
  private async storeOfflineAction(action: OfflineAction): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("YuraSchedulerOffline", 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const storeName = this.getStoreNameForActionType(action.type);
        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);

        const addRequest = store.add(action);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      };

      request.onupgradeneeded = () => {
        const db = request.result;

        // Create object stores for different action types
        const storeNames = [
          "pendingLessonBookings",
          "pendingPaymentUpdates",
          "pendingStudentUpdates",
          "pendingAnalyticsUpdates",
        ];

        storeNames.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "id" });
          }
        });
      };
    });
  }

  /**
   * Get IndexedDB store name for action type
   */
  private getStoreNameForActionType(actionType: OfflineAction["type"]): string {
    const storeMap = {
      "lesson-booking": "pendingLessonBookings",
      "payment-update": "pendingPaymentUpdates",
      "student-update": "pendingStudentUpdates",
      "analytics-update": "pendingAnalyticsUpdates",
    };

    return storeMap[actionType];
  }

  /**
   * Trigger background sync
   */
  private async triggerBackgroundSync(): Promise<void> {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
      return;
    }

    try {
      // Group actions by type and register sync events
      const actionTypes = [...new Set(this.offlineActionsQueue.map((action) => action.type))];

      for (const actionType of actionTypes) {
        const syncTag = this.getSyncTagForActionType(actionType);

        if ("sync" in window.ServiceWorkerRegistration.prototype) {
          await this.registration?.sync.register(syncTag);
          console.log("[SW Manager] Background sync registered:", syncTag);
        } else {
          // Fallback for browsers without background sync
          await this.fallbackSync(actionType);
        }
      }
    } catch (error) {
      console.error("[SW Manager] Failed to register background sync:", error);
    }
  }

  /**
   * Get sync tag for action type
   */
  private getSyncTagForActionType(actionType: OfflineAction["type"]): string {
    const syncTagMap = {
      "lesson-booking": "lesson-booking-sync",
      "payment-update": "payment-update-sync",
      "student-update": "student-update-sync",
      "analytics-update": "analytics-update-sync",
    };

    return syncTagMap[actionType];
  }

  /**
   * Fallback sync for browsers without background sync support
   */
  private async fallbackSync(actionType: OfflineAction["type"]): Promise<void> {
    const actionsToSync = this.offlineActionsQueue.filter((action) => action.type === actionType);

    for (const action of actionsToSync) {
      try {
        await this.syncAction(action);
        this.removeActionFromQueue(action.id);
      } catch (error) {
        console.error("[SW Manager] Fallback sync failed for action:", action.id, error);
        action.retryCount = (action.retryCount || 0) + 1;

        if (action.retryCount >= 3) {
          console.error("[SW Manager] Max retries reached for action:", action.id);
          this.removeActionFromQueue(action.id);
        }
      }
    }
  }

  /**
   * Sync individual action
   */
  private async syncAction(action: OfflineAction): Promise<void> {
    const endpointMap = {
      "lesson-booking": "/api/trpc/student.lesson.book",
      "payment-update": "/api/trpc/admin.payment.update",
      "student-update": "/api/trpc/admin.student.update",
      "analytics-update": "/api/trpc/admin.analytics.update",
    };

    const endpoint = endpointMap[action.type];

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(action.data),
    });

    if (!response.ok) {
      throw new Error(`Sync failed with status: ${response.status}`);
    }
  }

  /**
   * Remove synced actions from queue
   */
  private removeSyncedActions(syncTag: string): void {
    const actionTypeMap = {
      "lesson-booking-sync": "lesson-booking",
      "payment-update-sync": "payment-update",
      "student-update-sync": "student-update",
      "analytics-update-sync": "analytics-update",
    };

    const actionType = actionTypeMap[syncTag as keyof typeof actionTypeMap];
    if (actionType) {
      this.offlineActionsQueue = this.offlineActionsQueue.filter(
        (action) => action.type !== actionType,
      );
    }
  }

  /**
   * Remove action from queue
   */
  private removeActionFromQueue(actionId: string): void {
    this.offlineActionsQueue = this.offlineActionsQueue.filter((action) => action.id !== actionId);
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if service worker is active
   */
  isActive(): boolean {
    return Boolean(this.registration && navigator.serviceWorker.controller);
  }

  /**
   * Get registration status
   */
  getStatus() {
    return {
      registered: Boolean(this.registration),
      active: this.isActive(),
      updateAvailable: this.updateAvailable,
      pendingActions: this.offlineActionsQueue.length,
    };
  }

  /**
   * Force cache cleanup
   */
  async cleanupCaches(): Promise<void> {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CACHE_CLEANUP",
      });
    }
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Export types
export type { OfflineAction, SwRegistrationResult };

// Auto-register service worker in production
if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  serviceWorkerManager.register().then((result) => {
    if (result.success) {
      console.log("[SW Manager] Service Worker registered automatically");
    } else {
      console.error("[SW Manager] Auto-registration failed:", result.error?.message);
    }
  });
}
