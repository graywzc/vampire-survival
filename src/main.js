/**
 * Vampire Survivors Prototype — Main Entry
 *
 * This is the game entry point. The game loop, entity management,
 * and rendering logic will be implemented in subsequent phases.
 *
 * See IMPLEMENTATION_PLAN.md for the development roadmap.
 */

// --- Constants ---
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

// --- DOM References ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// HUD elements
const hudTime = document.getElementById('hud-time');
const hudHealthBar = document.getElementById('hud-health-bar');
const hudHealthVal = document.getElementById('hud-health-val');
const hudXpBar = document.getElementById('hud-xp-bar');
const hudXpVal = document.getElementById('hud-xp-val');
const hudLevelVal = document.getElementById('hud-level-val');
const hudKillsVal = document.getElementById('hud-kills-val');
const hudWeaponsList = document.getElementById('hud-weapons-list');

// Overlays
const overlayStart = document.getElementById('overlay-start');
const overlayPause = document.getElementById('overlay-pause');
const overlayLevelup = document.getElementById('overlay-levelup');
const overlayGameover = document.getElementById('overlay-gameover');

// Buttons
const btnPlay = document.getElementById('btn-play');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnRestart = document.getElementById('btn-restart');
const btnResume = document.getElementById('btn-resume');
const btnQuit = document.getElementById('btn-quit');
const btnRetry = document.getElementById('btn-retry');

// --- Game State ---
let gameState = 'start'; // 'start' | 'playing' | 'paused' | 'levelup' | 'gameover'
let animFrameId = null;

// --- Utility ---

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function showOverlay(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hideOverlay(id) {
  document.getElementById(id).classList.add('hidden');
}

// --- Game Loop ---

let lastTimestamp = 0;
let elapsed = 0;

function gameLoop(timestamp) {
  if (gameState !== 'playing') return;

  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05); // cap delta
  lastTimestamp = timestamp;
  elapsed += dt;

  update(dt);
  render();
  updateHUD();

  animFrameId = requestAnimationFrame(gameLoop);
}

function update(dt) {
  // TODO: Phase 2+ — update entities, spawn enemies, process input
}

function render() {
  // Clear
  ctx.fillStyle = '#111118';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // TODO: Phase 2+ — render player, enemies, effects
}

function updateHUD() {
  hudTime.textContent = formatTime(elapsed);
}

// --- Game Control ---

function startGame() {
  gameState = 'playing';
  elapsed = 0;
  lastTimestamp = performance.now();

  hideOverlay('overlay-start');
  hideOverlay('overlay-pause');
  hideOverlay('overlay-gameover');
  hideOverlay('overlay-levelup');

  animFrameId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  if (animFrameId) cancelAnimationFrame(animFrameId);
  showOverlay('overlay-pause');
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  lastTimestamp = performance.now();
  hideOverlay('overlay-pause');
  animFrameId = requestAnimationFrame(gameLoop);
}

function restartGame() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  gameState = 'start';
  elapsed = 0;
  hideOverlay('overlay-pause');
  hideOverlay('overlay-gameover');
  hideOverlay('overlay-levelup');
  showOverlay('overlay-start');
}

function triggerGameOver() {
  gameState = 'gameover';
  if (animFrameId) cancelAnimationFrame(animFrameId);

  // Populate stats
  document.getElementById('go-time').textContent = formatTime(elapsed);
  document.getElementById('go-level').textContent = hudLevelVal.textContent;
  document.getElementById('go-kills').textContent = hudKillsVal.textContent;

  showOverlay('overlay-gameover');
}

// --- Event Listeners ---

btnPlay.addEventListener('click', startGame);
btnStart.addEventListener('click', startGame);
btnPause.addEventListener('click', pauseGame);
btnRestart.addEventListener('click', restartGame);
btnResume.addEventListener('click', resumeGame);
btnQuit.addEventListener('click', restartGame);
btnRetry.addEventListener('click', startGame);

// Keyboard: Escape to pause/resume
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (gameState === 'playing') pauseGame();
    else if (gameState === 'paused') resumeGame();
  }
});

// --- Initialization ---

// Show start screen on load
showOverlay('overlay-start');

console.log('%c🧛 Vampire Survivors Prototype loaded', 'color: #8b5cf6; font-size: 14px; font-weight: bold;');
console.log('Open index.html in a browser to play.');
