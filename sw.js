const CACHE_NAME = 'hattyfocus-pro-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './icon.png',
  './icon-512.png',
  './icon-192.png',
  './icon-180.png',
  './manifest.json'
];

// Install Event: Resiliently cache core app shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(ASSETS_TO_CACHE.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames
        .filter(cacheName => cacheName !== CACHE_NAME)
        .map(cacheName => caches.delete(cacheName))
    )).then(() => self.clients.claim())
  );
});

// Fetch Event: Pass cross-origin requests straight through; network-first cache for same-origin app shell
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const reqUrl = new URL(event.request.url);
  if (reqUrl.protocol !== 'http:' && reqUrl.protocol !== 'https:') return;

  // Never intercept cross-origin CDN, font, PeerJS, or ad network requests (Affizy, apitiny, etc.)
  if (reqUrl.origin !== self.location.origin) return;

  const cacheKey = event.request.mode === 'navigate'
    ? new Request(reqUrl.origin + reqUrl.pathname)
    : event.request;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(cacheKey).then(cached => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }))
  );
});
