const player = document.getElementById("player");
const game = document.getElementById("game");

const leftButton = document.getElementById("left-button");
const rightButton = document.getElementById("right-button");

let playerX = 100;

let movingLeft = false;
let movingRight = false;

const playerSpeed = 5;


// ====================
// Device Detection
// ====================

const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

if (!isTouchDevice) {
    leftButton.style.display = "none";
    rightButton.style.display = "none";
}


// ====================
// Keyboard Input
// ====================

function handleKeyboardInput(event, isPressed) {
    if (event.key === "a" || event.key === "A") {
        movingLeft = isPressed;
    }

    if (event.key === "d" || event.key === "D") {
        movingRight = isPressed;
    }
}

document.addEventListener("keydown", function(event) {
    handleKeyboardInput(event, true);
});

document.addEventListener("keyup", function(event) {
    handleKeyboardInput(event, false);
});


// ====================
// Touch Input
// ====================

function startTouch(direction) {
    if (direction === "left") {
        movingLeft = true;
    }

    if (direction === "right") {
        movingRight = true;
    }
}

function stopTouch(direction) {
    if (direction === "left") {
        movingLeft = false;
    }

    if (direction === "right") {
        movingRight = false;
    }
}

if (isTouchDevice) {

    leftButton.addEventListener("touchstart", function(event) {
        event.preventDefault();
        startTouch("left");
    });

    leftButton.addEventListener("touchend", function(event) {
        event.preventDefault();
        stopTouch("left");
    });

    leftButton.addEventListener("touchcancel", function() {
        stopTouch("left");
    });


    rightButton.addEventListener("touchstart", function(event) {
        event.preventDefault();
        startTouch("right");
    });

    rightButton.addEventListener("touchend", function(event) {
        event.preventDefault();
        stopTouch("right");
    });

    rightButton.addEventListener("touchcancel", function() {
        stopTouch("right");
    });
}


// ====================
// Player Movement
// ====================

function updatePlayerMovement() {

    if (movingLeft) {
        playerX -= playerSpeed;
    }

    if (movingRight) {
        playerX += playerSpeed;
    }

    const maxX = game.clientWidth - player.offsetWidth;

    if (playerX < 0) {
        playerX = 0;
    }

    if (playerX > maxX) {
        playerX = maxX;
    }

    player.style.left = playerX + "px";
}


// ====================
// Game Loop
// ====================

function gameLoop() {
    updatePlayerMovement();

    requestAnimationFrame(gameLoop);
}

gameLoop();