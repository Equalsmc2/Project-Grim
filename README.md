# PROJECT GRIM — Pathfinder Campaign Stage (Prototype 0.2.1)

An original lightweight campaign-presentation website with a dedicated **player / TV stage** and a separate **DM console**. It is an early interactive prototype, not a Pathfinder rules engine.

## Start on Windows — no npm install required

1. Extract **all contents** of `Project-Grim_PROTOTYPE_0.2.1_NO_LOGIN.zip` anywhere, including Downloads. Double-click **`github.bat`**. When prompted, paste the path to your existing Git repository (for example `C:\Users\deste\OneDrive\Documents\GitHub\Project-Grim`). The BAT copies the website into that folder, shows the Git changes, and asks separately before committing and pushing. You can also extract directly into the repository.
2. In your **Git repository folder**, double-click **`RUN-GRIM.bat`**. It will launch a local server using Node.js (preferred) or Python, and open:
   - **DM console:** http://localhost:4173/dm.html
   - **Player / TV stage:** http://localhost:4173/index.html
3. Place the player stage on your TV or second monitor. Keep DM console private.
4. Try **Scene director** > choose another scene; or **Combat control** > damage, heal, conditions, next turn. The TV stage changes immediately.
5. **Upload future updates to GitHub:** Double-click **`github.bat`** (or `GITHUB-UPLOAD.bat`) from the extracted update folder. Enter your Git repository folder when prompted. It copies only the website files (not `.git`), shows changes, and asks before committing and pushing. **Matching website files in the repository will be overwritten**, so back up local edits first. It never force-pushes. If your GitHub repository has not been published yet, choose **Publish repository** in GitHub Desktop first. GitHub Desktop can also be used to commit/push manually.
6. **Publish the website online (optional):** GitHub upload does not deploy to Firebase Hosting. Follow `docs/FIREBASE_SETUP.md` for the separate Firebase Hosting command.

If Windows warns you before running the BAT file, you can inspect it with Notepad. It starts only a localhost server and opens the two pages in your browser.

## Features included

- **Scene mode:** title, narration and atmospheric scene changes. Four visually distinct demo environments; the DM can optionally show cast cards here as well.
- **Combat mode:** 3D, glossy laminated cards on a perspective stage, active turn spotlight, round counter and turn order; mouse tilt and arrow-key camera movement.
- **Separate DM page:** scene controls, on-the-fly HP adjustment, temporary HP handling, manually applied Pathfinder 2e conditions, round/initiative controls.
- **Card editor:** modify names, ancestries, classes, HP, AC, level, initiative, Perception modifier; upload portraits (downscaled automatically), toggle visibility and add/remove cards.
- **Same-browser live sync:** changes appear on the stage in another tab using BroadcastChannel and localStorage, with no Firebase connection required.
- **Optional Firebase Realtime Database:** for sending stage updates to another device **after** secure setup, with **automatic anonymous authentication for DM and stage**—there is no login screen. The DM browser UID is registered once in secure database rules.
- **No Terminal mode.** This is intentionally two presentation modes plus a DM control page.
- **Dependency-free local build** for the site itself. Remote Firebase mode fetches Google's Firebase SDK, and web fonts are an optional network enhancement.

## Keyboard controls

Stage: `←` and `→` turn the camera, `↑` and `↓` pitch it, `0` resets camera, `H` hides/shows the overlay, and `F` requests fullscreen. Mouse movement tilts the cards. Fullscreen might be restricted by browser or display settings.

DM page: `S` Scene mode, `C` Combat mode, `N` Next turn, when not editing a form field.

## Firebase connection — optional

**Do not switch on online sync before you secure the database.** Your screenshot shows temporary rules that allow anybody to read and write until November 30, 2026; this isn't safe for live player data.

Read [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) and use [firebase-rtdb.rules.json](firebase-rtdb.rules.json) with your DM browser's anonymously generated Firebase UID. The DM page can generate the exact rules using **Connection & setup → Copy secure rules** after enabling Firebase. No email/password account is required. The public Firebase web-app configuration copied from your screenshot is in `assets/firebase-config.js` for your existing `project-grim-ef4f0` Firebase project. If online mode fails with `auth/invalid-api-key`, re-copy the configuration from Firebase Console > Project settings > Your apps > Config and compare values.

## Prototype boundaries

- This is **visual 3D built with CSS perspective, depth planes, card thickness and interactive tilt**; it is not a full Three.js/WebGL tactical map, room editor, or 3D miniatures system.
- PF2e statistics are displayed and initiative is a demo `d20 + Perception` button. **It does not automatically calculate encounter actions, degrees of success, conditions, dying recovery, damage resistance, or character sheets.** Edit initiatives to match actual PF2e checks (e.g., Stealth initiative). This makes it system-agnostic enough to prototype the presentation while establishing the Pathfinder terminology.
- Default characters and lore are **illustrative placeholders**, not assumptions about your new campaign.
- The local DM page is not password protected. Do not publish sensitive DM-only content in it. Firebase Security Rules prevent unauthorized writes in online mode once installed; guests can still load the page's interface.
- Multiple DMs concurrently updating the same room aren't supported. Use one trusted, automatically authenticated DM browser profile.
- Firebase is NOT enabled automatically. The local demo works before Firebase Authentication and database rules are configured. Once enabled, both pages authenticate silently as anonymous Firebase users, with no sign-in screens.
- The DM browser UID is persistent in its browser profile, not a recoverable password-based account. Clearing browser storage or switching devices can change your UID; publish new database rules from the new DM browser if that happens.
- For an online campaign, use the generated random room ID instead of `grim-demo`. Any anonymous viewer who knows the room ID can read the shared player-facing stage data; do not include GM-only content or spoilers.

## Folder structure

```text
Project-Grim/
├── index.html                 Player / TV stage
├── dm.html                    DM controls
├── assets/
│   ├── stage.js, dm.js        Interfaces
│   ├── state.js               Shared local state, PF2e demo stats
│   ├── firebase-sync.js       Optional remote sync
│   ├── firebase-config.js     Public app connection metadata
│   ├── portraits.js           Placeholder silhouettes
│   └── styles.css             3D presentation and layouts
├── firebase-rtdb.rules.json   Secure rules TEMPLATE (paste DM browser UID)
├── firebase.json              Hosting config (does not deploy database rules)
├── .firebaserc                Project association
├── server.js                 Built-in Node localhost server
├── RUN-GRIM.bat              Windows localhost launcher
├── github.bat                Shortcut for GitHub upload
├── GITHUB-UPLOAD.bat         Review, commit, push to GitHub
└── docs/
    └── FIREBASE_SETUP.md     Connection and deployment guide
```

**Project Grim** · Prototype 0.2.1 · No-login DM + anonymous auth + GitHub upload helper
