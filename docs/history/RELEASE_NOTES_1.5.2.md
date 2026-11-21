# Project Grim 1.5.2 — Performance Engineering

Built directly from the complete Project Grim **1.5.1** website.

## Focus

Reduce unnecessary CPU and GPU-side scene work during storms, animated combat cards, and long encounters **without changing** weather density, the world's shape, camera safety rules, combat, or existing UI styling.

## Changes

1. **Weather simulation budget** — Instanced rain, snow, sand, and leaves are updated at 20 Hz on Low, 30 Hz on Balanced, and 45 Hz on High. Elapsed time carries forward so particles maintain their overall falling/travel speed. This reduces expensive per-particle matrix and terrain calculations during 60+ Hz rendering.
2. **Storm loop optimizations** — The wind sine/cosine values are computed once per weather update instead of once per particle; the ground-height check is skipped for particles well above all generated terrain.
3. **Render only changed frames** — A weather or cloud update requests a draw when the geometry actually changes. Unchanged frames can be skipped when no camera movement, lighting transition, fog motion, or card FX requires rendering.
4. **Static-lighting fast path** — Once a non-cycling, non-thunderstorm environment finishes transitioning, foil/card animations no longer cause a full lighting recomputation every frame. Changing the scene, lighting, or graphics quality invalidates this fast path.
5. **Material update caching** — Prop materials are updated only when wet/snow accumulation meaningfully changes, instead of rewriting every material every animation frame.
6. **Diagnostics & tests** — `window.grim3DStats.weatherPerformance` records weather simulation steps, particle-matrix writes, and simulated weather frames. New `tests/render-budget-152.test.mjs` validates 20/30/45 Hz budgets and exercises a simulated live world with real instanced meshes.

## Preserved

- PathFinder combat, turn order, Ground/Tactical/Top cameras and all-cards-visible framing.
- Native depth-tested matte cards, burn/frost FX, HP cracking, 0 HP shatter, and GPU foil optimization.
- Environment presets, hills, 3D terrain, sky, fog, storms, graphics quality controls.
- DM scene snapshots, Undo/Redo, compact layout, ambience audio, no-login Firebase workflow.
- GitHub folder-prompt BAT uploader and local Windows launcher.

## Measured simulation comparison

On the *same* simulated 1440×810 Balanced blizzard with 600 display frames at 60 Hz (10 seconds):

| Measurement | 1.5.1 | 1.5.2 | Change |
|---|---:|---:|---:|
| Instanced matrix writes (all scene instances) | 235,624 | 120,509 | -48.9% |
| Renderer calls | 600 | 446 | -25.7% |
| Test CPU time | 66.8 ms | 43.2 ms | -35.3% |

This is a deterministic, **mock-WebGL renderer benchmark**: CPU and scene-call comparisons, **not GPU FPS or graphics quality measurements**. Device characteristics, browser, storm settings, cloud/fog activity and animations can produce different gains. The five bundled audio files are unchanged.

## Installation

Extract the ZIP and run `github.bat`. Select the existing Project Grim repository directory, review changes and approve the GitHub push. Confirm **PERFORMANCE 1.5.2** in both page headers. Run `RUN-TESTS.bat` or `npm test`. No campaign data migration or reset is needed.

## Still requiring real-device verification

WebGL visual appearance, live GPU FPS during complex scenes, behavior on mobile, and Firebase network synchronization need confirmation in a real browser. Automated tests are not a substitute for those checks.
