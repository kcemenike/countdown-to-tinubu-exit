/* ==========================================================================
   Service worker.
   Two jobs: satisfy the installability requirement on Android, and keep the
   clock working with no signal (the countdown is computed from the device
   clock, so an offline launch is still correct).

   Bump CACHE when you change the shell — the old cache is dropped on activate.
   ========================================================================== */

var CACHE = 'countdown-2027-v3';

// Everything needed to render the page from a cold, offline start.
var SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll is atomic — one 404 would throw the whole install away, so
      // each entry is fetched independently and failures are tolerated.
      .then(function (cache) {
        return Promise.all(
          SHELL.map(function (url) {
            return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            return key === CACHE ? null : caches.delete(key);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('message', function (event) {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  var sameOrigin = url.origin === self.location.origin;

  // Navigations: network first, so a new deploy is picked up immediately and
  // nobody reads a stale countdown. Fall back to the cached page when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put('./index.html', copy);
          });
          return response;
        })
        .catch(function () {
          return caches.match('./index.html').then(function (hit) {
            return hit || caches.match('./');
          });
        })
    );
    return;
  }

  // Google Fonts and other cross-origin assets: cache on first success so the
  // typography survives offline, but never block on them.
  if (!sameOrigin && !/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;

  // Everything else: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(request).then(function (hit) {
      var network = fetch(request)
        .then(function (response) {
          if (response && (response.ok || response.type === 'opaque')) {
            var copy = response.clone();
            caches.open(CACHE).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return hit;
        });

      return hit || network;
    })
  );
});
