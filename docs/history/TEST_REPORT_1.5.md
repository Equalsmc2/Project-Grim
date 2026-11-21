# Project Grim 1.5.0 — Test Report

## Automated checks

Run all tests with:

```bash
for f in tests/*.mjs; do node "$f" || exit 1; done
node --experimental-vm-modules tests/state.test.cjs
```

The existing camera/roster/HP/status/ambience/environment/save-format checks are preserved. New `tests/refinement-15.test.mjs` covers bounded and validated scene snapshots, save/restore without combat resets, quality profiles and pixel/particle budgets, and integration wiring.

## Browser limitation

A local Chromium smoke attempt to `127.0.0.1` failed with `ERR_BLOCKED_BY_ADMINISTRATOR`; therefore this release **does not claim live WebGL visual or FPS verification**. Automated JavaScript tests cover the available simulation paths, not a full GPU/browser/device benchmark.

## Manual acceptance checklist

- Open stage at 1536×864. Test Ground, Tactical, Top, mouse orbit, wheel zoom and cinematic pan. Every visible card must remain on-screen.
- Set viewer quality Low, Balanced, High; check particle density, shadows and smooth rendering. Quality is local per browser and persists on reload.
- DM > Environment: save Forest at dusk to a named scene. Switch to Snowfield, then apply the saved scene; the environment and scene labels should restore while HP, round and initiative stay unchanged.
- Change fog and cloud sliders; Undo and Redo should restore the prior values. Remote edits should clear local undo history.
- Run a forest with many props, Blizzard, Night, 10+ combatants, Burning + Frozen, and 0 HP shatter. Watch for FPS drops and overlapping cards.
- Confirm audio still requires a viewer gesture to enable and remains muted on that viewer when disabled.
- Test the site on the actual computer / TV used during sessions. Run `github.bat` on Windows against a test clone first.
