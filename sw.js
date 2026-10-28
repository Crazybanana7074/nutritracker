const CACHE_NAME = 'nutritracker-pwa-v2.0.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/data.js',
  './js/state.js',
  './js/calculations.js',
  './js/ui.js',
  './js/food.js',
  './js/ai.js',
  './js/insights.js',
  './js/sleep.js',
  './js/dates.js',
  './js/settings.js',
  './js/backup.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const ALLOWED_CDNS = new Set([
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'unpkg.com'
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('nutritracker-pwa-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isAppRequest = url.origin === self.location.origin;
  const isAllowedCdn = ALLOWED_CDNS.has(url.hostname);
  // Never intercept unrelated third-party calls or API requests.
  if (!isAppRequest && !isAllowedCdn) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      const cacheable = response && (response.ok || response.type === 'opaque') &&
        (isAppRequest || isAllowedCdn);
      if (cacheable) {
        // Runtime caching is best-effort; it must never block a successful response.
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      if (cached) return cached;
      if (isAppRequest && request.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
