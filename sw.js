/* Pro Private - Service Worker
   Inafanya app ifanye kazi offline kwa kuhifadhi faili za msingi.
   Ukibadili faili yoyote, ongeza namba ya VERSION ili simu zipakue upya. */

const VERSION = 'v11';
const CACHE = 'pro-private-' + VERSION;

// Faili za lazima: zote lazima zihifadhiwe, vinginevyo toleo jipya halichukui nafasi
const CORE = [
  './',
  './index.html',
  './pin.html',
  './vault.html',
  './viewer.html',
  './player.html',
  './settings.html',
  './manifest.json',
  './css/base.css',
  './css/theme-dark.css',
  './css/theme-light.css',
  './css/pin.css',
  './css/vault.css',
  './css/player.css',
  './css/viewer.css',
  './css/settings.css',
  './css/polish.css',
  './css/icons.css',
  './css/music-plus.css',
  './css/video-pro.css',
  './js/theme.js',
  './js/app.js',
  './js/pin.js',
  './js/crypto.js',
  './js/db.js',
  './js/songname.js',
  './js/vault.js',
  './js/player.js',
  './js/viewer.js',
  './js/media.js',
  './js/settings.js',
  './js/backup.js'
];

// Za hiari: zikikosekana, install bado inaendelea
const OPTIONAL = [
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const FILES = CORE.concat(OPTIONAL);

async function fetchFresh(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (res && res.ok) return res;
    } catch (e) {}
  }
  return null;
}

/* Install: hifadhi kila faili. Faili za lazima zikikosa, install inashindwa
   (toleo la zamani linabaki) na itajaribiwa tena mtandao ukipatikana. */
self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    const cache = await caches.open(CACHE);
    const missing = [];

    await Promise.all(FILES.map(async function (url) {
      const res = await fetchFresh(url);
      if (res) {
        await cache.put(new Request(url), res);
      } else if (CORE.indexOf(url) !== -1) {
        missing.push(url);
      }
    }));

    if (missing.length) {
      await caches.delete(CACHE);
      throw new Error('Faili hazikupatikana: ' + missing.join(', '));
    }
    await self.skipWaiting();
  })());
});

/* Activate: futa cache za matoleo ya zamani */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k.indexOf('pro-private-') === 0 && k !== CACHE; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* Fetch: cache kwanza, kisha mtandao.
   ignoreSearch: viewer.html?id=... na player.html?id=... zitumie nakala ya viewer.html / player.html. */
self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async function () {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const response = await fetch(req);
      if (response && response.status === 200 && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      }
      return response;
    } catch (e) {
      if (req.mode === 'navigate') {
        const home = await caches.match('./index.html');
        if (home) return home;
      }
      return new Response('Hakuna mtandao.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});

/* Settings inauliza: "offline iko tayari?" */
self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'status' || !event.ports || !event.ports[0]) return;
  const port = event.ports[0];

  event.waitUntil((async function () {
    const cache = await caches.open(CACHE);
    const have = {};
    (await cache.keys()).forEach(function (r) { have[new URL(r.url).pathname] = 1; });

    const missing = FILES.filter(function (f) {
      return !have[new URL(f, self.registration.scope).pathname];
    });

    port.postMessage({
      version: VERSION,
      total: FILES.length,
      cached: FILES.length - missing.length,
      missing: missing
    });
  })());
});