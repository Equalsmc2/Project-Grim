# Project Grim 1.4.8 — Verification

- Base: full 1.4.7 ZIP. Changes focus on card presentation, active asset path/version and documentation/uploader updates.
- Automated suites include `card-redesign-148.test.mjs` (shape aspect ratio, UV mapping, real extruded backing, status paint, depth test), and all previously bundled tests.
- Real Chromium visit was attempted via local web server, but returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`. No live WebGL screenshot or FPS assertion is claimed.
- On Windows, run the included launcher and test character portrait, burning, frost, HP changes and 0 HP shatter from Ground/Tactical/Top camera angles. Switch Blank/Forest presets; cards should remain depth-tested.
