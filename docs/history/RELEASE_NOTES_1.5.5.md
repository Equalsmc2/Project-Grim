# Project Grim 1.5.5 — Presentation & Accessibility Polish

Built on Project Grim 1.5.4. All changes are additive and keep the saved-campaign schema intact.

## Changes

1. **Motion preference per viewer**: System follows OS settings; Reduced stops auto cinematic panning, card hover and foil animation, shatter bursts, and lightning flashes; Full allows them. The selection lives in the viewer's `localStorage` and is not synchronized to other players or the DM. Weather and manual camera control remain available in Reduced mode.
2. **Keyboard quality**: focus outline improvements; DM sidebar arrows and Home/End navigate its pages; current page is announced with `aria-current`. Added meaningful labels to HP and condition controls. Hotkeys now respect browser Ctrl/Cmd actions and focused editing/buttons.
3. **Narrow-screen behavior**: horizontal-scroll DM navigation replaces a tall stack on phone/tablet, and the DM editor no longer slides offscreen at widths around 768px. Stage camera controls, graphics and motion settings, and audio controls avoid overlapping on narrow viewports.
4. **Visual restraint**: no changes to native card design, world geometry, weather art, ambient sound files, or combat layout except responsive positioning.
5. **QA**: new motion and accessibility regression tests; optional `npm run test:layout` static Chromium check (no server or Firebase needed).

## Installation

Extract the complete ZIP. Run `github.bat` and enter the existing Project-Grim repository folder. Both pages display `ACCESSIBILITY 1.5.5`. The update preserves anonymous Firebase authentication and old campaign/scene save data. The GitHub uploader does not reset any data.

## Verification and limits

- `npm test`: 34 of 34 Node tests passed.
- `npm run test:quick`: includes new accessibility checks.
- `python tools/check-layout.py`: passed 14 static Chromium viewport checks at phone/tablet/desktop sizes, including horizontal overflow and overlapping presentation controls.
- Actual live stage WebGL, GPU frame times, keyboard screen-reader walkthrough and Firebase service were not verified in the build environment.
