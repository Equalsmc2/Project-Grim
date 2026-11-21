# 1.4.2 — Ambience Sound Integration

Built on Depth-Aware Cards 1.4.1. No changes to 3D renderer, player/enemy cards, camera, DM combat controls or Firebase authentication.

Tracks are provided by the user and preserved as MP3. Long files stream on demand; expect approximately 30 MB of audio assets on the hosting server. Audio files themselves are never stored in Firebase Realtime Database.

To verify manually:
1. Open DM → Environment and select Gentle rain; choose ~50% volume.
2. On the stage, click Enable sound once. Confirm continuous rain audio, no prompts or login.
3. Switch to Wind, Blizzard, Thunderstorm and Desert wind. Verify a short crossfade.
4. Change volume, switch to Off, then back to a track. Check the stage follows without another click.
5. Click Preview in DM. Only the DM browser should preview; Stop preview and switch tracks.
6. Check sync between two tabs and, if configured, separate Firebase-connected devices.
7. Check the stage with no WebGL; audio must still work independently.
8. Check the dark no-scroll desktop layout and the compact ambience panel.

Browser autoplay, actual sound output, and cloud permissions require testing in your own deployed setup.
