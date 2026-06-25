# Plan: Issue #7 - Support different kinds of enemies

**Issue:** https://github.com/graywzc/vampire-survival/issues/7
**Branch:** `qwen/issue-7-enemy-variety`
**Status:** implemented

## Requirements

- Add multiple distinct enemy kinds to the playable prototype.
- Make enemy variety visible and mechanically meaningful.
- Keep spawn progression playable without external dependencies or copyrighted assets.

## Proposed Changes

- Expand the enemy definitions into a named roster.
- Add spawn progression so new enemy types enter as time advances.
- Add behavior hooks for simple variations such as drifting, charging, and splitting.
- Keep the existing Reaper pressure phase intact.

## Verification

- `node --check src/main.js src/game.js src/input.js`
- Static scan for the new enemy types and behavior hooks.
- Browser smoke test to ensure the game starts without console errors.

## Risks

- Balance may need longer playtesting after the behavior MVP lands.

## Progress

- [x] Plan authored
- [x] Implementation
- [x] Tests
- [x] Lead review
- [ ] PR merged / issue closed
