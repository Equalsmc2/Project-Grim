## Rectangular battlefield fix (1.1.2)

- **Fixed the actual cause of the square terrain:** the 1.1 world applied a 1.6× Z/depth scale to the whole terrain group, nearly cancelling its rectangular proportions. The ground is now one **35 × 19-unit rectangle** with no nonuniform world scaling.
- Fixed a regression in the previous WIDTH_MATCH_FIX package: missing `FIELD_W`/`FIELD_D` constants caused a `ReferenceError` before WebGL terrain could load. This build defines those constants correctly.
- Camera now adjusts distance rather than distorting terrain geometry, so the entire rectangular map stays framed at different desktop and mobile aspect ratios.
- Grass, stone, dirt, snow, paths, scatter, weather, fog and props use the same world-space field bounds. Card positions / combat turn ordering are unchanged.
- The fallback pre-WebGL CSS ground also follows a wider rectangle.
- Cache-safe active assets are in `assets/rectangle-112`. Look for **RECTANGLE 1.1.2** in both DM and stage headers.

# Project Grim 1.1.2 — Correct Rectangular 3D Battlefield

Updated from the completed Environment 1.0 build, itself built directly from Project-Grim_ARENA_0.9_FULL.zip. The new entry points use
assets/rectangle-112/ and display RECTANGLE 1.1.2. All earlier asset folders
are retained for provenance; the website loads only the new active directory.

## Launch on Windows

1. Extract the entire ZIP, keeping the Project-Grim folder together.
2. Run RUN-GRIM.bat. Install Node.js if neither Node nor Python is available.
3. The launcher opens the DM console and TV stage on localhost:4174.
4. Keep the server window open. Use dm.html for controls and index.html on the TV.

The launcher retains the 0.9 Node/Python workflow and port; only its release
label changed. File-double-click mode cannot reliably load ES modules: use the
local server. Three.js r170 is included locally with its MIT license, so local
3D does not require a CDN. Firebase still requires internet access.

## Environment controls

Choose Environment in the DM sidebar. All controls publish immediately through
the existing campaign state; Scene and Combat remain separate presentation modes.

- Presets: Blank test stage, Forest, Snowfield, Desert, Stone Road / Path,
  Ruins, Autumn Field. Presets replace environment settings, not combatants.
- Ground: blank grid, grass, stone, dirt, sand, snow, or dead leaves. Surface
  variation changes geometric relief and procedural scatter.
- Path: enable a raised stone path, move X/Z, rotate, change width and edge
  scatter. Grass plus path is the mixed-ground option. Edge blending uses small
  scattered stones, not an external texture or terrain-painting system.
- Weather: none, rain, drifting snow, tumbling leaves, or blowing dust/sand.
  Intensity controls count; wind direction and speed control horizontal drift.
  Each weather system occupies real 3D space behind the card overlays.
- Ground fog: shallow translucent 3D volumes with gentle wind drift. This is
  lightweight stylized fog, not a physically based volumetric simulation.
- Props: mixed, forest, rocks, ruins, snow, grass, bushes, logs, or graves.
  Density controls sparse peripheral placement; the central combat area stays
  clear. Forest includes trees, bushes, logs, grass and rocks; ruins include
  pillars, wall blocks, gravestones and rocks. Snow includes mounds.
- Regenerate seed changes the deterministic layout. Clear props sets prop
  density to zero; terrain scatter, path and weather remain independently set.

Use arrow keys on the stage to orbit within a limited range; 0 resets the camera.
H hides the HUD and F toggles fullscreen. Cards stay front-facing, with readable
HTML text above all 3D props/weather. Enemies occupy the far/upper bank; players
occupy the near/lower bank. Global turn ranks are preserved, with descending
initiative left to right within each faction (row-major when multiple rows fit).
HP, temporary HP, conditions, portraits, active turn, scene captions, card scale,
and the original combat/character editing workflows remain available.

## Campaign compatibility and synchronization

The storage key remains grim:campaign:v1 and version remains 1. Old campaigns
receive a blank environment with no props. Characters, combat, scene overrides,
presentation settings and additional campaign fields are retained. No local
campaign data is bundled in this ZIP. Use the same browser profile, hostname and
port as before to keep browser-local saved data. A different origin has separate
browser storage. Keep the old ZIP as a rollback copy.

Environment is an additive top-level object normalized and bounded on load,
local updates and incoming cloud snapshots. LocalStorage, storage events,
BroadcastChannel and Firebase carry the same complete campaign state. Avoid
editing the same cloud room simultaneously with an older 0.9 DM build, which
has no environment editor and may publish an older snapshot.

## Firebase (optional, no visible login)

The ARENA 0.9 Firebase connector, configuration and database rules are retained.
Both stage and DM automatically authenticate anonymously; there is no login UI.
Check assets/rectangle-112/firebase-config.js for your project configuration.
Enable Anonymous Authentication and Realtime Database in that project. In DM
Connection & setup, choose the room, enable Firebase, copy that browser's DM
rules and install them in Firebase. The permitted anonymous DM UID controls
writes; viewers only read. Keep that browser profile to retain its identity.
Use the generated online stage URL for remote displays. Publish to Firebase
sends the campaign including environment; it does not deploy website files.
Live Firebase access and real cross-device synchronization were not tested in
this release session. Local synchronization and cloud-state ingestion were tested.

## Copy into GitHub repository / optional Hosting deploy

Run github.bat (GITHUB-UPLOAD.bat is the identical alias). It prompts for the
repository root, defaulting to:
C:\Users\deste\OneDrive\Documents\GitHub\Project-Grim

That destination's existence was verified during development. The release was
prepared separately; no existing repository files were overwritten or pushed.
The uploader checks the new asset path, asks before copying, preserves .git and
unrelated files, then offers the original review/commit/push workflow. Review all
listed changes: the inherited commit step stages ALL repository changes.
After a successful push it offers Firebase Hosting-only deployment, using the
existing project-grim-ef4f0 project. It never force-pushes or deploys database
rules. You can also deploy manually from your chosen repository using:

    firebase deploy --only hosting --project project-grim-ef4f0

Keep your project-specific configuration when installing into a customized repo;
the uploader copies the package's matching website/configuration filenames.
A GitHub push alone does not deploy Firebase Hosting. Reload until the header
shows RECTANGLE 1.1.2. No deployment was performed during development.

## Graphics, fallback and limits

The stage uses Three.js WebGL, an elevated perspective camera, geometric floor,
hemisphere/directional lighting, shadow maps and active-turn illumination. HTML
cards project from world positions while remaining above the graphics canvas.
The mobile map becomes narrower/longer to fit portrait screens. The interface and cards stay dark; terrain and weather use natural colors.
Grass is green, autumn leaves vary orange/red/gold, sand is tan, and wood is brown.
The stage uses procedural placeholder art.

Rain is capped at 1,000 instances; other weather at 500; props at 65 placements;
terrain scatter at 1,100; fog at 18 volumes; pixel ratio at 1.5. Rebuilds dispose
old geometry/materials. Static scenes render on demand; animated scenes pause
when the document is hidden and resume without large simulation jumps.

If WebGL or the local library cannot initialize, the 0.9-style 2D floor/cards,
HUD and sync remain usable with a visible fallback label. Test it using
index.html?webgl=0. Context-loss handling also exposes the fallback floor while
waiting for restoration. Actual hardware context loss was not induced in QA.
Large encounters still compact their cards; very large rosters and extreme
camera angles are not guaranteed legible on phones. This foundation does not
include manual per-prop placement, sculpting, collisions, asset imports,
physically simulated volumetric fog, embers or ash.

## Source and verification

No bundler is needed. Full browser source is in assets/rectangle-112/.
The local server is server.js. See TEST_REPORT.md for evidence and limitations.
Run campaign/state regression checks with:

    node --experimental-vm-modules tests/state.test.cjs

Historical 0.9 documentation is in docs/ARENA-0.9-README.md; use this README for
1.1 instructions. Three.js documentation: https://threejs.org/docs/

## New in 1.1

A real perspective camera makes the far side recede and the near side widen.
The battlefield is deeper, with an orbit framing adjustment. Cards have wider
spacing and screen-space clearance constraints applied after 3D projection,
so readable HTML faces do not overlap during orbit. Card faces stay upright.
Orange/red/gold ground and falling leaves use per-instance colors and actual
flattened 3D leaf geometry. No image overlays replace the 3D world.

Install the full ZIP with the same github.bat workflow. Existing saved data and
Firebase paths are unchanged. Look for RECTANGLE 1.1.2 in the header.
