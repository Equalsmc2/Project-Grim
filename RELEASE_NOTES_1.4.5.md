# Project Grim 1.4.5 — Native 3D Cards

## What changed
The cards are now **real 3D surfaces** inside the existing Three.js scene, not HTML panels composited above a 3D canvas. 3D rocks, trees and pillars naturally block their view through the same depth buffer. No approximate prop outlines or HTML clip masks are involved.

- Large CanvasTextures (696×960) preserve sharp card text, backgrounds, portraits, HP, AC, initiative, conditions, and the active-turn border.
- Cards stay anchored in world coordinates and billboard toward the camera during Ground / Tactical / Top views, cinematic motion and manual orbit.
- Card texture regeneration happens only for changes in their data, e.g., HP or portrait. Repeated environment/weather updates do not rerasterize unchanged cards.
- Fallback HTML cards remain in the document for browsers without WebGL or during context loss; this fallback does not have true 3D depth occlusion.
- Native card meshes survive environment preset terrain rebuilds and release GPU resources when removed or when the stage closes.

## Install
Extract the ZIP and run `github.bat`, specifying your Git repository path. The uploader copies the full website, including ambience audio, and offers optional cleanup of known old asset directories. Inspect Git changes before committing.

## Validation
- All included Node tests and syntax checks run against the new `grim-145` asset path.
- `tests/native-cards.test.mjs` validates real depth-tested material, canvas texture updates, orientation after camera orbit, persistent ground position and cleanup.
- `tests/preset-rebuild.test.mjs` validates repeated preset changes.
- WebGL browser rendering and audio/Firebase live behavior were not verified in the restricted test environment; perform an on-device visual check, especially a tree passing in front of a card during Auto pan.

## Notes
Native cards are crisp raster textures on a plane, not HTML DOM elements. The screen-space rank/initiative strip in the stage HUD remains HTML and visible even when a card is hidden behind a tree.
