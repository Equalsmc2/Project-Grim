# Project Grim 1.4.12 — Performance Test Report

## Controlled A/B comparison

A scripted test used **16 combatants**, alternating Burning and Frozen, across **180 animation steps**. The same mock canvas and camera were used against the original full 1.4.11 code and optimized 1.4.12 code.

| Metric | Baseline 1.4.11 | New 1.4.12 |
|---|---:|---:|
| Full card face texture uploads | 496 | 16 |
| Approx. card face pixel memory, 16 cards | 43.91 MB | 24.70 MB |
| Animation-only mock JS elapsed time | 44.93 ms | 4.31 ms |

Counts are deterministic for the tested simulation. CPU timings vary by machine; they are **not measured real-browser FPS or frame-time**. GPU texture memory excludes the separate foil texture, mipmaps, geometry and renderer overhead.

## Extended regression

- 19 pre-existing `.mjs` test suites passed, along with the legacy state migration test run using Node `--experimental-vm-modules`.
- New `tests/performance-1412.test.mjs` passed, checking 16 animated status cards across 180 steps, 0 additional full-face uploads, no extra camera layout work, an immediate update for HP changes, reuse of an unchanged portrait, and resource disposal.
- Three changed JS modules passed syntax checks.
- Active assets are isolated in `assets/grim-1412` and `assets/audio`.
- Uploader still requests an explicit repository folder and confirmation before copy/push.

## Unavailable tests

A browser smoke test was attempted using Chromium/Playwright, but navigation to `http://127.0.0.1:4192/` failed with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Live WebGL frame timing, desktop visual appearance, actual Firebase networking, audio playback, and execution of Windows BAT files must be checked on the target computer.
