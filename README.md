# Project Grim 2.0

A Pathfinder 2e presentation and encounter tool. The GM runs the session from a laptop, and the table watches a lit, weathered 3D stage on a TV. Players manage their own sheets on their phones.

| Page | Who uses it | What it does |
|---|---|---|
| `dm.html` | GM, on a laptop | Command deck: initiative, HP, conditions, resources, world, battle maps, music, overlays, chat, sync |
| `index.html` | The table, on a TV | The cinematic stage and the tactical board; read-only |
| `player.html` | Players, on phones | One party sheet: HP, stats, conditions, portrait, token movement, chat |
| `legacy/dm.html` | Fallback | The untouched 1.5.8 build, in case you need it mid-session |

No logins, no build step, no terminal. The site runs from GitHub Pages or Firebase Hosting exactly as before.

## Quick start

- **On one computer:** open `dm.html` and `index.html` in two tabs (or windows). They stay in sync on their own.
- **TV and phones on other devices:** in the GM deck open **Session**, turn on **Sync to the TV and phones**, then use **Copy TV link** and **Copy player link**.
- **Running locally:** double-click `RUN-GRIM.bat` (needs Node.js or Python). It opens the GM deck and the stage on `http://localhost:4174`.

## The GM deck at a glance

- **Top bar:** Scene/Combat, Cinematic/Tactical, round and turn controls, Undo/Redo, sync status, TV and player links.
- **Initiative rail (left):** every combatant in order. Type into the `±` box: `-7` damage, `+5` heal, `t10` temp HP, `20` sets HP. Temp HP absorbs damage first.
- **Live stage (centre):** the same 3D world the TV shows. Click a card to select it. In Tactical, drag cards onto squares; with the Map tab's paint tool, drag across squares to paint terrain.
- **Inspector (right):**
  - **Combatant:** portrait studio, stats, valued conditions (e.g. Frightened 2), resources such as Legendary 3/3 that refill per round or per turn, notes, hide/reveal, duplicate.
  - **World:** biome, atmosphere, time of day, weather, wind, fog, terrain, road, camera director, prepared scenes.
  - **Map:** maps from 6×6 up to 48×36 (32×20 by default), terrain painting, token reset, whether the TV follows your camera.
  - **Scene:** titles, narration and presentation options.
  - **Session:** online sync, links, backups, reset.
- **Dock (bottom):** music library and player, ambience, dialogue/title/handout overlays, table chat.

**Keyboard:**

| Key | Action |
|---|---|
| `N` / `P` | Next / previous turn |
| `C` / `S` | Combat / scene |
| `T` | Tactical on/off |
| `B` | Paint tool |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo (works for every GM action) |
| `Esc` | Deselect |

**On the TV:**

| Key | Action |
|---|---|
| `F` | Fullscreen |
| `H` | Hide labels |
| `0` | Reset camera |

## Compatibility

- Your 1.5.8 campaign (characters, portraits, avatar codes, maps, environment, prepared scenes) loads automatically the first time you open the new GM deck in the same browser. The old data is left untouched, so `legacy/` still works.
- An existing online room owned by your GM browser is upgraded in place the first time you connect.
- Firebase: the existing rules keep working. **Player chat** needs the updated `firebase-rtdb.rules.json` to be deployed once; see `GO_LIVE.md`. Everything else works without it.

## Tests

| Command | What it checks |
|---|---|
| `RUN-TESTS.bat` or `npm test` | Unit and regression suites: the 2.0 core plus the preserved 1.5.8 suites |
| `npm run test:ui` | Real pages in Chromium: card framing at 5 screen shapes, initiative order, tactical round trip, no-scroll GM layout, portrait studio, phone layout |
| `npm run test:sync` | GM + TV + two players in separate browser profiles against the Firebase emulator with the real rules: sync, overlays, chat, player edits, permissions, offline/online, refresh, bursts, legacy room upgrade |

The browser tests need Playwright, plus Java and `firebase-tools` for the sync test. GitHub Actions runs them in Chromium and Firefox on every push (`.github/workflows/project-qa.yml`).

## Project layout

```
src/core     state schema, migration, commands, undo/redo, PF2e helpers (no DOM)
src/sync     Firebase sync and the write outbox
src/stage    the 3D world: terrain, sky, fog, weather, props, cards, camera
src/portrait portrait painter, studio and GM-side rendering
src/ui       GM deck, TV stage and player desk (Preact + htm, vendored)
src/audio    ambience, music library, local soundtrack import
vendor/      three.js r170, preact+htm, fonts (all MIT/OFL)
legacy/      the 1.5.8 pages, served from assets/grim-158
tests/v2     2.0 tests · tests/legacy: preserved 1.5.8 suites
```

See `PROGRESS.md` for the build log and `docs/REPORT-2.0.md` for the full report.
