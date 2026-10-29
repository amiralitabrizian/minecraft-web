# Minecraft2D Web PWA v20 — test report

Changes:
- Added explicit favicon, Android icon, and Apple touch icon references.
- Manifest declares standard 192px, 512px, and maskable icons with direct paths.
- Service worker cache bumped to v20 and precaches all app icons; old app caches are removed on activation.
- Added final mobile CSS overrides: Hotbar slots are wider/taller and the full inventory panel is lower, larger, scrollable, and arranged in nine columns.
- Updated asset query versions and requested Service Worker update on page load.

Static checks performed: JSON parses; JavaScript syntax checks pending runtime environment; icon files are present in ZIP.

Not yet verified: actual GitHub Pages deployment, Chrome shortcut icon on Android, physical-device layout, and offline launch. These must be tested after publishing.
