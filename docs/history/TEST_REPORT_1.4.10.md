# Project Grim 1.4.10 — Verification

- Existing `.mjs` tests and the `--experimental-vm-modules` saved-state test: **passed**.
- New `tests/card-visibility-1410.test.mjs`: **216 scenarios passed**, testing six viewport sizes, three camera modes, three orbit angles and four roster sizes. The test also simulates a cinematic sideways camera offset and projects all physical card corners after framing.
- An already-safe camera was verified to remain unchanged.
- Syntax checks, zip references and archive integrity verified.

**Browser limitation:** Chromium was installed but localhost navigation failed with `ERR_BLOCKED_BY_ADMINISTRATOR`. A live WebGL image, Firebase session, FPS profile and TV display were therefore not verified here.
