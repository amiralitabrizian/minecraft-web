# Minecraft2D Web PWA — v18 patch

## Changes
- Added explicit 32x32 browser favicon and 180x180 Apple touch icon.
- Manifest icon paths no longer contain query strings; standard 192x192, 512x512, and maskable icons are declared.
- Service Worker cache version is v18, pre-caches all icon sizes, removes old project caches, and uses network-first navigation with offline fallback.
- Mobile hotbar slots are larger and centered; full Inventory panel is positioned above the hotbar and touch controls.

## Validation
- `manifest.json` parses as valid JSON.
- Icon files are present and valid PNGs.
- JavaScript syntax checks are required before release.
- Real-device install prompt, icon display, and Inventory layout still require testing on Android Chrome.
