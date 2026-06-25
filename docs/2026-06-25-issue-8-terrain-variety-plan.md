# Plan: Issue #8 - Support different kinds of terrain

**Issue:** https://github.com/graywzc/vampire-survival/issues/8
**Branch:** `qwen/issue-8-terrain-variety`
**Status:** implemented

## Requirements

- Add multiple different terrain kinds to the playable prototype.
- Make terrain visible and lightly mechanical.
- Preserve the simple Canvas architecture and overall playability.

## Proposed Changes

- Generate deterministic terrain patches across the world.
- Render terrain under the grid so the playfield has varied regions.
- Apply simple player effects for terrain such as movement changes and light hazard damage.
- Show the current terrain name in the canvas HUD.

## Verification

- `node --check src/main.js src/game.js src/input.js`
- Static scan for terrain definitions, terrain lookup, drawing, and movement effects.
- Browser smoke test to ensure the game starts without console errors.

## Risks

- Terrain balance may need longer playtesting, especially hazard damage.

## Progress

- [x] Plan authored
- [x] Implementation
- [x] Tests
- [x] Lead review
- [ ] PR merged / issue closed
