# Project Grim 1.5.7 — Music Library

The DM now has a **Music** page (separate from environmental Ambience). Songs are grouped by **game** and also by useful scene categories. This is a private local-first library: **the downloadable website contains only track metadata and code, not commercial soundtrack recordings**.

## Included catalogs

| Game | Tracks |
| --- | ---: |
| Dark Souls | 23 |
| Elden Ring | 67 |
| The Legend of Zelda: Ocarina of Time | 86 |
| The Legend of Zelda: Majora's Mask | 54 |
| **Total** | **230** |

All metadata was read from the four archives you provided. Scene groupings are approximate suggestions based on track titles, not official composer metadata. The original archives contain MP3 files; this update replaces the old *loose-file picker* with an organized music browser, not the codecs inside the source recordings.

## How to use on your own computer

1. Extract the complete **Project Grim 1.5.7 website ZIP**.
2. Put your original four soundtrack ZIP archives in one folder. They do **not** need to be unpacked.
3. Run **`IMPORT-MUSIC.bat`** inside the extracted website folder. Paste the folder location containing your four soundtrack ZIPs.
4. The installer reads `assets/music/import-manifest.json`, matches each original ZIP entry, and copies the tracks under `assets/music/<game>/` with stable filenames. It does not change or delete the originals. It uses Windows PowerShell; no Python or FFmpeg required on your PC.
5. Run **`RUN-GRIM.bat`**. Open `http://localhost:4173/dm.html` and navigate to **Music**.
6. Select a song from a game album or a scene folder. It is sent through Grim's existing campaign state. On the Stage page, click **Enable sound** once (browser permission) to hear playback.

You can use the DM **Preview** action to audition a recording only on the DM computer without changing the soundtrack selected for the Stage. The **Monitor locally** checkbox lets you follow the stage playback from the DM page.

**Controls:** search, game albums, scene collections, favorites (local to DM browser), previous/next, play/pause, stop, track seek, volume, repeat and shuffle-on-next. Clicking a song publishes the song to connected stage viewers. Selecting music automatically reduces ambience to 30% *while actual music audio is playing*; music and ambience volumes are separate.

## Files and legal rights

- The soundtracks are copyrighted commercial game music. Your original ZIPs remain local; we do **not** redistribute them in the public website ZIP or upload them to Firebase/GitHub.
- The standard `github.bat` copies site code, ambient sound effects, and music catalog **but explicitly skips the original game music files**.
- `.gitignore` excludes `assets/music/*/*.mp3`, `.ogg`, `.wav` and `.flac`.
- `firebase.json` ignores the entire `assets/music/` directory by default. The website also embeds the catalog in `music-catalog.js`.
- As a result, **the public GitHub Pages / Firebase site displays the catalog but cannot play copyrighted music until you supply media through an appropriately licensed source**. The local-site workflow works with your archives installed. Stage viewers on separate devices likewise need the recordings reachable from the same web origin; local `localhost` files on your machine are not automatically available to remote visitors.
- Do not remove these protections or upload the soundtrack archives to a public host unless you have permission to distribute and stream those recordings.

## Known limits

- No new accounts or login screen have been introduced. Firebase synchronization still uses the existing anonymous session model.
- Song playback uses browser audio; each viewer must explicitly click **Enable sound** after opening the Stage page.
- Timing is synchronized by a shared selection/clock with periodic correction, not sample-accurate multi-speaker audio sync. Expect small differences between devices.
- The importer copies the original files; it does not convert them to another codec.
- All original ambience recordings remain available in **Environment → Ambience**.
- A browser-refresh or a new computer needs the local music files reinstalled to use local preview.
