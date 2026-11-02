# Project Grim 1.4.9 — Card Finish & Camera Safety Fix

Built directly from **Project Grim 1.4.8**. No campaign reset or change of Firebase settings.

## Fixes

1. **Burning finish is visible** — fixed a canvas-transform mismatch left over from the older 174×240 card design. All effects now draw in the actual 160×268 card coordinate space. Stronger orange flame-like edge treatment, warm foil sweep across the portrait, and floating ember highlights. An active Burning card has a brighter flame finish.
2. **Card-safe camera zoom** — on the stage, zoom stops once any combatant card would cross a safe viewport boundary. It uses the actual world anchor, card size, camera angle, and formation rather than one hardcoded zoom value. Small formations still permit close-ups, wide formations do not. The stage zoom indicator now shows the permitted zoom.
3. **Cleaner fracture damage** — replaced the all-over scratch/web texture with persistent, fine branching laminate fractures in the portrait glass. Fractures extend as HP drops, with restrained stress halos near the impact sites at critical health. Names and stats remain unobstructed. The existing physical 0-HP shatter burst is unchanged.
4. **Regression protection** — new `tests/card-visibility-149.test.mjs` checks the Burn effect's canvas transform, visual-status rendering paths, fracture bounds and zoom limits.

## Preserved

- Ground, Tactical and Top camera views; cinematic panning and manual orbit.
- Native depth-tested laminated 3D cards with rounded 160×268 silhouette, depth occlusion, active-card effects, freezing and 0-HP shatter.
- Terrain, hills, forests, dynamic sky, day/night, weather, ambience, compact DM interface, no-login Firebase/local sync, initiative, condition changes.
- Windows `github.bat` folder prompt uploader and `RUN-GRIM.bat` launcher.

## Installing

Extract the complete ZIP. Launch `github.bat`, enter the local path to the existing Project-Grim Git repository, confirm copying and pushing the updated build, then reload your deployment. Check **CARD FINISH FIX 1.4.9** appears on the stage and DM headers.

## Manual visual acceptance checks

- Apply **Burning** from the DM combat condition selector and verify an orange flame finish appears on the stage (not only a BURNING footer label).
- Set HP to 40%, 20%, 5%, then 0. Fractures should extend on the portrait rather than scribbling across text, and the 0-HP 3D shatter should play on a live transition.
- Add 5+ characters to a formation and try wheel/+ zoom. Cards near the left and right edges should remain in view.
- Switch Forest → Blank → Snowfield, and pan/orbit the camera. Cards should remain world anchored and depth tested.
