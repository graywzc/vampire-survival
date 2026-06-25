# Vampire Survivors Prototype

A quick-playable browser game inspired by Vampire Survivors, built with vanilla HTML, CSS, and JavaScript.

## Quick Start

Open `index.html` in a modern browser (Chrome, Firefox, Safari, Edge). No build step required.

```bash
# Optional: serve via a local server
npx serve .
# or
python3 -m http.server 8000
```

## Controls

- **WASD** / **Arrow Keys** — Move character
- **Mouse** — (reserved for future targeting)

## Weapon System

- Start with **Magic Bolt**, a nearest-enemy projectile weapon.
- Level-up choices can unlock **Knife** and **Orbit** weapons.
- Active weapons can level up independently, improving cooldowns, volleys, pierce, or shard count.
- General upgrades still improve movement, health, pickup radius, projectile speed, and all weapon damage.

## Enemy Variety

- **Skeletons** form the baseline horde.
- **Bats** weave side to side while closing distance.
- **Slimes** split into smaller slimes when defeated.
- **Wraiths** drift around the player approach vector.
- **Brutes** alternate between slow movement and short charge bursts.

## Terrain Variety

- **Grave Soil** is the neutral baseline terrain.
- **Old Road** and **Moss** give small movement boosts.
- **Bog** slows player movement.
- **Cursed Ground** slightly slows and damages the player over time.

## Project Structure

```
├── index.html              # Entry point
├── styles.css              # Gothic desktop layout
├── assets/                  # Sprite assets (SVG)
│   ├── manifest.json       # Asset manifest (logical name → path)
│   ├── player_hunter.svg   # Player sprite
│   ├── enemy_bat.svg       # Bat enemy
│   ├── enemy_skeleton.svg  # Skeleton enemy
│   ├── enemy_slime.svg     # Slime enemy
│   ├── xp_gem.svg          # XP collectible
│   ├── weapon_magic_bolt.svg  # Magic bolt projectile
│   ├── weapon_knife.svg    # Knife projectile
│   ├── tile_graveyard_floor.svg  # Floor tile
│   ├── prop_tombstone.svg  # Tombstone prop
│   └── placeholder.png     # Build placeholder
├── IMPLEMENTATION_PLAN.md  # Phased development plan
└── ASSETS.md               # Asset manifest & licensing
```

## Development

This project is structured for incremental agent-driven development. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the phased roadmap.

### Tech Stack

- Vanilla HTML5 Canvas
- CSS3 with custom properties
- ES Modules (no bundler)
- No external dependencies

### DOM Contract

The following IDs are reserved for gameplay agents. Do not rename or remove them:

**Canvas**
- `game` — main rendering canvas (1280×720)

**HUD**
- `hud-time` — elapsed timer display
- `hud-level-val` — current level number
- `hud-kills-val` — enemy kill count
- `hud-health-bar` — health bar fill element
- `hud-health-val` — health numeric display
- `hud-xp-bar` — XP bar fill element
- `hud-xp-val` — XP numeric display
- `hud-weapons-list` — active weapons container

**Overlays**
- `overlay-start` — start screen
- `overlay-pause` — pause screen
- `overlay-levelup` — level-up choice screen
- `overlay-gameover` — game-over screen

**Overlay Content**
- `levelup-choices` — dynamic upgrade choice grid
- `levelup-timer` — level-up countdown display
- `go-time` / `go-level` / `go-kills` — game-over stats

**Buttons**
- `btn-play` — start screen play button
- `btn-start` — controls bar start button
- `btn-pause` — controls bar pause button
- `btn-restart` — controls bar restart button
- `btn-resume` — pause overlay resume button
- `btn-quit` — pause overlay quit button
- `btn-retry` — game-over retry button

### Target

- Desktop-first layout (1280×720)
- 60 FPS target
- Progressive enhancement

## License

This is a prototype for educational purposes. No copyrighted assets from Vampire Survivors are included. See [ASSETS.md](ASSETS.md) for asset licensing details.
