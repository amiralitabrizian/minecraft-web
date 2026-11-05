# Minecraft2D Web PWA v27 — Verification Report

## Automated checks completed locally

- `node --check` — passed for `script.js`, `world.js`, `survival.js`, and `sw.js`.
- World test — passed: 8 chunks generated, terrain surface and dirt layers exist, ore blocks are generated, chunk edits persist across unload/reload, and save data restores edits.
- Game clock — passed: 06:00 daytime start, 05:00 sunrise boundary, 20:00 night boundary, and reduced night light.
- Crafting data — passed: crafting table recipe is available without an existing table; the remaining recipes are marked as requiring a table.
- Tool data — passed: durability metadata is present for all wooden, iron, gold, and diamond pickaxes, axes, and swords.
- Mob data — passed: hostile spawn limits are bounded to 3 zombies and 2 skeletons; the system includes sheep/cow, zombie chase/melee, skeleton projectiles, and hostile daytime burning.
- Survival data — passed: exact food values are present for raw/cooked beef and mutton; health, hunger, regeneration, starvation, and fall-damage systems are wired into the game loop.
- Furnace test — passed: one coal fuel stack drives the 4-second smelting cycle and converts iron ore into an iron ingot.
- PWA shell — cache version is `minecraft-web-v27`; HTML, CSS, JavaScript, manifest, and all three app icons are included in precache. Cache lookup ignores query strings so `?v=27` asset URLs can match the cached base paths.

## Not yet verified

- Full interactive browser session: the headless Chromium process in this environment did not complete, so no browser-runtime pass is claimed.
- Physical Android models, Samsung Internet, iPhone Safari, and different screen aspect ratios.
- GitHub Pages deployment, installed shortcut icon behavior, real offline launch, and browser storage quota behavior.
- Full end-to-end interaction of the death/menu/load flow in a real browser.

## Manual device test checklist

1. Open the HTTPS page in a desktop browser and verify movement, jump, mining, placement, inventory, crafting, furnace, mobs, eating, save, and load.
2. On Android Chrome in landscape, test every touch control and open/close each panel.
3. Test a smaller screen and a low-memory phone; check that hotbar and touch controls do not cover the player or collide with each other.
4. Reload after saving and confirm terrain edits, inventory, player status, mobs, clock, and furnace contents persist.
5. Open once online, then relaunch in airplane mode.

**Important:** passing the local code/data checks does not guarantee zero bugs on every phone or laptop. Real-device tests are still required.
