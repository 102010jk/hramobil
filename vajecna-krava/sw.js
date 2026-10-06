/* Vaječná kráva – service worker pro offline hraní (stale-while-revalidate). */
const CACHE = 'vajecna-krava-v3';

const PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/match.js',
  './js/ui.js',
  './js/maps.js',
  './js/weapons.js',
  './js/skins.js',
  './js/characters.js',
  './js/textures.js',
  './js/profile.js',
  './js/audio.js',
  './js/vendor/three.module.min.js',
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
      await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('vajecna-krava-') && k !== CACHE).map((k) => caches.delete(k)));
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
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  const res = await network;
  if (res) return res;
  if (isNav) {
    const fallback = (await cache.match('./index.html')) || (await cache.match('./'));
    if (fallback) return fallback;
  }
  return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
