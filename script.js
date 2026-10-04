const player = document.getElementById("player");
const game = document.getElementById("game");

let playerX = 100;
let movingLeft = false;
let movingRight = false;

const playerSpeed = 5;

document.addEventListener("keydown", function(event) {
    if (event.key === "a" || event.key === "A") {
        movingLeft = true;
    }

    if (event.key === "d" || event.key === "D") {
        movingRight = true;
    }
});

document.addEventListener("keyup", function(event) {
    if (event.key === "a" || event.key === "A") {
        movingLeft = false;
    }

    if (event.key === "d" || event.key === "D") {
        movingRight = false;
    }
});

function gameLoop() {
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

    requestAnimationFrame(gameLoop);
}

gameLoop();