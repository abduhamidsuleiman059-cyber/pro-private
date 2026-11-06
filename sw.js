/* Pro Private - Service Worker
   Inafanya app ifanye kazi offline kwa kuhifadhi faili za msingi.
   Ukibadili faili yoyote, ongeza namba ya VERSION ili simu zipakue upya. */

const VERSION = 'v7';
const CACHE = 'pro-private-' + VERSION;

const FILES = [
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
  './js/theme.js',
  './js/app.js',
  './js/pin.js',
  './js/crypto.js',
  './js/db.js',
  './js/vault.js',
  './js/player.js',
  './js/viewer.js',
  './js/media.js',
  './js/settings.js',
  './js/backup.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* Install: hifadhi kila faili kivyake.
   Faili ambayo bado haijatengenezwa haivunji install. */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(
        FILES.map(function (url) {
          return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
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

/* Fetch: cache kwanza, kisha mtandao */
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});