# Project Grim 2.0: final report

## What changed

### The 3D stage (`src/stage/`)
- **One scene for everything.** The terrain heightfield, sky, fog, weather, scenery and cards live in one Three.js scene. Cinematic and tactical are two camera presets on the same spring-driven rig.
- **Terrain:**
  - A shader blends the ground type, slope rock and macro/micro variation.
  - Roads, puddles and wetness in rain, and snow that settles on flat ground first.
  - Water and difficult squares, with micro-bump normals.
  - The encounter area sits in a larger landscape that rises into hills. The camera side stays low so hills never block the shot. The far side of the encounter rises gently, which keeps enemy cards visible behind the party.
- **Sky and light:**
  - Time-of-day keyframes drive sky colour, sun/moon direction, light colour and exposure.
  - Procedural clouds, stars and moon; thunderstorm lightning with a visible bolt.
  - Height fog is patched into every material, so valleys hold mist and the horizon dissolves into the sky.
- **Weather:** rain, thunderstorm, snow, blizzard, leaves, dust and sandstorm are GPU particles. Their positions are computed in the shader, so precipitation costs no CPU per frame.
- **Scenery:** procedural faceted props (conifers, broadleaf and dead trees, rocks, ruins, pillars, graves, logs, barricades, grass) are instanced, sway in the wind and collect snow.
- **The battle map is the world.** Tree, rock, wall, pillar, ruin, grave, log, bush, mound and cover squares become real scenery standing on that square, in both views. In cinematic view, tall scenery that would block a card sinks out of the way.
- **Cards:**
  - Standees with painted faces: portrait, serif name, HP bar, AC/initiative, condition chips and rank badge.
  - Effects run in the card shader: burning (charred, licking edges, plus embers and a flickering light), frozen (frost crystals), cracks that spread as HP falls, an ember line for the active turn, and a downed look.
  - On the 0 HP transition the card shatters; a felled foe falls backward and a dying hero kneels.
- **Camera:**
  - A framing solver keeps every visible card on screen at any aspect ratio, and steepens the pitch only as much as needed so foes clear the party.
  - Director styles: follow-turn, orbit and sweep, with a push-in "turn spotlight" when the turn passes and subtle handheld drift.
  - Damage shakes the card.
  - Reduced-motion turns all of this off.
- **Tactical:**
  - Switching glides the camera up, moves each card to its square, and fades a 5 ft grid into the terrain shader so it follows the ground.
  - The GM can orbit, zoom and pan, and the TV can follow the GM's camera.
  - Picking, terrain painting and token dragging all happen in the 3D view.
- **Performance:**
  - Three quality tiers.
  - Adaptive resolution when the frame time drops.
  - Rendering pauses on hidden tabs, and context loss is handled.
  - A 2D fallback is used when WebGL is unavailable.

### GM command deck (`dm.html`)
- **Layout:**
  - One screen with no page scroll at 1280×720 and above.
  - Initiative rail, live 3D preview, inspector tabs and a bottom dock.
  - Phones and narrow windows stack the panels.
- **Speed:**
  - Quick HP syntax: `-7`, `+5`, `t10`, `20`.
  - PF2e valued conditions with steppers.
  - GM-defined resource counters: Legendary, Focus, reactions and so on. They refill per round or per turn, which is how legendary actions are supported without inventing rules.
  - Multi-add for groups of foes, and keyboard shortcuts.
- **Undo/redo for every GM action:** combat, cards, maps, environment, scenes and imports. Slider drags and paint strokes count as one step.
- **New:**
  - Dialogue, title-card and handout overlays.
  - Table chat, shown on the TV if you choose.
  - Full campaign export/import.
  - Prepared scenes are kept, with export and import.

### Portrait studio (`src/portrait/`)
- A new illustrated painter with gradient shading, rim light, vignette and grain.
- 27 features in 6 groups. New options include half-elf, elf, long-elf, goblin, feline and broad ears; swept and ram horns; fangs and tusks; five beards; hood and circlet; glowing, milky and mismatched eyes; 14 skin tones including green, blue, ashen and infernal; war paint, tattoos and runes; arcane and ember auras; armour with pauldrons; and metal trims.
- **Recipe codes keep the exact 1.5.8 format** (`v1-` + 16 base-36 digits) by packing two features per digit. The deployed Firebase rule still accepts them from players, and every old code still decodes.
- Option thumbnails show your actual face with each choice applied. Includes Random, "Vary" (keeps lineage), undo, and upload-an-image for the GM.

### TV stage and player desk
- **TV:**
  - Serif scene titles, round and turn pills, an initiative ribbon with portraits, and overlays with a typewriter effect.
  - Chat toasts, a sound gate, and auto-hiding viewer controls (quality, motion, camera reset, fullscreen, soundtrack import).
- **Phone:**
  - Character picker, large HP controls, stats, condition chips with values, and a d-pad in tactical view.
  - Chat, and the portrait studio for your own character.
  - A "your turn" banner.

### Foundations
- **State:**
  - A sectioned v2 schema with lossless migration from the 1.5.8 blob.
  - Commands declare which sections they touch, so portraits are never cloned for an HP change.
  - Same-browser tabs sync through BroadcastChannel.
- **Sync:**
  - Per-section Firebase writes (portraits individually) under the **existing** rules, ordered by revision.
  - Retry with backoff and a refresh-safe pending marker.
  - Automatic upgrade of rooms this GM owns, and never claims another GM's room.
- **Kept:** the player inbox, anonymous auth, no logins, GitHub Pages and the Firebase Hosting layout.
- **Repository:**
  - The 1.5.8 build is preserved (tag `legacy-1.5.8` and `/legacy/`).
  - Dead builds and unrelated MuseSink files were removed; history notes moved to `docs/history/`.

## Tests

| Suite | Result in this environment |
|---|---|
| `npm test`: 2.0 unit suites (core, formation, portraits) plus 27 preserved 1.5.8 suites | **45/45 passed** |
| `npm run test:ui` (Chromium, software WebGL): card framing at 1920×1080, 1366×768, 1280×800, 1024×1366 and 2560×1080 with 10 combatants; initiative order; tactical round trip; weather/biome switching; GM no-scroll at 3 sizes; undo/redo keys; portrait studio; phone layout; no page errors | **16/16 passed** |
| `npm run test:sync` (Chromium, Firebase emulator, real rules, 4 browser profiles): room creation and ownership; TV receives state; combat/HP/conditions; overlays open and dismiss; tactical and map edits; player inbox edits; player token movement; player chat; permission denials for room writes, character overwrites and spoofed UIDs; TV refresh; GM offline edits published on reconnect; GM refresh without rollback; 40-update burst convergence; stale revisions ignored; second GM cannot take over; second player sees updates; 1.5.8 room upgraded in place | **18/18 passed** |
| Firefox | **Not run here.** The environment's network policy blocks the Firefox download. CI runs both browser suites in Chromium **and Firefox** on every push. |

### Bugs the new tests caught and fixed
- Player-edit cursor keys contained `/`, which Firebase forbids. After the first player edit every GM write failed. This affected 1.5.8 behaviour too.
- Inverted tactical grid shading, cards leaning away from the tactical camera, and a canvas sizing bug. All three were found in screenshots.

## What still needs you (cannot be automated here)
1. **Real GPU frame rate** on your laptop and TV, especially in a thunderstorm or blizzard on High. The tests use software rendering, which proves correctness, not speed.
2. **Live Firebase project:** connect once with your real rooms. Deploy the updated rules if you want player chat (`GO_LIVE.md`).
3. **Real phones on a real network**, and audio on your TV, including the click-to-enable sound gate.
4. **Firefox and Safari by eye.** The Firefox run happens in CI; Safari is untested.
5. **Taste:** the portrait art, card look and colour palette are a first professional pass and easy to tune.

## Known limitations
- **Scenery:** procedural and stylised (faceted diorama). There are no imported 3D models or textures, which keeps the site small and dependency-free.
- **No rules automation:** Grim tracks PF2e numbers but does not automate rules. Frightened does not auto-decrement, and there is no action economy.
- **Map size:** maps are capped at 48×36 squares, and the cinematic formation shrinks cards and wraps rows beyond about 12 per side.
- **Sync model:**
  - The GM browser is the single source of truth. Player edits apply only while the GM deck is open, as in 1.5.8.
  - Two GM tabs in the same browser share state locally. Two GM *devices* cannot share a room, by design of the security rules.
- **Music:** soundtrack audio is still local-only per device (unchanged from 1.5.8).
- **Not ported:** the old `qa/` Playwright agent targets the 1.5.8 page structure. It is kept for reference but no longer runs in CI.
