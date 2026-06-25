# Plan: Issue #6 - Support different weapons

**Issue:** https://github.com/graywzc/vampire-survival/issues/6
**Branch:** `qwen/issue-6-weapon-system`
**Status:** implemented

## Requirements

- Add multiple distinct weapon types to the playable prototype.
- Support weapon leveling through the existing level-up choice flow.
- Keep the MVP playable without external dependencies or copyrighted assets.

## Proposed Changes

- Replace hard-coded bolt/orbit timers with active weapon state and reusable weapon definitions.
- Start the player with Magic Bolt.
- Add unlockable Knife and Orbit weapons with distinct targeting/firing behavior.
- Add weapon-specific level upgrades alongside general stat upgrades.
- Update the HUD to show active weapon names and levels.

## Verification

- `node --check src/main.js src/game.js src/input.js`
- Static scan for expected weapon definitions and HUD fields.

## Risks

- Balance may need live playtesting after the MVP lands.
- The single-file game loop remains compact for the prototype but will become harder to maintain as more systems are added.

## Progress

- [x] Plan authored
- [x] Implementation
- [x] Tests
- [x] Lead review
- [ ] PR merged / issue closed
