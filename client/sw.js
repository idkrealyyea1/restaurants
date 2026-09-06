'use strict';

/* Lightweight service worker: offline app shell for weak Palestinian networks.
   - Navigations: network-first with cache fallback (fresh menus/orders).
   - Static assets: cache-first.
   - API + uploads: never cached (must stay live/fresh). */

const CACHE = 'restaurants-v4';
const SHELL = [
  '/',
  '/css/style.css',
  '/css/storefront.css',
  '/fonts/fonts.css',
  '/js/api.js',
  '/js/i18n.js',
  '/js/home.js',
  '/js/restaurant.js',
  '/js/track.js',
  '/js/pwa.js',
  '/login.html',
  '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isStatic(url) {
  return SHELL.includes(url.pathname + (url.search || '')) ||
    /\.(css|js|svg|png|jpg|jpeg|webp|woff2?)$/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() =>
          caches.match(event.request).then((hit) => hit || caches.match('/'))
        )
    );
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      caches.match(event.request).then((hit) =>
        hit ||
        fetch(event.request).then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
          }
          return resp;
        })
      )
    );
  }
});
