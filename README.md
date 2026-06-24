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

## Project Structure

```
├── index.html              # Entry point
├── styles.css              # Gothic desktop layout
├── src/
│   └── main.js             # Game entry (ES module)
├── assets/                  # Placeholder assets
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

### Target

- Desktop-first layout (1280×720)
- 60 FPS target
- Progressive enhancement

## License

This is a prototype for educational purposes. No copyrighted assets from Vampire Survivors are included. See [ASSETS.md](ASSETS.md) for asset licensing details.
