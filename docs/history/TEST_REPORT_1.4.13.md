# Grim 1.4.13 — Test Report

Foundation: Grim 1.4.12 (Performance). Changes are limited to native card finish, HTML fallback finish, versioned references, tests and release packaging.

Run `node tests/matte-finish-1413.test.mjs` to validate the new foil rules and `node tests/performance-1412.test.mjs` to validate animation does not repaint/transfer card images. Run all `tests/*.mjs` and `node --experimental-vm-modules tests/state.test.cjs` for regression coverage.

A standalone card-art PNG was generated with a Canvas-compatible renderer for visual inspection. This is not a live WebGL screenshot or an in-browser FPS measurement. Chromium navigation to local preview files was blocked in the test environment. Windows BAT execution and live Firebase transport were not tested here. Review Git changes before committing.
