// Cambiar la versión al modificar la estrategia de caché: el "activate" borra las cachés antiguas
const CACHE_NAME = 'ubica-cache-v3';
// Lo compartido desde otra app (fotos y texto de WhatsApp) espera aquí a que lo recoja «Subir inmueble»
const SHARE_CACHE = 'ubica-share';
const SHARE_PATH = '/publicar/compartir';
const MAX_SHARED_PHOTOS = 30;
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
                    .filter((name) => name !== CACHE_NAME && name !== SHARE_CACHE)
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

/**
 * Compartir con Ubica (manifest "share_target"): guarda las fotos y el texto y abre «Subir inmueble».
 * Se acumula: WhatsApp no deja compartir fotos y texto a la vez, así que llegan en dos envíos al mismo borrador.
 */
async function receiveShare(request) {
    try {
        const form = await request.formData();
        const cache = await caches.open(SHARE_CACHE);
        const previous = await cache.match('/__share/meta');
        const meta = previous ? await previous.json() : { files: [], text: '' };
        for (const file of form.getAll('photos')) {
            if (!(file instanceof File) || meta.files.length >= MAX_SHARED_PHOTOS) continue;
            const key = `/__share/photo-${Date.now()}-${meta.files.length}`;
            await cache.put(key, new Response(file, { headers: { 'Content-Type': file.type || 'image/jpeg' } }));
            meta.files.push({ key, name: file.name || 'foto.jpg', type: file.type || 'image/jpeg' });
        }
        // WhatsApp manda el mensaje en "text"; otras apps usan también "title" o "url"
        const text = [...new Set(['title', 'text', 'url'].map((k) => String(form.get(k) || '').trim()).filter(Boolean))].join('\n');
        if (text) meta.text = meta.text ? `${meta.text}\n\n${text}` : text;
        meta.at = Date.now();
        await cache.put('/__share/meta', new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
        return Response.redirect('/publicar?compartido=1', 303);
    } catch {
        return Response.redirect('/publicar?compartido=error', 303);
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method === 'POST' && new URL(request.url).pathname === SHARE_PATH) {
        event.respondWith(receiveShare(request));
        return;
    }
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
