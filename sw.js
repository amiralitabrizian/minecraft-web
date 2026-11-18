
"use strict";

const CACHE_NAME = "minecraft-web-v38";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./feedback.js",
  "./world.js",
  "./script.js",
  "./survival.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./sounds/food.mp3",
  "./sounds/sheep-hit.mp3",
  "./sounds/cow-hit.mp3",
  "./sounds/zombie.mp3",
  "./sounds/background_music.mp3"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();

      await Promise.all(
        names
          .filter(name =>
            name.startsWith("minecraft-web-") &&
            name !== CACHE_NAME
          )
          .map(name => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === "navigate";

  const isCode =
    /\.(js|css|html)$/.test(url.pathname);

  event.respondWith(
    (async () => {
      if (isNavigation || isCode) {
        try {
          const response = await fetch(request, {
            cache: "no-store"
          });

          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }

          return response;
        } catch (error) {
          const cached = await caches.match(request);

          if (cached) return cached;

          if (isNavigation) {
            return caches.match("./index.html");
          }

          throw error;
        }
      }

      const cached = await caches.match(request);

      if (cached) return cached;

      const response = await fetch(request);

      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    })()
  );
});
