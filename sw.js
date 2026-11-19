"use strict";
const CACHE_NAME = "minecraft-web-v37";
const CORE_FILES = ["./", "./index.html", "./style.css", "./feedback.js", "./world.js", "./script.js", "./survival.js", "./manifest.json", "./icon.svg", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.all(CORE_FILES.map(url => cache.add(url).catch(err => console.warn("Optional cache failed:", url, err))))));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(names => Promise.all(names.filter(name => name.startsWith("minecraft-web-") && name !== CACHE_NAME).map(name => caches.delete(name)))),
    self.clients.claim()
  ]));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => {
    if (event.request.mode === "navigate") return caches.match("./index.html");
    throw new Error("Offline resource is not cached: " + event.request.url);
  })));
});
