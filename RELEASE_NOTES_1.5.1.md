# Project Grim 1.5.1 — Automated Reliability Foundation

Based on the complete **1.5.0 Refinement** source.

## Changes made

1. **Automated test runner** — Use `npm test` or `RUN-TESTS.bat`. All individual tests run in isolated Node processes, with a 90-second per-test timeout and failure reporting. A quick smoke subset is available with `npm run test:quick`.
2. **Long-session simulation** — Tests the real formation, camera-fitting and native-card logic across **126 deterministic scenarios** (4, 10, and 16 combatants; desktop/phone viewports; Ground/Tactical/Top cameras; terrain changes; HP, statuses and active turns). It also checks that repeated Burning/Frozen animations do **not** upload full card textures.
3. **Release asset check** — Verifies that both public pages reference the active bundle, relative module imports resolve, all five audio files exist, and the GitHub uploader recognizes the correct asset version.
4. **Real local HTTP check** — Spawns Grim's `server.js`, requests the stage, DM, scripts, CSS and audio, validates MIME types, and sends invalid/sensitive-path requests to verify resilience.
5. **Prepared-scene Undo/Redo bug fix** — Applying a scene snapshot changes the environment *and* the stage scene ID/labels. Undo and Redo now restore them together, while regular environment edits continue to undo only environment changes. Combat HP, initiative, active turn and roster remain untouched.
6. **Local server hardening** — Malformed percent encoding now returns HTTP 400 instead of crashing the process; the local server only serves public HTML and `assets/` content (plus an optional favicon). Private files, tests, dotfiles and hidden configuration are not served. MP3 files are served with the proper `audio/mpeg` content type.
7. **Optional browser smoke runner** — `tests/browser-smoke-151.py` can open both pages, test cross-tab combat synchronization, switch presets, and capture screenshots into ignored `qa-reports/browser/`. Requires Python Playwright. This is separate from the dependency-free default suite.

## Preserved behavior

- Stage scene/combat modes, initiative order, real 3D cards and environmental occlusion.
- Burning, Frozen, damaged/shattered card finish effects and earlier performance optimizations.
- Continuous terrain, hill profiles, weather, day/night lighting and five ambience recordings.
- Ground/Tactical/Top camera modes and visibility safeguards.
- Viewer-local graphics quality settings, DM snapshots and Undo/Redo.
- Anonymous/no-login Firebase workflow and path-prompt GitHub uploader.

## Install and use

1. Extract the ZIP completely.
2. Optionally run `RUN-TESTS.bat` to verify the package on your PC.
3. Run `github.bat`, choose your repository root, review the changed files, confirm Git push, and optionally deploy Firebase Hosting.
4. The page header must say **RELIABILITY 1.5.1**.

## Important limitations

- Automated code and simulated Three.js tests are **not equivalent to real WebGL appearance or FPS measurements**.
- Local Chromium navigation was blocked in the build environment, so the browser screenshots and live WebGL visual check were **not verified** here.
- Live Firebase permission rules, real multi-device synchronization and deployed production hosting were **not tested**. The existing sync implementation was retained.
