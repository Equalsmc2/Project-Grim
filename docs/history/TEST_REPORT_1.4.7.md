# Project Grim 1.4.7 — Verification report

## Automated checks

Run from the extracted project root:

```sh
for t in tests/*.mjs; do node "$t" || exit 1; done
node --experimental-vm-modules tests/state.test.cjs
```

Includes new `card-fx-147.test.mjs` testing damage severity, combined conditions, one-shot shatter, 3D fragment animation, revival cleanup, end-of-animation disposal, and frame scheduling. Existing tests cover world anchors, camera, ambient audio, atmosphere, preset switching, state migration, initiative, and optimization.

## Browser limitation

A Chromium navigation attempt to `http://127.0.0.1:8766/fx-preview.html` returned `net::ERR_BLOCKED_BY_ADMINISTRATOR` in this environment. No live WebGL screenshots, real GPU FPS or visual interaction results are claimed. Use the manual checks in `RELEASE_NOTES_1.4.7.md` after installing.
