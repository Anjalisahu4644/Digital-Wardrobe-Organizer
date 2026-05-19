const CACHE_NAME = "wardrobe-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/db.js",
  "./js/auth.js",
  "./js/wardrobe.js",
  "./js/outfits.js",
  "./js/suggestions.js",
  "./js/analytics.js",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install - cache core assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate - clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch - cache first, then network
self.addEventListener("fetch", (e) => {
  // Skip non-GET and external requests
  if (e.request.method !== "GET") return;

  // Handle navigation requests with a shell fallback
  if (e.request.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then((cached) => {
        return cached || fetch(e.request).catch(() => caches.match("./index.html"));
      }),
    );
    return;
  }

  // For API calls (weather), use network first
  if (e.request.url.includes("api.open-meteo.com")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)),
    );
    return;
  }

  // For app assets, cache first
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        }),
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow("/");
      }),
  );
});
