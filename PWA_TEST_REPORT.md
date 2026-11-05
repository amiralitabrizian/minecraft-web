# Minecraft2D Web — v28 Test Report

## Automated checks completed

- JavaScript syntax validation (`node --check`) for `script.js`, `survival.js`, `world.js`, and `sw.js`.
- Embedded-browser smoke test in Chromium at desktop viewport (1365×768) and mobile landscape viewport (844×390, touch emulation).
- Both layouts loaded the game canvas and start menu without JavaScript page errors.
- New World menu action opened the game successfully; the HUD clock displayed `06:00 DAY`.
- Menu Save and Load buttons were exercised; the saved state was present in local storage and Load returned to gameplay.
- Inventory and Crafting panels opened successfully; Pause returned to the menu.
- No JavaScript page errors occurred during those interactions.
- Mobile touch-control markup contains exactly three buttons: left, right, and jump. The quick menu contains three buttons: menu, inventory, and crafting.
- Checked that the v28 sound assets exist and are referenced by the service-worker precache list.
- Checked HTML IDs for duplicates and validated local asset references.
- Node-level checks passed for terrain generation, chunk-edit persistence, day/night phase, mob health reduction, and iron smelting in the furnace.
- CSS was parsed with no stylesheet syntax errors.

## Not verified on physical hardware

No physical Android phone, iPhone, tablet, or laptop browser was available for this run. The browser test used Chromium with desktop and mobile viewport/touch emulation. It does not prove compatibility with every mobile browser or device, and it does not fully test real touch timing, audio autoplay policies, offline installation, or device storage quotas.

## Manual device checks before release

1. Test touch movement, jumping, mob tapping/attacks, block mining, and block placement on at least one Android phone in landscape.
2. Test Safari on iPhone if iOS is a target.
3. Confirm that music and effects start after the first touch and that the sound toggle persists.
4. Save, reload the page, and load the saved world on the same device.
5. Install the PWA, open it offline, and verify that the game, icons, and sound effects load.
6. Check the crafting and furnace panels on a small landscape screen so their buttons remain reachable.

## Notes

- The save is local to the current browser/device; it is not cloud-synced.
- The browser may require a first user interaction before allowing background music.
- v28 uses local sound files under `sounds/` and a new cache name, `minecraft-web-v28`.
