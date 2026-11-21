# Project Grim 1.5.6 — Visual Regression Foundation

This release continues the "Once More" stabilization series from 1.5.5. **It does not intentionally redesign the cards, alter camera behavior, or change gameplay or saved campaign data.** It introduces a reproducible visual test layer for future releases.

## Added

- **Six pinned Chromium screenshot fixtures** in `tests/visual-baselines/`:
  1. Desktop DM overview (1440 × 900)
  2. Tablet DM environment controls (768 × 860)
  3. Mobile DM combat controls (390 × 844)
  4. Desktop stage scene layout (1440 × 900)
  5. Mobile stage combat layout with test card art (390 × 844)
  6. Card finish comparison, including clean, burning, frozen, worn, critical and shattered states (1330 × 530)
- `tools/visual-regression.py` captures the current viewports and checks screenshots against stored baseline PNGs, also enforcing basic viewport/overlap contracts.
- **Visual difference images** are generated in `qa-reports/visual/diffs/` when a snapshot has changed beyond tolerance. Nothing overwrites baselines during ordinary test runs.
- `RUN-VISUAL-TESTS.bat` and `npm run test:visual` provide one-command execution.
- `--update-baselines` is an intentional action for accepting changed screenshots **after human review**, not an automatic part of deployment or tests.
- `--smoke` captures the static fixtures without comparing them to baselines, useful on systems with different local fonts/Chromium versions.
- `--self-test` verifies the comparator rejects an intentionally changed image and writes a diff.
- Added a dependency-free Node test that verifies screenshot manifest, dimensions, SHA-256 hashes, uploader inclusion and asset-version references.
- Updated the optional full browser smoke test to look for the 1.5.6 version label.

## What the tests do and do not prove

**Covered here:** Real Chromium HTML/CSS layout rendering, deterministic rendering of the *actual card painting functions* in a 2D canvas, responsive viewports and screenshot comparison.

**Not covered by the static baseline tests:** Runtime Three.js/WebGL lighting and occlusion, GPU FPS, real Firebase communication or actual remote-device syncing. The separate optional full-browser smoke test can check real navigation when an environment permits it.

The DM environment/combat screenshots contain deterministic sample controls/rows; the standalone DM modules are covered by the existing Node integration tests. These screenshots are fixture baselines taken on Linux Chromium. They establish a starting point for regression detection, **not an artistic sign-off**. Pixel comparison on Windows or a different Chromium build can differ due to fonts and rasterization.

## How to run

```
RUN-TESTS.bat
RUN-VISUAL-TESTS.bat
```

Or from the extracted website folder:

```
npm test
npm run test:layout
npm run test:visual
```

Optional dependencies for visual tests: Python 3, Pillow, Playwright and Chromium. If missing, install `pip install playwright pillow` and `python -m playwright install chromium`. Chromium executable on PATH is also supported.

To approve a known, intentional visual change in a future release:

```
python tools/visual-regression.py --update-baselines
```

Review the resulting PNG files and the code diff before committing them. Do not blindly update baselines to conceal regressions. Normal runs never modify reference screenshots.

## Installation and compatibility

Use `github.bat`, enter the Project-Grim repository folder and confirm the copy/push. The website now uses `assets/grim-157`. The included uploader copies the new QA tool, screenshot baseline files, tests and documentation. Existing saved campaigns and anonymous/no-login Firebase setup remain untouched.
