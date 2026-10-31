# Grim UI test build — Design / interaction checklist

## Current layout (0.3)

**Player stage**: white top status strip, wall grid, perspective floor grid, a simple scene title/description (Scene mode), or four laminated placeholder cards and an initiative strip (Combat mode). No 3D model downloads or image dependencies. One visible callout marks the active character. The card photo slot starts empty.

**DM controls**: fixed black navigation column on desktop, white page with black actions, compact read-only metrics, scene selector, encounter controls, and roster editor. Scene / Combat controls remain visible in the top bar for fewer clicks.

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
