const CACHE_NAME = 'universal-editor-v1';
const APP_SHELL = [
    './',
    './index.html',
    './vendor/dependencies.js',
    './vendor/squoosh_oxipng_bg.wasm'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) {
        return;
    }

    const updateCacheInBackground = fetch(event.request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                const responseToCache = networkResponse.clone();
                return caches.open(CACHE_NAME)
                    .then((cache) => cache.put(event.request, responseToCache))
                    .then(() => networkResponse);
            }
            return networkResponse;
        })
        .catch(() => null);

    event.waitUntil(updateCacheInBackground);
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return updateCacheInBackground.then((networkResponse) => networkResponse || (
                event.request.mode === 'navigate'
                    ? caches.match('./index.html')
                    : Response.error()
            ));
        })
    );
});
