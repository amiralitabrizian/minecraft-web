# Minecraft2D Web PWA — v16 Test Notes

## Changes in this update
- Bumped the app shell cache to `minecraft-web-v16` so previously cached v14/v15 resources are replaced.
- Added all three PNG app icons to the service-worker app shell cache for offline availability.
- Added cache-busting version `v16` to the stylesheet, scripts, manifest, and favicon references.
- Updated the mobile Inventory panel to sit near the bottom, use a shorter scrollable grid, and stay below touch controls in stacking order.
- Kept the existing game logic, touch controls, hotbar, and item handling unchanged.

## Local checks
- `manifest.json` parses as valid JSON.
- PNG icons exist and have dimensions 192×192, 512×512, and 512×512.
- JavaScript syntax checks are required before release.
- These checks do not substitute for testing on a real Android phone.

## Retest on Android
1. Push v16 to GitHub Pages and wait until deployment finishes.
2. Open the page once online, then close old game tabs.
3. Reopen the site in Chrome; if needed clear the site's stored data or unregister the old service worker.
4. Confirm the icon is visible when creating a new shortcut. Remove the old shortcut first because its icon may be stored by Android.
5. Open Inventory in landscape mode. Confirm it appears as a compact panel near the bottom and does not block the touch controls.
6. Repeat the offline test after loading the app fully while online.

## Known limitation
This update was not physically tested on an Android device in this environment. If the icon remains blank after deployment, verify the published URLs:
- `/minecraft-web/manifest.json`
- `/minecraft-web/icons/icon-192.png`
- `/minecraft-web/icons/icon-512.png`
