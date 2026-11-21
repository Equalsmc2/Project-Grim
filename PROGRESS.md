# Project Grim Reforge — Progress Log

Resume here. The full vision and milestone plan is in `docs/REFORGE_PLAN.md`.

## Current status
- **Phase:** Step 1 complete (inspection + plan). **Waiting for owner approval** before any implementation.
- **Branch:** `claude/intelligent-lovelace-0sw4s0`
- **Live code:** unchanged 1.5.8 (`assets/grim-158`). Existing suite: `node tools/run-tests.mjs` → 43/43 pass (2026-11-21).

## Key findings from inspection
- Legendary actions, dialogue/presentation overlays and chat do **not** exist in 1.5.8 (new features, not regressions).
- Tactical mode presentation is broken: the combat-info panel covers the board (screenshot-verified in Chromium/SwiftShader).
- Firebase writes the whole campaign (with base64 portraits) on every change.
- Root `app.js`, `styles.css`, `firebase-config.js`, `database.rules.json` belong to an unrelated project (MuseSink) and are unused by Grim.
- `assets/battlefield-118`, `grim-148`, `grim-149` are unused old builds.
- Environment: Chromium + SwiftShader WebGL works for screenshots; Java is available (Firebase emulator feasible); Firefox not preinstalled.

## Open questions for the owner
See the end of the plan summary message / `docs/REFORGE_PLAN.md` §6 and the approval questions.

## Milestones
| # | Status |
|---|---|
| M0 Foundations | not started |
| M1 Sync v2 | not started |
| M2 World renderer | not started |
| M3 Cards & camera | not started |
| M4 Tactical unification | not started |
| M5 GM command deck | not started |
| M6 Session features | not started |
| M7 Stage HUD + player desk | not started |
| M8 Hardening & release | not started |
