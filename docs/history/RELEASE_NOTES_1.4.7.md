# Project Grim 1.4.7 — Card FX Polish

Built from the complete **Project Grim 1.4.6** release, with the real 3D laminated cards retained.

## Visual changes

- **Burning:** denser edge-bound moving flames, warmer iridescent foil, brighter edge trim, and sparse drifting embers. Effects prioritize the portrait and borders so the name and combat numbers remain readable.
- **Frozen:** sharper branched frost crystals at card edges, cool pearlescent finish, a frost band at the top of the portrait, and an animated ice sparkle.
- **HP cracking:** cracks have persistent deterministic seeds and **grow continuously** with damage, rather than jumping to a completely new random pattern at each HP threshold.
- **0 HP:** a transition from positive HP to zero triggers a **one-shot physical shatter burst** of 24 texture-mapped triangular pieces. The pieces burst outward, rotate and fade, then are disposed. A permanently fractured/broken version of the card remains on stage and continues to show its stats.
- **Healing/revival:** stops and removes unfinished shatter fragments, restores the card's appropriate HP wear state.
- **Status stacking:** burning and frozen can apply simultaneously without changing initiative or combat rules. Added `Burning` and `Frozen` to the DM condition picker; these are presentation labels, not Pathfinder 2e mechanical automation.

## Technical changes

- The real Three.js card scene and native depth occlusion are preserved; shards share that scene and obey object depth.
- Card FX now request animation frames even if weather and cinematic panning are disabled. Static cards do not continuously repaint.
- Animated finish textures refresh on a limited cadence; active weather/camera rendering is otherwise unchanged.
- Shatter graphics exist only during the transition; temporary geometries and materials are disposed afterward.
- OS reduced-motion preference suppresses ongoing status motion and skips the flying shatter burst while retaining the finished broken design.
- New cache-safe `assets/grim-147` folder.
- No change to character health rules, damage automation, campaign state schema, local/Firebase sync, or required login.

## Manual verification checklist

1. Start in Combat mode with at least one player and enemy, turn on a Forest or Ruins preset.
2. Add a condition containing `Burning` to a character: look for flowing fiery foil and embers.
3. Add a condition containing `Frozen` or `Freeze`: look for icy crystals and blue shimmer. Check both statuses together.
4. Reduce that character from full HP through 70%, 45%, 20%, then 5%: the **same cracks** should extend and multiply.
5. Set HP to exactly 0 from a positive value: watch the shards burst and fade, leaving a heavily fractured card still readable.
6. Heal above zero: the shatter fragment animation should cancel and the card should recover its wear state.
7. Switch environment presets and rotate the camera; the cards and shards should remain world-anchored and naturally depth-tested by props.
8. Reload while a character is already at zero: it must show the broken state without replaying the shatter burst.

All five ambience MP3s, existing DM pages, no-login sync flow, and the Windows folder-prompt GitHub uploader remain included.
