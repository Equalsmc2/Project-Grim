# Project Grim 1.4.9 — Test Report

Automated regression suite: **17 `.mjs` tests plus the legacy state test** passed, including the new `card-visibility-149.test.mjs` tests for visible Burning strokes, stable portrait-only fractures, and roster-aware zoom constraints. Run the legacy state test with `node --experimental-vm-modules tests/state.test.cjs`.

Also checked JavaScript syntax for all first-party modules. Rendered all six card finishes with a local Skia Canvas renderer and visually inspected the composited result: clean, Burning, Frozen, light wear, critical damage, and 0 HP.

**Browser/WebGL limitation:** Chromium refused local and localhost navigation (`ERR_BLOCKED_BY_ADMINISTRATOR`). Consequently, live WebGL FPS, 3D projection appearance and on-device ambience/Firebase interactions were not verified in a browser. The original 1.4.8 combat/environment tests still pass, and a static card preview is provided at `tests/card-visual-preview.html` for convenient in-browser QA.

Production files: `assets/grim-1412/` is the only active JavaScript asset bundle. Existing uploaded MP3s remain under `assets/audio/`.
