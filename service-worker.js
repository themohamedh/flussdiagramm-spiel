const CACHE_NAME = "flussdiagramm-spiel-v14";
const CONTENT_VERSION = "2026-06-30-mobile-a11y";
const TONI_VERSION = "2026-06-30-mobile-a11y";
const APP_SHELL = [
  "./",
  "./index.html",
  "./liquid-glass.css",
  `./unterrichtsmaterial.js?v=${CONTENT_VERSION}`,
  `./tarif-toni.css?v=${TONI_VERSION}`,
  `./tarif-toni.js?v=${TONI_VERSION}`,
  "./manifest.webmanifest",
  "./app-icon.svg",
  "./C9BD4168-EDB7-44C9-8257-97976AA34FB8.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request) || await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      })
  );
});
