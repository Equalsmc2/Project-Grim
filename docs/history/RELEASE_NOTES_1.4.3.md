# Project Grim 1.4.3 — Cinematic Pan & Occlusion Stability

Base: Project Grim 1.4.2 (all five uploaded ambience files preserved).

- Added DM Environment toggle for automatic cinematic camera pan and 0.35–2.5× pan speed.
- Added stage `Auto pan` button and `C` shortcut, synced without continuous Firebase writes.
- Gentle ±12° world-space orbit and ±1.7° tilt, using the current camera preset and fixed zoom (no retreat).
- Direct manual dragging/arrow/wheel briefly pauses automatic motion; camera resumes gently.
- Replaced intermittently generated PNG card occlusion masks with native vector clip-path calculated on the same frame as card projection.
- Fallback for browsers lacking CSS vector paths: smooth opacity for foreground occlusion, never flashing bitmap masks.
- Preserved Ground camera default, 3D weather, player and enemy formations, initiative, ambience, and no-login Firebase.

Tests: run the bundled tests; browser playback and WebGL hardware must be verified on the user's machine.
