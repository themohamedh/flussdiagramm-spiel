const CACHE_PREFIX = "flussdiagramm-spiel-";
const CACHE_NAME = `${CACHE_PREFIX}v23`;
const CONTENT_VERSION = "2026-06-30-mobile-a11y";
const TONI_VERSION = "2026-07-20-api-fallback";
const DESIGN_VERSION = "2026-07-18-toni-tools";
const REQUIRED_APP_SHELL = [
  "./",
  "./index.html",
  `./liquid-glass.css?v=${DESIGN_VERSION}`,
  `./unterrichtsmaterial.js?v=${CONTENT_VERSION}`,
  `./tarif-toni.css?v=${TONI_VERSION}`,
  `./tarif-toni.js?v=${TONI_VERSION}`,
  "./manifest.webmanifest",
  "./app-icon.svg"
];
const OPTIONAL_APP_SHELL = [
  "./C9BD4168-EDB7-44C9-8257-97976AA34FB8.png"
];
const APP_SHELL = [...REQUIRED_APP_SHELL, ...OPTIONAL_APP_SHELL];
const APP_SHELL_URLS = new Set(APP_SHELL.map((path) => new URL(path, self.location.href).href));

function isAppShellRequest(request) {
  return APP_SHELL_URLS.has(request.url);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(REQUIRED_APP_SHELL);
      await Promise.all(OPTIONAL_APP_SHELL.map((path) => cache.add(path).catch(() => null)));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  const isNavigation = event.request.mode === "navigate";
  const isStaticAsset = isAppShellRequest(event.request);

  if (!isNavigation && !isStaticAsset) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && (isStaticAsset || isNavigation)) {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request) || await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        if (event.request.mode === "navigate") return await caches.match("./index.html") || Response.error();
        return Response.error();
      })
  );
});
