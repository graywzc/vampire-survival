// Main game engine — single-file core loop
// All game logic lives here to avoid cross-module dependency issues.

import { initInput, getMoveDir } from './input.js';

// ── DOM refs ──────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const el = (id) => document.getElementById(id);

// ── Game state ────────────────────────────────────────────────────
let gameState = 'menu'; // menu | playing | paused | levelup | gameover
let gameTime = 0;
let lastTime = 0;
let animFrameId = null;
const WIN_TIME = 300; // 5 minutes

// ── Player ────────────────────────────────────────────────────────
const P = {
  x: 0, y: 0, radius: 12, speed: 180,
  hp: 100, maxHp: 100, level: 1,
  xp: 0, xpToNext: 20, kills: 0,
  invTimer: 0,
  damage: 10,
  wCd: 0, wRate: 0.8,
  projSpeed: 400,
  orbitCount: 1, orbitRadius: 60, orbitAngle: 0,
};

function resetPlayer() {
  P.x = 0; P.y = 0; P.speed = 180;
  P.hp = 100; P.maxHp = 100; P.level = 1;
  P.xp = 0; P.xpToNext = 20; P.kills = 0;
  P.invTimer = 0; P.damage = 10;
  P.wCd = 0; P.wRate = 0.8;
  P.projSpeed = 400;
  P.orbitCount = 1; P.orbitRadius = 60; P.orbitAngle = 0;
}

// ── Enemies ───────────────────────────────────────────────────────
let enemies = [];
let spawnTimer = 0;

const ETYPES = {
  basic: { r: 10, spd: 60, hp: 20, dmg: 8, color: '#ef4444', xp: 3 },
  fast:  { r: 8,  spd: 110, hp: 10, dmg: 5, color: '#f97316', xp: 2 },
  tank:  { r: 16, spd: 35, hp: 60, dmg: 15, color: '#a855f7', xp: 6 },
};

function spawnEnemy() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 600 + Math.random() * 200;
  let type = 'basic';
  if (gameTime > 60 && Math.random() < 0.3) type = 'fast';
  if (gameTime > 120 && Math.random() < 0.15) type = 'tank';
  const t = ETYPES[type];
  const hm = 1 + gameTime / 120;
  enemies.push({
    x: P.x + Math.cos(angle) * dist,
    y: P.y + Math.sin(angle) * dist,
    r: t.r, spd: t.spd * (1 + gameTime / 300),
    hp: t.hp * hm, maxHp: t.hp * hm,
    dmg: t.dmg, color: t.color, xpVal: t.xp,
  });
}

// ── Projectiles ───────────────────────────────────────────────────
let projs = [];

function fireProjectile(x, y, angle, dmg) {
  projs.push({
    x, y,
    vx: Math.cos(angle) * P.projSpeed,
    vy: Math.sin(angle) * P.projSpeed,
    r: 4, dmg: dmg || P.damage, life: 2.5, color: '#22d3ee',
  });
}

// ── XP Gems ───────────────────────────────────────────────────────
let gems = [];
let levelUpPending = false;
let levelUpTimer = 0;
const LEVEL_UP_TIMEOUT = 5;

const UPGRADES = [
  { id: 'damage', name: 'Damage Up', desc: 'Increase weapon damage by 5',
    apply: () => { P.damage += 5; } },
  { id: 'speed', name: 'Speed Up', desc: 'Move 15% faster',
    apply: () => { P.speed *= 1.15; } },
  { id: 'firerate', name: 'Fire Rate', desc: 'Shoot 20% faster',
    apply: () => { P.wRate *= 0.8; } },
  { id: 'health', name: 'Heal', desc: 'Restore 30 HP',
    apply: () => { P.hp = Math.min(P.hp + 30, P.maxHp); } },
  { id: 'maxhealth', name: 'Max HP Up', desc: 'Increase max HP by 20',
    apply: () => { P.maxHp += 20; P.hp += 20; } },
  { id: 'orbitcount', name: 'Extra Orbit', desc: 'Add an orbiting projectile',
    apply: () => { P.orbitCount += 1; } },
  { id: 'projspeed', name: 'Projectile Speed', desc: 'Projectiles fly 20% faster',
    apply: () => { P.projSpeed *= 1.2; } },
];

function spawnGem(x, y, val) {
  gems.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20, val, r: 4 });
}

// ── Camera ────────────────────────────────────────────────────────
let camX = 0, camY = 0;

function updateCamera() {
  camX = P.x - W / 2;
  camY = P.y - H / 2;
}

function toScreen(wx, wy) {
  return { x: wx - camX, y: wy - camY };
}

// ── HUD ───────────────────────────────────────────────────────────
function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function updateHud() {
  el('hud-time').textContent = fmtTime(gameTime);
  el('hud-health-val').textContent = Math.max(Math.round(P.hp), 0);
  el('hud-health-bar').style.width = Math.max(0, (P.hp / P.maxHp) * 100) + '%';
  el('hud-xp-val').textContent = Math.floor(P.xp) + '/' + P.xpToNext;
  el('hud-xp-bar').style.width = Math.min(100, (P.xp / P.xpToNext) * 100) + '%';
  el('hud-level-val').textContent = P.level;
  el('hud-kills-val').textContent = P.kills;

  // Weapons list
  const wl = el('hud-weapons-list');
  wl.innerHTML = '';
  for (let i = 0; i < P.orbitCount; i++) {
    const s = document.createElement('div');
    s.className = 'weapon-slot';
    s.textContent = '✦';
    wl.appendChild(s);
  }
}

// ── Level-up UI ───────────────────────────────────────────────────
function showLevelUp() {
  const container = el('levelup-choices');
  container.innerHTML = '';
  const shuffled = [...UPGRADES].sort(() => Math.random() - 0.5);
  const choices = shuffled.slice(0, 3);
  choices.forEach((u) => {
    const card = document.createElement('div');
    card.className = 'choice-card';
    card.innerHTML = `<h3>${u.name}</h3><p>${u.desc}</p>`;
    card.addEventListener('click', () => applyUpgrade(u));
    container.appendChild(card);
  });
  el('overlay-levelup').classList.remove('hidden');
}

function applyUpgrade(u) {
  u.apply();
  P.xp = 0;
  P.xpToNext = Math.floor(20 * Math.pow(1.3, P.level - 1));
  levelUpPending = false;
  levelUpTimer = 0;
  el('overlay-levelup').classList.add('hidden');
}

// ── Game flow ─────────────────────────────────────────────────────
function hideAllOverlays() {
  ['overlay-start', 'overlay-pause', 'overlay-levelup', 'overlay-gameover'].forEach((id) => {
    el(id).classList.add('hidden');
  });
}

function startGame() {
  resetPlayer();
  enemies = [];
  projs = [];
  gems = [];
  spawnTimer = 0;
  levelUpPending = false;
  levelUpTimer = 0;
  gameTime = 0;
  lastTime = performance.now();
  gameState = 'playing';
  hideAllOverlays();
  // Restore game-over heading
  el('overlay-gameover').querySelector('h2').textContent = 'Game Over';
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  el('overlay-pause').classList.remove('hidden');
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  lastTime = performance.now();
  el('overlay-pause').classList.add('hidden');
  animFrameId = requestAnimationFrame(gameLoop);
}

function quitToMenu() {
  gameState = 'menu';
  if (animFrameId) cancelAnimationFrame(animFrameId);
  el('overlay-pause').classList.add('hidden');
  el('overlay-start').classList.remove('hidden');
}

function showGameOver() {
  gameState = 'gameover';
  el('go-time').textContent = fmtTime(gameTime);
  el('go-level').textContent = P.level;
  el('go-kills').textContent = P.kills;
  el('overlay-gameover').querySelector('h2').textContent = 'Game Over';
  el('overlay-gameover').classList.remove('hidden');
}

function showWin() {
  gameState = 'gameover';
  el('go-time').textContent = fmtTime(gameTime);
  el('go-level').textContent = P.level;
  el('go-kills').textContent = P.kills;
  el('overlay-gameover').querySelector('h2').textContent = 'You Survived!';
  el('overlay-gameover').classList.remove('hidden');
}

// ── Rendering ─────────────────────────────────────────────────────
const TILE = 64;

function drawBackground() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(60, 40, 80, 0.4)';
  ctx.lineWidth = 1;
  const sx = Math.floor(camX / TILE) * TILE;
  const sy = Math.floor(camY / TILE) * TILE;

  for (let x = sx; x < sx + W + TILE * 2; x += TILE) {
    const s = x - camX;
    ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(s, H); ctx.stroke();
  }
  for (let y = sy; y < sy + H + TILE * 2; y += TILE) {
    const s = y - camY;
    ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(W, s); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(30, 20, 50, 0.3)';
  for (let tx = 0; tx < Math.ceil(W / TILE) + 2; tx++) {
    for (let ty = 0; ty < Math.ceil(H / TILE) + 2; ty++) {
      const wx = sx + tx * TILE;
      const wy = sy + ty * TILE;
      const h = (Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453) % 1;
      if (h > 0.6) {
        ctx.fillRect(wx - camX, wy - camY, TILE, TILE);
      }
    }
  }
}

function drawPlayer() {
  const { x: sx, y: sy } = toScreen(P.x, P.y);
  if (P.invTimer > 0 && Math.floor(P.invTimer * 10) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }
  ctx.fillStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.arc(sx, sy, P.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = '#8b5cf6';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawEnemies() {
  for (const e of enemies) {
    const { x: sx, y: sy } = toScreen(e.x, e.y);
    if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
    ctx.fill();
    if (e.hp < e.maxHp) {
      const bw = e.r * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(sx - bw / 2, sy - e.r - 8, bw, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(sx - bw / 2, sy - e.r - 8, bw * (e.hp / e.maxHp), 4);
    }
  }
}

function drawProjectiles() {
  for (const p of projs) {
    const { x: sx, y: sy } = toScreen(p.x, p.y);
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawGems() {
  for (const g of gems) {
    const { x: sx, y: sy } = toScreen(g.x, g.y);
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(sx, sy - g.r);
    ctx.lineTo(sx + g.r, sy);
    ctx.lineTo(sx, sy + g.r);
    ctx.lineTo(sx - g.r, sy);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ── Main loop ─────────────────────────────────────────────────────
function gameLoop(timestamp) {
  if (gameState !== 'playing') return;

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  gameTime += dt;

  // ── Update ──
  // Player movement
  const { dx, dy } = getMoveDir();
  P.x += dx * P.speed * dt;
  P.y += dy * P.speed * dt;
  if (P.invTimer > 0) P.invTimer -= dt;
  P.orbitAngle += dt * 2.5;

  updateCamera();

  // Spawn enemies
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    const count = Math.min(1 + Math.floor(gameTime / 30), 5);
    for (let i = 0; i < count; i++) spawnEnemy();
    spawnTimer = Math.max(1.5 - gameTime / 200, 0.3);
  }

  // Move enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const ddx = P.x - e.x;
    const ddy = P.y - e.y;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dist < 1) {
      if (P.invTimer <= 0) {
        P.hp -= e.dmg;
        P.invTimer = 0.5;
      }
      continue;
    }
    e.x += (ddx / dist) * e.spd * dt;
    e.y += (ddy / dist) * e.spd * dt;
  }

  // Cull far enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const ddx = e.x - P.x;
    const ddy = e.y - P.y;
    if (ddx * ddx + ddy * ddy > 1200 * 1200) enemies.splice(i, 1);
  }

  // Update projectiles
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) projs.splice(i, 1);
  }

  // Projectile-enemy collisions
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i];
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const ddx = p.x - e.x;
      const ddy = p.y - e.y;
      if (ddx * ddx + ddy * ddy < (p.r + e.r) * (p.r + e.r)) {
        e.hp -= p.dmg;
        projs.splice(i, 1);
        if (e.hp <= 0) {
          P.kills++;
          spawnGem(e.x, e.y, e.xpVal);
          enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  // Gems
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const ddx = P.x - g.x;
    const ddy = P.y - g.y;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dist < 100) {
      g.x += (ddx / dist) * 300 * dt;
      g.y += (ddy / dist) * 300 * dt;
    }
    if (dist < P.radius + g.r) {
      P.xp += g.val;
      gems.splice(i, 1);
    }
  }

  // Cull far gems
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const ddx = g.x - P.x;
    const ddy = g.y - P.y;
    if (ddx * ddx + ddy * ddy > 800 * 800) gems.splice(i, 1);
  }

  // Level up check
  if (P.xp >= P.xpToNext && !levelUpPending) {
    P.level++;
    P.xpToNext = Math.floor(20 * Math.pow(1.3, P.level - 1));
    levelUpPending = true;
    levelUpTimer = LEVEL_UP_TIMEOUT;
    showLevelUp();
    // Pause the loop while choosing
    return;
  }

  // Level-up timer countdown
  if (levelUpPending) {
    levelUpTimer -= dt;
    el('levelup-timer').textContent = Math.max(levelUpTimer, 0).toFixed(1) + 's';
    if (levelUpTimer <= 0) {
      const cards = document.querySelectorAll('.choice-card');
      if (cards.length > 0) cards[0].click();
    }
  }

  // Fire weapons
  P.wCd -= dt;
  if (P.wCd <= 0) {
    P.wCd = P.wRate;
    let nearest = null, nDist = Infinity;
    for (const e of enemies) {
      const d = (e.x - P.x) ** 2 + (e.y - P.y) ** 2;
      if (d < nDist) { nDist = d; nearest = e; }
    }
    for (let i = 0; i < P.orbitCount; i++) {
      if (nearest) {
        const a = Math.atan2(nearest.y - P.y, nearest.x - P.x);
        fireProjectile(P.x + Math.cos(a) * P.orbitRadius, P.y + Math.sin(a) * P.orbitRadius, a);
      } else {
        const a = P.orbitAngle + (Math.PI * 2 / P.orbitCount) * i;
        fireProjectile(P.x + Math.cos(a) * P.orbitRadius, P.y + Math.sin(a) * P.orbitRadius, a);
      }
    }
  }

  // Death check
  if (P.hp <= 0) {
    showGameOver();
    return;
  }

  // Win check
  if (gameTime >= WIN_TIME) {
    showWin();
    return;
  }

  // ── Render ──
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawGems();
  drawEnemies();
  drawProjectiles();
  drawPlayer();
  updateHud();

  animFrameId = requestAnimationFrame(gameLoop);
}

// ── Button bindings ───────────────────────────────────────────────
el('btn-play').addEventListener('click', startGame);
el('btn-start').addEventListener('click', startGame);
el('btn-pause').addEventListener('click', pauseGame);
el('btn-resume').addEventListener('click', resumeGame);
el('btn-quit').addEventListener('click', quitToMenu);
el('btn-restart').addEventListener('click', () => {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  startGame();
});
el('btn-retry').addEventListener('click', () => {
  startGame();
});

// ── Init ──────────────────────────────────────────────────────────
initInput();

// Draw initial background on canvas
drawBackground();

export { gameState };
