const CACHE = "fama-app-v2";
const CACHE_MAPA = "fama-mapa-v1";
const HOST_MAPA = "server.arcgisonline.com";
const ESPERA_PAGINA_MS = 4000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE && c !== CACHE_MAPA).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

const guardar = (clave, respuesta) => {
  if (!respuesta || !respuesta.ok) return;
  const copia = respuesta.clone();
  caches.open(CACHE).then((cache) => cache.put(clave, copia));
};

const desdeCache = async (clave) => {
  const cache = await caches.open(CACHE);
  return (await cache.match(clave)) || (await cache.match(clave, { ignoreSearch: true }));
};

const conLimite = (promesa, ms) => new Promise((resolver, rechazar) => {
  const t = setTimeout(() => rechazar(new Error("tiempo")), ms);
  promesa.then((r) => { clearTimeout(t); resolver(r); }, (e) => { clearTimeout(t); rechazar(e); });
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.hostname === HOST_MAPA) {
    event.respondWith(
      caches.open(CACHE_MAPA).then(async (cache) => {
        const enCache = await cache.match(request.url);
        if (enCache) return enCache;
        try {
          const r = await fetch(request.url, { mode: "cors", credentials: "omit" });
          if (r.ok) cache.put(request.url, r.clone());
          return r;
        } catch {
          return fetch(request).catch(() => Response.error());
        }
      }),
    );
    return;
  }
  if (url.origin !== self.location.origin || url.pathname.startsWith("/socket.io")) return;

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      desdeCache(request).then((enCache) => enCache || fetch(request).then((r) => { guardar(request, r); return r; })),
    );
    return;
  }

  if (request.mode === "navigate") {
    const red = fetch(request, { cache: "no-store" });
    event.respondWith(
      conLimite(red, ESPERA_PAGINA_MS)
        .catch(async () => (await desdeCache("/")) || red),
    );
    red.then((r) => guardar("/", r)).catch(() => undefined);
    return;
  }

  event.respondWith(
    fetch(request)
      .then((r) => { guardar(request, r); return r; })
      .catch(async () => (await desdeCache(request)) || Response.error()),
  );
});
