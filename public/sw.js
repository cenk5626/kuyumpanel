// Service Worker for KuyumPanel Enterprise PWA
const CACHE_NAME = 'kuyumpanel-v1.0.0';
const STATIC_CACHE_URLS = [
  '/',
  '/login',
  '/showcase',
  '/favicon.ico',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install Event — Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS).catch((err) => {
        console.warn('[ServiceWorker] Pre-caching partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event — Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event — Network-first for API, Cache-first with network fallback for assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Non-GET requests should always go to network
  if (request.method !== 'GET') {
    return;
  }

  // API or WebSocket requests: Network first
  if (url.pathname.startsWith('/api/') || url.protocol.startsWith('ws')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // Static assets & navigations: Stale-while-revalidate / Network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and requesting page navigation, return cached home or fallback
          if (request.mode === 'navigate') {
            return caches.match('/') || caches.match('/showcase');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
