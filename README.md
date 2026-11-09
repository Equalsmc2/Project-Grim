# Project Grim 1.5.6 — Visual Regression Foundation

**Current release:** a reproducible screenshot regression system for the DM dashboard, stage controls and native canvas card art. Adds six pinned screenshot baselines, a visual-diff report, explicit baseline approval, and a Windows `RUN-VISUAL-TESTS.bat` runner. No intentional visual redesign, gameplay change, saved-state migration or Firebase account change.

**Install:** Extract the ZIP and run `github.bat` to copy into your Project-Grim repository. Stage and DM pages should display **VISUAL QA 1.5.6**. Your previous characters and scene presets remain compatible.

**Tests:** `RUN-TESTS.bat` runs Node regressions. `RUN-VISUAL-TESTS.bat` compares screenshots if Python, Pillow, Playwright and Chromium are installed. For machines with different browser/font versions, `python tools/visual-regression.py --smoke` performs viewport geometry and screenshot capture without strict baseline comparison. Review any differences before approving new reference images. See `RELEASE_NOTES_1.5.6.md` and `TEST_REPORT_1.5.6.md`.

**Scope:** Screenshot fixtures cover static HTML/CSS layouts and actual 2D-painted card artwork. The full WebGL stage, real FPS and live Firebase access still need separate interactive testing on a machine with browser navigation access.

---

# Project Grim 1.5.5 — Presentation & Accessibility Polish

**Current release:** safer DM navigation on keyboards and small screens, a viewer-local Motion control (System / Reduced / Full), reduced-motion support for the native 3D cinematic director and card effects, and improved mobile presentation controls. No changes to characters, saved campaigns, Firebase credentials, or shared gameplay state.

**Motion control:** On the player stage, use the **Motion** selector next to Quality. System follows the browser/OS preference, Reduced pauses automatic cinematic movement and animated card finishes/shatter bursts, and Full allows the original motion. This is saved only on that viewer's device. Weather may still move because the DM deliberately selected it.

**DM navigation:** On narrow screens, the sidebar becomes a horizontally scrollable strip; Tab remains supported, and Arrow Left/Right or Up/Down navigates among the main DM pages. Keyboard focus is more visible and the current section is announced to assistive technology. Existing DM shortcuts C/S/N no longer interfere while editing or focused on a button.

**Installation:** Extract the full ZIP and run `github.bat`. Choose your existing Project-Grim repository path. Both pages should display **ACCESSIBILITY 1.5.5**. No campaign reset is required. Run `RUN-TESTS.bat` for automated checks; optionally run `npm run test:layout` if Chromium and Playwright are installed for HTML/CSS viewport testing.

**Verification:** 34/34 automated Node test suites and 14 static Chromium viewport/layout checks passed in the build environment. The full live website WebGL and FPS tests remain unverified because direct browser navigation is blocked here.

---

# Project Grim 1.5.4 — DM Workflow Reliability

**Current release:** stronger scene backups, more predictable Environment Undo/Redo, and recoverable Firebase publishing. The player stage and visual effects are unchanged. No new login and no campaign reset are required.

**DM additions:** Environment → Prepared scenes now has **Export** and **Import**. The JSON file backs up your 12 prepared scene setups, not your entire campaign. Undo/Redo treats a slider drag as one change but each applied scene as a separate step; ambience changes are also included.

**Firebase recovery:** Temporary failed writes are retried within the open DM tab. An unsynced revision marker also protects locally saved changes after a refresh: if Grim finds one, it keeps the local view and asks you to click **Publish** to recover. This deliberately avoids silently overwriting a potentially newer cloud room. Keep the same browser profile and do not clear browser storage until the changes are published. The stage viewer stays read-only.

**Install:** Extract this full ZIP and run `github.bat` next to the website files, then choose your Project-Grim Git repository. Both pages must show **DM RELIABILITY 1.5.4**. Run `RUN-TESTS.bat` or `npm test` for the automated tests. See `RELEASE_NOTES_1.5.4.md` and `TEST_REPORT_1.5.4.md`.

---

# Project Grim 1.5.3 — Architecture & Cleanup

**Earlier release:** safer, atomic environment rebuilds, dedicated terrain/resource/cinematic modules, and focused cleanup. If one environment fails to generate, the previous battlefield remains visible, including its card meshes. No deliberate visual or gameplay redesign; no saved-world data changes.

**Install:** Extract the full ZIP, run `github.bat`, and enter the Project-Grim Git repository folder. The stage and DM headers should display **ARCHITECTURE 1.5.3**. Run `RUN-TESTS.bat` or `npm test` for the complete automated checks. See [`RELEASE_NOTES_1.5.3.md`](RELEASE_NOTES_1.5.3.md) and [`TEST_REPORT_1.5.3.md`](TEST_REPORT_1.5.3.md).

---

# Project Grim 1.5.2 — Performance Engineering

**Earlier release:** renderer scheduling improvements for storms and long encounters. Weather particle updates use a quality-aware simulation budget rather than updating at every display refresh; unchanged scenic materials and settled static lighting are no longer recalculated each animation frame. The existing 1.5.1 reliability tests, camera safeguards, matte/status cards, DM tools, saved scenes, audio and Firebase configuration remain intact.

**Install:** Extract the full ZIP. Run `github.bat`, enter your Project-Grim Git repository path, confirm the copy and optionally push/deploy. Both website headers should read **ARCHITECTURE 1.5.3**. No campaign reset is needed. `RUN-TESTS.bat` or `npm test` executes the full automated suite. See `RELEASE_NOTES_1.5.2.md` and `TEST_REPORT_1.5.2.md` for limitations.

---

# Project Grim 1.5.1 — Automated Reliability Foundation

**Earlier release:** a reliability-first patch built directly on 1.5.0. All stage and DM features remain in place. This release adds a one-command QA runner, long-encounter stress tests, real local HTTP checks, and an optional browser screenshot test. It also fixes scene snapshot Undo/Redo and hardens the local preview server.

**Install:** Extract the full ZIP. Run `github.bat` and enter your existing Project-Grim repository path. The stage and DM page headers should display **RELIABILITY 1.5.1**. Your existing saved campaign and Firebase anonymous connection settings are compatible.

**Run tests yourself later:** Double-click `RUN-TESTS.bat`, or run `npm test` (Node.js LTS required; no `npm install` needed). Results are saved locally to `qa-reports/`. Optional real-browser smoke tests: `npm run test:browser` after installing Python Playwright and its Chromium browser; this is not part of the default test runner.

See `RELEASE_NOTES_1.5.1.md` and `TEST_REPORT_1.5.1.md` for changes, test evidence and explicit limitations.

---

# Project Grim 1.5.0 — Refinement

**Earlier release:** continued from 1.4.13, with viewer-local graphics quality (Low/Balanced/High), prepared DM scene snapshots, environment Undo/Redo, better camera direction, more coherent prop placement and fewer redundant 3D/DM updates.

**Install:** Extract the full ZIP, run `github.bat`, choose your existing Project-Grim repository folder, review the copied files and authorize the push. Confirm **REFINEMENT 1.5.0** on the DM and Stage pages. The live site is still `index.html` and `dm.html`. Old campaign data is supported.

See `RELEASE_NOTES_1.5.md` and `TEST_REPORT_1.5.md` for exact changes and limitations.

---

# Project Grim 1.4.13 — Matte Card Finish

**Earlier release:** The 3D cards now use a deep-charcoal matte finish instead of a milky all-over laminate. The large baked gloss overlay is gone; only a narrow specular accent remains for active cards and colored status treatments. The rounded card geometry, HP cracks/shatter, real 3D occlusion, 1.4.12 status-FX performance improvements, camera framing, terrain, sound, DM controls and local/no-login Firebase workflows remain intact.

**Install:** Extract the full ZIP, run `github.bat`, enter your existing `Project-Grim` Git repository path and approve the copy/push. Verify **MATTE FINISH 1.4.13** appears on both Stage and DM page headers. No campaign or Firebase reset is needed. See `RELEASE_NOTES_1.4.13.md` and `TEST_REPORT_1.4.13.md`.

---

# Project Grim 1.4.12 — Performance & Stability

This build fixes severe slowdowns from Burning and Frozen status effects by animating foil on the GPU instead of repeatedly painting and uploading high-resolution card textures. It also improves card texture memory, portrait reuse, fallback UI handling, and initiative-strip updates. Existing features and save data are preserved.

**Install:** Extract the full ZIP, run `github.bat`, enter your Project-Grim repository path, approve copy/push, and look for **PERFORMANCE 1.4.12** in both headers. No Firebase reset or campaign reset is needed.

See `RELEASE_NOTES_1.4.12.md` and `TEST_REPORT_1.4.12.md` for details.

---

# Project Grim 1.4.11 — Camera Stability Repair

**Earlier release:** fixes the extreme zoom-out introduced in 1.4.10 (which could force the camera to 6% zoom). The stage now uses bounded framing adjustments and adaptive card-only scaling when encounters are crowded, so the world stays a useful size and every displayed card remains within the stage frame in tested scenarios. All native 3D card FX, depth, weather, audio, DM controls and no-login Firebase workflow remain available.

**Install:** Extract the ZIP, run `github.bat`, enter your existing Project Grim Git repository path, and approve the upload. Both pages should show **CAMERA STABILITY 1.4.11**. No campaign reset is required. See `RELEASE_NOTES_1.4.11.md` and `TEST_REPORT_1.4.11.md`.

---

# Project Grim 1.4.9 — Card Finish Fix

**Earlier release:** fixes barely visible Burning, prevents camera zoom from cropping combatant cards, and replaces scratchy cracks with stable, readable portrait-glass fractures. The existing 0 HP shatter, native 3D depth occlusion, weather, ambience, combat/DM systems and no-login Firebase are preserved.

**Install:** Extract the ZIP, run `github.bat`, enter your existing Project Grim Git repository path, and approve the upload. Both pages should show **CARD FINISH FIX 1.4.9**. You do not need to reset saved campaign data. Details: `RELEASE_NOTES_1.4.9.md`, `TEST_REPORT_1.4.9.md`.

---

# Project Grim 1.4.8 — Slim Premium Cards

**Earlier release:** redesigned real 3D character cards with a taller tarot/dossier profile, genuinely rounded 3D geometry, metallic laminated trim, cleaner typography and a taller portrait. Preserves 1.4.7 Burning, Frozen, cracking and 0-HP shatter finishes, and all stage/DM/ambience/terrain features.

**Install:** Extract the full ZIP, run `github.bat`, enter the Project-Grim repository path, review and confirm. Both pages show **CARD REDESIGN 1.4.8**. Campaign data and Firebase settings are preserved. See `RELEASE_NOTES_1.4.8.md` and `TEST_REPORT_1.4.8.md`.

---

# Project Grim 1.4.7 — Card FX Polish

**Earlier release:** richer burning and freezing laminate effects, continuous HP fracture progression, and one-shot 3D vinyl shatter when a character falls from positive HP to zero. Real 3D world anchoring, occlusion, camera controls, atmosphere, ambience, the DM dashboard, no-login Firebase/local sync, and the existing state format remain intact.

**Install:** Extract this full ZIP, run `github.bat`, input your existing Project-Grim repository path, review the copy and Git changes, then push/deploy. Both pages should show **CARD FX POLISH 1.4.7**. See `RELEASE_NOTES_1.4.7.md` and `TEST_REPORT_1.4.7.md`. No campaign reset is needed.

---

# Project Grim 1.4.6 — Premium Card FX

**Earlier release:** premium-looking laminated world cards with improved native 3D presentation, burning/frozen finish effects, and progressive HP cracking/shatter while keeping real Three.js prop occlusion. Ground camera remains the default; atmosphere, terrain, ambience, compact DM controls, no-login sync and the GitHub uploader are preserved.

Extract this ZIP, run `github.bat`, enter your existing Project-Grim repository path, review the changes, and deploy. Confirm **PREMIUM CARD FX 1.4.6** in both page headers. No campaign reset is required. See `RELEASE_NOTES_1.4.6.md` and `TEST_REPORT_1.4.6.md` for details.

---

# Project Grim 1.4.4 — Preset Recovery Fix

**Earlier release:** fixes a renderer error when changing environment presets, especially after selecting Blank test stage. See `RELEASE_NOTES_1.4.4.md`. The existing saved campaign, ambience, stage and DM controls are preserved.

# Project Grim 1.4.3 — Cinematic Camera & Card Occlusion

DM Environment panel: toggle Auto cinematic pan and set speed. Stage: Auto pan toggle / C key. Manual camera movement pauses auto orbit briefly; no automatic zoom-out. 1.4.2 ambience sounds remain bundled.

# Project Grim 1.4.2 — Ambience

Adds **Environment → Ambience** to the existing Project Grim 1.4.1 website.

**DM**: Select one of Wind, Thunderstorm, Desert wind, Blizzard, Gentle rain or Off. Set volume 0–100%. Use **Preview** for local audition without affecting the stage. Selecting the track and volume is broadcast over the existing campaign state, including Firebase when connected.

**Stage**: Open the stage and click **Enable sound** once. This is required by modern browser autoplay policies; without it, the soundtrack will not play. The stage can then follow DM changes automatically. **Mute sound** only affects that viewer. The ambience loops until changed or turned off. Each audio file is requested only when selected, not on page load. Web browser audio errors are surfaced in the small audio panel.

**Deployment**: Extract the ZIP, run `github.bat`, enter your existing Project-Grim GitHub repo folder, and confirm the copy/push. The `assets/audio/` MP3s are copied alongside the website. Deploy to Firebase Hosting separately if you use it. Confirm header **AMBIENCE 1.4.2**. Old campaign data remains supported.

**Audio rights**: These are user-supplied tracks. Before making a public deployment, verify that your licenses cover public web distribution/hosting, including the redistribution of included MP3 assets.

---

# PROJECT GRIM 1.4 — WORLD POLISH & IMMERSION

Based on 1.3 Living Atmosphere. Install as a complete website replacement: extract, run `github.bat`, select your existing Project-Grim Git repository path, approve copy and push. After deployment, verify **WORLD POLISH 1.4** in both page headers.

## New in 1.4

- Smarter seeded procedural prop clusters, with paths and both player/enemy rows left clear.
- Tighter directional shadows, night-sensitive card rim light, and animated active card hover.
- Visual weather accumulation: puddles/wetness in rain, snow patches in blizzards and sand buildup in sandstorms. New **Ground accumulation** DM slider. The slider is stored/synced; precipitation supplements the setting.
- Terrain material roughness/darkness, prop highlights, and fog wisps respond smoothly to weather without rebuilding terrain on each slider movement.
- Reduced per-frame allocations, smoother card scaling across camera perspectives, and coalesced Firebase writes during quick DM changes (local changes remain immediate).
- Cache-busted `assets/grim-142` active bundle; both HTML pages remain separate and anonymous authentication does not show a login.

## Checks and limitations

Run `node tests/polish-14.test.mjs`, plus all other test files in `tests/`. The legacy state test requires `node --experimental-vm-modules tests/state.test.cjs`. Browser navigation/WebGL was blocked in the build environment; inspect live 3D effects after deployment. Keep your saved campaign data; state normalization adds `accumulation` as a backward-compatible default.

---

# Project Grim 1.3 — Living Atmosphere

Latest complete release. See [`RELEASE_NOTES_1.3.md`](RELEASE_NOTES_1.3.md) for the sky, sun/moon, cloud, fog, storm, day/night, DM controls and verification checklist.

**How to install:** Extract the full ZIP. Run `github.bat`, enter your existing `Project-Grim` repository path, review copied files, and confirm the Git commit/push. The stage (`index.html`) and DM page (`dm.html`) should both say **LIVING ATMOSPHERE 1.3**. Your saved campaign and Firebase configuration do **not** need resetting.

**Local run:** use `RUN-GRIM.bat` or `node server.js`, then open the stage and DM URLs shown by the launcher.

**Automated tests:**
```sh
node tests/atmosphere-13.test.mjs
node tests/environment-12.test.mjs
node tests/world-anchor.test.mjs
node tests/camera-modes.test.mjs
node tests/optimization.test.mjs
node --experimental-vm-modules tests/state.test.cjs
```

---

# Project Grim 1.2 — Continuous 3D Battlefield

This is the complete standalone site (DM page + player stage) based on 1.1.9.

## New in 1.2

- The **32 × 20 combat field remains the gameplay footprint**, but now sits within
  a much larger continuous 3D landscape. Terrain and distant hills extend beyond
  the encounter, with a dark horizon gradient and genuine 3D distance fog.
- **Ground is still the default camera**, reframed slightly to prioritize the
  combatants. Tactical and Top remain available with animated transitions;
  orbiting never automatically zooms out.
- Floating laminated cards are still **anchored to real 3D ground points**, but
  have no support poles. A diffuse world-space shadow and a subtle ground ring
  reveal their exact locations; the active unit receives a clearer highlight.
- Simplified procedural art has improved **layered trees, embedded stones,
  rolling distant hills, terrain scatter and environment-aware palettes**.
- Rain, snow, leaves and dust occupy a **bounded 3D weather volume** with
  distance attenuation and fog, instead of evenly filling an empty black sky.
- Existing live controls for **terrain width/depth, environment presets, weather,
  props and paths** remain synced across DM and stage.
- The active source moved to `assets/grim-142/` to avoid caching older releases.

## Install

1. Extract the ZIP completely.
2. Run `github.bat` and enter the Git repository path prompted (or Enter for the default).
3. Review the changes, confirm the commit and push, and deploy Firebase Hosting
   separately if that is how you host the site. GitHub Pages needs its normal deploy.
4. Check both pages display **LIVING ATMOSPHERE 1.3** in their header.

**Preservation:** the state key, Firebase paths, player/enemy data, initiative,
no-login workflow, DM controls and Windows launcher are unchanged. Do not reset
campaign data when upgrading.

## Verification

Run all checks using Node:

```
node tests/camera-modes.test.mjs
node tests/rectangle-projection.test.mjs
node tests/world-anchor.test.mjs
node tests/optimization.test.mjs
node tests/environment-12.test.mjs
node --experimental-vm-modules tests/state.test.cjs
```

The sandbox Chromium browser cannot allocate a WebGL context; visual rendering
must be verified on a WebGL-capable browser. These tests validate geometry,
state, camera projection and source structure but **do not establish real GPU FPS**.

---

# Project Grim 1.1.9 — Tactical Perspective Redesign

This release is a **full replacement website**, based on **Locked Camera 1.1.7**. It redesigns the battlefield's physical proportions and camera views rather than patching only the zoom value. Your saved characters, combat data, environment settings, and Firebase state format have not been changed.

## What's new

- **30 × 24 world-unit rectangular battlefield** (previously 35 × 19): more depth so the ground reads naturally from an angled tactical camera. Terrain materials, stone paths, weather and prop scatter all follow the same geometry constants.
- **Tactical** is the default three-quarter perspective at approximately **54° above the horizon**. It fills the stage with intentional slight edge cropping instead of zooming away to show every corner.
- **Ground** switches to a **17° cinematic camera angle**; it is a separate viewer perspective, not the default. Because it is low, some close terrain may be cropped intentionally.
- **Top** offers a **76° overhead perspective** for wider tactical context.
- The three modes transition smoothly (approximately 720ms, or instantly when reduced motion is enabled). All cards stay upright, tied to their fixed world coordinates, and in initiative order within each side.
- The player's stage includes a compact camera switch in the top-right of the battlefield. Its modes are viewer-local; changing camera mode does not overwrite shared campaign data.
- New cache-distinct `assets/grim-141` bundle and **LIVING ATMOSPHERE 1.3** header, to prevent previously cached camera behavior.

**Camera controls:** `1` Tactical, `2` Ground, `3` Top, `0` reset to Tactical, mouse drag/arrows orbit gently, mouse wheel and `+`/`−` zoom, `H` hide stage HUD, `F` fullscreen. All camera controls remain on the player presentation page; DM controls work as before.

## Installing with GitHub Desktop / GitHub Pages

1. Extract this entire ZIP in Downloads, retaining the folder structure.
2. Run **`github.bat`** and paste (or accept) `C:\Users\deste\OneDrive\Documents\GitHub\Project-Grim`.
3. Review the file-copy confirmation and Git changes; optionally let the uploader delete only known old Grim asset-version directories in the repository.
4. Commit/push or let the uploader do so after its confirmation. Wait for the GitHub Pages deployment to update.
5. Open `index.html` and `dm.html` and verify **LIVING ATMOSPHERE 1.3** appears in the header. If it does not, you are viewing an old deployment.

Local testing: run `RUN-GRIM.bat` from the actual Git repository, then open `http://localhost:4174/index.html` and `/dm.html`. No visible sign-in screen is required. Optional anonymous Firebase behavior and secure database rules are unchanged.

## Verification

The new camera test covers three viewpoints, five viewport sizes, stable camera distance during rotation, non-distorted rectangular geometry, and card-anchor persistence. Existing tests cover initiative ordering, state migration and renderer optimizations.

```sh
node tests/camera-modes.test.mjs
node tests/world-anchor.test.mjs
node tests/rectangle-projection.test.mjs
node tests/optimization.test.mjs
node --experimental-vm-modules tests/state.test.cjs
```

**Limitations:** the browser environment here blocks navigation to the local site, so we could verify projection geometry and JavaScript tests but not visually confirm live WebGL appearance or Firefox/Windows behavior. Test the three camera modes on your own display before a session.

---

## Previous release notes (historical)

# Project Grim 1.1.7 — No More Automatic Zoom-Out

**Update based on the latest full Framing 1.1.6 website.** It retains the same 3D battlefield, fixed ground markers, upright player/enemy cards, card ordering, terrain, weather, DM tools, and optional no-login Firebase synchronization. No campaign reset or changes to saved data structures are required.

## Camera fix in 1.1.7

**This update specifically fixes the battlefield shrinking into a small diagonal island when the camera turns.** Earlier builds automatically pushed the camera away to include all four rotated terrain corners. That is no longer allowed.

- The renderer fits the battlefield **once for a neutral, front-facing view**, then keeps the camera at that distance when rotating. Camera distance is not recalculated from rotated corners.
- Camera rotation is intentionally gentler, limited to ±14 degrees horizontally. This protects the rectangular battlefield composition. Extreme drags cannot create the 40-degree tiny-diamond view again.
- You can **zoom in**, but wheel-down/`-` stops at **100%**, preventing accidental extreme zoom-out. Press `0` to return to the neutral view and 100% zoom.
- At a 1650×850 stage viewport, a 40° orbit input previously reduced the ground to approximately **678 px wide**. The same input now clamps to 14°, keeping it approximately **1,444 px wide** in deterministic projection tests. This is **not** a live WebGL screenshot measurement.
- Because the camera no longer retreats to fit extreme rotations, the far edges of the map may be cropped slightly at maximum orbit or higher zoom. This is intentional: the stage stays large and the floating cards remain anchored to fixed positions on the terrain.
- The cache-distinct files live in `assets/framing-117/`; both pages must display **LOCKED CAMERA 1.1.7** after deployment.

**Controls:** drag / left-right arrows = gentle orbit; up-down arrows = minor tilt; mouse wheel / `+`/`-` = zoom 100–150%; `0` = reset; `H` = hide UI; `F` = fullscreen.

## What's improved

- Removed all **10 inactive historical asset folders** and unused root-level legacy assets from the *downloaded package*. Only `assets/framing-117` is loaded. Documentation and current tests are retained.
- Updated the Windows `github.bat` uploader to verify the **current** active asset directory and optionally remove only explicitly named older Grim asset folders from your existing GitHub repository. **It asks before deleting.** It never deletes `.git` or user-created folders.
- Three.js weather continues rendering when active, but it does **not recalculate/rewrite all HTML card positions on every animation frame** unless the camera or cards actually change. Player/enemy card positions remain world-anchored.
- Reused the renderer's temporary card-position vector and cached the current card HTML nodes, reducing garbage generation and DOM lookups during camera movement.
- Limited pointer-driven card tilt changes to one animation frame, instead of repeating a full card-style update for every mouse event.
- Reduced 3D performance-stat collection to once per second. Hidden-tab pausing, procedural instancing, context loss handling, GPU resource disposal, and rectangular geometry are preserved.
- Prevented test files and historic report/changelog markdown from being uploaded to Firebase Hosting. Source/tests are still present in the ZIP.

## Windows update (same workflow)

1. Extract the ZIP, leaving all files and folders intact.
2. Double-click **`github.bat`**. Paste or accept the existing `C:\Users\deste\OneDrive\Documents\GitHub\Project-Grim` repository path.
3. Confirm copying the files, then optionally choose **Yes** to remove older inactive Grim asset folders in your Git repository. These are known versioned copies only; no user art or campaign data are targeted.
4. Review the Git changes before committing/pushing. GitHub Pages deploys when your configured Pages workflow completes. Firebase Hosting is a separate optional upload offered by the BAT.
5. For local use, launch **`RUN-GRIM.bat`** in the repository and open `http://localhost:4174/dm.html` and `http://localhost:4174/index.html`.
6. Check both pages say **LOCKED CAMERA 1.1.7**. If not, the browser is still serving an earlier deployment or cache.

**Test in your Windows browser before a live session.** The anonymous Firebase UID and secure rules have not been touched. This is a maintenance update, not a new campaign setup.

## Local regression commands

```sh
node tests/world-anchor.test.mjs
node tests/rectangle-projection.test.mjs
node tests/camera-frame.test.mjs
node --experimental-vm-modules tests/state.test.cjs
```

See `OPTIMIZATION_REPORT_1.1.5.md` for exact changes and verification limitations.

---

## Prior feature documentation

# Project Grim 1.1.3 — World-Anchored Cards

Combat cards now use fixed 3D battlefield coordinates and follow camera orbit while staying upright. See `ANCHOR_1.1.3_CHANGELOG.md`.

## Rectangular battlefield fix (1.1.2)

- **Fixed the actual cause of the square terrain:** the 1.1 world applied a 1.6× Z/depth scale to the whole terrain group, nearly cancelling its rectangular proportions. The ground is now one **35 × 19-unit rectangle** with no nonuniform world scaling.
- Fixed a regression in the previous WIDTH_MATCH_FIX package: missing `FIELD_W`/`FIELD_D` constants caused a `ReferenceError` before WebGL terrain could load. This build defines those constants correctly.
- Camera now adjusts distance rather than distorting terrain geometry, so the entire rectangular map stays framed at different desktop and mobile aspect ratios.
- Grass, stone, dirt, snow, paths, scatter, weather, fog and props use the same world-space field bounds. The battlefield dimensions remain unchanged; combat cards now use real fixed X/Z anchors on that field.
- The fallback pre-WebGL CSS ground also follows a wider rectangle.
- Cache-safe active assets are in `assets/anchored-113`. Look for **ANCHORED 1.1.3** in both DM and stage headers.

## Foundation — Rectangular 3D Battlefield (1.1.2)

Updated from the completed Environment 1.0 build, itself built directly from Project-Grim_ARENA_0.9_FULL.zip. The new entry points use
assets/anchored-113/ and display ANCHORED 1.1.3. All earlier asset folders
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

Drag across the battlefield or use arrow keys to orbit the camera. Use the mouse wheel or +/- to zoom, and 0 to reset camera orbit and zoom.
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
Check assets/anchored-113/firebase-config.js for your project configuration.
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
shows ANCHORED 1.1.3. No deployment was performed during development.

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

No bundler is needed. Full browser source is in assets/anchored-113/.
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
Firebase paths are unchanged. Look for ANCHORED 1.1.3 in the header.
