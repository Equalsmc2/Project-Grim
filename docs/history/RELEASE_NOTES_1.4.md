# Project Grim 1.4 — Implementation and test notes

Base: Project-Grim_LIVING_ATMOSPHERE_1.3_FULL.zip

## Features
- Seeded clusters for forest/rocks/ruins etc., with path and player/enemy lane clearance.
- Tighter 3D shadow frustum and softer night presentation without reducing card legibility.
- Three lightweight instanced ground accumulators: wet puddles, snow cover, blowing sand. They fade in and out based on accumulated weather and the DM slider. No terrain reconstruction during weather changes.
- Lower fog wisps placed against terrain height, darker wet ground with lower roughness, snowy props, animated hovering active card.
- Fewer short-lived allocations per light frame, and 190-ms coalescing of cloud writes on sliders. Local stage/tab updates remain immediate.

## Known limitations
- Continuous 3D scenery is procedural/stylized, not physically accurate fluid or snow accumulation.
- Real Firebase sync, GPU FPS and live WebGL appearance must be verified in the user's environment.
- No automated browser visual screenshot was possible in this environment (Chromium blocked navigation).

## Test command
`node tests/polish-14.test.mjs` (and other `.mjs` tests); `node --experimental-vm-modules tests/state.test.cjs`.
