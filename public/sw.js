const CACHE = "fama-app-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/socket.io")) return;

  event.respondWith(
    fetch(request)
      .then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(request.mode === "navigate" ? "/" : request, copia));
        }
        return respuesta;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(request.mode === "navigate" ? "/" : request)) || (await cache.match(request, { ignoreSearch: true })) || Response.error();
      }),
  );
});
