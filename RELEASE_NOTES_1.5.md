# Project Grim 1.5.0 — Refinement

Built on the **1.4.13 full release**. This release is a stability and usability pass, not a rewrite or new campaign.

## Changes

### Battlefield and camera
- Ground remains the default view. Auto cinematic movement now gives the active card gentle priority and uses much smaller, slower motion, rather than broad periodic sweeps.
- Existing full-card camera-framing checks remain enabled after zoom, window changes, camera transitions and active turn changes.
- Terrain clusters favor natural groups at the flanks and behind the combat lane without removing real scenery occlusion.
- Reduce-motion OS preferences suppress lightning flash bursts.

### Performance and graphics
- **Viewer-local graphics quality:** Low, Balanced and High controls affect pixel ratio, shadow rendering and precipitation particle budgets. This is deliberately local to each viewer, not a campaign/Firebase setting. The DM cannot unknowingly downgrade another viewer.
- Atmospheric updates no longer call the card-fitting algorithm unless the camera or card projection actually changes.
- Unchanged card layouts no longer rebuild ground markers, redo camera fitting or reposition unchanged cards on weather/ambience edits.
- Hidden DM dashboard panels are no longer rebuilt on each environment slider change.
- Existing optimized Burning/Frozen foil animation remains GPU-side; the 1.4.13 matte card art, shadows, shatter and natural occlusion are preserved.

### DM workflow
- **Prepared scenes:** Save up to 12 named snapshots of environment, scene selection and scene labels. Apply in one click without changing combat mode, HP, initiative, current turn or characters.
- **Environment Undo/Redo** with bounded local history and grouping for slider drags; local undo history clears on incoming remote/cloud changes to avoid undoing another editor's work.
- A prepared scene is selected and then applied intentionally. Effects still go live when the DM edits the main Environment controls as before.

### Deployment
- Separate cache-safe `assets/grim-150` active bundle.
- Existing GitHub `.bat` folder-prompt uploader, site, DM page, five audio recordings and Firebase no-login/anonymous workflow preserved.
- No campaign reset required; old saves migrate with an empty snapshots list.

## Deliberate boundaries
- The card material is polished from the existing 1.4.13 matte design, **not redesigned into a new visual identity**.
- Scene snapshots are configurations, not independent saved campaigns. Applying one does **not** reset combat or roster.
- Undo/Redo is **environment-only**, local to this DM browser tab; it is not a distributed collaboration history.
- No private 3D preview before publishing. The DM can inspect saved configuration labels before applying; ordinary environment sliders remain live.
- Browser FPS on your machine, remote Firebase connectivity and the final WebGL appearance still require live-device verification.
