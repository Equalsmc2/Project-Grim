# Project Grim 0.5 — UX layout acceptance checks

Expected viewport behavior:
- On desktop 1920×1080, 1536×960, 1366×768 and 1024×768: no **page-level** scrollbar for Overview, Scene, Combat, Cast, or Settings.
- Long combatant lists, character roster/editor, and the Firebase setup can scroll **inside their own panels**.
- On phones or windows shorter than 620 px, normal page scrolling is allowed to avoid hiding controls.

Checks in the isolated Chromium preview (no live server access):
- All five sections: no horizontal or global vertical overflow on the above desktop sizes.
- Health adjustment: first combatant changed from 36/36 to 31/36 after pressing −5.
- DM sections, mode buttons and next-turn operation rendered and responded without JS page errors.
- Scene has editable text and a live preview; Cast has editable stats and a preview card.
- Stage retains prior viewer functionality and black-and-white training grid.

Limits: an actual localhost navigation was blocked by the testing environment; a live Firebase sync and Windows BAT upload/deploy still require tests on the user's computer. The preview was tested by mounting code and CSS in an isolated browser, not by connecting to a production deployment.

---
# Grim UI test build — Design / interaction checklist

## Current layout (0.4)

**Player stage**: dark top status strip, wall grid, perspective floor grid, a simple scene title/description (Scene mode), or four laminated placeholder cards and an initiative strip (Combat mode). No 3D model downloads or image dependencies. One visible callout marks the active character. The card photo slot starts empty.

**DM controls**: fixed black navigation column on desktop, black page with pale actions, compact read-only metrics, scene selector, encounter controls, and roster editor. Scene / Combat controls remain visible in the top bar for fewer clicks.

## Test with your players / DM

- Can the DM switch Scene ⇄ Combat without hunting through the menu?
- Can the DM deal damage, heal, remove a condition, spotlight a character, and go to the next turn in a few clicks?
- Can viewers identify active turn, HP, AC, and initiative from their usual TV viewing distance?
- Can a new participant understand the card placeholders without art direction?
- Are scene text, card size and number of cards readable at 1080p?
- Do focus states and controls work with keyboard only?
- How do 4, 6, and 8 characters change camera framing and card overlap?
- What should be fully hidden from players? The current cloud room is **player-facing data only**.

## Intentionally deferred

- Campaign fonts, decorative framing, character art, effects, particles, custom portraits and themed environments.
- Realtime 3D engine, world navigation, lighting presets and animation system.
- PF2e automation, dice integration, turn timers and combat rules.
- GM-only data isolation and role management.

## Updating from version 0.2

The website preserves stored campaign data when it updates; **it does not reset or migrate your existing party**. The new neutral layouts apply regardless of old palette values. Use **DM → Connection & setup → Reset to test data** only when you intentionally want generic fighter names and clean test scenes. Confirm before the reset, as it overwrites local scene/roster information.
