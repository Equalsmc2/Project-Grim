# Project Grim 1.5.3 — Test Report

## Verified automated results

The dependency-free Node test runner completed **30/30 independent tests** in this release. Its machine-readable output is `qa-reports/last-run.json`; the compact test table is `qa-reports/last-run.md`.

New 1.5.3 checks:

- `scene-lifecycle-153.test.mjs`: verifies geometry/material/texture disposal deduplication; switches scene roots only after successful construction; injects a scene-generation failure and checks the old terrain, sky, fog, and native cards remain; retries successfully and performs 10 repeated preset rebuilds without retaining obsolete terrain groups.
- `cinematic-director-153.test.mjs`: verifies repeatability and movement bounds for active-turn camera targets at extreme positions and multiple phases.

Prior test coverage retained: WebGL simulated renderer, weather budgets, camera fitting, HP/shatter and Burning/Frozen, environment history, local server HTTP and path protection, asset imports, package references, local persistence migration, audio and Firebase sync logic.

## Other checks

- New JS modules pass syntax checks.
- The website retains only the active `assets/grim-153` code bundle plus five audio assets.
- Browser screenshot test was attempted with installed Chromium; localhost navigation was rejected with **`net::ERR_BLOCKED_BY_ADMINISTRATOR`**. This is an execution-environment restriction; **no live WebGL visual or GPU FPS verification is claimed**.
- Live Firebase connectivity and external hosting were not tested, and no deployment was performed.

## Reproduce tests

`npm test` or `RUN-TESTS.bat` (Node.js required). Browser screenshots optionally: `npm run test:browser` on a workstation with Playwright/Chromium and browser permission to open local sites.
