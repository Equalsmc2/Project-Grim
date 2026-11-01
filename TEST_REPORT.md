# Verification — Environment 1.0

Date: October 31, 2026. Built and tested on Windows with Node 24.22.1 and the
available Chromium-based in-app browser. No production deployment was performed.

## Provenance

Exact source: Downloads/Project-Grim_ARENA_0.9_FULL.zip, 219,275 bytes.
SHA-256: 6F073FE6C86B3550CBCDBA1F603CDACEA824D981A7C81A759192B3881EE523BA
Unpacked and inspected before implementation. Original asset directories remain
unchanged. The active release is assets/environment-100. The existing Windows
Git destination was found and inspected read-only; it was not used as an older
substitute for the requested archive and was not overwritten.

## Automated checks — passed

- Node syntax checks on all active first-party JavaScript modules and server.js.
- tests/state.test.cjs: old campaign migration/default environment; preserved
  custom fields, saved characters, conditions and combat round; faction fallback;
  descending global initiative; numeric bounds and weather validation; local
  persistence; BroadcastChannel emission; storage-event reception; temporary-HP
  absorption; initial cloud snapshot authority; persisted-state reload.
- Local Three.js module loaded successfully without external art/CDN dependencies.
- Current HTML asset and module-import references resolve inside the release.

This is a static ES-module site: no transpilation/bundler build is required.

## Browser interactions — passed

- Local DM and TV stage open separately; build label ENVIRONMENT 1.0 and 3D WORLD.
- All seven environment presets update ground/weather controls and the live stage.
- Added three enemies to four default players; stage received all seven cards.
- Damage changed Fighter 04 from 36 to 31 HP; Frightened condition appeared on
  its stage card; Next turn moved spotlight from Fighter 04 to Fighter 01.
- Reload retained encounter, environment and conditions.
- Maximum rain intensity produced the expected 1,000-instance cap.
- Path rotation changed from 0 to 5 degrees; seed regeneration changed the seed;
  Clear props changed density to zero without clearing terrain/weather.
- Camera arrow-key orbit moves the world and projected card anchors while cards
  remain upright; reset returns the camera to baseline.
- Forced no-WebGL route (?webgl=0) retained all seven cards and displayed the
  explicit fallback label; document bounds remained 1536 x 960.
- Mobile DM environment preset selection worked at 390 x 844; vertical scrolling
  is intentional on mobile, with no horizontal overflow observed.
- No error-level browser console messages observed on the final 3D stage.

## Responsive checks

The browser viewport override did not change its actual 1280 x 720 viewport.
Instead, same-origin iframe viewports were sized and their innerWidth/innerHeight
verified directly. This exercises real CSS breakpoints and Resize events, but is
not a physical mobile-device or touch-hardware test.

| Stage viewport | Encounter | Card overlap | Cards outside viewport | Page scroll |
| --- | --- | --- | --- | --- |
| 1536 x 960 | 4 players / 3 enemies | None | None | None |
| 1366 x 768 | 4 players / 3 enemies | None | None | None |
| 1024 x 768 | 4 players / 3 enemies | None | None | None |
| 390 x 844 | 4 players / 3 enemies | None | None | None |

Descending global ranks were displayed; faction banks remained separated.
Mobile players used two rows, ordered left-to-right and then top-to-bottom.
DM Environment at the three desktop sizes also matched viewport document bounds
without document-level scrolling. The environment panel scrolls internally when
needed. Screenshots led to fixes for card contrast, font size, mobile map shape,
and HUD clearance above enemy turn markers.

## Resource observations

Renderer-reported snapshots (not a GPU benchmark):

- Autumn preset, 250 leaf particles: 12 render calls, 33,506 triangles,
  12 geometries, pixel ratio 1.5.
- Grass/path, maximum rain, props cleared: 6 render calls, 24,870 triangles,
  1,000 rain instances, 7 geometries, pixel ratio 1.5.

Source limits: 1,000 rain / 500 other particles, 65 prop placements, 1,100 ground
scatter instances, 18 fog volumes, 1,024-square directional shadow map, 1.5 pixel
ratio. Static scenes are demand-rendered; animated scenes use requestAnimationFrame
and stop on document.hidden. Replacement geometry/materials are disposed.
Frame rate, GPU time, battery use, long-running memory trends and pause/resume
on physical background tabs were not benchmarked. No universal FPS claim is made.

## Unverified / limitations

- Live Firebase sign-in, rules authorization, actual remote network synchronization,
  Git commit/push and Firebase Hosting deployment were not executed. Connector,
  configuration and rules were retained from 0.9; cloud-state ingestion was
  exercised with a simulated incoming snapshot.
- Windows BAT workflows were inspected, not launched end-to-end because uploader
  actions would alter the user's repository/remotes. The launcher server was
  run directly; the asset-path check in both uploader aliases was corrected.
- Forced fallback was tested; hardware WebGL failure/context loss/restoration
  was not induced. Browser cache back/forward restoration was not tested.
- Props, surfaces and fog are lightweight procedural placeholders. Fog uses
  shallow 3D ellipsoids, not physically simulated volumetrics; path edges use
  scattered geometry rather than texture splatting.
- Very large rosters, unusually long labels, extreme orbit angles, all phone
  orientations, old browsers and every GPU are outside this validation sample.
- Mobile DM has vertical page scrolling; the TV stage has none at tested sizes.
- Embers/ash and individual prop dragging are not implemented in this foundation.

## Reproduce

Run RUN-GRIM.bat, then open tests/responsive.html on that server for the viewport
harness. Change size/page and use the embedded DM controls. The on-screen report
checks document dimensions, card intersections and renderer counters. Run:

    node --experimental-vm-modules tests/state.test.cjs

Test on a separate local port/profile if you do not want sample edits to affect
an existing browser-local campaign. Do not enable Firebase during isolated QA.
