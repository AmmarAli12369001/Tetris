const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
const BLOCK_SIZE = 30;
context.scale(BLOCK_SIZE, BLOCK_SIZE);


let isPaused = false;
let isGameOver = false;


const colors = [
    null,
    "purple",
    "yellow",
    "orange",
    "cyan"
];


function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

const arena = createMatrix(10, 20);


function createPiece(type) {
    if (type === "T") {
        return [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ];
    } else if (type === "O") {
        return [
            [2, 2],
            [2, 2]
        ];
    } else if (type === "L") {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3]
        ];
    } else if (type === "I") {
        return [
            [0, 4, 0, 0],
            [0, 4, 0, 0],
            [0, 4, 0, 0],
            [0, 4, 0, 0]
        ];
    }
}


const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0
};


function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);

    if (isPaused) drawOverlay("PAUSED");
    if (isGameOver) drawOverlay("GAME OVER", "Press R to Restart");
}

function drawOverlay(title, subtitle = "") {
    context.fillStyle = "rgba(0,0,0,0.7)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#fff";
    context.font = "1px Arial";
    context.textAlign = "center";
    context.fillText(title, canvas.width / 40, canvas.height / 40);

    if (subtitle) {
        context.fillText(subtitle, canvas.width / 40, canvas.height / 40 + 2);
    }
}


function collide(arena, player) {
    const m = player.matrix;
    const o = player.pos;

    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0) {
                const arenaY = y + o.y;
                const arenaX = x + o.x;

                if (
                    arenaX < 0 ||
                    arenaX >= arena[0].length ||
                    arenaY >= arena.length
                ) {
                    return true;
                }

                if (arena[arenaY] && arena[arenaY][arenaX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}



function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}


function arenaSweep() {
    outer: for (let y = arena.length - 1; y >= 0; y--) {
        for (let x = 0; x < arena[y].length; x++) {
            if (arena[y][x] === 0) continue outer;
        }
        arena.splice(y, 1);
        arena.unshift(new Array(10).fill(0));
        player.score += 10;
    }
}


function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < y; x++) {
            [matrix[x][y], matrix[y][x]] =
            [matrix[y][x], matrix[x][y]];
        }
    }
    dir > 0 ? matrix.forEach(row => row.reverse()) : matrix.reverse();
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);

    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}


function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    let distance = 0;
    while (!collide(arena, player)) {
        player.pos.y++;
        distance++;
    }
    player.pos.y--;
    merge(arena, player);
    player.score += distance;
    playerReset();
    arenaSweep();
    updateScore();
    dropCounter = 0;
}


function playerReset() {
    const pieces = "TOLI";
    player.matrix = createPiece(
        pieces[Math.floor(Math.random() * pieces.length)]
    );
    player.pos.y = 0;
    player.pos.x =
        (arena[0].length / 2 | 0) -
        (player.matrix[0].length / 2 | 0);

    if (collide(arena, player)) {
        isGameOver = true;
    }
}


function updateScore() {
    document.getElementById("score").innerText = player.score;
}


function togglePause() {
    if (!isGameOver) isPaused = !isPaused;
}

function restartGame() {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    updateScore();
    isPaused = false;
    isGameOver = false;
    playerReset();
}


document.addEventListener("keydown", event => {
    if (event.key === "p" || event.key === "P") return togglePause();
    if (event.key === "r" || event.key === "R") return restartGame();
    if (isPaused || isGameOver) return;

    if (event.key === "ArrowLeft") {
        player.pos.x--;
        if (collide(arena, player)) player.pos.x++;
    } else if (event.key === "ArrowRight") {
        player.pos.x++;
        if (collide(arena, player)) player.pos.x--;
    } else if (event.key === "ArrowDown") {
        playerDrop();
    } else if (event.key === "ArrowUp") {
        playerRotate(1);
    } else if (event.code === "Space") {
        playerHardDrop();
    }
});


let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
    if (!isPaused && !isGameOver) {
        const deltaTime = time - lastTime;
        lastTime = time;
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}


playerReset();
updateScore();
update();
