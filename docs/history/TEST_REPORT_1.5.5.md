# Project Grim 1.5.5 — Test Report

Baseline: 1.5.4 full ZIP. Active bundle: `assets/grim-157`.

## Results

- 34/34 automated Node regression suites passed after changes.
- New `accessibility-155.test.mjs`: System/Reduced/Full preference logic, OS override, rendered card shatter suppression and GPU cleanup, status animation suppression, navigation helper behavior and source wiring.
- 14/14 static Chromium layout checks passed for `dm.html` and `index.html` at 360, 390, 560, 768, 900, 1024 and 1366 px. Found and fixed the tablet DM sidebar issue during testing.
- JavaScript syntax and asset-link integrity passed as part of the existing suite.
- Optional full browser smoke test was attempted but local navigation was blocked by the browser environment. No assertion of real WebGL FPS, rendered appearance, or live Firebase connectivity is made.

### Known limits

Reduced Motion removes voluntary camera and card FX motion, but explicitly configured environmental weather may still animate. Graphics quality remains a separate per-viewer setting. The fallback static layout check cannot assess 3D card readability or performance.

### Commands

```bash
npm test
npm run test:quick
npm run test:layout   # Optional: needs Python Playwright and Chromium
npm run test:browser  # Optional: live local website and WebGL browser QA
```
