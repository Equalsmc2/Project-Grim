## 1.4.13 — Matte Card Finish

- Replaced baked, broad white laminate streaks with subtle metallic edge catches and a deep-charcoal satin base.
- Reworked the GPU foil map into one narrow, mostly transparent specular stripe instead of several overlapping full-face streaks.
- No foil overlay at all on regular inactive cards, and lower opacity on active/status cards; retained Burning and Frozen finishes.
- Darkened placeholder portrait gradients to preserve contrast; lightly refined backing roughness and metallic edge treatment.
- Updated fallback HTML card gloss to match the restrained matte design.
- Preserved 1.4.12's static card texture caching and foil offset-only animation (no frame-by-frame card texture uploads).
- Isolated the active assets in `assets/grim-1413` to prevent browser cache reuse.

## Project Grim 1.4.12 — Performance & Stability

- Eliminated periodic full-card canvas repaints and GPU texture uploads for animated Burning/Frozen cards; retained moving GPU foil.
- Reduced card face pixel allocation from 640×1072 to 480×804, with unchanged logical card proportions.
- Split camera/layout updates from lightweight foil/shatter animation.
- Cached portrait decoding through HP/condition changes, bypassed invisible HTML fallback mouse tilts, and avoided unchanged initiative HUD rebuilds.
- Added 16-combatant A/B performance measurements and regression tests, plus `window.grim3DStats.cardPerformance`.
- Updated cache-distinct asset path `assets/grim-1412` and retained existing UI, content, audio, local/Firebase sync and Windows uploader.

## Project Grim 1.4.11 — Camera Stability Repair

- Fixed the 1.4.10 regression that could push the camera to **6% zoom** and make the battlefield tiny.
- Replaced extreme camera retreat with a bounded safety fit and adaptive card-only scale for crowded encounters.
- Protected all card corners during zoom, cinematic pan, camera transitions and resizing without making the entire environment vanish.
- Fixed cumulative camera retreat on repeated combat state updates.
- Added a 20-update stability regression and retained the 216-case framing test.
- New cache-safe `assets/grim-1412` with GitHub uploader references updated.

## Project Grim 1.4.9 — Card Finish Fix

- Corrected 1.4.8's old-card canvas transform: Burning and Frozen finishes now cover the actual tall card face.
- Strengthened orange flame edge/foil treatment and subtle frosted glass border, staying clear of core stats.
- Refined damage into deterministic, branching portrait-laminate fractures with small critical stress halos.
- Added roster-aware safe zoom in Ground/Tactical/Top views to keep visible cards within the stage frame.
- Updated stage zoom indicator and added a focused regression test and visual preview page.
- Cache-safe `assets/grim-1412` bundle; installer and no-login campaign state preserved.

## Project Grim 1.4.8 — Slim Card Redesign

- Changed native card proportions to **160×268 (1:1.675)**, taller/slimmer than 1.4.7.
- Replaced both face and physical backing with rounded, UV-mapped, softly beveled 3D geometry.
- Retuned dark-metallic frame, taller portrait, slim name area and open stat strip.
- Preserved depth-correct occlusion, burn/frost foil, HP crack progression and live 3D shatter.
- Created cache-distinct `assets/grim-148` and updated GitHub uploader/test references.

## Project Grim 1.4.7 — Card FX Polish

- More dramatic flame foil/embers and layered crystalline frost on native cards.
- Persistent, continuous HP crack growth; highly fractured 0 HP state.
- Real, texture-mapped, depth-tested 24-piece shatter burst on positive-HP to 0 HP transitions, with cleanup and revival handling.
- Card effects continue animating even without moving weather; reduced-motion preference respected.
- Cache-distinct `assets/grim-147` and updated folder-prompt GitHub uploader.

## 1.4.6 — Premium Card FX

- Kept true Three.js world-anchored card occlusion, but upgraded the card art back toward a sharper premium laminated presentation.
- Added richer native card framing, portrait panel styling, cleaner stat capsules, stronger active-turn emphasis, and a thin 3D shell/backing.
- Added status-finish visuals for **burning** and **frozen** cards.
- Added progressive HP wear: scuffs, cracks, heavy fractures, and a shattered vinyl-style 0 HP state.
- Added lightweight animated refresh for burning/frozen/dead/heavily damaged cards while leaving ordinary cards stable and efficient.
- New cache-distinct `assets/grim-146` directory remains the active bundle.


## Project Grim 1.4.4 — Preset recovery fix

- Removed a stale undefined occlusion variable that crashed environment reconstruction after changing presets.
- Added runtime scene-rebuild regression coverage for Blank → other preset transitions.
- Updated active assets to `assets/grim-146` so browsers fetch the corrected code.

## Preset Fix 1.4.4 — Pan and Stable Occlusion

Automatic cinematic camera orbit and tilt; removes intermittent raster mask generation that caused card stutter when passing scenery.

# Project Grim 1.4.2 — Environment Ambience

- Five user-supplied MP3 ambience tracks: wind, thunderstorm, desert wind, blizzard, gentle rain, plus Off.
- New compact Ambience panel in DM Environment with track choice, shared volume, and local preview.
- Player stage follows selection and volume through existing local/Firebase campaign sync without uploading the audio files into database.
- A visible Enable sound control respects browser autoplay restrictions; players/TVs can mute locally without changing DM selection.
- Smooth ~850ms crossfades and continuous looping; tracks are lazy loaded only when selected and enabled.
- Cache-safe `assets/grim-142` bundle and updated Windows GitHub uploader.

## Depth-Aware Cards 1.4.1 — Natural Prop Occlusion

- Added camera-depth-aware masking to world-anchored HTML cards: nearer trees, rocks, bushes, ruins, pillars, logs, gravestones, and snow mounds can naturally hide portions of a card.
- Occlusion follows the Ground / Tactical / Top camera views, zoom, orbit and prop regeneration. Scene props behind a card do not obscure it.
- Masks are computed from projected prop silhouettes only when camera/card positions change (throttled during camera transitions), avoiding extra WebGL draw calls and preserving sharp typography.
- Preserved all 1.4 world polish, weather, lighting, DM controls, local/cloud synchronization and Windows uploader.

## Project Grim 1.4 — World Polish & Immersion
- Seeded, path-aware clustered scenery, with safe combatant lanes.
- Lighting/shadow refinements, nighttime card contrast and low-motion active hover.
- Dynamic wet, snow and sand ground accumulation and prop tone reactions.
- Better valley mist and smooth ground effect transitions.
- Optimized render allocations and coalesced cloud updates, no changes to anonymous sign-in.
- Separate `grim-141` asset directory, preserved Windows path-prompt uploader.

## Living Atmosphere 1.3 — Sky, Sun/Moon, Clouds and Storms

- New dynamic sky and celestial lighting with optional day/night clock.
- Instanced 3D clouds, nighttime stars, real sunlight/moonlight, and smooth atmosphere transitions.
- Blizzard, sandstorm, thunderstorm, denser fog, storm-colored haze and wet-ground shading.
- Compact DM atmosphere controls, presets and persistent Firebase/local sync state.
- Cache-distinct active assets in `assets/grim-141`, full GitHub uploader retained.

## Continuous World 1.2.2 — Terrain Grid + Hill Profiles

- Replaced the center-limited grid helper with a terrain-following grid overlay so blank and stone floors read as a full-surface grid across the whole continuous landscape.
- Added **Hill profile** environment options: **flat**, **small**, **mid**, and **mountains**.
- Presets now choose sensible default hill profiles while still allowing manual override in the DM environment editor.

## Continuous World 1.2.1 — Path and Grid Continuity Fix

- Extended generated stone paths so they continue across the full continuous terrain instead of stopping near the encounter core.
- Expanded stone/blank floor grid coverage to span the entire visible terrain surface, not only the inner combat rectangle.
- Kept the continuous-world renderer, world-anchored cards, and Ground-default camera behavior unchanged.

# Project Grim 1.2 — Continuous World & Presentation Pass

- Replaced the standalone terrain slab with an extended height-mapped ground mesh
  and distant rolling hills; no abrupt floating-board edge.
- Added atmosphere sky dome and environment-matched depth fog.
- Tuned Ground/Tactical camera composition around the actual encounter.
- Removed card support poles; added diffuse terrain contact shadows and subtle
  animated-turn highlighting. Anchors remain world-fixed, cards remain readable.
- Added layered low-poly tree shapes, distant scenery, terrain-following scatter.
- Improved weather 3D volumes with bounded distribution, fading and better fog.
- Preserved the existing DM editor, Firebase/no-login sync, and GitHub BAT uploader.
- Cache-safe `assets/grim-141` version.

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
