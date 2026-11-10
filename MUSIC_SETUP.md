# Project Grim — Music Library (1.5.9)

The music browser lists **276 tracks in seven albums**: Dark Souls (23), Elden Ring (67), Ocarina of Time (86), Majora's Mask (54), Hollow Knight (26), Dragon Quest I & II (19), and Other (1).

## Use it on your hosted website

1. Publish the latest **website code** (not soundtrack audio) to GitHub Pages or your usual host.
2. Open the hosted **DM page → Music**. Choose **Load soundtrack ZIPs** and select the seven original ZIPs. You can select several at once; original filenames and download suffixes such as (3) do not matter.
3. The page reads ZIPs locally and keeps matched archives in **browser-local IndexedDB**. It does not upload the ZIPs to the website, Firebase, or GitHub.
4. Preview a track on the DM device, or click one to select it for the Stage. On Stage click **Enable sound** once; browsers require a click before playing.
5. If the Stage is in a **different browser profile or another computer/phone**, use its **Load music** control to import ZIPs on that device too. Tabs on the **same browser and website origin** share a saved library. Different devices do not share audio bytes.
6. Imported ZIPs persist until browser storage is cleared. **Remove local files** on DM deletes those ZIPs from the current browser.

The importer matches ZIP contents against a catalog manifest, checks track sizes, and supports stored and deflate ZIP entries where the browser supports native decompression. Chrome and Edge are the recommended browsers. Large archives can exceed browser storage limits; load albums as needed. Clearing browser site data removes the saved collection.

**Important:** This is browser-local playback of personal audio, not a public streaming service. Campaign state sync sends only track IDs and timings. Remote viewers without a locally installed copy can see a track title but will not hear it. Have appropriate rights for the intended use; never commit commercial soundtrack recordings to a public repository.

## Alternative: private local server

1. Put the seven soundtrack ZIPs in one folder on the computer running Project Grim.
2. Run IMPORT-MUSIC.bat from the Project Grim repository and paste that folder path. The installer now recognizes suffixes like (1) and (3) and URL-escaped spaces.
3. The installer validates and installs 276 MP3s under assets/music/<album>/, preserving the original ZIPs.
4. Run RUN-GRIM.bat and open http://localhost:4173/dm.html. Preview and Stage audio work from the local server on that computer.

Project Grim's bundled server is loopback-only and is deliberately not an Internet audio host.

## Retained controls

Albums, scene folders, favorites, search, preview, Stage monitor, previous/next, play/pause/stop, seek, volume, repeat, shuffle-on-next, and ambient ducking remain.

## Privacy

Catalog and manifest files are metadata only. Copyrighted music remains outside public GitHub, GitHub Pages and Firebase. The .gitignore continues excluding soundtrack MP3/OGG/WAV/FLAC files.
