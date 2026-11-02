# Project Grim 1.4.11 — Camera Stability Repair

## Reproduction and root cause

The 1.4.10 full-card visibility guard could lower zoom to `0.06` (6%) when a crowded formation did not fit the requested camera preset. At the Ground camera's normal distance around 24 world units, this meant a distance around 400 world units. The battlefield consequently looked like a tiny distant island, sometimes barely visible.

A second risk was repeatedly applying a camera retreat to a previously retreated camera when character state or cinematic motion updated.

## Fixes

- Increased the minimum *manual* camera zoom to 78% and removed the pre-fit guard's extreme-zoom fallback. The normal view remains close to the pre-regression camera.
- Replaced unbounded camera retreat with a bounded two-stage fitting approach: modest adjustment to camera distance first, then reduction of the **on-screen card dimensions only** for crowded formations.
- Framing checks use the actual corners of the native 3D cards and include margins for active-card bobbing and the stage HUD.
- The fitted card-scale factor is used by both the framing math and the Three.js card meshes, so the visible result matches the safety check.
- Prevented cumulative camera retreat by starting every fit from the unadjusted camera pose. Repeated DM updates no longer make the stage drift backward.
- Preserved Ground/Tactical/Top views, cinematic pan, anchored cards, initiative order, depth-tested scenery, atmosphere, ambience, and anonymous Firebase/local state synchronization.
- Activated new cache-safe `assets/grim-1412/` paths in both entry pages and the Windows GitHub uploader.

## Test outcomes

- Full automated suite passes, including 216 combinations of stage size, camera mode, yaw and roster size.
- Added a 20-update stability regression, ensuring updates to the same combatants do not make the camera creep away.
- Browser-rendered WebGL QA remains unverified: the current environment's Chromium policy blocks localhost navigation.

## Installation

Extract the full ZIP, run `github.bat`, enter your existing Project Grim Git repository directory, and approve the copy/push. Verify the site header says **CAMERA STABILITY 1.4.11**. No campaign data reset is required.
