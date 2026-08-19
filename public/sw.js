/**
 * Service worker mínimo: solo cachea el "app shell" (HTML + assets estáticos
 * del propio origen) para que la app siga cargando sin conexión y el
 * borrador del cierre en curso (guardado en localStorage) pueda recuperarse.
 *
 * NUNCA intercepta peticiones a la API (backend en otro origen, /api/, /auth/)
 * ni peticiones que no sean GET: esas siempre van directo a la red, para no
 * interferir con la lógica de auto-discovery/reintentos de src/services/api.js
 * ni con cookies/credenciales.
 */
const CACHE_NAME = 'koaj-cierre-shell-v1';
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icon-koaj.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo GET, y solo mismo origen. Todo lo demás (API en Render, POST, etc.)
  // se deja pasar sin tocar.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  // Navegación (recargar/abrir la app): red primero, con fallback al shell
  // cacheado si no hay conexión (para que React Router y el draft local sigan
  // funcionando sin internet).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets estáticos versionados por hash (JS/CSS/íconos): cache-first.
  if (url.pathname.startsWith('/assets/') || SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
