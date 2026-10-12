
# Minecraft Web

A simple web prototype for Minecraft2D, built with HTML, CSS and JavaScript.

## Controls

- Physical A key: Move left
- Physical D key: Move right
- Touch left arrow: Move left
- Touch right arrow: Move right

Keyboard controls use `KeyboardEvent.code`, so the physical A and D keys work with Persian or English keyboard layouts.

## Keyboard Events

- `keydown`: runs when a key is pressed.
- `keyup`: runs when a key is released.

## Touch Debugging

The console logs device detection, viewport orientation, pointer-down events and pointer-stop events. These logs help identify whether a problem is in device detection, button visibility or input handling.

## PWA

The project includes a web app manifest and a service worker for basic offline caching. The manifest requests landscape orientation for the installed app; support depends on the browser.
