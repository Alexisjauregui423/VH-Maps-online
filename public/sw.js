const CACHE_NAME = 'vh-maps-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/style.css'
];

// Instalar y guardar archivos estáticos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Responder desde caché si no hay internet
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
