
"use strict";

const game = document.getElementById("game");
const player = document.getElementById("player");
const ground = document.getElementById("ground");
const statusText = document.getElementById("debug-status");
const rotateScreen = document.getElementById("rotate-screen");

const leftButton = document.getElementById("left-button");
const rightButton = document.getElementById("right-button");
const jumpButton = document.getElementById("jump-button");

if (
    !game || !player || !ground || !statusText ||
    !rotateScreen || !leftButton || !rightButton || !jumpButton
) {
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

/* بررسی جهت گوشی و نمایش راهنما */
function updateOrientationMode(touchDevice) {
    if (typeof touchDevice !== "boolean") {
        touchDevice = document.body.classList.contains("touch-device");
    }

    const portrait =
        window.matchMedia("(orientation: portrait)").matches ||
        window.innerHeight > window.innerWidth;

    const needsLandscape = touchDevice && portrait;

    document.body.classList.toggle("needs-landscape", needsLandscape);

    if (needsLandscape) {
        setStatus("برای شروع، گوشی را افقی کنید");
        releaseInputs();
    } else {
        setStatus("بازی آماده است");
    }

    return needsLandscape;
}

/* پیدا کردن ارتفاع سطح زمین */
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

/* شناسایی موبایل یا دستگاه لمسی */
function updateDeviceMode() {
    const touchDevice =
        navigator.maxTouchPoints > 0 ||
        "ontouchstart" in window ||
        window.matchMedia("(pointer: coarse)").matches ||
        window.matchMedia("(hover: none)").matches;

    document.body.classList.toggle("touch-device", touchDevice);

    updateOrientationMode(touchDevice);

    console.log("[DEVICE] Touch device:", touchDevice);
}

/* پرش */
function requestJump(source) {
    if (document.body.classList.contains("needs-landscape")) {
        return;
    }

    const floorY = getFloorY();

    if (grounded || playerY >= floorY - 3) {
        playerY = floorY;
        velocityY = -JUMP_SPEED;
        grounded = false;
        jumpBuffer = 0;

        setStatus("پرش!");
        console.log("[JUMP STARTED]", source);
    } else {
        jumpBuffer = 0.18;
        setStatus("در هوا...");
    }
}

/* صفحه‌کلید: A/D یا کلیدهای جهت‌دار */
window.addEventListener("keydown", function (event) {
    const key = event.key.toLowerCase();

    if (
        event.code === "KeyA" ||
        key === "a" ||
        event.code === "ArrowLeft"
    ) {
        keys.left = true;
        event.preventDefault();
    }

    if (
        event.code === "KeyD" ||
        key === "d" ||
        event.code === "ArrowRight"
    ) {
        keys.right = true;
        event.preventDefault();
    }

    if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        key === "w"
    ) {
        event.preventDefault();

        if (!event.repeat) {
            requestJump("keyboard");
        }
    }
});

window.addEventListener("keyup", function (event) {
    const key = event.key.toLowerCase();

    if (
        event.code === "KeyA" ||
        key === "a" ||
        event.code === "ArrowLeft"
    ) {
        keys.left = false;
    }

    if (
        event.code === "KeyD" ||
        key === "d" ||
        event.code === "ArrowRight"
    ) {
        keys.right = false;
    }
});

/* آزاد کردن تمام دکمه‌ها */
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

/* کنترل لمسی چپ و راست */
function connectMovementButton(button, direction) {
    const activePointers = new Set();
    const touchKey = direction === "left" ? "left" : "right";

    button.addEventListener("pointerdown", function (event) {
        if (document.body.classList.contains("needs-landscape")) {
            return;
        }

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

/* دکمه پرش */
jumpButton.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    requestJump("touch");
});

/* منطق حرکت مشترک برای کیبورد و لمس */
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

    /* برخورد با زمین */
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

    /* جلوگیری از خارج شدن از بالای صفحه */
    if (playerY < 0) {
        playerY = 0;

        if (velocityY < 0) {
            velocityY = 0;
        }
    }

    renderPlayer();
}

/* تغییر اندازه صفحه یا چرخاندن گوشی */
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

/* رویدادهای تغییر جهت در مرورگرهای جدید */
if (screen.orientation) {
    screen.orientation.addEventListener("change", function () {
        requestAnimationFrame(handleResize);
    });
}

/* راه‌اندازی بازی */
updateDeviceMode();

playerX = 80;
playerY = getFloorY();
velocityY = 0;
grounded = true;

keepPlayerInsideWorld();
renderPlayer();

console.log("[INIT] JavaScript loaded successfully.");

let previousTime = 0;

/* حلقه بازی */
function gameLoop(timestamp) {
    if (previousTime === 0) {
        previousTime = timestamp;
    }

    const dt = Math.min((timestamp - previousTime) / 1000, 0.033);
    previousTime = timestamp;

    /* در حالت عمودی بازی حرکت نمی‌کند */
    if (!document.body.classList.contains("needs-landscape")) {
        updateGame(dt);
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
