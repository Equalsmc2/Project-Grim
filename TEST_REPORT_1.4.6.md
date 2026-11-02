# Project Grim 1.4.6 — Test Report

## Build under test
- Release: **Premium Card FX 1.4.6**
- Active asset bundle: `assets/grim-146`

## Automated test runs completed

All `.mjs` tests were run with `node`, and the legacy state test was run with `node --experimental-vm-modules`.

### Commands exercised

```sh
node tests/ambience-142.test.mjs
node tests/ambience-playback.test.mjs
node tests/atmosphere-13.test.mjs
node tests/camera-frame.test.mjs
node tests/camera-modes.test.mjs
node tests/card-fx-146.test.mjs
node tests/cinematic-143.test.mjs
node tests/environment-12.test.mjs
node tests/native-cards.test.mjs
node tests/optimization.test.mjs
node tests/polish-14.test.mjs
node tests/preset-rebuild.test.mjs
node tests/rectangle-projection.test.mjs
node tests/world-anchor.test.mjs
node --experimental-vm-modules tests/state.test.cjs
```

## Result summary

All listed automated tests passed.

### Coverage highlights
- **Atmosphere / ambience**: preserved 1.3 + 1.4.2 behavior.
- **Camera framing / stage geometry**: preserved ground/tactical/top framing expectations.
- **Continuous terrain / world anchors**: preserved 32×20 play footprint within continuous 3D terrain.
- **Preset rebuild regression**: repeated Forest/Blank/Snowfield/Ruins/Desert switching still works.
- **Optimization / packaging**: confirmed active bundle usage and resource cleanup.
- **Native card system**: confirmed world anchoring, depth-tested materials, texture updates, lifecycle cleanup.
- **New 1.4.6 premium card FX**: added explicit checks for burning/frozen condition parsing plus heavy-damage / zero-HP render paths.
- **State migration / persistence**: legacy state migration and storage sync passed using the VM-modules test.

## Manual limitations

The build environment used here did not include a full visual browser QA pass against a live deployed URL. The code was modified, automated tests were run, and the site was packaged successfully, but final subjective visual tuning should still be checked in-browser after deployment.

## Expected visible verification after deployment

Confirm these items manually in the browser:
- Stage header shows **PREMIUM CARD FX 1.4.6**.
- DM header shows **PREMIUM CARD FX 1.4.6**.
- Burning cards show a fiery sheen.
- Frozen cards show frosted edge treatment.
- Low-HP cards show progressive cracking.
- 0 HP cards show the heaviest shattered presentation.
- Cards still remain occluded naturally by world props without flashing back to old mask behavior.
