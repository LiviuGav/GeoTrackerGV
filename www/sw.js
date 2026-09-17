const CACHE_NAME = 'geotrack-v1';
const ASSETS_TO_CACHE = [
  '/index.html',
  '/manifest.json',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/map-styles.css',
  '/css/modals.css',
  '/css/timeline-styles.css',
  '/css/friends-styles.css',
  '/js/config.js',
  '/js/map.js',
  '/js/ui.js',
  '/js/gps.js',
  '/js/peer.js',
  '/js/friends.js',
  '/js/timeline-ui.js',
  '/js/events.js',
  '/js/app.js',
  '/js/timeline.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

// Install (cache core assets)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate (clean old caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch (network first, fallback to cache)
self.addEventListener('fetch', (event) => {
  // Skip non-GET and external requests for CDN resources
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For same-origin requests, use network-first strategy
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
