# Minecraft2D Web — v29 Test Report

Test date: 2026-11-05

## Fixes included in v29

- Non-solid world objects such as torches are included in the renderer query; solid-only collision queries remain unchanged.
- A torch is drawn as an upright wooden stick with an animated flame and a warm glow. It can be placed in a supported empty cell above a solid block, and placement avoids intersecting the player.
- Dropped items use their own sprite drawing routine for ores, blocks, ingots, tools, food, wool, bones, sticks, and torches. Inventory CSS icons also have separate designs for ores, tools, and common items.
- The first-run Save action is enabled. Continue and Load remain disabled until a save exists. The menu reports save success or failure.
- Mobile Help and About/creator information are available without permanently occupying the gameplay screen.
- The drop pickup path avoids rebuilding the whole Inventory DOM every frame when the inventory cannot accept an item; inventory rendering is batched when pickup succeeds.
- Lighting checks visible torches rather than scanning every loaded world block each frame. Mobile canvas pixel ratio and render cadence are capped.

## Automated checks completed

- `node --check` passed for `script.js`, `world.js`, `survival.js`, and `sw.js`.
- Chromium smoke tests passed at desktop 1365×768, mobile landscape 844×390 (touch emulation), and compact mobile landscape 720×360 (touch emulation).
- In all three viewports: main menu opened, first-run Save was enabled, About displayed `امیرعلی تبریزیان`, Save created a local save, Load became enabled, Load returned to gameplay, Inventory opened, duplicate HTML IDs were absent, and no JavaScript page errors or console errors were recorded.
- In both mobile viewport tests: exactly three movement buttons were present (left, right, jump); Help opened and closed and included mining instructions.
- A touch-emulated placement test placed a torch above a solid ground block. The save contained the torch world override and the inventory count decreased from 16 to 15. Reloading that save restored the torch visibly in gameplay.
- A night-state test loaded the saved world at 21:00. The HUD showed NIGHT, the sky darkened, stars appeared, and the placed torch emitted a visible warm light pool.
- Node world test confirmed that normal physics queries exclude torches while renderer queries using `includeNonSolid=true` include them.
- The sun/moon timing was left unchanged: sunrise phase begins at 05:00, daytime begins at 06:00, sunset begins at 17:00, and night begins at 20:00. These times match the original Python GameTime logic.

## Not verified on physical hardware

These are automated Chromium tests using desktop/mobile viewport and touch emulation, not tests on actual phones. No physical Android, iPhone/Safari, or multiple laptop models were available. Therefore v29 is not certified error-free on every device. Real-device checks are still required for touch precision, sound autoplay permissions, installed-PWA/offline behavior, browser storage limits, and device-specific performance.

## Manual checks before release

1. On an Android phone in landscape, place torches on the ground and verify the flame remains visible after moving away and returning.
2. Save, close the tab, reopen the site, and load the world. Confirm torches, inventory, clock, health, hunger, drops, mobs, and furnace contents persist.
3. Check Safari on iPhone if iOS support is required.
4. Confirm music and sound effects start after a user gesture and that the sound toggle behaves correctly.
5. Install the PWA, open it offline, and check the UI and sound files.
6. Play for several minutes on a lower-end phone and note any slowdown or heat.

## Storage note

World saves are stored locally in the current browser on the current device. They do not automatically synchronize between different phones or computers.
