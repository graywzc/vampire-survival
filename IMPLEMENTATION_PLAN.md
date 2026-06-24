# Implementation Plan — Vampire Survivors-Style Browser Prototype

## Overview

This document outlines the phased implementation plan for a quick-playable vanilla HTML game inspired by Vampire Survivors. Each phase is scoped for independent agent handoff.

## Phase 1 — Project Scaffold (Done ✅)

**Branch:** `qwen/scaffold`

- [x] `index.html` with canvas, HUD, overlays
- [x] `styles.css` with gothic desktop layout
- [x] `README.md` with setup instructions and DOM contract
- [x] `ASSETS.md` with asset manifest and licensing
- [x] Placeholder asset (1×1 PNG)

**Deliverables:** `index.html`, `styles.css`, `README.md`, `ASSETS.md`, `assets/placeholder.png`

**DOM IDs provided for later phases:**

| ID | Purpose |
|----|---------|
| `game` | Main canvas element |
| `hud-time` | Timer display |
| `hud-level-val` | Level number |
| `hud-kills-val` | Kill counter |
| `hud-health-bar` | Health bar fill |
| `hud-health-val` | Health value |
| `hud-xp-bar` | XP bar fill |
| `hud-xp-val` | XP value |
| `hud-weapons-list` | Weapons container |
| `overlay-start` | Start screen overlay |
| `overlay-pause` | Pause overlay |
| `overlay-levelup` | Level-up overlay |
| `overlay-gameover` | Game-over overlay |
| `levelup-choices` | Upgrade choice grid |
| `levelup-timer` | Level-up countdown |
| `go-time` | Game-over time stat |
| `go-level` | Game-over level stat |
| `go-kills` | Game-over kills stat |
| `btn-play` | Start screen play button |
| `btn-start` | Controls bar start |
| `btn-pause` | Controls bar pause |
| `btn-restart` | Controls bar restart |
| `btn-resume` | Pause resume button |
| `btn-quit` | Pause quit button |
| `btn-retry` | Game-over retry button |

## Phase 2 — Core Game Loop & Player

**Suggested branch:** `feat/game-loop`

- [ ] Game loop via `requestAnimationFrame` with fixed-tick update + render separation
- [ ] Player entity: position, velocity, stats (HP, maxHP, speed, XP, level)
- [ ] WASD / Arrow key input handling with normalized diagonal movement
- [ ] Camera system: canvas translation to follow player
- [ ] Simple player sprite rendering (shape or placeholder)
- [ ] Collision detection: player vs world bounds

## Phase 3 — Enemy Spawning & Waves

**Suggested branch:** `feat/enemies`

- [ ] Enemy types: basic walker, fast runner, tank
- [ ] Wave system: increasing spawn rate over time
- [ ] Enemy AI: simple chase toward player
- [ ] Enemy rendering with distinct shapes/colors
- [ ] Enemy death: disappear on HP 0, drop XP orb
- [ ] Collision: enemy vs player (damage), enemy vs weapons

## Phase 4 — Weapons & XP System

**Suggested branch:** `feat/weapons-xp`

- [ ] XP orb entities: attracted to player on proximity
- [ ] Level-up trigger: overlay with 2–3 weapon/upgrade choices
- [ ] Weapon types (start simple):
  - Magic Wand: fires at nearest enemy
  - Garlic: damage aura around player
  - Lightning: random strikes on nearby enemies
- [ ] Weapon cooldowns, damage values, upgrade tiers
- [ ] HUD updates: XP bar, level, kill count

## Phase 5 — HUD & UI Polish

**Suggested branch:** `feat/hud-ui`

- [ ] Real-time HUD: timer, health bar, XP bar, level, kill count
- [ ] Pause overlay with resume/restart buttons
- [ ] Game over overlay with final stats and restart
- [ ] Level-up choice overlay with timer (5s to pick)
- [ ] Smooth HUD animations (bar fills, number transitions)

## Phase 6 — World & Polish

**Suggested branch:** `feat/world-polish`

- [ ] Procedural tile background (scrolling pattern)
- [ ] Particle effects: damage numbers, death explosions
- [ ] Screen shake on damage
- [ ] Save/restore progress via `localStorage`
- [ ] Performance: entity pooling, offscreen culling
- [ ] Accessibility: keyboard-only play, reduced motion option

## Architecture

```
project-root/
├── index.html            # Entry point, loads styles + main.js
├── styles.css            # All styling (HUD, overlays, gothic theme)
├── src/
│   └── main.js           # Game entry, loop, entity management (Phase 2+)
├── assets/
│   └── placeholder.png   # 1×1 transparent PNG
├── IMPLEMENTATION_PLAN.md
├── README.md
└── ASSETS.md
```

## Tech Constraints

- Vanilla HTML/CSS/JS only — no frameworks
- ES modules for `src/main.js`
- Single canvas (`#game`) for rendering
- Desktop-first (1280×720 target)
- No external dependencies
