# PROJECT GRIM — Wireframe 0.3.1 (Black-dominant comfort pass)

A simple, editable Pathfinder 2e campaign presentation prototype. This build intentionally **removes decorative assets and themed styling** so we can evaluate UI and UX before choosing the campaign's aesthetic.

## What's new in 0.3.1

- Fighting-game-style training room: **white/gray grid walls and perspective floor** drawn with CSS, no downloaded images or 3D models.
- Four all-grayscale layout presets: **Training Grid, White Studio, Graybox, Black Studio**.
- **Comfort pass:** black is now the primary background across the stage, DM dashboard, panels, and cards, reducing eye strain while preserving the wireframe layout.
- Scene mode shows a plain stage and editable text; combat mode adds **simple laminated 3D placeholder cards**.
- Neutral card faces and numbered image slots; upload portrait photos later if desired. Removed the old fantasy silhouettes, colored foils, arcane symbols, fog, windows, particles, and web-font downloads.
- A black-and-white DM dashboard, more uniform forms, legible HP actions, and **Scene / Combat** switches always available in the DM top bar.
- Preserved existing controls, editing, local synchronization, anonymous Firebase options, and **the GitHub BAT that prompts for your repository path**.

**This is still a CSS perspective prototype, not a full 3D engine or Pathfinder rules automation.** The goal for now is to validate composition and interaction.

## Install and upload (Windows)

1. Extract `Project-Grim_WIREFRAME_0.3.zip` into a folder, including Downloads. Keep the extracted `assets` and `docs` directories next to the `.html` and `.bat` files.
2. Double-click `github.bat` or `GITHUB-UPLOAD.bat`.
3. Paste the path to your existing Git repository when prompted, or press Enter for the default path:
   `C:\Users\deste\OneDrive\Documents\GitHub\Project-Grim`
4. The uploader verifies that folder is a Git repository, asks before **copying** the website files, displays Git changes, and asks again before committing and pushing. It does not force-push or remove unrelated files.
5. Once the website is in the repository, double-click `RUN-GRIM.bat` **from the repository folder**. Node.js or Python must be installed for its local server.
6. Use the DM page at `http://localhost:4173/dm.html` and the TV/Stage page at `http://localhost:4173/index.html`.

**Important:** Existing local site data from 0.2 is deliberately preserved so upgrading does not erase your edits. If you want the new generic sample names and training-stage labels, use **DM → Connection & setup → Reset to test data**. This replaces the saved sample roster, scene text, and combat data in that browser; it does not delete Firebase data by itself. Back up custom work before resetting.

## Try the UX

1. Open DM and Stage in two tabs **of the same browser profile**. Local changes sync automatically.
2. In DM, click **Combat** in the top right. You should see four plain plastic-like cards on the grid, the round, active turn, and initiative strip.
3. Open **Combat control**. Try `−5`, `+5`, conditions, spotlight and **Next turn**.
4. Open **Scene director**, select another grayscale stage, change the title, and click **Present scene**.
5. Open **Character cards** to edit names/classes/stats, hide a card, upload a portrait, or add another card.
6. **Connection & setup** controls card scale, stage labels and whether Scene mode shows character cards.

### Keyboard

Stage: **arrow keys** orbit camera, **0** reset, **H** toggle HUD, **F** fullscreen, mouse motion tilts the cards. DM: **S** = Scene, **C** = Combat, **N** = Next turn (when not typing).

## No login / Firebase

There is **no user login screen**. For a two-tab local demo, Firebase is not needed. Across devices, enable Firebase Anonymous Authentication and register your DM browser as the only writer using **Connection & setup → Copy secure rules**. All anonymous viewers with the room link can read player-facing state, so do not store GM secrets there. The previous temporary open database rules from your screenshots are unsafe.

See [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md) for details. **GitHub upload and Firebase Hosting deployment are separate actions.** No Firebase connection was tested live in this package.

## Design principle

Use **black / white / gray only**, easy-to-read buttons, plain typography, visible spacing, CSS grid geometry and a single 3D card component. Art direction will be applied in a later project phase. Design rationale and UX checklist: [`docs/UI_TEST_NOTES.md`](docs/UI_TEST_NOTES.md).

## Limitations

- CSS 3D card perspective, not WebGL/free-roam 3D or a map editor.
- Not a Pathfinder rule engine or live VTT integration.
- No private GM-only data layer; the cloud room stores only player-facing state.
- `github.bat` requires an existing local Git repository with an origin remote; you can publish through GitHub Desktop first.
- The browser sandbox used during verification disallowed direct localhost navigation. Inline browser checks of the new interface and interactions passed, but live deployment and Firebase were not tested.
