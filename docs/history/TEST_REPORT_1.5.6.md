# Project Grim 1.5.6 — QA Report

Build base: 1.5.5 — Presentation & Accessibility.

## Results in this environment

- **35 / 35** automated Node test suites passed (`node tools/run-tests.mjs`).
- **14 / 14** static Chromium viewport checks passed (`python tools/check-layout.py`).
- **6 / 6** static Chromium screenshot comparisons passed with **0.00%** changed pixels against pinned baselines (`python tools/visual-regression.py`).
- **1 / 1** deliberately changed-image comparator self-test passed; visual difference was detected and a diff generated.
- The baseline manifest is checked for PNG dimensions and SHA-256 integrity by the Node suite.
- Optional live Chromium browser smoke attempted but returned a **skip**, because policy blocked navigation to localhost. No claim is made that full WebGL visuals, GPU frame rate or live Firebase sync passed.

## Tested fixtures

| Fixture | Viewport | Purpose |
|---|---:|---|
| dm-overview-desktop | 1440 × 900 | Navigation and dashboard composition |
| dm-environment-tablet | 768 × 860 | Environment editor controls at breakpoint |
| dm-combat-mobile | 390 × 844 | Combat toolbar and rows on phone |
| stage-scene-desktop | 1440 × 900 | Stage HUD and presentation controls |
| stage-combat-mobile | 390 × 844 | Stage HUD and deterministic painted card samples |
| card-finishes | 1330 × 530 | Real canvas paint output for damage/status finishes |

## Caveats

- The screenshots use static HTML/CSS and deterministic test rows where the live app normally populates data. They **do not** test the real 3D stage, real Firebase, real camera projection or physics.
- The card-finish screenshot uses Grim's actual `cardVisualData` and `paintCard` functions at a fixed animation timestamp. It does not test the full GPU foil effect or dynamic occlusion.
- Screenshot comparison can be sensitive to Chromium/font differences between machines. Use `--smoke` for a non-baseline geometry check when comparing on a new platform, and rebaseline only after reviewing intended changes.
- The additional 35-test Node suite covers camera framing, 3D card lifecycle, terrain rebuilds, Firebase-recovery simulations, combat state and other regressions independently of screenshots.

Local ephemeral images/reports are written under `qa-reports/` and excluded by `.gitignore`; only approved baselines are bundled.
