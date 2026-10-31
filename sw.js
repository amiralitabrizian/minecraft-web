"use strict";

// Increase this value whenever the offline app shell changes.
const CACHE_NAME = "minecraft-web-v22";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./world.js",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // addAll fails the install if any required shell file is missing.
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith("minecraft-web-") && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // For page navigation, prefer the newest page and fall back to the cached app.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("./index.html", response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match(request)) ||
          (await caches.match("./index.html")) ||
          new Response("Offline: game files are not cached yet.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
      }
    })());
    return;
  }

  // For same-origin assets, use cache first and update the cache on a miss.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return new Response("Resource unavailable offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
