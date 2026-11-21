# Project Grim 1.4.4 — Environment Preset Recovery

## Fixed

A stale `lastOcclusionAt` assignment remained in `world.js` after the 1.4.3 card-occlusion rewrite. It raised `ReferenceError` inside `clearRoot()` when a DM selected a different terrain preset, interrupting the scene rebuild and leaving the stage blank. Removed this obsolete assignment and verified repeated environment changes using the actual geometry builder and a stub renderer.

## Preserved

- 3D terrain, sky and storms, day/night lighting, procedural props, cinematic camera pan, and world-anchored cards.
- Ambience sound assets and player audio controls.
- DM editor, no-login local/Firebase sync, and folder-prompt GitHub uploader.
- Saved campaign compatibility: no reset required.

## Verification

`node tests/preset-rebuild.test.mjs` simulates successive environment presets with the Three.js scene code and confirms terrain reappears after Blank. Existing regression tests also run. Real browser WebGL and live Firebase deployment were not verified in this environment.
