# Project Grim — Tactical 0.8 (Observer Battlefield Camera)

This build makes the dark UI a **one-screen DM application** where practical. The global page avoids scrolling on a standard desktop; the encounter list, roster, card editor and online settings have their own scroll areas only when their content exceeds the viewport. Black-and-white wireframe styling is retained.

## New in 0.8 — observer-above battlefield camera

- **Enemy cards always appear in the upper/far line**, and **player cards in the lower/near line**, like opposing teams on a fighting-game stage.
- Combat stage now reads like an **overhead tactical battlefield**: the camera looks down across a tilted battle plane while cards stay upright and floating for readability.
- Cards are positioned as hovering units above the field, with subtle shadows and a compact tactical HUD that stays out of the battle space.
- The two groups are independently centered and spaced; initiative changes never mix or rearrange them.
- Cards keep their front faces readable, with a subtle opposing 3D tilt and monochrome **VS** separator. The active combatant still comes forward.
- Responsive scaling keeps typical encounters inside one screen; oversized groups wrap within their own side.
- This only changes presentation. All existing enemy/player data, encounter management, Firebase sync, and no-login behavior remain unchanged.

## Previous 0.6 functionality — enemy cards

- **Combat control → + Add enemy:** instantly adds an NPC enemy to the current initiative roster and switches to Combat presentation if you were in Scene mode. Add multiple enemies as needed.
- **Combatant cards → + Add enemy / + Add player:** create either type in the same single-screen editor. The editable **Combatant type** field switches an existing character between Player and Enemy.
- **Enemy cards** have a cut-corner double border, contrasting light heading, diagonal neutral placeholders, and explicit **◆ ENEMY** labels. Players retain the simpler matte **● PLAYER** card style.
- **Both types share one initiative order** and can take damage, heal, receive conditions, be spotlighted, have their initiative rolled, be hidden from the stage, and be removed. Use the **Edit** button beside any combatant to jump to its card editor.
- **Old campaigns are preserved:** a saved card from 0.5 without a type is treated as a Player; no migration/reset is needed. The same local storage and optional Firebase room are used.
- **Low-scroll design retained:** combatants stay in a compact scrollable panel at desktop resolutions; phone layouts scroll only to keep controls usable.

## UX changes

- **Overview:** equal-height content panels and compact summary metrics, without unused empty areas.
- **Scene director:** stage presets (2×2) alongside live scene inputs instead of two stacked full-width panels.
- **Combat control:** round/turn toolbar above a compact, internally scrollable initiative roster.
- **Combatant cards:** selectable roster at left, three-column editor at right on wide screens; portrait & fields are compact.
- **Connection & setup:** evenly spaced view/online setup columns, concise security reminder.
- **Navigation:** fixed DM header and sidebar; no page-level scrolling on desktop where content fits.
- **Responsive:** icon sidebar at medium widths, single-column and natural scrolling on phones where necessary for legibility.
- **Stage:** Scene and Combat behaviors, laminated card effect and no-login operation remain; the stage now distinguishes players from enemies.

## Installing from Downloads

1. Extract the full ZIP (keep folders). Run **`github.bat`**.
2. Paste `C:\Users\deste\OneDrive\Documents\GitHub\Project-Grim` or your actual repository location.
3. Confirm copy and GitHub upload. The BAT can optionally deploy Firebase Hosting if Firebase CLI is installed and signed in. **Pushing to GitHub alone does not deploy Firebase Hosting.**
4. For local testing, open `RUN-GRIM.bat` inside the repo, then visit `http://localhost:4174/dm.html` and `http://localhost:4174/index.html`.
5. Verify the top bar says **TACTICAL 0.8**.

Custom scene, character and combat data are preserved. Reset to test data only if you want to discard edits. Firebase anonymous authentication and DM-browser rules are the same as in 0.4.

## Scope and limits

This remains a UI prototype with CSS 3D cards, not true WebGL terrain or Pathfinder rules automation. Check the BAT and Firebase connection on your Windows machine; the packaged app does not change live Firebase rules.

## Try the UX

1. Open DM and Stage in two tabs **of the same browser profile**. Local changes sync automatically.
2. In DM, click **Combat** in the top right. You should see four plain plastic-like cards on the grid, the round, active turn, and initiative strip.
3. Open **Combat control**. Try `−5`, `+5`, conditions, spotlight and **Next turn**.
4. Open **Scene director**, select another grayscale stage, change the title, and click **Present scene**.
5. Open **Combatant cards** to edit names/classes/stats, hide a card, upload a portrait, or add another card.
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

## Verify the fix

1. Open the **new local URL**: `http://localhost:4174/dm.html` (old builds used 4173).
2. Confirm both the DM and Stage headers show **TACTICAL 0.8**.
3. Confirm the DM content area and stage are black/charcoal, with thin gray grid lines and no gold or fantasy typefaces.
4. In the browser's Network tab, the CSS URL must contain **`/assets/tactical-080/styles.css`**. If you see `assets/styles.css`, the browser is serving an old HTML page. Confirm the uploader copied into the exact Git repository from GitHub Desktop.
5. For a public Firebase site, uploading to **GitHub alone does not guarantee deployment**. Run the optional Firebase Hosting deploy from the uploader (requires Firebase CLI), or manually run `firebase deploy --only hosting --project project-grim-ef4f0` inside the repo. If your actual host is Render, use its deployment process instead.
6. Browser refresh: Ctrl+Shift+R; if a service worker or external CDN is caching the old deployment, remove its cache according to that hosting setup.

No automatic deletion of custom data occurs.
