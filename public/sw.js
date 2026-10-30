// Eloise's HSK APP Service Worker (Offline Support)
const CACHE_NAME = "eloise-hsk-cache-v1";
const OFFLINE_URLS = [
  "/",
  "/words",
  "/mistakes",
  "/settings",
  "/manifest.json",
  "/icon.png",
  "/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch((err) => {
        console.warn("Pre-caching encountered an error:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Audio files might be huge; let browser handle range requests natively
  if (event.request.url.includes("/audio/")) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached and update in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is HTML document, fallback to cached root
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/");
          }
        });
    })
  );
});
