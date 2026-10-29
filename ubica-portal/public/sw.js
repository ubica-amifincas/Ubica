// Cambiar la versión al modificar la estrategia de caché: el "activate" borra las cachés antiguas
const CACHE_NAME = 'ubica-cache-v2';
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/inmo_amilogo.png',
    '/logo_ubica.png',
];

// Install: precache essential resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

function putInCache(request, response) {
    // Solo respuestas completas y propias (no opacas ni errores)
    if (!response || !response.ok || response.type === 'opaque') return;
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;

    // Recursos de terceros: solo los ficheros versionados de unpkg (Leaflet), cache-first
    if (!sameOrigin) {
        if (!url.hostname.includes('unpkg.com')) return;
        event.respondWith(
            caches.match(request).then((cached) => cached || fetch(request).then((response) => {
                putInCache(request, response);
                return response;
            }))
        );
        return;
    }

    // Mismo origen: network-first para que los visitantes reciban siempre la última versión;
    // la caché solo se usa sin conexión
    event.respondWith(
        fetch(request)
            .then((response) => {
                putInCache(request, response);
                return response;
            })
            .catch(() =>
                caches.match(request).then((cached) => {
                    if (cached) return cached;
                    if (request.mode === 'navigate') return caches.match('/index.html');
                    return Response.error();
                })
            )
    );
});
