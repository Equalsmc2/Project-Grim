# Project Grim 1.4.6 — Premium Card FX

This build starts from the latest **1.4.5 full website** and focuses on making the in-world cards look better again while keeping true Three.js depth occlusion.

## Main goals

- Keep **real 3D world-anchored cards** in the same WebGL scene as the terrain and props.
- Improve the visual quality so the cards feel closer to the nicer laminated/Java-style presentation.
- Add readable **status-finish effects** and **HP damage wear**.
- Preserve all existing Project Grim systems: ground camera default, terrain presets, weather/atmosphere, ambience, compact DM UI, initiative order, no-login Firebase workflow, and GitHub BAT uploader.

## New in 1.4.6

### 1) Premium laminated card presentation
- Reworked the native 3D card texture art with a richer frame, cleaner portrait panel, improved stat capsules, better footer tags, and stronger active-turn emphasis.
- Added a subtle **laminated gloss/foil treatment** so the cards feel collectible and premium instead of plain slabs.
- Added a thin **3D shell/backing** behind each card so the cards feel more like physical objects in the world.

### 2) Hybrid look: sharp UI cards + real world depth
- Cards remain **true Three.js objects** that are naturally occluded by trees, rocks, ruins, and other stage props.
- The visual style is tuned back toward the sharper UI-card look rather than the rougher fully-native 3D slab look.
- Preserved the HTML fallback when WebGL is unavailable.

### 3) Status-finish effects
- **Burning / fire-like conditions** now add a warm fiery sheen and ember-like treatment.
- **Frozen / frost / ice-like conditions** now add frosted edges and a cold crystalline finish.
- Effects are designed to stay readable and not obscure the name, HP, AC, or initiative.

### 4) HP wear and shatter progression
- Cards now gain increasing visual wear as HP drops:
  - light scuffs at moderate damage
  - visible crack lines as HP gets low
  - heavy fracture treatment near 0 HP
  - shattered vinyl-style damage presentation at **0 HP**

### 5) Animated polish
- Active cards retain a subtle hover/bob and foil response.
- Burning/frozen/dead/heavily damaged cards repaint on a light animation cadence so their finish effects stay alive without repainting every card every frame.

## Preserved systems

- Ground camera remains the default.
- Tactical and overhead views still work.
- World continuity, live 3D terrain, atmosphere, hills, ambience, and DM environment controls remain intact.
- Initiative order and current turn display are unchanged.
- Compact DM UI, local persistence, anonymous/no-login Firebase sync, and GitHub BAT uploader are preserved.

## Asset bundle

This release uses the cache-safe active bundle:

- `assets/grim-146`

Both `index.html` and `dm.html` point to the new bundle.

## Notes

- Existing campaign data remains compatible.
- No reset is required.
- The included automated tests were updated to point at the active `grim-146` bundle.
