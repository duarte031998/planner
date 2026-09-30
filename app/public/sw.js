// Mi Planner — service worker: funciona sin conexión.
// Los datos NO viven aquí (están en localStorage/IndexedDB); esto solo guarda la app.
const CACHE = 'mi-planner-app-v1';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const res = await fetch('./index.html', { cache: 'reload' });
    await c.put('./index.html', res.clone());
    const html = await res.text();
    const urls = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map(m => m[1]);
    await c.addAll(['./', ...new Set(urls)]).catch(() => {});
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    // Borra archivos de versiones anteriores de la app (no afecta a los datos).
    try {
      const c = await caches.open(CACHE);
      const idx = await c.match('./index.html');
      if (idx) {
        const html = await idx.text();
        const keep = new Set([...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map(m => new URL(m[1], self.registration.scope).href));
        for (const req of await c.keys()) if (req.url.includes('/assets/') && !keep.has(req.url)) await c.delete(req);
      }
    } catch (e) {}
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonts) return;

  // Páginas: primero red (para recibir actualizaciones), si no hay conexión, caché.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(CACHE); c.put('./index.html', res.clone());
        return res;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Resto (JS, CSS, iconos, fuentes): caché y actualización en segundo plano.
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});
