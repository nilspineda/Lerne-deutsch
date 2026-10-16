// SW mínimo: shell offline (no-cache-first simple). Las rutas son dinámicas (Supabase), así que
// solo cacheamos el shell y los estáticos; el contenido vive en la red.
const V = 'lerne-v2'
const SHELL = ['/', '/icon-192.png', '/icon-512.png', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/')) return
  // estáticos: cache-first; navegación: network con fallback al cache del shell
  if (/\.(svg|png|jpg|css|js|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      const copy = r.clone()
      caches.open(V).then((c) => c.put(e.request, copy))
      return r
    })))
    return
  }
  e.respondWith(fetch(e.request).catch(() => caches.match(url.pathname).then((hit) => hit || caches.match('/'))))
})
