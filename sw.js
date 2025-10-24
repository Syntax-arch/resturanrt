// Service Worker for Restaurant PWA
const CACHE_NAME = 'restaurant-pwa-v1.2';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/dashboard.html',
  '/reservation.html',
  '/menu.html',
  '/style.css',
  '/main.css',
  '/utils.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install Event
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First Strategy
self.addEventListener('fetch', (event) => {
  // Skip Supabase real-time connections
  if (event.request.url.includes('supabase.co') && 
      (event.request.url.includes('/realtime/') || event.request.url.includes('/rest/v1/'))) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Network request failed, try to get it from the cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            
            // If not found in cache and it's an HTML request, return offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Background Sync for Offline Bookings
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'background-booking-sync') {
    event.waitUntil(syncOfflineBookings());
  }
});

// Sync offline bookings when back online
async function syncOfflineBookings() {
  const db = await openOfflineDB();
  const transactions = await db.getAll('offlineBookings');
  
  for (const booking of transactions) {
    try {
      // Try to sync with server
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking.data)
      });
      
      if (response.ok) {
        // Remove from offline storage
        await db.delete('offlineBookings', booking.id);
        console.log('✅ Synced offline booking:', booking.id);
      }
    } catch (error) {
      console.log('❌ Failed to sync booking:', booking.id);
    }
  }
}

// Open IndexedDB for offline storage
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RestaurantOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store for offline bookings
      if (!db.objectStoreNames.contains('offlineBookings')) {
        const store = db.createObjectStore('offlineBookings', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url },
    actions: [
      {
        action: 'view',
        title: '表示',
        icon: '/icons/eye-72x72.png'
      },
      {
        action: 'dismiss',
        title: '閉じる',
        icon: '/icons/x-72x72.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});