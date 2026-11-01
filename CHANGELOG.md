# Project Grim 1.1.9 — Tactical Perspective Redesign

- Redesigned battlefield to **30 × 24** world units, with no nonuniform terrain scaling.
- Added camera presets Tactical (54°), Ground (17°) and Top (76°) with a compact stage switch and smooth transitions.
- Replaced rotation-driven frame fitting with neutral-camera framing; small edge cropping is intentional.
- Adapted PC/enemy positions to the deeper arena without altering initiative ordering or world anchoring.
- Updated world-space ground, props, weather distribution and terrain bounds to shared field dimensions.
- Retained local/Firebase state compatibility, compact DM interface, Windows GitHub uploader, and hidden-tab rendering optimizations.

# Project Grim 1.1.7 — No Orbit Zoom-Out

- Removed the rotation-dependent auto-fit that increased camera distance and shrank the arena into a small diamond.
- Fit the terrain for the neutral camera pose and reuse the distance while orbiting.
- Limited extreme horizontal orbit to ±14° to keep the wide battlefield easy to read.
- Clamped zoom to 100–150%: scroll-down and `-` no longer shrink below the default framing.
- Preserved world-anchored card projection, fixed terrain geometry, all DM controls and campaign-state compatibility.
- Added dedicated camera regression tests and a cache-distinct asset path `assets/framing-117`.

# Project Grim 1.1.6 — Framing that fits the site

- New `framing-116` active asset path so the browser cannot reuse an older camera stylesheet/module URL.
- Rebuilt the camera auto-fit around a higher spectator angle and less extreme padding. The rectangular stage now occupies considerably more of a landscape TV.
- Reduced the default physical card presentation and corrected card-height projection to match the billboard dimensions; fixed world anchors and initiative ordering are unchanged.
- Added mouse-wheel and +/- zoom for manual fine tuning; 0 resets orbit and zoom. Zoom is applied after auto-fit rather than being negated by it.
- Kept environment, weather, DM controls, anonymous Firebase synchronization and Windows uploader; uploader can optionally remove the previous active asset directory.

# Project Grim 1.1.5 — Camera Fit & Stage Proportion Tuning

- Brought the 3D battlefield closer to the viewer so the stage uses more of the available screen space.
- Relaxed the camera auto-fit margins so the arena better matches the site aspect ratio instead of floating in excessive empty black space.
- Reduced the world-anchored combat card size and screen projection scale for a cleaner stage-to-card balance.
- Increased the room canvas size slightly to support the tighter framing.
- Updated projected card height math so tethers and tops remain aligned after the smaller card size change.

# Project Grim 1.1.2 — Rectangle Fix

- Corrected nonuniform terrain depth scale that made the 3D battlefield square.
- Defined the missing terrain constants from the previous patch.
- Set field dimensions to 35×19 world units; all surface details follow bounds.
- Camera auto-fits the full rectangle without distorting 3D geometry.
- Updated fallback CSS shape and versioned assets to bypass stale caches.
- Existing DM/combat, Firebase, no-login, BAT uploader, terrain and weather remain.

# Perspective 1.1 — November 1, 2026

- Removed forced grayscale from all environment materials.
- Green grass/foliage, brown wood/soil, tan sand, cool snow and orange/red/gold autumn leaves.
- Added multicolored instanced leaves with flattened tumbling geometry.
- Replaced orthographic projection with a real perspective camera and deeper map proportions.
- Increased card spacing; projection clearance and screen bounds protect readability during orbit.
- Added camera pullback during orbit to keep more of the battlefield in view.
- Retained campaign state, sync, DM controls, fallback and launch/upload workflows.
- New cache-distinct assets/perspective-110 directory and PERSPECTIVE 1.1 label.

# Changes in Environment 1.0

- Uses the exact ARENA 0.9 FULL archive as its foundation, with new cache-distinct assets/environment-100 entry points.
- Adds a genuine local Three.js world: terrain relief, ground scatter, raised editable paths, light, depth, shadows and world-anchored HTML cards.
- Adds world-space rain, snow, tumbling leaves, dust/sand, wind and shallow 3D fog volumes.
- Adds sparse instanced procedural trees, bushes, tufts, rocks, logs, pillars, ruin blocks, graves and snow mounds, with deterministic reseeding.
- Adds seven live DM presets and terrain/path/weather/wind/fog/prop controls to the existing persisted campaign and synchronization pipeline.
- Preserves scene/combat, anonymous Firebase connector, separate DM/TV pages, global initiative and faction layout, HP/conditions/portraits and spotlight.
- Improves card text contrast/size, compacts the HUD to expose enemy turn ranks, and adapts world proportions on mobile.
- Adds graceful 2D fallback, GPU resource disposal, capped instance counts and hidden-page animation pause.
- Fixes the inherited uploader's missing-asset check to target the active version; retains folder prompt, Git review/push and optional Firebase Hosting deploy.
- Includes full source, local Three.js license, campaign regression tests and a detailed verification report.
