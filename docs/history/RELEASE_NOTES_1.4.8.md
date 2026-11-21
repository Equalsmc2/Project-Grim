# Project Grim 1.4.8 — Card Redesign

This is a complete website build on the **1.4.7 Card FX Polish** release, not a standalone card preview.

## Visual changes

- **Tall tarot/dossier silhouette:** face changed from 174 × 240 (1:1.38) to 160 × 268 (1:1.675). Screen-space height increases slightly while the width decreases.
- **Real rounded geometry:** new rounded, UV-mapped Three.js face/foil geometry plus a subtle extruded, beveled back. No square backing or fake CSS occlusion.
- **Refined material:** quieter silver/chrome hairlines, deep charcoal vertical gradient, inset accents and a compact top plate. Active cards have a restrained luminous edge rather than a solid white frame.
- **Tall portrait:** more of the card is devoted to the character illustration, with a gently shaded image area.
- **Airy typography:** clear name/class rows, hairline separators and a three-column stats strip without three dark rectangular boxes.
- **Premium status finishes:** 1.4.7 animated flames, crystalline frost, persistent crack growth and the 0-HP shatter all remain. The older finish artwork is remapped and clipped to the new silhouette.

## Unchanged

All world/weather/camera/ambience presets, cinematic pan, combat data, initiative order, separate DM page, world-anchoring, real tree/card occlusion, legacy HTML fallback, Firebase sync without visible login, and Windows uploader remain.

## Installation

Extract this full package, run `github.bat`, enter the destination repo folder, and follow the prompts. The website stage and DM headers should display **CARD REDESIGN 1.4.8**. This version uses the cache-distinct `assets/grim-148/` directory; no campaign reset or Firebase rules changes are necessary.

## Known limits

The current build uses canvas-drawn textures for native cards (4x resolution). The foil is a lightweight 3D additive overlay, not ray-traced reflections. A live WebGL aesthetic inspection was not possible here because browser navigation to local addresses was blocked; final visual judgments should be made after deployment.
