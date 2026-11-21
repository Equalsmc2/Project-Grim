# Project Grim 1.5.4 — Test Report

**Base:** Project Grim 1.5.3 full ZIP.

## Results

- Full `npm test`: **33/33 passed**.
- Quick `npm run test:quick`: **9/9 passed**.
- `node --check` on every active first-party `.js` module: **passed**.
- Local HTTP test: stage, DM page, JavaScript, CSS and audio served successfully; private-file paths blocked.
- Simulated anonymous Firebase integration: DM initial read, transient write failure, coalescing with newer edits, stale cloud echo protection, manual restore of a previous-session unsynced revision, read-only viewer and disconnect: **passed**.
- Scene backups: round-trip validation, invalid/oversized payload rejection, duplicate-ID handling, newest-12 merge, safe combat preservation: **passed**.
- Environment Undo/Redo: discrete snapshot actions, drag coalescing, redo invalidation and combat preservation: **passed**.
- Existing session stress, camera, terrain, card FX, ambience, atomic preset rebuild, resource lifecycle and state migration suites: **passed**.

## Browser and external service limitations

- Optional Playwright browser smoke run: **SKIPPED** because the execution environment blocked browser navigation to localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`). This is **not** a successful visual QA run.
- Live Firebase rules/auth synchronization, production network outages, browser-storage deletion, actual WebGL appearance and physical-device FPS remain **unverified**. Mocked integration tests are not a substitute for real connectivity checks.
- This update does **not** implement automatic reconciliation of simultaneous DM devices. Recovered prior-session edits require an explicit manual Publish.

## Run checks on Windows

Use `RUN-TESTS.bat`, or `npm test` with Node installed. Optional browser smoke: `npm run test:browser` after Playwright and Chromium are installed. Machine-readable results are generated in `qa-reports/`.
