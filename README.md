# Minecraft Web — Drop, Inventory & Hotbar

A 2D block-based browser game built with HTML, CSS, and JavaScript. This project is separate from the original Python/Pygame Minecraft2D project; the original game is used as a reference for gameplay and visual behavior, while browser-specific functionality is implemented for desktop and mobile devices.

## Current Features

- Player movement and jumping
- Block breaking and placement
- Dropped blocks appear in the world and can be collected
- 36-slot inventory and 9-slot hotbar
- Stack counts, with a limit of 64 items per stack
- Select hotbar slots with mouse, touch, or number keys 1–9
- Move items between inventory and hotbar using mouse drag-and-drop or tap-to-select and tap-to-move on touch screens
- Scrollable inventory panel positioned higher on the screen
- Item names shown on slot hover/focus and above the selected hotbar slot
- Player sprite proportions, clothing, and walking animation adapted from the original Pygame player renderer
- Desktop keyboard/mouse controls and mobile touch controls

## Desktop Controls

- **A / D** or **Arrow Keys** — Move
- **Space** or **Arrow Up** — Jump
- **Hold left mouse button** — Break a block (mining timer applies)
- **Right-click** — Place the selected block next to a valid target
- **E** — Open or close the inventory
- **1–9** — Select a hotbar slot
- **Q** — Place the selected block near the current target

## Mobile Controls

- Rotate the phone to landscape orientation.
- Use the on-screen left/right and jump buttons to move.
- Tap a block to select it, then use the break button.
- Dropped items are collected automatically when the player gets close.
- Tap the hotbar to select an item. Open Inventory to move items between slots; touch and drag between slots.

## Project Files

- `index.html` — Game page and controls
- `style.css` — Layout, responsive styles, inventory and tooltips
- `script.js` — Game logic, player rendering, drops, inventory and hotbar
- `world.js` — World and block management
- `manifest.json` — Web app metadata
- `sw.js` — Service worker and cache versioning

## Run Locally

Open `index.html` through a local development server. In PyCharm, use **Open in Browser**. A service worker requires HTTPS or localhost.

## Related Project

Original Python/Pygame project: https://github.com/amiralitabrizian/Minecraft2D

## Developer

Developed by Amir Ali Tabrizian.

## Testing Notes

This update includes inventory drag-and-drop, a scrollable inventory panel, item-name tooltips, and a walking animation adapted from the original Pygame player renderer. Please test on desktop and on a real mobile device after deployment; mobile behavior has not been physically verified in this build.
