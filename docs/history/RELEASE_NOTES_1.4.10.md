# Project Grim 1.4.10 — Always-Visible Cards

The 1.4.9 camera guard only constrained the requested zoom and had a hard lower boundary. When it couldn't fit all combatants at that boundary, it accepted clipping; also cinematic pan/transition positions did not pass through the guard.

## Fix

- Keep the Ground camera, manual orbit and all camera presets.
- Preserve each card's true world anchor and depth-tested 3D geometry.
- Compute **projected bounds of all four card corners**, not only the anchors.
- Apply a final fit to the actual camera after any viewpoint movement, including animation frames and window resizing.
- Only retreat when necessary; a view that already fits is never changed.
- Reserve margins inside the stage for the HUD.
- The emergency fit can retreat beyond the normal user-controlled zoom minimum to handle large rosters and narrow screens.

No campaign-state or Firebase schema changes. Sound files are preserved.

## Install

Unzip, run `github.bat`, enter the Project-Grim repository folder, review changes, and deploy. Stage and DM headers must show **CARD VISIBILITY 1.4.10**.
