// public/sw.js
// ─────────────────────────────────────────────────────────────────────────────
// Service Worker — VH-Maps
//
// Estrategias:
//  · Tiles OSM    → Cache-first, luego red. Guarda los tiles navegados.
//  · App shell    → Network-first, fallback a caché.
//  · Supabase/API → Network-only (datos autenticados, no se cachean aquí).
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_APP   = 'vh-maps-app-v2';
const CACHE_TILES = 'vh-maps-tiles-v1';
const TILES_MAX   = 500;   // ~5–10 MB de tiles cacheados

// Assets del app shell que queremos disponibles offline
const APP_ASSETS = ['/'];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_APP)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate — limpia cachés viejos ─────────────────────────────────────────
self.addEventListener('activate', (e) => {
  const actuales = new Set([CACHE_APP, CACHE_TILES]);
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !actuales.has(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 1. Tiles de OpenStreetMap → cache-first
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(cacheTileFirst(e.request));
    return;
  }

  // 2. Supabase y otras APIs externas → network-only (no cachear)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('router.project-osrm.org')
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 3. Recursos del propio origen → network-first con fallback
  if (url.origin === self.location.origin) {
    e.respondWith(networkFirstApp(e.request));
    return;
  }

  // 4. Cualquier otra cosa → network normal
  e.respondWith(fetch(e.request));
});

// ─── Estrategia: cache-first para tiles ──────────────────────────────────────
async function cacheTileFirst(request) {
  const cache  = await caches.open(CACHE_TILES);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);

    if (response.ok) {
      // LRU simple: si llegamos al límite, borramos el tile más antiguo
      const keys = await cache.keys();
      if (keys.length >= TILES_MAX) {
        await cache.delete(keys[0]);
      }
      // Guardamos una copia en caché
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    // Sin red y sin caché → respuesta vacía (el tile queda en blanco)
    return new Response('', {
      status:     503,
      statusText: 'Offline — tile no disponible',
    });
  }
}

// ─── Estrategia: network-first para el app shell ─────────────────────────────
async function networkFirstApp(request) {
  const cache = await caches.open(CACHE_APP);

  try {
    const response = await fetch(request);
    // Actualizamos la entrada en caché con la versión más reciente
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Sin red → servimos desde caché
    const cached = await cache.match(request);
    if (cached) return cached;

    // Último recurso: index.html (SPA fallback)
    const fallback = await cache.match('/');
    return fallback ?? new Response('Sin conexión', { status: 503 });
  }
}
