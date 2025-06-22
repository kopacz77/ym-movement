/**
 * Service Worker React Hook
 * 
 * React hook for integrating service worker functionality with components
 * 
 * @version 3.0.0
 * @since Phase 2 Priority 3 Optimizations
 */

import { useEffect, useState, useCallback } from 'react';
import { serviceWorkerManager, type OfflineAction } from '@/lib/service-worker';

interface ServiceWorkerState {
  isRegistered: boolean;
  isActive: boolean;
  updateAvailable: boolean;
  isOnline: boolean;
  pendingActions: number;
  isInstalling: boolean;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  register: () => Promise<void>;
  applyUpdate: () => Promise<void>;
  queueOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp'>) => Promise<string>;
  cleanupCaches: () => Promise<void>;
  forceSync: () => Promise<void>;
}

/**
 * Hook for managing service worker functionality
 */
export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isRegistered: false,
    isActive: false,
    updateAvailable: false,
    isOnline: navigator?.onLine ?? true,
    pendingActions: 0,
    isInstalling: false,
  });

  /**
   * Update state from service worker manager
   */
  const updateState = useCallback(() => {
    const status = serviceWorkerManager.getStatus();
    setState(prevState => ({
      ...prevState,
      isRegistered: status.registered,
      isActive: status.active,
      updateAvailable: status.updateAvailable,
      pendingActions: status.pendingActions,
    }));
  }, []);

  /**
   * Register service worker
   */
  const register = useCallback(async () => {
    setState(prevState => ({ ...prevState, isInstalling: true }));
    
    try {
      const result = await serviceWorkerManager.register();
      if (result.success) {
        updateState();
      }
    } catch (error) {
      console.error('[useServiceWorker] Registration failed:', error);
    } finally {
      setState(prevState => ({ ...prevState, isInstalling: false }));
    }
  }, [updateState]);

  /**
   * Apply service worker update
   */
  const applyUpdate = useCallback(async () => {
    try {
      await serviceWorkerManager.applyUpdate();
    } catch (error) {
      console.error('[useServiceWorker] Apply update failed:', error);
    }
  }, []);

  /**
   * Queue offline action
   */
  const queueOfflineAction = useCallback(async (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    try {
      const actionId = await serviceWorkerManager.queueOfflineAction(action);
      updateState();
      return actionId;
    } catch (error) {
      console.error('[useServiceWorker] Queue action failed:', error);
      throw error;
    }
  }, [updateState]);

  /**
   * Clean up caches
   */
  const cleanupCaches = useCallback(async () => {
    try {
      await serviceWorkerManager.cleanupCaches();
    } catch (error) {
      console.error('[useServiceWorker] Cache cleanup failed:', error);
    }
  }, []);

  /**
   * Force sync of pending actions
   */
  const forceSync = useCallback(async () => {
    if (state.pendingActions > 0 && state.isOnline) {
      // Trigger background sync by going offline and online
      window.dispatchEvent(new Event('offline'));
      setTimeout(() => {
        window.dispatchEvent(new Event('online'));
      }, 100);
    }
  }, [state.pendingActions, state.isOnline]);

  /**
   * Setup event listeners
   */
  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      setState(prevState => ({ ...prevState, isOnline: true }));
    };

    const handleOffline = () => {
      setState(prevState => ({ ...prevState, isOnline: false }));
    };

    // Listen for service worker update events
    const handleUpdateAvailable = () => {
      setState(prevState => ({ ...prevState, updateAvailable: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sw-update-available', handleUpdateAvailable);

    // Initial state update
    updateState();

    // Periodic state updates
    const interval = setInterval(updateState, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      clearInterval(interval);
    };
  }, [updateState]);

  /**
   * Auto-register in production
   */
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && !state.isRegistered && !state.isInstalling) {
      register();
    }
  }, [register, state.isRegistered, state.isInstalling]);

  return {
    ...state,
    register,
    applyUpdate,
    queueOfflineAction,
    cleanupCaches,
    forceSync,
  };
}

/**
 * Hook for offline action management
 */
export function useOfflineActions() {
  const { queueOfflineAction, pendingActions, isOnline } = useServiceWorker();

  /**
   * Queue lesson booking for offline sync
   */
  const queueLessonBooking = useCallback(async (bookingData: any) => {
    return queueOfflineAction({
      type: 'lesson-booking',
      data: bookingData,
    });
  }, [queueOfflineAction]);

  /**
   * Queue payment update for offline sync
   */
  const queuePaymentUpdate = useCallback(async (paymentData: any) => {
    return queueOfflineAction({
      type: 'payment-update',
      data: paymentData,
    });
  }, [queueOfflineAction]);

  /**
   * Queue student update for offline sync
   */
  const queueStudentUpdate = useCallback(async (studentData: any) => {
    return queueOfflineAction({
      type: 'student-update',
      data: studentData,
    });
  }, [queueOfflineAction]);

  /**
   * Queue analytics update for offline sync
   */
  const queueAnalyticsUpdate = useCallback(async (analyticsData: any) => {
    return queueOfflineAction({
      type: 'analytics-update',
      data: analyticsData,
    });
  }, [queueOfflineAction]);

  return {
    queueLessonBooking,
    queuePaymentUpdate,
    queueStudentUpdate,
    queueAnalyticsUpdate,
    pendingActions,
    isOnline,
  };
}

/**
 * Hook for service worker notifications
 */
export function useServiceWorkerNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'update' | 'offline' | 'sync' | 'error';
    message: string;
    timestamp: number;
  }>>([]);

  const { updateAvailable, isOnline, pendingActions } = useServiceWorker();

  /**
   * Add notification
   */
  const addNotification = useCallback((type: 'update' | 'offline' | 'sync' | 'error', message: string) => {
    const notification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  /**
   * Remove notification
   */
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Handle service worker events
   */
  useEffect(() => {
    if (updateAvailable) {
      addNotification('update', 'A new version is available. Refresh to update.');
    }
  }, [updateAvailable, addNotification]);

  useEffect(() => {
    if (!isOnline) {
      addNotification('offline', 'You are offline. Changes will sync when reconnected.');
    } else if (pendingActions > 0) {
      addNotification('sync', `Syncing ${pendingActions} pending changes...`);
    }
  }, [isOnline, pendingActions, addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
}

/**
 * Hook for service worker performance monitoring
 */
export function useServiceWorkerPerformance() {
  const [metrics, setMetrics] = useState({
    cacheHitRate: 0,
    averageResponseTime: 0,
    totalRequests: 0,
    cacheSize: 0,
  });

  useEffect(() => {
    // Listen for performance data from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PERFORMANCE_DATA') {
        setMetrics(event.data.metrics);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  return metrics;
}