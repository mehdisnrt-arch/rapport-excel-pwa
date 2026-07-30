const CACHE_NAME = 'rapport-excel-pwa-v12-general-date-sync';
const ASSETS = ['./', './index.html', './style.css', './enhancements.css', './multi-photo-layout.css', './app.js', './enhancements.js', './gallery-fix.js', './final-fixes.js', './empty-fields-fix.js', './final-layout-v10.js', './energy-empty-v11.js', './date-sync-v12.js', './manifest.json', './icons/icon-192.svg', './icons/icon-512.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
