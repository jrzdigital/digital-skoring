/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CACHE_NAME = "jrz-score-offline-v3";
const STATIC_ASSETS = [
  "/jrzscoreutama.ico",
  "/jrzscoreutama.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("ServiceWorker pre-caching warning:", err);
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept Vite dev modules, source files, pre-bundled deps, or API streams
  if (
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.startsWith("/@") ||
    url.searchParams.has("v") ||
    url.pathname.startsWith("/api/match-state/stream")
  ) {
    return;
  }

  // Network first for API endpoints with fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        if (url.pathname === "/api/match-state") {
          return new Response(JSON.stringify({ offline: true }), {
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Mode Offline Aktif" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      })
    );
    return;
  }

  // Cache-first for images, icons, and audio assets for 0ms instant asset loading
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|mp3|wav|ogg)$/i)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-first for HTML navigation and JS/CSS bundles to avoid stale module hashes
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
