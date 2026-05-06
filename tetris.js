/* =============================================
   TETRIS — Game Logic
   ============================================= */

const COLS  = 10;
const ROWS  = 20;
const BLOCK = 30;

const COLORS = {
  I: { fill: '#00d4ff', glow: '#00d4ff' },
  O: { fill: '#ffe600', glow: '#ffe600' },
  T: { fill: '#bf00ff', glow: '#bf00ff' },
  S: { fill: '#00ff88', glow: '#00ff88' },
  Z: { fill: '#ff0080', glow: '#ff0080' },
  J: { fill: '#0080ff', glow: '#0080ff' },
  L: { fill: '#ff8800', glow: '#ff8800' },
};

const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
};

const SCORE_TABLE = { 1: 100, 2: 300, 3: 500, 4: 800 };
const LEVEL_SPEED = [800,700,600,500,400,320,260,210,165,130,100,80,65,50,40,33,27,22,18,15];

let board, piece, nextPiece, score, level, lines, highscore;
let gameLoop, dropInterval;
let state = 'idle';

const canvas     = document.getElementById('board');
const ctx        = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nCtx       = nextCanvas.getContext('2d');

const scoreEl  = document.getElementById('score');
const levelEl  = document.getElementById('level');
const linesEl  = document.getElementById('lines');
const highEl   = document.getElementById('highscore');
const statusEl = document.getElementById('status-msg');
const overlay  = document.getElementById('overlay');
const oTitle   = document.getElementById('overlay-title');
const oSub     = document.getElementById('overlay-sub');
const btnStart = document.getElementById('btn-start');

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const key  = keys[Math.floor(Math.random() * keys.length)];
  return {
    type: key,
    shape: SHAPES[key].map(r => [...r]),
    color: COLORS[key],
    x: Math.floor(COLS / 2) - Math.ceil(SHAPES[key][0].length / 2),
    y: 0,
  };
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function isValid(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c, ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
  }
  return true;
}

function rotate(shape) {
  const n = shape.length;
  return shape[0].map((_, c) => shape.map((_, r) => shape[n - 1 - r][c]));
}

function lock() {
  piece.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) {
        const ny = piece.y + r;
        if (ny < 0) { endGame(); return; }
        board[ny][piece.x + c] = piece.color;
      }
    });
  });
  clearLines();
  piece = nextPiece;
  nextPiece = randomPiece();
  if (!isValid(piece.shape, piece.x, piece.y)) endGame();
  drawNext();
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; ) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
    } else { r--; }
  }
  if (cleared) {
    lines += cleared;
    score += (SCORE_TABLE[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = LEVEL_SPEED[Math.min(level - 1, LEVEL_SPEED.length - 1)];
    updateHUD();
  }
}

function drawBlock(context, x, y, color, alpha = 1) {
  const px = x * BLOCK, py = y * BLOCK, sz = BLOCK;
  context.save();
  context.globalAlpha  = alpha;
  context.shadowColor  = color.glow;
  context.shadowBlur   = 12;
  context.fillStyle    = color.fill;
  context.fillRect(px + 1, py + 1, sz - 2, sz - 2);
  context.shadowBlur   = 0;
  const grad = context.createLinearGradient(px, py, px + sz, py + sz);
  grad.addColorStop(0, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  context.fillStyle    = grad;
  context.fillRect(px + 1, py + 1, sz - 2, sz - 2);
  context.strokeStyle  = 'rgba(255,255,255,0.18)';
  context.lineWidth    = 1;
  context.strokeRect(px + 1.5, py + 1.5, sz - 3, sz - 3);
  context.restore();
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(0,212,255,0.06)';
  ctx.lineWidth   = 0.5;
  for (let r = 0; r < ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(COLS * BLOCK, r * BLOCK); ctx.stroke();
  }
  for (let c = 0; c < COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, ROWS * BLOCK); ctx.stroke();
  }
}

function drawBoard() {
  board.forEach((row, r) => {
    row.forEach((cell, c) => { if (cell) drawBlock(ctx, c, r, cell); });
  });
}

function drawGhost() {
  let gy = piece.y;
  while (isValid(piece.shape, piece.x, gy + 1)) gy++;
  if (gy === piece.y) return;
  piece.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!cell) return;
      const px = (piece.x + c) * BLOCK, py = (gy + r) * BLOCK;
      ctx.save();
      ctx.strokeStyle  = piece.color.fill;
      ctx.lineWidth    = 1;
      ctx.globalAlpha  = 0.35;
      ctx.strokeRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
      ctx.restore();
    });
  });
}

function drawPiece() {
  piece.shape.forEach((row, r) => {
    row.forEach((cell, c) => { if (cell) drawBlock(ctx, piece.x + c, piece.y + r, piece.color); });
  });
}

function drawNext() {
  nCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const s = nextPiece.shape;
  const offX = Math.floor((4 - s[0].length) / 2);
  const offY = Math.floor((4 - s.length) / 2);
  const bs   = 24;
  s.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!cell) return;
      const px = (offX + c) * bs + 12, py = (offY + r) * bs + 12;
      nCtx.save();
      nCtx.shadowColor = nextPiece.color.glow;
      nCtx.shadowBlur  = 10;
      nCtx.fillStyle   = nextPiece.color.fill;
      nCtx.fillRect(px, py, bs - 2, bs - 2);
      const g = nCtx.createLinearGradient(px, py, px + bs, py + bs);
      g.addColorStop(0, 'rgba(255,255,255,0.25)');
      g.addColorStop(1, 'rgba(0,0,0,0.3)');
      nCtx.shadowBlur  = 0;
      nCtx.fillStyle   = g;
      nCtx.fillRect(px, py, bs - 2, bs - 2);
      nCtx.restore();
    });
  });
}

function render() {
  drawGrid();
  drawBoard();
  if (state === 'playing') { drawGhost(); drawPiece(); }
}

let lastTime = 0, dropAccum = 0;

function tick(ts = 0) {
  if (state !== 'playing') return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) { dropAccum = 0; moveDown(); }
  render();
  gameLoop = requestAnimationFrame(tick);
}

function moveDown()  { if (isValid(piece.shape, piece.x, piece.y + 1)) piece.y++; else lock(); }
function moveLeft()  { if (isValid(piece.shape, piece.x - 1, piece.y)) piece.x--; }
function moveRight() { if (isValid(piece.shape, piece.x + 1, piece.y)) piece.x++; }

function rotatePiece() {
  const rotated = rotate(piece.shape);
  for (const k of [0, -1, 1, -2, 2]) {
    if (isValid(rotated, piece.x + k, piece.y)) { piece.shape = rotated; piece.x += k; return; }
  }
}

function hardDrop() {
  let dropped = 0;
  while (isValid(piece.shape, piece.x, piece.y + 1)) { piece.y++; dropped++; }
  score += dropped * 2;
  updateHUD();
  lock();
}

function startGame() {
  board        = emptyBoard();
  score        = 0; level = 1; lines = 0;
  dropInterval = LEVEL_SPEED[0];
  dropAccum    = 0;
  piece        = randomPiece();
  nextPiece    = randomPiece();
  state        = 'playing';
  overlay.classList.add('hidden');
  updateHUD(); drawNext();
  lastTime = performance.now();
  gameLoop = requestAnimationFrame(tick);
  setStatus('PLAYING');
}

function endGame() {
  state = 'over';
  cancelAnimationFrame(gameLoop);
  render();
  if (score > highscore) { highscore = score; highEl.textContent = highscore; }
  oTitle.textContent   = 'GAME OVER';
  oSub.textContent     = `SCORE: ${score}`;
  btnStart.textContent = '▶ RETRY';
  overlay.classList.remove('hidden');
  setStatus('GAME OVER');
}

function pauseGame() {
  if (state === 'playing') {
    state = 'paused';
    cancelAnimationFrame(gameLoop);
    setStatus('PAUSED');
    oTitle.textContent   = 'PAUSED';
    oSub.textContent     = 'PRESS P TO RESUME';
    btnStart.textContent = '▶ RESUME';
    overlay.classList.remove('hidden');
  } else if (state === 'paused') {
    overlay.classList.add('hidden');
    state    = 'playing';
    lastTime = performance.now();
    gameLoop = requestAnimationFrame(tick);
    setStatus('PLAYING');
  }
}

function updateHUD() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  linesEl.textContent = lines;
  if (score > highscore) { highscore = score; highEl.textContent = highscore; }
}

function setStatus(msg) { statusEl.textContent = msg; }

let softDropActive = false;

document.addEventListener('keydown', e => {
  if (state === 'idle') return;
  switch (e.code) {
    case 'ArrowLeft':  e.preventDefault(); if (state === 'playing') moveLeft();  render(); break;
    case 'ArrowRight': e.preventDefault(); if (state === 'playing') moveRight(); render(); break;
    case 'ArrowUp':    e.preventDefault(); if (state === 'playing') rotatePiece(); render(); break;
    case 'ArrowDown':
      e.preventDefault();
      if (state === 'playing' && !softDropActive) { softDropActive = true; dropInterval = 50; }
      break;
    case 'Space': e.preventDefault(); if (state === 'playing') hardDrop(); render(); break;
    case 'KeyP':  pauseGame(); break;
  }
});

document.addEventListener('keyup', e => {
  if (e.code === 'ArrowDown') {
    softDropActive = false;
    dropInterval   = LEVEL_SPEED[Math.min(level - 1, LEVEL_SPEED.length - 1)];
  }
});

btnStart.addEventListener('click', () => {
  if (state === 'idle' || state === 'over') startGame();
  else if (state === 'paused') pauseGame();
});

let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchend', e => {
  if (state !== 'playing') return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (adx < 10 && ady < 10) rotatePiece();
  else if (adx > ady) { if (dx > 0) moveRight(); else moveLeft(); }
  else if (dy > 30) hardDrop();
  render(); e.preventDefault();
}, { passive: false });

highscore = parseInt(localStorage.getItem('tetris_hs') || '0', 10);
highEl.textContent = highscore;
setInterval(() => localStorage.setItem('tetris_hs', highscore), 5000);

board = emptyBoard(); piece = randomPiece(); nextPiece = randomPiece();
render(); drawNext();
setStatus('READY PLAYER ONE');
