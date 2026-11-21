# Project Grim 1.5.8 — Design Refinement

This is a **focused application of the user's original design philosophy**, not a new theme or feature expansion. Base: Music Library 1.5.7.

## Changes

- Removed redundant prototype/test labels and explanatory filler from the visible DM and Stage interfaces. Kept meaningful status, navigation, and error/security guidance.
- Removed the oversized placeholder scene sigil from the Overview and replaced it with live **ground, weather, local time-of-day setting, and music state**, plus links to Scene and Environment.
- Gave more usable height to the music list on desktop and reduced its decorative player block. The library still organizes music by game, favorites and scene, with transport and previews intact.
- Removed duplicated section headings already conveyed by the DM page title, leaving primary action controls easily accessible.
- Tightened spacing and hierarchy on the dark monochrome UI. Retained natural document scroll for small and short screens where necessary for accessibility.
- Added `DESIGN_PRINCIPLES.md` and a dedicated automated design-contract test.
- Updated active asset path to `assets/grim-158` to avoid stale cached CSS/JS.

## Retained

3D world, Ground camera, all-cards-visible safeguards, native cards, Burning/Frozen/HP fracture, scene/combat modes, enemy/player order, weather, ambience, music library, prepared scene snapshots, Undo/Redo, local/Firebase sync and no-login DM workflow. Original user-provided soundtrack audio stays out of the public website package.

## Test limits

Static Chromium screenshots and layout checks are not proof of real WebGL performance, live Firebase operation or soundtrack hosting. No live backend was changed.

## Installation

Extract the full package and run `github.bat`, entering the local Project-Grim Git repository. The BAT's existing confirmation and safe Git push logic are preserved. An audio-free website-update ZIP is provided for repositories with ambience already installed.
