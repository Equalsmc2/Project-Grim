# Project Grim 1.5.2 — Automated QA and Performance

- Source: complete 1.5.1 website + performance patch.
- Active assets: `assets/grim-152`.
- Test runner: `node tools/run-tests.mjs` (or `RUN-TESTS.bat` on Windows).
- New integration coverage: `tests/render-budget-152.test.mjs`.

## Tested behavior

- Weather budget output for Low, Balanced and High at a simulated 60 Hz display rate.
- Particle simulation elapsed-time preservation and inactive-weather reset.
- Changed-material cache tolerance.
- Real Three.js instanced geometry updates through a simulated WebGLRenderer.
- Existing camera, card visibility, status effects and shatter, saved-state migration, DM snapshots/Undo, terrain preset switching and HTTP server tests.

## Simulation benchmark

The local benchmark uses equal elapsed time (10 seconds / 600 frames), 1440×810, Balanced, blizzard at intensity 1, cloud cover 0, wind 2. It instruments all `InstancedMesh.setMatrixAt()` calls and the renderer `render()` call count.

| Version | Matrix writes | Render calls | CPU run time |
|---|---:|---:|---:|
| 1.5.1 | 235,624 | 600 | 66.8 ms |
| 1.5.2 | 120,509 | 446 | 43.2 ms |

The numbers are environment-specific, not a guaranteed frame rate. The mock renderer **does not rasterize the scene**; GPU rendering performance remains unverified.

## Deployment checks

Both HTML pages must point to `assets/grim-152`; `github.bat` and `GITHUB-UPLOAD.bat` must validate that bundle before optional cleanup. The five on-demand ambience audio files remain packaged under `assets/audio`.
