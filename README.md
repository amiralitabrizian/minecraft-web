# Minecraft Web — Block World milestone

A small browser-based block-world prototype. The code is split into:

- `world.js`: block data, world generation, block lookup/removal and placement validation.
- `script.js`: rendering, keyboard/mouse/touch input, player physics, collision and block interaction.
- `style.css`: responsive laptop/mobile layout and landscape prompt.
- `index.html`: page structure.
- `manifest.json` and `sw.js`: install metadata and offline cache.

## Laptop / mouse controls

- Move the mouse over a block to highlight it.
- Left-click a reachable block to break it.
- Right-click a reachable block to place the chosen block type against the nearest face of that block.
- `A` / `D` or `←` / `→`: move.
- `Space`, `W` or `↑`: jump.
- `E`, `Backspace` or `Delete`: break the selected block as an alternative to left-click.
- `Q`: place the chosen block as an alternative to right-click.

## Mobile / touch controls

- Turn the phone sideways (landscape).
- Hold `←` / `→` to move; tap `↑` to jump.
- Tap a nearby block to select it, then use the separate **شکستن** or **قراردادن** buttons.

## Notes

- Blocks are separate records with world coordinates and a type.
- The player collides with solid blocks horizontally and vertically.
- Bedrock cannot be broken.
- Placing requires an empty adjacent cell and will not place inside the player.
- Inventory, crafting, enemies, health, hunger and saving are not included yet.
- Browser orientation locking is not guaranteed by every browser; the page displays a rotate-phone prompt in portrait mode on touch devices.

Open `index.html` locally or publish the folder to GitHub Pages. Service worker caching requires HTTPS or localhost.


## Mobile controls (v8)

- In portrait mode, the orientation guide asks you to rotate the phone.
- In landscape mode, left/right and jump buttons stay visible at the bottom, with break/place buttons on the right.
- Touch controls use safe-area spacing and smaller sizes on short landscape screens.
- After updating the deployed site, refresh it; if an older offline copy remains, close/reopen the site once so the new service-worker cache activates.


## Mouse and mobile controls (v9)

- Laptop: hold left mouse button on a reachable block for 3 seconds to break it; a progress bar and cracks show the progress.
- Laptop: right-click once on a reachable adjacent empty cell to place the selected block. If clicking an existing block, the block is placed on its nearest face.
- Mobile: tap a block to select it, then hold the bottom **Break** button for 3 seconds. Tap **Place** once after selecting a target area.
- Movement buttons are explicitly left-to-right even though the page uses a right-to-left language direction.
- `E` (hold) breaks the selected/hovered block after 3 seconds; `Q` places a block.
