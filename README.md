# Minecraft2D Web — Survival PWA (v27)

A browser-based, 2D block-world survival game. This project is separate from the original Python/Pygame game; its gameplay systems are being ported and adapted for desktop browsers and touch devices.

## Gameplay systems in this build

- Seeded chunk world with grass, dirt, stone, bedrock, trees, caves, and coal/iron/gold/diamond ore
- Player movement, jumping, collision, camera follow, block mining, block placement, and dropped-item pickup
- 36-slot inventory and 9-slot hotbar, stack sizes, item movement, and tool durability
- Wooden, iron, gold, and diamond pickaxes, axes, and swords
- Crafting recipes for the crafting table, planks, sticks, furnace, and tools
- Furnace input/fuel/output, coal fuel, and smelting for ores and raw food
- Day/night cycle, sunrise/sunset, night and cave darkness, and torch lighting
- Sheep, cows, zombies, skeletons, zombie melee attacks, skeleton arrows, and daytime burning for hostile mobs
- Health, hunger, food, regeneration, starvation, fall damage, death, dropped inventory, and respawn
- Death screen, respawn with dropped inventory left in the world, and a menu exit path
- Manual save/load and automatic local browser save
- Responsive canvas, desktop keyboard/mouse controls, touch controls, landscape prompt, and PWA offline app shell

The web build follows the original game's main rules and data where possible, but it is not a pixel-perfect or code-identical copy of Pygame. Rendering, world generation, and some entity behavior are adapted to JavaScript and the browser.

## Desktop controls

- **A / D** or **← / →** — Move
- **Shift** or quickly double-tap a movement key — Sprint
- **Space** or **↑** — Jump
- **Hold left mouse button** — Mine a block; click a mob to attack
- **Right-click** — Place a block, eat selected food, or interact with a station
- **E** — Open/close inventory
- **C** — Open crafting menu (the first crafting table can be made here)
- **G** — Interact with a nearby crafting table/furnace
- **F** — Attack the mob under the pointer
- **R** — Eat selected food
- **1–9** — Select a hotbar slot
- **Mouse wheel** — Cycle hotbar slots, or scroll the inventory grid

## Mobile controls

1. Open the published site over HTTPS.
2. Rotate the phone to landscape; the app displays a landscape prompt in portrait mode.
3. Use the left/right buttons and jump button to move.
4. Tap a block to select it, then hold the mining button to break it.
5. Use the place, attack, eat, and interact buttons for the corresponding actions.
6. Use the Inventory and Craft buttons near the top-left for item management and crafting.
7. When the death screen appears, choose RESPAWN to continue in the same world or EXIT TO MENU to load/continue/start another world.

Touch behavior and layout depend on the device/browser. The project has not been physically tested on every Android/iPhone model.

## PWA installation and offline use

1. Publish this folder to the configured GitHub Pages source and confirm the HTTPS page opens.
2. Open the HTTPS URL in Chrome on Android (or a supported browser on another device).
3. Let the app finish loading once while online so the service worker can cache its app shell and icons.
4. Use the browser's **Install app** or **Add to Home Screen** option, if available.
5. Launch the installed app, rotate to landscape, and test controls.
6. For an offline test, open the app online first, then enable airplane mode and relaunch it.

The manifest requests standalone display and landscape orientation. Browser/OS behavior can vary, and orientation locking is not guaranteed on every device.

## Project files

- `index.html` — Page structure, PWA metadata, and interface controls
- `style.css` — Responsive desktop/mobile layout
- `script.js` — Main game loop, player, inventory, mining, crafting, furnace, survival, save/load, and input
- `world.js` — Deterministic chunk terrain and block management
- `survival.js` — Tool/recipe data, game clock, mob AI, and furnace simulation
- `manifest.json` — PWA app name, icons, orientation, and display mode
- `sw.js` — Versioned app-shell cache and offline fallback
- `icons/` — PWA app icons

## Verification status

Automated checks were run for JavaScript syntax, world generation/edit persistence, time phases, crafting recipe rules, tool data, and furnace smelting. A full physical-device matrix and GitHub Pages deployment check remain manual. See `PWA_TEST_REPORT.md` for the exact checks.

## Related project

Original Python/Pygame project: https://github.com/amiralitabrizian/Minecraft2D

## Developer

Developed by Amir Ali Tabrizian.
