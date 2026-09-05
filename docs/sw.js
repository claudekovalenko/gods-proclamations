/* Service worker: makes the app open instantly and work with no signal.

   The shell is precached on install. Google Fonts are cached the first time
   they are fetched, so the second launch is fully offline even though the
   faces come from another origin. Bump SHELL when any shell file changes. */

const SHELL = "proclamations-shell-v3";
const FONTS = "proclamations-fonts-v1";

const PRECACHE = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./data.js",
  "./manifest.webmanifest",
  "./icons/mark.svg",
  "./icons/favicon-32.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    /* one bad URL should not fail the whole install */
    await Promise.all(PRECACHE.map(url =>
      cache.add(new Request(url, {cache: "reload"})).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keep = [SHELL, FONTS];
    const names = await caches.keys();
    await Promise.all(names.filter(n => !keep.includes(n)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

const isFont = url =>
  url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);

  /* Fonts: serve from cache, otherwise fetch and keep a copy. */
  if(isFont(url)){
    event.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      if(hit) return hit;
      try{
        const res = await fetch(req);
        if(res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
        return res;
      }catch(e){
        return hit || Response.error();
      }
    })());
    return;
  }

  if(url.origin !== location.origin) return;

  /* Navigations always resolve to the app shell, so a deep or stale URL,
     or a cold start with no signal, still opens the app. */
  if(req.mode === "navigate"){
    event.respondWith((async () => {
      try{
        return await fetch(req);
      }catch(e){
        const cache = await caches.open(SHELL);
        return (await cache.match("./index.html")) ||
               (await cache.match("./")) ||
               Response.error();
      }
    })());
    return;
  }

  /* Everything else: cache first, refreshing in the background. */
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const hit = await cache.match(req, {ignoreSearch: true});
    const network = fetch(req).then(res => {
      if(res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return hit || (await network) || Response.error();
  })());
});
