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
let gameState = 'menu'; // menu | playing | paused | levelup | reaper | gameover
let gameTime = 0;
let lastTime = 0;
let animFrameId = null;
const WIN_TIME = 300;    // 5 minutes — triggers Reaper pressure
const REAPER_TIME = 420; // 7 minutes — final win condition

// ── Caps ──────────────────────────────────────────────────────────
const MAX_ENEMIES = 300;
const MAX_PROJS   = 120;
const MAX_GEMS    = 500;

// ── Player ────────────────────────────────────────────────────────
const P = {
  x: 0, y: 0, radius: 12, speed: 180,
  hp: 150, maxHp: 150, level: 1,
  xp: 0, xpToNext: 12, kills: 0,
  invTimer: 0,
  damage: 0,
  cooldownMult: 1,
  projSpeed: 400,
  orbitAngle: 0,
  pickupRadius: 100,
  weapons: {},
};

function resetPlayer() {
  P.x = 0; P.y = 0; P.speed = 180;
  P.hp = 150; P.maxHp = 150; P.level = 1;
  P.xp = 0; P.xpToNext = 12; P.kills = 0;
  P.invTimer = 0; P.damage = 0; P.cooldownMult = 1;
  P.projSpeed = 400;
  P.orbitAngle = 0;
  P.pickupRadius = 100;
  P.weapons = {};
  currentTerrainId = 'graveSoil';
  unlockWeapon('magicBolt');
}

// ── Enemies ───────────────────────────────────────────────────────
let enemies = [];
let spawnTimer = 0;

const ETYPES = {
  skeleton: { name: 'Skeleton', r: 10, spd: 50, hp: 16, dmg: 5, color: '#ef4444', xp: 4, behavior: 'chase' },
  bat:      { name: 'Bat', r: 8,  spd: 95, hp: 10, dmg: 4, color: '#f97316', xp: 3, behavior: 'zigzag' },
  slime:    { name: 'Slime', r: 12, spd: 38, hp: 24, dmg: 6, color: '#22c55e', xp: 5, behavior: 'chase', split: 'miniSlime' },
  miniSlime:{ name: 'Mini Slime', r: 7, spd: 64, hp: 8, dmg: 3, color: '#86efac', xp: 1, behavior: 'chase' },
  brute:    { name: 'Brute', r: 17, spd: 34, hp: 56, dmg: 11, color: '#a855f7', xp: 8, behavior: 'charge' },
  wraith:   { name: 'Wraith', r: 11, spd: 62, hp: 28, dmg: 8, color: '#38bdf8', xp: 7, behavior: 'drift' },
  reaper:   { name: 'Reaper', r: 14, spd: 74, hp: 85, dmg: 15, color: '#000000', xp: 10, behavior: 'drift' },
};

function chooseEnemyType() {
  if (gameTime >= WIN_TIME && Math.random() < 0.25) return 'reaper';
  const pool = [{ type: 'skeleton', weight: 8 }];
  if (gameTime > 25) pool.push({ type: 'bat', weight: 4 });
  if (gameTime > 55) pool.push({ type: 'slime', weight: 4 });
  if (gameTime > 100) pool.push({ type: 'wraith', weight: 3 });
  if (gameTime > 145) pool.push({ type: 'brute', weight: 3 });

  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return 'skeleton';
}

function createEnemy(type, x, y, hpScale = 1) {
  const t = ETYPES[type];
  const hm = (1 + gameTime / 120) * hpScale;
  return {
    type,
    name: t.name,
    behavior: t.behavior,
    split: t.split,
    x, y,
    r: t.r,
    spd: t.spd * (1 + gameTime / 300),
    hp: t.hp * hm,
    maxHp: t.hp * hm,
    dmg: t.dmg,
    color: t.color,
    xpVal: t.xp,
    age: Math.random() * Math.PI * 2,
    phase: Math.random() * Math.PI * 2,
  };
}

function spawnEnemy() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 800 + Math.random() * 200;
  enemies.push(createEnemy(
    chooseEnemyType(),
    P.x + Math.cos(angle) * dist,
    P.y + Math.sin(angle) * dist
  ));
}

function spawnSplitEnemies(e) {
  if (!e.split || enemies.length >= MAX_ENEMIES - 1) return;
  for (let i = 0; i < 2; i++) {
    const angle = e.phase + Math.PI * i;
    enemies.push(createEnemy(
      e.split,
      e.x + Math.cos(angle) * e.r,
      e.y + Math.sin(angle) * e.r,
      0.75
    ));
  }
}

// ── Projectiles ───────────────────────────────────────────────────
let projs = [];

function fireProjectile(x, y, angle, opts = {}) {
  if (projs.length >= MAX_PROJS) return;
  const speed = opts.speed || P.projSpeed;
  projs.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: opts.r || 4,
    dmg: opts.dmg || 10,
    life: opts.life || 2.5,
    pierce: opts.pierce || 1,
    color: opts.color || '#22d3ee',
    weaponId: opts.weaponId || 'unknown',
  });
}

function findNearestEnemy(x = P.x, y = P.y) {
  let nearest = null;
  let nDist = Infinity;
  for (const e of enemies) {
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < nDist) {
      nDist = d;
      nearest = e;
    }
  }
  return nearest;
}

function getWeaponLevel(id) {
  return P.weapons[id]?.level || 0;
}

function getWeaponDamage(id) {
  const def = WEAPONS[id];
  const level = getWeaponLevel(id);
  return def.baseDamage + (level - 1) * def.damageStep + P.damage;
}

function unlockWeapon(id) {
  if (P.weapons[id]) return false;
  P.weapons[id] = { level: 1, cd: 0 };
  return true;
}

function upgradeWeapon(id) {
  const weapon = P.weapons[id];
  if (!weapon) return unlockWeapon(id);
  const def = WEAPONS[id];
  if (weapon.level >= def.maxLevel) return false;
  weapon.level++;
  weapon.cd = Math.min(weapon.cd, getWeaponRate(id));
  return true;
}

function getWeaponRate(id) {
  return WEAPONS[id].rate(getWeaponLevel(id)) * P.cooldownMult;
}

function fireSpread(originX, originY, angle, count, spread, opts) {
  const start = angle - spread * (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    fireProjectile(originX, originY, start + spread * i, opts);
  }
}

const WEAPONS = {
  magicBolt: {
    name: 'Magic Bolt',
    icon: 'B',
    color: '#fbbf24',
    baseDamage: 10,
    damageStep: 4,
    maxLevel: 5,
    rate: (level) => Math.max(1.2 - level * 0.12, 0.45),
    desc: (level) => `Level ${level}: fires ${1 + Math.floor((level - 1) / 2)} seeking bolt${level >= 3 ? 's' : ''}`,
    fire: (weapon) => {
      const nearest = findNearestEnemy();
      if (!nearest) return;
      const level = weapon.level;
      const angle = Math.atan2(nearest.y - P.y, nearest.x - P.x);
      fireSpread(P.x, P.y, angle, 1 + Math.floor((level - 1) / 2), 0.18, {
        dmg: getWeaponDamage('magicBolt'),
        color: WEAPONS.magicBolt.color,
        life: 2.5,
        weaponId: 'magicBolt',
      });
    },
  },
  knife: {
    name: 'Knife',
    icon: 'K',
    color: '#e5e7eb',
    baseDamage: 7,
    damageStep: 3,
    maxLevel: 5,
    rate: (level) => Math.max(0.9 - level * 0.08, 0.35),
    desc: (level) => `Level ${level}: quick volley with ${1 + Math.floor(level / 2)} pierce`,
    fire: (weapon) => {
      const nearest = findNearestEnemy();
      if (!nearest) return;
      const level = weapon.level;
      const angle = Math.atan2(nearest.y - P.y, nearest.x - P.x);
      fireSpread(P.x, P.y, angle, Math.min(level + 1, 5), 0.1, {
        dmg: getWeaponDamage('knife'),
        color: WEAPONS.knife.color,
        speed: P.projSpeed * 1.35,
        life: 1.7,
        pierce: 1 + Math.floor(level / 2),
        weaponId: 'knife',
      });
    },
  },
  orbit: {
    name: 'Orbit',
    icon: 'O',
    color: '#22d3ee',
    baseDamage: 8,
    damageStep: 3,
    maxLevel: 5,
    rate: (level) => Math.max(1.0 - level * 0.08, 0.45),
    desc: (level) => `Level ${level}: launches ${level + 1} rotating shards`,
    fire: (weapon) => {
      const level = weapon.level;
      const count = level + 1;
      const radius = 46 + level * 8;
      for (let i = 0; i < count; i++) {
        const a = P.orbitAngle + (Math.PI * 2 / count) * i;
        const ox = P.x + Math.cos(a) * radius;
        const oy = P.y + Math.sin(a) * radius;
        fireProjectile(ox, oy, a, {
          dmg: getWeaponDamage('orbit'),
          color: WEAPONS.orbit.color,
          speed: P.projSpeed * 0.75,
          life: 1.4,
          pierce: 2,
          weaponId: 'orbit',
        });
      }
    },
  },
};

// ── XP Gems ───────────────────────────────────────────────────────
let gems = [];
let levelUpPending = false;
let levelUpTimer = 0;
let levelUpPrevState = 'playing'; // remembers playing|reaper before levelup pause
let pausePrevState = 'playing';    // remembers playing|reaper before pause
const LEVEL_UP_TIMEOUT = 5;

const BASE_UPGRADES = [
  { id: 'damage', name: 'Damage Up', desc: 'Increase weapon damage by 5',
    apply: () => { P.damage += 5; } },
  { id: 'speed', name: 'Speed Up', desc: 'Move 15% faster',
    apply: () => { P.speed *= 1.15; } },
  { id: 'firerate', name: 'Fire Rate', desc: 'Reduce all cooldowns by 15%',
    apply: () => {
      P.cooldownMult *= 0.85;
      for (const weapon of Object.values(P.weapons)) weapon.cd *= 0.85;
    } },
  { id: 'health', name: 'Heal', desc: 'Restore 40 HP',
    apply: () => { P.hp = Math.min(P.hp + 40, P.maxHp); } },
  { id: 'maxhealth', name: 'Max HP Up', desc: 'Increase max HP by 25 and heal 25',
    apply: () => { P.maxHp += 25; P.hp += 25; } },
  { id: 'pickupradius', name: 'Pickup Radius', desc: 'Increase gem magnet range by 30',
    apply: () => { P.pickupRadius += 30; } },
  { id: 'projspeed', name: 'Projectile Speed', desc: 'Projectiles fly 20% faster',
    apply: () => { P.projSpeed *= 1.2; } },
];

function getWeaponUpgradeChoices() {
  const choices = [];
  for (const [id, def] of Object.entries(WEAPONS)) {
    const level = getWeaponLevel(id);
    if (level === 0) {
      choices.push({
        id: 'unlock-' + id,
        name: 'Unlock ' + def.name,
        desc: def.desc(1),
        apply: () => { unlockWeapon(id); },
      });
      continue;
    }
    if (level < def.maxLevel) {
      choices.push({
        id: 'weapon-' + id,
        name: def.name + ' Lv. ' + (level + 1),
        desc: def.desc(level + 1),
        apply: () => { upgradeWeapon(id); },
      });
    }
  }
  return choices;
}

function getLevelUpChoices() {
  const choices = [...BASE_UPGRADES, ...getWeaponUpgradeChoices()];
  return choices.sort(() => Math.random() - 0.5).slice(0, 3);
}

function spawnGem(x, y, val) {
  if (gems.length >= MAX_GEMS) return;
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

// ── Terrain ───────────────────────────────────────────────────────
const TERRAIN_CELL = 320;
let currentTerrainId = 'graveSoil';

const TERRAINS = {
  graveSoil: { name: 'Grave Soil', color: 'rgba(49, 46, 80, 0.22)', speed: 1, damage: 0 },
  oldRoad:   { name: 'Old Road', color: 'rgba(148, 163, 184, 0.18)', speed: 1.12, damage: 0 },
  moss:      { name: 'Moss', color: 'rgba(34, 197, 94, 0.16)', speed: 1.04, damage: 0 },
  bog:       { name: 'Bog', color: 'rgba(20, 83, 45, 0.28)', speed: 0.72, damage: 0 },
  cursed:    { name: 'Cursed Ground', color: 'rgba(127, 29, 29, 0.28)', speed: 0.92, damage: 2 },
};

function hashCell(cx, cy) {
  const h = Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

function getTerrainId(wx, wy) {
  const cx = Math.floor(wx / TERRAIN_CELL);
  const cy = Math.floor(wy / TERRAIN_CELL);
  const h = hashCell(cx, cy);
  if (h > 0.86) return 'cursed';
  if (h > 0.72) return 'bog';
  if (h > 0.55) return 'oldRoad';
  if (h > 0.38) return 'moss';
  return 'graveSoil';
}

function getCurrentTerrain() {
  currentTerrainId = getTerrainId(P.x, P.y);
  return TERRAINS[currentTerrainId];
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
  for (const [id, weapon] of Object.entries(P.weapons)) {
    const def = WEAPONS[id];
    const s = document.createElement('div');
    s.className = 'weapon-slot';
    s.textContent = def.icon + weapon.level;
    s.title = def.name + ' Lv. ' + weapon.level;
    wl.appendChild(s);
  }
}

// ── Level-up UI ───────────────────────────────────────────────────
function showLevelUp() {
  const container = el('levelup-choices');
  container.innerHTML = '';
  const choices = getLevelUpChoices();
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
  // Resume to the state we were in before levelup (playing or reaper)
  gameState = levelUpPrevState;
  lastTime = performance.now();
  animFrameId = requestAnimationFrame(gameLoop);
}

// ── Reaper pressure visual ────────────────────────────────────────
let reaperTriggered = false;

function triggerReaper() {
  reaperTriggered = true;
  // Brief visual flash
  ctx.fillStyle = 'rgba(80, 0, 0, 0.4)';
  ctx.fillRect(0, 0, W, H);
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
  levelUpPrevState = 'playing';
  pausePrevState = 'playing';
  reaperTriggered = false;
  gameTime = 0;
  lastTime = performance.now();
  gameState = 'playing';
  hideAllOverlays();
  el('overlay-gameover').querySelector('h2').textContent = 'Game Over';
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (gameState !== 'playing' && gameState !== 'reaper') return;
  pausePrevState = gameState; // save playing|reaper
  gameState = 'paused';
  el('overlay-pause').classList.remove('hidden');
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = pausePrevState; // restore playing|reaper
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
  // Dark ground with Reaper tint
  if (gameState === 'reaper') {
    ctx.fillStyle = '#1a0a0a';
  } else {
    ctx.fillStyle = '#1a1a2e';
  }
  ctx.fillRect(0, 0, W, H);

  const tcx = Math.floor(camX / TERRAIN_CELL) * TERRAIN_CELL;
  const tcy = Math.floor(camY / TERRAIN_CELL) * TERRAIN_CELL;
  for (let x = tcx; x < camX + W + TERRAIN_CELL; x += TERRAIN_CELL) {
    for (let y = tcy; y < camY + H + TERRAIN_CELL; y += TERRAIN_CELL) {
      const terrain = TERRAINS[getTerrainId(x + 1, y + 1)];
      ctx.fillStyle = terrain.color;
      ctx.fillRect(x - camX, y - camY, TERRAIN_CELL, TERRAIN_CELL);
    }
  }

  ctx.strokeStyle = gameState === 'reaper'
    ? 'rgba(100, 20, 20, 0.4)'
    : 'rgba(60, 40, 80, 0.4)';
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

  ctx.fillStyle = gameState === 'reaper'
    ? 'rgba(60, 10, 10, 0.3)'
    : 'rgba(30, 20, 50, 0.3)';
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

  // Reaper vignette
  if (gameState === 'reaper') {
    const grad = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(80,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Reaper countdown text
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    const remaining = Math.max(0, REAPER_TIME - gameTime);
    ctx.fillText('[REAPER] ' + fmtTime(remaining) + ' remaining', W / 2, H - 60);
    ctx.textAlign = 'start';
  }

  const terrain = TERRAINS[currentTerrainId];
  ctx.fillStyle = terrain.damage > 0 ? '#fca5a5' : '#cbd5e1';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Terrain: ' + terrain.name, 18, H - 28);
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
    // Reaper enemies get a skull outline
    if (e.color === '#000000') {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (e.behavior === 'zigzag') {
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - e.r, sy);
      ctx.lineTo(sx + e.r, sy);
      ctx.stroke();
    }
    if (e.behavior === 'charge') {
      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - e.r * 0.7, sy - e.r * 0.7, e.r * 1.4, e.r * 1.4);
    }
    if (e.behavior === 'drift') {
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, e.r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
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
  // Level-up state: only update timer, don't advance game
  if (gameState === 'levelup') {
    levelUpTimer -= (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    el('levelup-timer').textContent = Math.max(levelUpTimer, 0).toFixed(1) + 's';
    if (levelUpTimer <= 0) {
      // Auto-pick first card
      const cards = document.querySelectorAll('.choice-card');
      if (cards.length > 0) cards[0].click();
    }
    // Still render the scene frozen
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawGems();
    drawEnemies();
    drawProjectiles();
    drawPlayer();
    animFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  if (gameState !== 'playing' && gameState !== 'reaper') return;

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  gameTime += dt;

  // ── Reaper pressure transition ──
  if (gameTime >= WIN_TIME && !reaperTriggered) {
    triggerReaper();
    gameState = 'reaper';
  }

  // ── Update ──
  // Player movement
  const { dx, dy } = getMoveDir();
  const terrain = getCurrentTerrain();
  P.x += dx * P.speed * terrain.speed * dt;
  P.y += dy * P.speed * terrain.speed * dt;
  if (terrain.damage > 0) {
    P.hp -= terrain.damage * dt;
  }
  if (P.invTimer > 0) P.invTimer -= dt;
  P.orbitAngle += dt * 2.5;

  updateCamera();

  // Spawn enemies (faster during Reaper)
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    const reaperMult = gameState === 'reaper' ? 2 : 1;
    const count = Math.min(1 + Math.floor(gameTime / 30), 5) * reaperMult;
    for (let i = 0; i < count && enemies.length < MAX_ENEMIES; i++) spawnEnemy();
    spawnTimer = Math.max(1.5 - gameTime / 200, 0.3) / reaperMult;
  }

  // Move enemies + contact damage (proper circle overlap)
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.age += dt;
    const ddx = P.x - e.x;
    const ddy = P.y - e.y;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    const overlapDist = P.radius + e.r;
    if (dist < overlapDist) {
      if (P.invTimer <= 0) {
        P.hp -= e.dmg;
        P.invTimer = 0.75;
      }
      continue;
    }
    let moveX = ddx / dist;
    let moveY = ddy / dist;
    let speed = e.spd;
    if (e.behavior === 'zigzag' || e.behavior === 'drift') {
      const sway = Math.sin(e.age * (e.behavior === 'zigzag' ? 7 : 2.5) + e.phase);
      const amount = e.behavior === 'zigzag' ? 0.55 : 0.32;
      moveX += (-ddy / dist) * sway * amount;
      moveY += (ddx / dist) * sway * amount;
    }
    if (e.behavior === 'charge') {
      speed *= Math.sin(e.age * 2.8 + e.phase) > 0.55 ? 1.9 : 0.72;
    }
    const mag = Math.sqrt(moveX * moveX + moveY * moveY) || 1;
    e.x += (moveX / mag) * speed * dt;
    e.y += (moveY / mag) * speed * dt;
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
        p.pierce--;
        if (e.hp <= 0) {
          P.kills++;
          spawnGem(e.x, e.y, e.xpVal);
          spawnSplitEnemies(e);
          enemies.splice(j, 1);
        }
        if (p.pierce <= 0) projs.splice(i, 1);
        break;
      }
    }
  }

  // Gems — collect first (avoids div-by-zero in magnet when dist==0)
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const ddx = P.x - g.x;
    const ddy = P.y - g.y;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dist < P.radius + g.r) {
      P.xp += g.val;
      gems.splice(i, 1);
      continue;
    }
    if (dist < P.pickupRadius && dist > 0.1) {
      g.x += (ddx / dist) * 300 * dt;
      g.y += (ddy / dist) * 300 * dt;
    }
  }

  // Cull far gems
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const ddx = g.x - P.x;
    const ddy = g.y - P.y;
    if (ddx * ddx + ddy * ddy > 800 * 800) gems.splice(i, 1);
  }

  // Level up check — pause into levelup state
  if (P.xp >= P.xpToNext && !levelUpPending) {
    P.level++;
    P.xpToNext = Math.floor(20 * Math.pow(1.3, P.level - 1));
    levelUpPending = true;
    levelUpTimer = LEVEL_UP_TIMEOUT;
    showLevelUp();
    levelUpPrevState = gameState; // save playing|reaper before pausing
    gameState = 'levelup';
    lastTime = performance.now();
    animFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  // Fire each active weapon on its own cooldown.
  for (const [id, weapon] of Object.entries(P.weapons)) {
    weapon.cd -= dt;
    if (weapon.cd <= 0) {
      WEAPONS[id].fire(weapon);
      weapon.cd = getWeaponRate(id);
    }
  }

  // Death check
  if (P.hp <= 0) {
    showGameOver();
    return;
  }

  // Win check (survive until REAPER_TIME)
  if (gameTime >= REAPER_TIME) {
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
