# Minecraft2D Web — PWA Test Build (v16)

A lightweight 2D block-based browser game built with HTML, CSS, and JavaScript. This web project is separate from the original Python/Pygame project.

## Current Features

- Player movement and jumping
- Block breaking and placement
- Dropped blocks that can be collected
- 36-slot inventory and 9-slot hotbar
- Stack counts (up to 64 per stack)
- Desktop keyboard/mouse controls and mobile touch controls
- Touch inventory uses a compact bottom panel on mobile, with touch controls kept above it
- Mining durations adapted from the original Pygame game's bare-hand block timings
- PWA manifest, square app icons, standalone display mode, and landscape orientation preference
- Versioned service-worker app-shell caching, cached app icons, and offline navigation fallback

## Desktop Controls

- **A / D** or **Arrow Keys** — Move
- **Space** or **Arrow Up** — Jump
- **Hold left mouse button** — Break the targeted block
- **Right-click** — Place a block next to a valid target
- **E** — Open or close Inventory
- **1–9** — Select a hotbar slot
- **Mouse wheel** — Cycle hotbar slots; scroll the inventory while the pointer is over it

## Mobile Controls

1. Open the site over HTTPS (GitHub Pages is HTTPS).
2. Rotate the phone to landscape. The game asks for landscape when the phone is in portrait.
3. Use the left/right buttons and jump button to move.
4. Tap a nearby block to select it, then press and hold the pickaxe button until mining finishes.
5. Use the Inventory button to open Inventory. Tap an item and then its destination slot to move it.
6. Tap a hotbar slot to select the block for placement.

The manifest requests `standalone` display and landscape orientation. The browser/operating system decides how installation is presented, so orientation locking is not guaranteed in every browser.

## Install on Android

1. Push the project to the GitHub repository and enable GitHub Pages for the correct branch and root folder.
2. Open the published **HTTPS** Pages URL in Chrome on Android.
3. Wait for the page to finish loading once while online.
4. In Chrome, use **⋮ → Install app** or **Add to Home screen** (the exact wording depends on Chrome version).
5. Launch the installed icon from the home screen and confirm it opens in its own app window.
6. Rotate to landscape and test movement, mining, placement, Inventory, and Hotbar.

## Offline Test

1. Open the app once while online and wait for it to finish loading.
2. Close/reopen it once, then enable Airplane mode.
3. Launch the home-screen app again.
4. The cached HTML, CSS, JavaScript, manifest, and app icons should load from the service worker. Any future external resources must be added to the app-shell cache or they may not be available offline.

## Project Files

- `index.html` — Page, PWA metadata, and controls
- `style.css` — Responsive desktop/mobile layout
- `script.js` — Game logic, player, mining, drops, inventory, and hotbar
- `world.js` — World and block management
- `manifest.json` — App name, icons, standalone display, landscape preference
- `sw.js` — Versioned app-shell cache and offline navigation fallback
- `icons/` — PWA icon sizes and maskable icon

## Test Status

See `PWA_TEST_REPORT.md`. Automated/local browser checks do not replace installing and testing the app on a physical Android phone.

## Related Project

Original Python/Pygame project: https://github.com/amiralitabrizian/Minecraft2D

## Developer

Developed by Amir Ali Tabrizian.
