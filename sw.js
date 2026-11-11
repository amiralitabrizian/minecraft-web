"use strict";
const CACHE_NAME = "minecraft-web-v32";
const FILES_TO_CACHE = ["./", "./index.html", "./style.css", "./world.js", "./script.js", "./survival.js", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./sounds/food.mp3", "./sounds/sheep-hit.mp3", "./sounds/cow-hit.mp3", "./sounds/zombie.mp3", "./sounds/background_music.mp3"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)));
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
