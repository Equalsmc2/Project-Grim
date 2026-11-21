# Project Grim — Reforge: Vision & Implementation Plan

Status: **awaiting owner approval** (written 2026-11-21, against build 1.5.8 / `assets/grim-158`).
Nothing in this plan has been implemented yet.

---

## 1. What exists today (audit)

### Functional inventory (grim-158)

| System | Where | State |
|---|---|---|
| Campaign state (single blob, `grim:campaign:v1`) | `state.js` | Works. Whole campaign is cloned, normalised and re-broadcast on every change. |
| Local multi-tab sync | `state.js` (BroadcastChannel + `storage` event) | Works. Last-writer-wins by `updatedAt`. |
| Firebase sync (anonymous auth, room owned by DM uid) | `firebase-sync.js`, `cloud-outbox.js` | Works, with retry/backoff and an unsynced marker. Writes the **entire campaign including base64 portraits** on every change (debounced 190 ms). |
| Player edit inbox (rules-validated per-field writes) | `player-fields.js`, `firebase-rtdb.rules.json` | Works; DM absorbs edits and acknowledges by revision cursor. |
| Combat: round, active turn, initiative roll, HP ±, temp HP, conditions, hide, spotlight | `dm.js` | Works. Conditions are free strings; valued conditions (Frightened 2) partly supported. |
| Characters/portraits (upload → JPEG data URL) and avatar studio (procedural SVG portraits) | `dm.js`, `avatar-*.js` | Works. |
| 3D stage: terrain, hills, paths, props, weather (8 kinds), fog, clouds, sky, day/night cycle | `world.js` + 8 helper modules | Works, but visually flat (low-poly cones, untextured ground, uniform lighting), and logic is spread over many patch modules (`camera-guard`, `world-polish`, `card-framing`, `render-budget`…). |
| 3D cards (canvas-texture meshes), burning/frozen/cracks/shatter | `native-cards.js` | Works; strongest existing asset. |
| Cinematic camera director (follow/orbit/sweep) | `cinematic-director.js`, `stage.js` | Works. |
| Tactical battle maps (12 maps, 6–36 × 6–24 cells, 13 terrain codes, token placement, phone d-pad movement) | `battle-map-*.js`, `scene-tactical-overlay.js` | **Broken presentation**: in tactical mode the combat-info panel covers most of the board (verified by screenshot); obstacles are separate box meshes not related to scenery. |
| Prepared scenes (12 snapshots), export/import, environment undo/redo | `scene-snapshots.js`, `scene-backup.js`, `environment-history.js` | Works; **undo only covers environment**, not combat or cards. |
| Ambience (5 MP3 loops) and music library (230-track catalog, local ZIP import to IndexedDB, synced playback clock) | `ambience.js`, `music-*.js` | Works. Soundtrack audio is intentionally not hosted. |
| Player desk (mobile sheets, avatar studio, map movement) | `player.js` | Works. |
| Tests | `tests/` (43 Node suites, all pass), `qa/` (Playwright) | Many suites are **source-text contracts** (regex over JS/CSS) rather than behaviour tests; no automated multi-client Firebase test; no Firefox run. |

### Features named in the brief that do **not** exist in the current code
A full-text search finds no implementation of **legendary actions**, **dialogue / presentation overlays**, or **chat**. They are not regressions to preserve; they would be **new features** (see §6 and the open questions).

### Technical debt worth fixing
1. **Whole-campaign writes** to Firebase, including portrait images (tens–hundreds of KB per write) — the main reliability/latency risk in real sessions.
2. **Last-writer-wins on wall-clock `updatedAt`** across tabs/devices — clock skew can drop updates.
3. Undo/redo limited to environment edits.
4. 1.4–1.5 patch layering: behaviour split across "guard"/"polish"/"budget" modules that correct each other.
5. Tactical mode is a second presentation path layered over the stage rather than a view of the same world.
6. Dead weight in the repo: `assets/battlefield-118`, `grim-148`, `grim-149` (48 tracked files, ~4.7 MB, unused); root `app.js`, `styles.css`, `firebase-config.js`, `database.rules.json` belong to a **different project (MuseSink)** and are not used by Grim; ~40 historical release/test-report markdown files at the root.
7. Long single-line minified-style source makes review and diffing hard.

---

## 2. Creative vision

> **Project Grim is a stage, not a spreadsheet.** The TV shows a living diorama of the encounter — a lit, weathered piece of the world where the combatants stand as physical cards. The GM runs it from a compact command deck that shows the exact same world, and can tilt that world into a tactical board at any moment without ever leaving it.

### Visual identity — "Ink, bone and ember"
- **Surfaces:** layered warm charcoal/ink (not pure black, not blue-grey), with fine 1 px bone-tinted hairlines rather than heavy borders or glow.
- **Text:** bone white (`#e7dfd0`) on ink; secondary text in desaturated ash.
- **One accent:** tarnished ember/brass for *active / live / current turn* only. Enemies use a restrained oxblood; players a cold slate. Burning = ember, frozen = steel-ice. Colour always means something.
- **Type:** a sharp literary serif for scene titles and names only (self-hosted, OFL, e.g. *Cormorant* or *Spectral*), a neutral sans with tabular numerals for all UI and numbers (e.g. *Inter*). Small, dense, legible sizes; no oversized headline typography on the GM screen.
- **Motion:** short, physical (springs, 150–300 ms), never decorative loops on the GM screen. Reduced-motion respected everywhere.
- **No** generic AI dashboard tropes: no metric tiles, no gradient glow cards, no emoji icons. A small consistent SVG icon set.

This deliberately evolves the 1.5.8 "monochrome until a theme is chosen" contract into a chosen theme; `DESIGN_PRINCIPLES.md` will be updated accordingly.

### The stage (TV)
- **One world, one renderer, two cameras.** A single Three.js scene holds terrain, sky, weather, props and cards. "Cinematic" and "Tactical" are camera rigs + overlay states, interpolated with springs.
- **Terrain:** a heightfield with a custom splat shader blending ground types by slope/noise (grass, dirt, rock, sand, snow, leaves, stone, mud/puddles), procedural detail normals, wetness and snow accumulation as shader parameters (no rebuilds on slider moves). The encounter area (default 32 × 20 squares = 160 × 100 ft) sits inside a larger landscape that recedes into height fog and silhouetted hills.
- **Light and air:** physically-motivated sky dome with sun/moon positions from time of day, hemisphere + directional light with shadows fitted to the encounter area, exponential height fog, ACES tone mapping and a per-time-of-day colour grade. Restrained post: vignette and very mild bloom only on genuinely bright sources (fire, lightning, moon).
- **Weather:** GPU-instanced particles (rain streaks with splashes, snow, leaves, dust/sand, blizzard, thunderstorm with lightning flashes and thunder sync), wind-driven vegetation sway in the vertex shader.
- **Props:** instanced, slightly more detailed procedural meshes (layered conifers and broadleaf trees, rocks with bevels, ruins, logs, graves) with a single cohesive palette per biome, placed by a seeded scatter that respects the encounter area.
- **Cards:** keep the strongest idea of the current build — cards are physical objects in the depth buffer. Re-carve them as *standees* on small bases, Y-axis billboarded, with the face texture redrawn only when data changes. Burning: animated ember edge in the shader + a few world-space embers + one shared flickering light. Frozen: frost rim and crystalline mist on the base. Damage: progressive cracks; 0 HP: one-shot shatter. Active turn: subtle ember edge and a ground ring, not a glow halo.
- **Formation (cinematic):** players in the foreground row, enemies in the back row, each row ordered by initiative left→right, wrapping to extra rows when crowded. A framing solver fits *all visible cards* into the frustum with safe margins at any aspect ratio (TV 16:9, laptop 16:10, phone portrait).
- **Default camera:** low ground-level shot (≈10–14° pitch) from behind the party, with optional director shots (follow active turn, slow orbit, sweep).

### Tactical mode — the same world
- Switching to tactical: cards glide from formation positions to their grid squares, the camera springs up to a ≈55° three-quarter view, and a **5 ft grid is drawn by the terrain shader itself**, so it hugs hills instead of floating above them. Fog thins slightly for legibility; weather, lighting and props remain.
- **The battle map *is* the world:** map cells marked tree/rock/wall/pillar/ruin/water/difficult become real props or terrain treatments in the same scene, visible in cinematic mode too. Decorative scatter stays out of walkable squares.
- GM gets free orbit/zoom/pan clamped to the map; the TV can follow the GM's tactical camera or keep its own.
- Adjustable map dimensions (6–48 × 6–36; 32 × 20 default), map painting directly on the 3D terrain, token dragging, saved maps, and phone d-pad movement — all preserved.
- Switching back reverses the same interpolation.

### The GM command deck (laptop, single screen)
```
┌ top bar ─ Scene|Combat|Tactical ─ Round 3 ▸ Turn: Goblin Archer ─ ◀ Prev  Next ▶ ─ ↶ ↷ ─ sync ●┐
├ initiative rail ─┬──────── live stage view (same renderer) ────────┬─ inspector ──────────────┤
│ 25 Fighter 04 ▮▮ │                                                │ Selected: Goblin Archer   │
│ 22 Fighter 01 ▮▮ │     (click a card to select; drag on map       │ HP / temp / AC / init      │
│ 14 Goblin  ▮▯ 🔥 │      in tactical; paint terrain)               │ conditions (valued chips)  │
│ …               │                                                │ resources / counters       │
│ [+ add] [roll]   │                                                │ notes, portrait            │
├──────────────────┴──── dock: music ▸ ambience ▸ overlays ▸ chat ──┴──────────────────────────┤
```
- The **initiative rail** is always visible: inline damage/heal entry (type `-7`, `+5`, `t10` for temp HP), condition chips with values, quick hide/reveal, drag to reorder ties.
- The **inspector** swaps context: combatant, environment (time/weather/fog sliders), scene, map editing, session/connection.
- The **dock** gives one-click access to music, ambience, overlays (dialogue/title/handout) and chat without leaving combat.
- A **command palette** (Ctrl/⌘-K) and keyboard shortcuts (N next turn, Ctrl-Z/Y, etc.).
- Responsive targets: 1280×720 → 2560×1440 laptops; the stage view can be collapsed on small screens. TV stage targets 1920×1080 and 3840×2160; player desk targets phones.

---

## 3. Technical architecture

**Constraint kept:** static site, deployable unchanged to GitHub Pages and Firebase Hosting, **no build step and no terminal for normal users**, no login, same Firebase project.

```
index.html  dm.html  player.html          (thin entry points; same URLs as today)
src/
  core/        pure, DOM-free, fully unit-tested
    schema.js       versioned campaign schema + migration from grim:campaign:v1 blobs
    commands.js     every GM action as a named command (combat/damage, turn/next, map/paint…)
    reducer.js      command → new state (structural sharing, no full deep clone)
    history.js      undo/redo for ALL GM commands, with coalescing for slider drags
    rules/          PF2e helpers: HP/temp HP, valued conditions, dying/wounded, initiative order
    selectors.js    formation order, visible cards, active turn
  sync/
    bus.js          local multi-tab transport (BroadcastChannel) with tab leadership
    firebase.js     granular paths, revision counters, outbox, presence, reconnection
    protocol.js     message ids for dedupe, revision ordering, conflict policy
  stage/       Three.js world (one renderer)
    world.js  terrain/  sky/  weather/  props/  cards/  camera/  tactical/  fx/  quality.js
  ui/          DM command deck, player desk, stage HUD (Preact + htm, vendored, no build)
  audio/       ambience + music engines (catalog/IndexedDB import preserved)
vendor/        three r170 (existing), preact+htm (MIT, ~15 KB), fonts
tests/         node:test unit suites + Playwright multi-client e2e
legacy/        frozen copy of the 1.5.8 site, reachable at /legacy/dm.html as a fallback
```

Key decisions:
1. **No bundler.** Native ES modules + an import map. Preact/htm gives maintainable components without a compile step. Code is formatted, readable, `// @ts-check` + JSDoc types checked in CI.
2. **Command-based state.** Every change is a command; the DM is the single authority. This gives universal undo/redo, an activity log for free, deterministic tests, and small sync deltas.
3. **Granular Firebase layout** (same project, same anonymous auth, same "room owned by DM uid" model):
   ```
   grim/rooms/{room}/meta       {dmUid, schema, rev}
   grim/rooms/{room}/state/...  scene, environment, combat, characters/{id}, maps/{id}, overlay, music
   grim/rooms/{room}/portraits/{characterId}   image data, written only when it changes
   grim/playerEdits/{room}/...  unchanged contract (player-writable, validated per field)
   grim/chat/{room}/{msgId}     new: append-only, author uid enforced, length-limited
   ```
   Writes become per-section `update()` calls with a room revision number instead of a whole-campaign `set()`. **Rules are tightened, not weakened**, but they *do* change, so the project administrator must redeploy `firebase-rtdb.rules.json` once. Legacy rooms (`grim/rooms/{room}` blob) are read and migrated automatically; old saved local campaigns load unchanged.
4. **Conflict policy:** monotonic room revision (not wall clock); DM is the only writer of shared state; player intents go through the inbox and are applied (or rejected) by the DM; every message carries an id so duplicates are ignored.
5. **Recovery:** state persists locally per room; on reload the DM compares local vs cloud revision and resumes or offers explicit recovery (the existing protective behaviour, kept); viewers always render the last known state while reconnecting and show an honest status.
6. **Performance:** fixed render budget per quality tier, instancing everywhere, shader-driven weather/wind/wetness (no geometry rebuilds for slider changes), render-on-demand when static, adaptive resolution if frame time exceeds budget, pause on hidden tabs with clock-correct resume.
7. **Browser support:** current Chromium (Chrome/Edge), Firefox, Safari 16.4+ (import maps). WebGL2 required for the full stage, with a graceful 2D card fallback.

---

## 4. Compatibility promises
- Same URLs: `index.html` (TV stage), `dm.html`, `player.html`.
- Existing local campaign (`grim:campaign:v1`), prepared scenes, battle maps, portraits, avatar codes, music favourites and IndexedDB soundtrack imports all load. A migration test suite uses real 1.5.8 snapshots.
- Existing cloud rooms are migrated on first DM connection; the old blob is left in place (not deleted) until you choose to clean it up.
- Firebase config, project id, anonymous auth and the "players can edit only allowed sheet fields" boundary are unchanged in spirit; the rules file gets new paths and tighter validation.
- The 1.5.8 site stays available: git tag `legacy-1.5.8`, plus a frozen copy at `/legacy/`.

---

## 5. Milestones

Each milestone ends with: working code, tests run, regression check, `PROGRESS.md` updated, and a short report of what is finished and what remains.

| # | Milestone | Done when |
|---|---|---|
| **M0** | Foundations: legacy tag + `/legacy/` copy, repo cleanup, `src/core` schema/migration/commands/reducer/history/rules, vendor setup, test runner, CI | Old campaigns migrate in tests; undo/redo covers every command; old site still runs at `/legacy/`. |
| **M1** | Sync v2: local bus, Firebase transport, outbox, revisions, presence, player inbox, chat path, rules + rules tests, legacy-room migration | Multi-client Playwright tests (GM + TV + 2 players) pass against the Firebase emulator, including refresh, offline/online, duplicate and concurrent updates, and rule-denied writes. |
| **M2** | World renderer: terrain shader, sky/sun/moon, lighting & shadows, fog, weather, props, quality tiers | All presets render in Chromium (SwiftShader screenshots) with no console errors; frame-time benchmark recorded. |
| **M3** | Cards & camera: standee cards, status FX, formation solver, cinematic rig + director | Automated checks: all visible cards inside the viewport at 5 aspect ratios with up to 20 combatants; initiative order preserved. |
| **M4** | Tactical unification: terrain grid, map cells → world props, transitions, 3D map editing, token drag, phone movement, adjustable size | Cinematic ↔ tactical round-trip test; map edits persist and sync; player d-pad moves sync. |
| **M5** | GM command deck: design system, rail, inspector, dock, palette, shortcuts, responsive layout | Fits 1280×720 without page scroll; visual baselines approved by you. |
| **M6** | Session features: overlays (dialogue, title card, handout image), chat, resource counters, music/ambience UI, prepared scenes | E2E: overlay open/dismiss and chat delivered to all clients, survive refresh. |
| **M7** | TV stage HUD + player desk redesign | Phone and 4K layout tests pass. |
| **M8** | Hardening & release: Firefox run, perf, accessibility, visual regression, docs, `RELEASES/` ZIP + Windows uploader, final report | Full suite green; explicit list of what still needs your live test. |

## 6. What I can and cannot verify here
- **Can automate:** unit tests, Chromium + (if installable) Firefox via Playwright, WebGL via SwiftShader (correctness and screenshots, not real GPU FPS), multi-client sync against the local Firebase emulator, security-rule tests against the emulator.
- **Needs you:** real GPU frame rate on your laptop and TV, the live Firebase project after you deploy the new rules, real phones on a real network, audio output on your TV, and final aesthetic sign-off.
