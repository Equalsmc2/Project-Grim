# Project Grim Reforge — progress log

The plan is in `docs/REFORGE_PLAN.md`, the outcome in `docs/REPORT-2.0.md`.

## Status: 2.0.0 feature-complete, awaiting owner hardware testing
- **Branch:** `claude/intelligent-lovelace-0sw4s0`. Not merged, and production is not touched.
- **Fallback:** tag `legacy-1.5.8` and `/legacy/*.html`.
- **Releases:** `RELEASES/Project-Grim-2.0.0.zip` (full) and `-website-only.zip`. Rebuild with `node tools/package-release.mjs`.

| Milestone | Status |
|---|---|
| M0 Foundations: legacy preserved, cleanup, v2 core, undo/redo | done |
| M1 Sync v2: per-section Firebase, inbox, chat path, emulator tests | done (18/18) |
| M2 World renderer: terrain, sky, fog, weather, props | done |
| M3 Cards, formation, camera director | done |
| M4 Tactical in the same world: grid on terrain, map props, picking/painting/dragging | done |
| M5 GM command deck | done |
| M6 Overlays, chat, resources, music/ambience | done |
| M7 TV stage and player desk | done |
| M8 Tests, CI, docs, release, uploader | done; Firefox runs in CI only |

## How to resume
- **Unit tests:** `node tools/run-tests.mjs`.
- **Browser tests:** `node tests/v2/e2e/ui.e2e.mjs`.
- **Sync tests:** `FIREBASE_BIN=... FIREBASE_SDK_DIR=... node tests/v2/e2e/sync.e2e.mjs`. Needs Java, `firebase-tools` and the `firebase@10.14.1` npm package for the SDK files.
- **Local server:** `GRIM_TEST=1 node server.js` also serves `tests/v2/harness/world.html`, a bare 3D world for visual checks driven through `window.store`.
- **Debug hooks:** `window.__grim.store` (and `.world` on the TV) exist on every page.

## Architecture notes for the next session
- Every change is a command in `src/core/commands.js`. Add new behaviour there with its `sections` list; undo, sync and logging follow automatically.
- `VOLATILE` sections (`log`, `chat`, `camera`, `cursors`, `music`) are excluded from undo.
- Firebase room layout: `grim/rooms/{room}/{dmUid,mode,sceneId,schema,rev,s/<section>}`. The root keys are required by the deployed rules' `.validate`.
- The world API is in `src/stage/world.js` (`setCampaign`, `setTool`, `setSelected`, `cardRects`, `stats`).

## Open ideas, if the owner wants more
- Imported glTF scenery packs, decals, light sources placed on the map.
- Per-token facing and auras or areas on the tactical grid.
- Automatic end-of-turn reminders (Frightened, persistent damage), offered as prompts rather than enforced rules.
