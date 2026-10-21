# Minecraft Web

A 2D block-based sandbox game built with HTML, CSS, and JavaScript.

## About the Project

Minecraft Web is a browser-based game project inspired by 2D sandbox games. The goal is to create a playable experience on both desktop computers and mobile devices.

This project is separate from the original Python/Pygame version of Minecraft2D. The original project can be used as a reference for gameplay logic, while web-specific features are implemented using JavaScript, HTML, and CSS.

## Current Development Stage

The current development stage focuses on block interactions, item drops, inventory management, and the hotbar.

Planned and implemented features should be verified in the running game before being considered complete.

## Project Structure

- `index.html` — Main game page.
- `style.css` — Game layout and visual styling.
- `script.js` — Main game logic and player interactions.
- `world.js` — World and block management.
- `manifest.json` — Web app configuration.
- `sw.js` — Service worker for caching and offline support.
- `README.md` — Project documentation.

## Controls

### Desktop

- **A / D** or **Arrow Keys** — Move.
- **Space** — Jump.
- **Mouse** — Interact with blocks.
- **Number Keys 1–9** — Select a hotbar slot.
- **E** — Open or close the inventory.

### Mobile

The game is designed to support touch controls and a mobile-friendly layout. Touch interactions and landscape orientation should be tested on the target device.

## Technologies

- HTML5
- CSS3
- JavaScript
- Git and GitHub Pages

## Running the Game

Open `index.html` in a compatible browser or run the project using a local development server.

For GitHub Pages deployment, configure the repository to publish the correct branch and root directory.

## Development Goals

- Improve desktop and mobile controls