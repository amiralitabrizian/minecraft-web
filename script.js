
"use strict";

// ==============================
// Elements
// ==============================

const player = document.getElementById("player");
const game = document.getElementById("game");
const controls = document.getElementById("touch-controls");
const leftButton = document.getElementById("left-button");
const rightButton = document.getElementById("right-button");

if (!player || !game || !controls || !leftButton || !rightButton) {
    throw new Error("[INIT] Required game elements were not found.");
}

// ==============================
// State
// ==============================

let playerX = 100;

const playerSpeed = 5;

const input = {
    leftKeyboard: false,
    rightKeyboard: false,
    leftTouch: false,
    rightTouch: false
};

function isMovingLeft() {
    return input.leftKeyboard || input.leftTouch;
}

function isMovingRight() {
    return input.rightKeyboard || input.rightTouch;
}

// ==============================
// Device detection + debugging
// ==============================

function detectTouchDevice() {
    return (
        navigator.maxTouchPoints > 0 ||
        "ontouchstart" in window ||
        window.matchMedia("(pointer: coarse)").matches
    );
}

function updateDeviceMode() {
    const touchDevice = detectTouchDevice();

    document.body.classList.toggle("touch-device", touchDevice);

    console.log("[DEVICE]", {
        touchDevice,
        maxTouchPoints: navigator.maxTouchPoints,
        width: window.innerWidth,
        height: window.innerHeight,
        orientation:
            window.innerWidth > window.innerHeight
                ? "landscape"
                : "portrait",
        controlsDisplay: getComputedStyle(controls).display
    });
}

updateDeviceMode();

window.addEventListener("resize", updateDeviceMode);
window.addEventListener("orientationchange", function () {
    setTimeout(updateDeviceMode, 100);
});

// ==============================
// Keyboard input
// ==============================

function handleKeyDown(event) {
    if (event.code === "KeyA") {
        input.leftKeyboard = true;
        console.log("[KEYBOARD] A physical key pressed");
    }

    if (event.code === "KeyD") {
        input.rightKeyboard = true;
        console.log("[KEYBOARD] D physical key pressed");
    }
}

function handleKeyUp(event) {
    if (event.code === "KeyA") {
        input.leftKeyboard = false;
        console.log("[KEYBOARD] A physical key released");
    }

    if (event.code === "KeyD") {
        input.rightKeyboard = false;
        console.log("[KEYBOARD] D physical key released");
    }
}

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

window.addEventListener("blur", function () {
    input.leftKeyboard = false;
    input.rightKeyboard = false;
    input.leftTouch = false;
    input.rightTouch = false;

    console.log("[INPUT] Reset after window lost focus");
});

// ==============================
// Touch / pointer input
// ==============================

function connectMovementButton(button, direction) {
    const stateKey =
        direction === "left" ? "leftTouch" : "rightTouch";

    button.addEventListener("pointerdown", function (event) {
        event.preventDefault();

        input[stateKey] = true;

        console.log("[POINTER DOWN]", {
            direction,
            pointerType: event.pointerType,
            pointerId: event.pointerId
        });

        try {
            button.setPointerCapture(event.pointerId);
        } catch (error) {
            console.warn("[POINTER] Capture unavailable", error);
        }
    });

    function stopPointer(event) {
        input[stateKey] = false;

        console.log("[POINTER STOP]", {
            direction,
            eventType: event ? event.type : "unknown"
        });
    }

    button.addEventListener("pointerup", stopPointer);
    button.addEventListener("pointercancel", stopPointer);
    button.addEventListener("lostpointercapture", stopPointer);

    console.log("[INPUT] Pointer handlers registered:", direction);
}

connectMovementButton(leftButton, "left");
connectMovementButton(rightButton, "right");

// ==============================
// Player movement
// ==============================

function updatePlayerMovement() {
    if (isMovingLeft()) {
        playerX -= playerSpeed;
    }

    if (isMovingRight()) {
        playerX += playerSpeed;
    }

    const maxX = Math.max(0, game.clientWidth - player.offsetWidth);

    playerX = Math.max(0, Math.min(playerX, maxX));

    player.style.left = playerX + "px";
}

function gameLoop() {
    updatePlayerMovement();
    requestAnimationFrame(gameLoop);
}

console.log("[INIT] Minecraft Web started successfully.");
gameLoop();
