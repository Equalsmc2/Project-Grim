# Project Grim 1.4.12 — Performance & Stability

This is a performance-maintenance release based on the full **1.4.11 Camera Stability** website, preserving its combat presentation, native 3D cards and FX, card-visibility camera rules, cinematic pan, world environments, ambience, DM UI, and no-login Firebase/local sync.

## Primary fix: Burning/Frozen lag

- Before: every affected high-resolution card was rasterized again in Canvas 2D and uploaded to the GPU roughly every 100ms during animation.
- Now: the card face is painted **only when card data or portrait changes**. Its moving flame/frost sheen is animated using a small existing GPU foil texture, rather than repainting and re-uploading the entire face.
- Maintains warm flame borders, embers, crystalline frost, readable stats, laminate cracking, active-card highlighting, and the 0-HP shatter.
- Animated status-only frames are capped near 30 FPS when no other scene motion needs rendering. Weather, manual camera motion, and cinematic pans remain free to use the normal frame cadence.

## Additional optimizations

- Reduced per-card texture resolution from **640 × 1072** to **480 × 804**, still 3× the 160 × 268 logical card dimensions. This reduces raw card-face pixel memory by **43.75%**.
- Separated card-layout projection from ongoing foil/shatter updates. Unchanged camera positions are not recalculated on each status-animation frame.
- Cached decoded portrait images across HP and condition changes; only a *new* portrait triggers an image decode.
- Skipped hidden HTML fallback tilt/mouse-move updates whenever the real 3D renderer is active.
- Skipped unnecessary initiative-strip HTML replacement when the initiative data has not changed.
- Added card performance counters to `window.grim3DStats.cardPerformance` for troubleshooting.
- Preserved 3D resource cleanup, low-motion handling and hidden-tab suspension.

## No changes to campaign state

No data migration or Firebase reset is needed. Audio files remain separate in `assets/audio/` and are loaded only when selected.

## Testing limitations

The automated Node suites, synthetic multi-card benchmark, syntax checks, and ZIP integrity check were run. Chromium live navigation to localhost failed with `ERR_BLOCKED_BY_ADMINISTRATOR`, so real FPS and the final GPU appearance remain unverified in a live browser. See `TEST_REPORT_1.4.12.md`.
