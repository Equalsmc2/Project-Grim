# Project Grim 1.4.11 — Test Report

## Root-cause reproduction
- Previous version could return a zoom of `0.06` when the card-layout guard considered a formation too wide for the default view.
- This produced a ground-view camera distance above 400 world units for an ordinary two-row encounter.
- The new version keeps the requested 100% zoom where possible and uses bounded retreat and adaptive **card-only** scaling to preserve visibility.

## Automated test coverage
- Passed 216 viewport/roster/view-mode/orbit combinations, checking all projected card corners.
- Passed a new 20-step repeated-update stability regression: the same cards no longer cause cumulative camera distance changes.
- Passed saved-campaign-state migration, terrain preset recovery, native card updates and FX, weather, ambience, and camera mode regressions.
- Syntax checks passed for the revised camera, world and card-rendering modules.

## Limits
- A live visual WebGL test was attempted but Chromium blocked localhost navigation (`ERR_BLOCKED_BY_ADMINISTRATOR`). The release has not been visually verified in a live browser.
- A physically obstructing prop can still hide a card because cards use true 3D depth testing. The framing guarantee is for screen boundaries, not visibility through opaque terrain.

## Deployment
- ZIP contains the complete stage and DM site, GitHub uploader, local launcher, 5 audio recordings and source tests.
- Both page references point to `assets/grim-1411`.
