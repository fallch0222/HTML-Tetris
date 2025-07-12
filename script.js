const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 20;

const COLORS = [
    null,
    '#FF0D72',
    '#0DC2FF',
    '#0DFF72',
    '#F538FF',
    '#FF8E0D',
    '#FFE138',
    '#3877FF',
];

const blocklandsfx = new Audio('sound effect/pop-39222.mp3'); //DO NOT DELETE THIS SOUND EFFECT FUNCTION

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let score = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 1000;
let nextPiece = null;
let gameOver = false;
let animationFrameId;

let player = {
    pos: { x: 0, y: 0 },
    matrix: null,
};

function createPiece(type) {
    if (type === 'T') {
        return [[0, 3, 0], [3, 3, 3], [0, 0, 0]];
    } else if (type === 'O') {
        return [[2, 2], [2, 2]];
    } else if (type === 'L') {
        return [[0, 5, 0], [0, 5, 0], [5, 5, 0]];
    } else if (type === 'J') {
        return [[0, 7, 0], [0, 7, 0], [0, 7, 7]];
    } else if (type === 'I') {
        return [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]];
    } else if (type === 'S') {
        return [[0, 4, 4], [4, 4, 0], [0, 0, 0]];
    } else if (type === 'Z') {
        return [[6, 6, 0], [0, 6, 6], [0, 0, 0]];
    }
}

function playerReset() {
    const pieces = 'TJLOSZI';
    if (nextPiece === null) {
        nextPiece = createPiece(pieces[pieces.length * Math.random() | 0]);
    }

    player.matrix = nextPiece;
    nextPiece = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);

    if (collide(board, player)) {
        gameOver = true;
        showGameOver();
        cancelAnimationFrame(animationFrameId);
        return;
    }
    drawNextPiece();
}

function showGameOver() {
    context.fillStyle = 'rgba(0, 0, 0, 0.75)';
    context.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
    context.fillStyle = 'white';
    context.font = '24px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('Game Over', canvas.width / 2, canvas.height / 2);
}

function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
        player.pos.y--;
        merge(board, player);
        playerReset();
        sweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(board, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(board, player);
    playerReset();
    sweep();
    updateScore();
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(board, player)) {
        player.pos.x -= dir;
    }
}

function playerRotate() {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix);
    while (collide(board, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix); // rotate back
            player.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    matrix.forEach(row => row.reverse());
}

function collide(board, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0) {
                let newY = y + o.y;
                let newX = x + o.x;
                if (newX < 0 || newX >= COLS || newY >= ROWS || (board[newY] && board[newY][newX] !== 0)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function merge(board, player) {
     blocklandsfx.play();
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function sweep() {
    let rowCount = 1;
    outer: for (let y = board.length - 1; y > 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }

        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;

        score += rowCount * 10;
        rowCount *= 2;
        if (score >= level * 100) {
            level++;
            dropInterval -= 50;
            if (dropInterval < 100) {
                dropInterval = 100;
            }
        }
    }
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(context, board, { x: 0, y: 0 });
    drawGhostPiece();
    drawMatrix(context, player.matrix, player.pos);
}

function drawMatrix(context, matrix, offset, isGhost = false) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                if (isGhost) {
                    context.fillStyle = 'rgba(128, 128, 128, 0.5)';
                    context.strokeStyle = 'white';
                    context.lineWidth = 1;
                    context.fillRect((x + offset.x) * BLOCK_SIZE, (y + offset.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    context.strokeRect((x + offset.x) * BLOCK_SIZE, (y + offset.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                } else {
                    context.fillStyle = COLORS[value];
                    context.fillRect((x + offset.x) * BLOCK_SIZE,
                                     (y + offset.y) * BLOCK_SIZE,
                                     BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        });
    });
}

function drawGhostPiece() {
    const ghost = { ...player, pos: { ...player.pos } };
    while (!collide(board, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;

    drawMatrix(context, ghost.matrix, ghost.pos, true);
}

function drawNextPiece() {
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const offsetX = (nextCanvas.width / BLOCK_SIZE - nextPiece[0].length) / 2;
    const offsetY = (nextCanvas.height / BLOCK_SIZE - nextPiece.length) / 2;
    drawMatrix(nextContext, nextPiece, {x: offsetX, y: offsetY});
}

function updateScore() {
    scoreElement.innerText = score;
    levelElement.innerText = level;
}

let lastTime = 0;
function update(time = 0) {
    if (gameOver) {
        return;
    }
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    animationFrameId = requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
    if (gameOver) {
        return;
    }
    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === 'ArrowUp') {
        playerRotate();
    } else if (event.key === ' ') {
        playerHardDrop();
    }
});

playerReset();
updateScore();
update();