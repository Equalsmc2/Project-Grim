# Project Grim 1.5.1 — Test Report

**Baseline:** Project Grim 1.5.0
**Outcome:** 27/27 independent automated test suites passed.
**Executed:** 2026-11-09T19:20:57.210Z

## New 1.5.1 checks

- **126 integrated encounter scenarios:** real formation, card meshes, camera fitting, status effects, HP changes, scene presets and two viewport classes; all passed.
- **120 additional Burning/Frozen animation frames:** no unexpected full-card texture repaints.
- **HTTP smoke:** real local web server delivered both pages and modules, CSS and MP3s; invalid encoding returned 400 without killing the server; private/dotfile paths were blocked.
- **Asset/module integrity:** two pages, 20 related JavaScript modules, 38 relative imports, all five audio tracks, GitHub uploader active-bundle validation.
- **Prepared-scene Undo/Redo:** scene ID, labels and environment restored; HP, initiative and combat state preserved.

## Existing regressions rechecked

Camera visibility/stability, native card lifecycle, Burning/Frozen and shatter FX, 1.5 graphics-quality switching, environment rebuilds, terrain, ambience, campaign save migration and sync-state behavior.

## Verification limits

These tests use real JavaScript modules, Three.js math/meshes, fake WebGL rendering, isolated Node processes, and a real local HTTP server. They **do not measure actual browser FPS or verify appearance**. Attempts to access localhost in Chromium were blocked by the execution environment. An optional browser smoke script is included for running locally on a machine with Playwright.

Real multi-device Firebase connectivity and deployed web hosting were not exercised.

## Reproduce

```text
RUN-TESTS.bat
```

or

```sh
npm test
npm run test:quick
```

Reports are created under `qa-reports/` in your local extracted folder. They are ignored by Git.
