# Project Grim 1.5.3 — Architecture & Cleanup

Built from the full **1.5.2** release. No intended changes to the visual style, saved campaign schema, combat mechanics, or no-login Firebase workflow.

## What changed

- **Atomic environment rebuilding:** generate the next terrain in a detached 3D group, then switch scenes only after the new geometry is complete. If generation throws an error, dispose the failed candidate, restore the previous terrain, sky and fog, show a restrained status message, and allow a subsequent preset change to recover.
- **World foundations module (`world-foundations.js`):** isolates terrain height math, palettes, deterministic random generation, grid/shadow textures and the procedural sky surface. The existing `world.js` export for `landscapeHeight` remains supported.
- **GPU resource lifecycle (`scene-resources.js`):** disposes distinct geometries, materials and textures once, including standard secondary material maps, without disposing shared textures owned by the card or marker systems.
- **Cinematic director (`cinematic-director.js`):** separates the small camera-pan target calculations from WebGL scene state; all-card visibility fitting still runs afterward.
- Removed demonstrably unused constants/imports and corrected renderer shutdown to avoid adding an empty scene group while disposing.
- Updated the active, cache-distinct asset bundle to **`assets/grim-153`** and retained the original repository-path-prompt GitHub uploader.

## Test coverage

- New tests inject a failure during a preset switch and verify the previous terrain, sky, fog and card meshes remain intact.
- New tests repeatedly rebuild 10 environments, check GPU disposal deduplication, and verify deterministic cinematic target bounds.
- Existing tests cover large rosters, card FX uploads, camera views and framing, ambience, state migration, presets, performance budgets, the local HTTP server and uploader integrity.
- Run `npm test` or `RUN-TESTS.bat`. Detailed reports are saved to `qa-reports/`.

## Installation

1. Extract the complete ZIP.
2. Run `github.bat` and enter your existing Project-Grim repository folder.
3. Review changes and confirm copying and push. Firebase Hosting remains a separately confirmed optional action.
4. Verify both page headers read **ARCHITECTURE 1.5.3**.

No campaign reset is needed. As before, actual deployed-browser WebGL appearance, GPU FPS, live Firebase synchronization and audio output have **not** been manually verified in this environment.
