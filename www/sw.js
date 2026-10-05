/* Veritdoku service worker – offline hra (stale-while-revalidate). */
const CACHE = 'veritdoku-v4';

const PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/engine.js',
  './js/explain.js',
  './js/ink.js',
  './js/verities.js',
  './js/gen-worker.js',
  './levels.json',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Každý soubor zvlášť – chybějící soubor nesmí rozbít instalaci.
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(handle(req, event));
});

async function handle(req, event) {
  const cache = await caches.open(CACHE);
  const isNav = req.mode === 'navigate';
  const cached = await cache.match(req, { ignoreSearch: isNav });

  const network = fetch(req)
    .then((res) => {
      if (res && res.ok && res.type === 'basic') {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => null);

  if (cached) {
    // stale-while-revalidate: aktualizace na pozadí
    event.waitUntil(network);
    return cached;
  }

  const res = await network;
  if (res) return res;

  if (isNav) {
    const fallback = (await cache.match('./index.html')) || (await cache.match('./'));
    if (fallback) return fallback;
  }
  return new Response('Offline', { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
