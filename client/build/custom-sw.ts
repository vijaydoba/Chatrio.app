/* eslint-disable no-restricted-globals */

const CACHE = "chatblink-cache-v1";
const ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches
      .match(req)
      .then(
        (res) =>
          res ||
          fetch(req)
            .then((netRes) => {
              const copy = netRes.clone();
              caches
                .open(CACHE)
                .then((cache) => cache.put(req, copy))
                .catch(() => {});
              return netRes;
            })
            .catch(() => caches.match("/index.html"))
      )
  );
});
