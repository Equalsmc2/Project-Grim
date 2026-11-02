# Project Grim 1.4.5 — Test & Limitations Report

## Source baseline
Full `Project-Grim_PRESET_RECOVERY_1.4.4_FULL.zip`, with all five previously bundled ambience MP3s retained.

## What was implemented
- Character cards are now actual Three.js planes in the same scene and depth buffer as trees, terrain and rocks.
- Cards use high-resolution CanvasTextures (696 × 960) and are redrawn when their combat data changes (HP, AC, initiative, conditions, portraits, active turn), **not** every frame.
- Native cards share real world anchors with their ground shadows. During camera movement, the planes billboard to face the viewer while keeping their world coordinates.
- Removed the superseded projected CSS occlusion module. HTML card markup remains solely for WebGL fallback.
- Cards are maintained separately from terrain so changing environment presets cannot erase them.
- New `assets/grim-145` path busts stale cached assets.

## Checks performed
- 13 `.mjs` tests pass, including new `native-cards.test.mjs` validating material depth settings, texture refresh only on data changes, camera-facing orientation, fixed world anchors and resource cleanup.
- `preset-rebuild.test.mjs` now checks that a native card mesh survives Forest → Blank → Snowfield → Blank → Ruins → Desert → Forest.
- Saved campaign normalization, team initiative ordering, Firebase data structures and state migration pass in `node --experimental-vm-modules tests/state.test.cjs`.
- JavaScript syntax, active references, Windows GitHub uploader paths and five audio assets checked.
- ZIP integrity checked.

## Limitations
- Chromium returned `ERR_BLOCKED_BY_ADMINISTRATOR` for the local test server, even though local HTTP responses worked, so **actual visual WebGL rendering was not verified here**.
- FPS/VRAM benchmarks, audio hardware playback, Windows BAT execution, and live Firebase tests were not available.
- Native cards are high-resolution textures, not DOM text: zooming very close may reveal texture pixels. Their appearance at different monitor sizes should be checked on the user's computer.
- The HTML fallback remains available without WebGL, but fallback cards cannot participate in real GPU occlusion.
