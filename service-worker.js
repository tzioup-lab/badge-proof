const BUILD = "__BUILD_ID__";
const ASSETS = __ASSET_PATHS__;
const CACHE = "badge-proof-" + BUILD;
const root = self.registration.scope;
const index = new URL("index.html", root).href;
const allowed = new Set(ASSETS.map(asset => new URL(asset.path, root).pathname));

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await Promise.all(ASSETS.map(async asset => {
        const url = new URL(asset.path, root);
        const response = await fetch(new Request(url, {cache: "reload", integrity: asset.integrity}));
        if (!response.ok) throw new Error("Incomplete application download");
        await cache.put(url, response);
      }));
    } catch (error) {await caches.delete(CACHE); throw error;}
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: "window", includeUncontrolled: true});
    // Keep older versioned assets while other windows may still be using them.
    if (windows.length <= 1) {
      for (const name of await caches.keys()) if (name.startsWith("badge-proof-") && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("message", event => {
  if (event.data?.type === "APPLY_UPDATE") self.skipWaiting();
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !url.href.startsWith(root)) return;
  const navigation = event.request.mode === "navigate" && (url.pathname === new URL(root).pathname || url.pathname === new URL(index).pathname);
  if (!navigation && !allowed.has(url.pathname)) return;
  event.respondWith((async () => {
    if (navigation) return (await caches.open(CACHE)).match(index);
    const cached = await caches.match(event.request);
    return cached || fetch(event.request);
  })());
});
