# Project Grim 1.5.7 — Organized Music Library

From 1.5.6 baseline. Added a full DM Music tab with game folders, scene categories, search, favorites, local preview, shared play/pause/seek/queue/repeat/shuffle/volume and a compact transport. The Stage now follows music selection after a user gesture, with periodic track progression and ambience ducking when actual music is playing.

Catalogued 230 user-provided tracks: Dark Souls (23), Elden Ring (67), Ocarina of Time (86), Majora's Mask (54). Track files are **not** bundled or published; a PowerShell installer consumes the original archives locally. See `MUSIC_SETUP.md`. This is a music-management feature, not a new distribution license for game soundtracks.

New modules: `music-catalog.js`, `music-playback.js`, `music-library.js` plus `assets/music/catalog.json`, `assets/music/import-manifest.json`, `tools/import_music.ps1`, and `IMPORT-MUSIC.bat`. Original scenery, cards, camera, QA, Firebase settings and existing ambience remain unchanged.
