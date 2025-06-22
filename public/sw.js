/**
 * Service Worker for Yura Scheduler v3
 * 
 * Advanced caching strategies, offline functionality, and background sync
 * 
 * @version 3.0.0
 * @since Phase 2 Priority 3 Optimizations
 */

const CACHE_VERSION = 'v3.0.0';
const STATIC_CACHE = `yura-scheduler-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `yura-scheduler-dynamic-${CACHE_VERSION}`;
const API_CACHE = `yura-scheduler-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `yura-scheduler-images-${CACHE_VERSION}`;

// Cache configuration
const CACHE_CONFIG = {
  // Static assets (long-term cache)
  static: {
    maxAge: 365 * 24 * 60 * 60, // 1 year
    maxEntries: 100,
  },
  // Dynamic content (short-term cache)
  dynamic: {
    maxAge: 7 * 24 * 60 * 60, // 1 week
    maxEntries: 50,
  },
  // API responses (medium-term cache)
  api: {
    maxAge: 60 * 60, // 1 hour
    maxEntries: 200,
  },
  // Images (long-term cache)
  images: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    maxEntries: 100,
  },
};

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline',
  '/_next/static/css/',
  '/_next/static/js/',
];

// API routes that should be cached
const CACHEABLE_API_ROUTES = [
  '/api/trpc/admin.analytics',
  '/api/trpc/student.dashboard',
  '/api/trpc/admin.student.list',
  '/api/trpc/admin.schedule.timeSlots',
];

// Routes that require network-first strategy
const NETWORK_FIRST_ROUTES = [
  '/api/trpc/admin.student.approve',
  '/api/trpc/admin.payment',
  '/api/trpc/student.lesson.book',
];

// Background sync tags
const SYNC_TAGS = {
  LESSON_BOOKING: 'lesson-booking-sync',
  PAYMENT_UPDATE: 'payment-update-sync',
  STUDENT_UPDATE: 'student-update-sync',
  ANALYTICS_UPDATE: 'analytics-update-sync',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE);
        
        // Cache critical static assets
        await staticCache.addAll([
          '/',
          '/manifest.json',
          '/offline.html',
        ]);
        
        console.log('[SW] Static assets cached successfully');
        
        // Skip waiting to activate immediately
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] Failed to cache static assets:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name.startsWith('yura-scheduler-') && !name.includes(CACHE_VERSION)
        );
        
        // Delete old caches
        await Promise.all(
          oldCaches.map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
        
        // Claim all clients immediately
        await self.clients.claim();
        
        console.log('[SW] Service Worker activated successfully');
      } catch (error) {
        console.error('[SW] Failed to activate service worker:', error);
      }
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { method, url } = request;
  
  // Only handle GET requests
  if (method !== 'GET') {
    return;
  }
  
  const urlObj = new URL(url);
  
  // Handle different request types
  if (urlObj.pathname.startsWith('/api/trpc')) {
    event.respondWith(handleApiRequest(request));
  } else if (urlObj.pathname.startsWith('/_next/static') || 
             urlObj.pathname.includes('.js') || 
             urlObj.pathname.includes('.css')) {
    event.respondWith(handleStaticAsset(request));
  } else if (urlObj.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/)) {
    event.respondWith(handleImage(request));
  } else {
    event.respondWith(handleNavigation(request));
  }
});

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_ROUTES.some(route => 
    url.pathname.includes(route)
  );
  const isNetworkFirst = NETWORK_FIRST_ROUTES.some(route => 
    url.pathname.includes(route)
  );
  
  if (isNetworkFirst) {
    return handleNetworkFirst(request, API_CACHE);
  } else if (isCacheable) {
    return handleCacheFirst(request, API_CACHE, CACHE_CONFIG.api);
  } else {
    // For non-cacheable API requests, always go to network
    return fetch(request);
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  return handleCacheFirst(request, STATIC_CACHE, CACHE_CONFIG.static);
}

// Handle images with cache-first strategy
async function handleImage(request) {
  return handleCacheFirst(request, IMAGE_CACHE, CACHE_CONFIG.images);
}

// Handle navigation requests
async function handleNavigation(request) {
  try {
    // Try network first for navigation
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache, return offline page
    const cache = await caches.open(STATIC_CACHE);
    return cache.match('/offline.html') || new Response(
      'Offline - Please check your internet connection',
      { status: 503, statusText: 'Service Unavailable' }
    );
  }
}

// Cache-first strategy with TTL
async function handleCacheFirst(request, cacheName, config) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const cachedDate = new Date(cachedResponse.headers.get('date') || 0);
      const now = new Date();
      const age = (now - cachedDate) / 1000; // age in seconds
      
      // If cached response is still fresh, return it
      if (age < config.maxAge) {
        console.log('[SW] Serving from cache:', request.url);
        return cachedResponse;
      }
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Add timestamp header for TTL tracking
      const responseClone = networkResponse.clone();
      const responseWithTimestamp = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'date': new Date().toISOString(),
        },
      });
      
      await cache.put(request, responseWithTimestamp);
      console.log('[SW] Cached network response:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // If network fails, return cached response even if stale
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Network-first strategy with cache fallback
async function handleNetworkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      console.log('[SW] Network-first: cached response:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network-first: network failed, trying cache:', request.url);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.LESSON_BOOKING:
      event.waitUntil(syncLessonBookings());
      break;
    case SYNC_TAGS.PAYMENT_UPDATE:
      event.waitUntil(syncPaymentUpdates());
      break;
    case SYNC_TAGS.STUDENT_UPDATE:
      event.waitUntil(syncStudentUpdates());
      break;
    case SYNC_TAGS.ANALYTICS_UPDATE:
      event.waitUntil(syncAnalyticsUpdates());
      break;
    default:
      console.log('[SW] Unknown sync tag:', event.tag);
  }
});

// Sync lesson bookings when back online
async function syncLessonBookings() {
  try {
    const pendingBookings = await getFromIndexedDB('pendingLessonBookings');
    
    for (const booking of pendingBookings) {
      try {
        const response = await fetch('/api/trpc/student.lesson.book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(booking),
        });
        
        if (response.ok) {
          await removeFromIndexedDB('pendingLessonBookings', booking.id);
          console.log('[SW] Synced lesson booking:', booking.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync lesson booking:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync lesson bookings:', error);
  }
}

// Sync payment updates when back online
async function syncPaymentUpdates() {
  try {
    const pendingPayments = await getFromIndexedDB('pendingPaymentUpdates');
    
    for (const payment of pendingPayments) {
      try {
        const response = await fetch('/api/trpc/admin.payment.update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payment),
        });
        
        if (response.ok) {
          await removeFromIndexedDB('pendingPaymentUpdates', payment.id);
          console.log('[SW] Synced payment update:', payment.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync payment update:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync payment updates:', error);
  }
}

// Sync student updates when back online
async function syncStudentUpdates() {
  try {
    const pendingUpdates = await getFromIndexedDB('pendingStudentUpdates');
    
    for (const update of pendingUpdates) {
      try {
        const response = await fetch('/api/trpc/admin.student.update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update),
        });
        
        if (response.ok) {
          await removeFromIndexedDB('pendingStudentUpdates', update.id);
          console.log('[SW] Synced student update:', update.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync student update:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync student updates:', error);
  }
}

// Sync analytics updates when back online
async function syncAnalyticsUpdates() {
  try {
    const pendingAnalytics = await getFromIndexedDB('pendingAnalyticsUpdates');
    
    for (const analytics of pendingAnalytics) {
      try {
        const response = await fetch('/api/trpc/admin.analytics.update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(analytics),
        });
        
        if (response.ok) {
          await removeFromIndexedDB('pendingAnalyticsUpdates', analytics.id);
          console.log('[SW] Synced analytics update:', analytics.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync analytics update:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync analytics updates:', error);
  }
}

// IndexedDB helpers for offline storage
async function getFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('YuraSchedulerOffline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

async function removeFromIndexedDB(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('YuraSchedulerOffline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Cache management - clean up old entries
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_CLEANUP') {
    event.waitUntil(cleanupCaches());
  }
});

async function cleanupCaches() {
  console.log('[SW] Starting cache cleanup');
  
  const cacheConfigs = [
    { name: STATIC_CACHE, config: CACHE_CONFIG.static },
    { name: DYNAMIC_CACHE, config: CACHE_CONFIG.dynamic },
    { name: API_CACHE, config: CACHE_CONFIG.api },
    { name: IMAGE_CACHE, config: CACHE_CONFIG.images },
  ];
  
  for (const { name, config } of cacheConfigs) {
    try {
      await cleanupCache(name, config);
    } catch (error) {
      console.error(`[SW] Failed to cleanup cache ${name}:`, error);
    }
  }
  
  console.log('[SW] Cache cleanup completed');
}

async function cleanupCache(cacheName, config) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length <= config.maxEntries) {
    return;
  }
  
  // Sort by date and remove oldest entries
  const entries = await Promise.all(
    keys.map(async (key) => {
      const response = await cache.match(key);
      const date = new Date(response.headers.get('date') || 0);
      return { key, date };
    })
  );
  
  entries.sort((a, b) => a.date - b.date);
  const entriesToDelete = entries.slice(0, keys.length - config.maxEntries);
  
  await Promise.all(
    entriesToDelete.map(entry => cache.delete(entry.key))
  );
  
  console.log(`[SW] Cleaned up ${entriesToDelete.length} entries from ${cacheName}`);
}

console.log('[SW] Service Worker script loaded v' + CACHE_VERSION);