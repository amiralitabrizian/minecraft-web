
"use strict";

const game = document.getElementById("game");
const player = document.getElementById("player");
const ground = document.getElementById("ground");
const statusText = document.getElementById("debug-status");

const leftButton = document.getElementById("left-button");
const rightButton = document.getElementById("right-button");
const jumpButton = document.getElementById("jump-button");

if (!game || !player || !ground || !statusText ||
    !leftButton || !rightButton || !jumpButton) {
    throw new Error("Game elements missing. Check index.html.");
}

/* Physics */
const MOVE_SPEED = 260;
const GRAVITY = 1500;
const JUMP_SPEED = 560;

let playerX = 80;
let playerY = 0;
let velocityY = 0;
let grounded = false;
let jumpBuffer = 0;

const keys = {
    left: false,
    right: false
};

const touch = {
    left: false,
    right: false
};

function setStatus(message) {
    statusText.textContent = message;
}

function getFloorY() {
    const gameRect = game.getBoundingClientRect();
    const groundRect = ground.getBoundingClientRect();

    return Math.max(
        0,
        groundRect.top - gameRect.top - player.offsetHeight
    );
}

function renderPlayer() {
    player.style.left = playerX + "px";
    player.style.top = playerY + "px";
}

function keepPlayerInsideWorld() {
    const maxX = Math.max(
        0,
        game.clientWidth - player.offsetWidth
    );

    playerX = Math.max(0, Math.min(playerX, maxX));
}

/* Detect touch devices and show mobile controls. */
function updateDeviceMode() {
    const touchDevice =
        navigator.maxTouchPoints > 0 ||
        "ontouchstart" in window ||
        window.matchMedia("(pointer: coarse)").matches ||
        window.matchMedia("(hover: none)").matches;

    document.body.classList.toggle("touch-device", touchDevice);

    console.log("[DEVICE] Touch device:", touchDevice);
}

function requestJump(source) {
    const floorY = getFloorY();

    console.log("[JUMP REQUEST]", source, {
        grounded: grounded,
        playerY: playerY,
        floorY: floorY
    });

    /*
     * Permit jumping if grounded or very close to the floor.
     */
    if (grounded || playerY >= floorY - 3) {
        playerY = floorY;
        velocityY = -JUMP_SPEED;
        grounded = false;
        jumpBuffer = 0;

        setStatus("پرش! " + source);
        console.log("[JUMP STARTED]", source);
    } else {
        jumpBuffer = 0.18;
        setStatus("در هوا...");
    }
}

/* Keyboard: A/D, arrows, Space, and Up. */
window.addEventListener("keydown", function (event) {
    const key = event.key.toLowerCase();

    if (event.code === "KeyA" || key === "a" ||
        event.code === "ArrowLeft") {
        keys.left = true;
        event.preventDefault();
    }

    if (event.code === "KeyD" || key === "d" ||
        event.code === "ArrowRight") {
        keys.right = true;
        event.preventDefault();
    }

    if (event.code === "Space" ||
        event.code === "ArrowUp" ||
        key === "w") {
        event.preventDefault();

        if (!event.repeat) {
            requestJump("keyboard");
        }
    }
});

window.addEventListener("keyup", function (event) {
    const key = event.key.toLowerCase();

    if (event.code === "KeyA" || key === "a" ||
        event.code === "ArrowLeft") {
        keys.left = false;
    }

    if (event.code === "KeyD" || key === "d" ||
        event.code === "ArrowRight") {
        keys.right = false;
    }
});

function releaseInputs() {
    keys.left = false;
    keys.right = false;
    touch.left = false;
    touch.right = false;
}

window.addEventListener("blur", releaseInputs);

document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
        releaseInputs();
    }
});

/* Touch movement: multiple pointers are supported. */
function connectMovementButton(button, direction) {
    const activePointers = new Set();
    const touchKey = direction === "left" ? "left" : "right";

    button.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        activePointers.add(event.pointerId);
        touch[touchKey] = true;

        try {
            button.setPointerCapture(event.pointerId);
        } catch (_) {}
    });

    function stopPointer(event) {
        activePointers.delete(event.pointerId);
        touch[touchKey] = activePointers.size > 0;
    }

    button.addEventListener("pointerup", stopPointer);
    button.addEventListener("pointercancel", stopPointer);
    button.addEventListener("lostpointercapture", stopPointer);
}

connectMovementButton(leftButton, "left");
connectMovementButton(rightButton, "right");

/* Touch jump */
jumpButton.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    requestJump("touch");
});

/* Physics */
function updateGame(dt) {
    let direction = 0;

    if (keys.left || touch.left) direction -= 1;
    if (keys.right || touch.right) direction += 1;

    playerX += direction * MOVE_SPEED * dt;
    keepPlayerInsideWorld();

    const floorY = getFloorY();

    if (jumpBuffer > 0) {
        jumpBuffer = Math.max(0, jumpBuffer - dt);
    }

    velocityY += GRAVITY * dt;
    playerY += velocityY * dt;

    if (playerY >= floorY) {
        playerY = floorY;
        velocityY = 0;
        grounded = true;

        if (jumpBuffer > 0) {
            jumpBuffer = 0;
            requestJump("buffered");
        }
    } else {
        grounded = false;
    }

    if (playerY < 0) {
        playerY = 0;

        if (velocityY < 0) {
            velocityY = 0;
        }
    }

    renderPlayer();
}

function handleResize() {
    updateDeviceMode();
    keepPlayerInsideWorld();

    const floorY = getFloorY();

    if (grounded || playerY > floorY) {
        playerY = floorY;
        velocityY = 0;
        grounded = true;
    }

    renderPlayer();
}

window.addEventListener("resize", handleResize);
window.addEventListener("orientationchange", function () {
    requestAnimationFrame(handleResize);
});

/* Initialize */
updateDeviceMode();

playerX = 80;
playerY = getFloorY();
velocityY = 0;
grounded = true;

keepPlayerInsideWorld();
renderPlayer();

setStatus("بازی آماده است");
console.log("[INIT] JavaScript loaded successfully.");

let previousTime = 0;

function gameLoop(timestamp) {
    if (previousTime === 0) {
        previousTime = timestamp;
    }

    const dt = Math.min((timestamp - previousTime) / 1000, 0.033);
    previousTime = timestamp;

    updateGame(dt);
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
