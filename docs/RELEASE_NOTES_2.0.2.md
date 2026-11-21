# Project Grim 2.0.2: card animations

All animations play on the TV and in the GM preview, triggered by normal GM and player actions. No new controls are needed.

| Event | What the card does |
|---|---|
| Its turn starts | Full spin with a hop, a light sweep across the face and a small scale pop. The card now has a back design (Grim sigil). |
| Takes damage | Recoils backwards, shakes side to side (harder for bigger hits), red rim flash, floating "-12" |
| Big hit (30%+ of max HP) | Heavier recoil and flash |
| Drops to 0 HP | Shatter, falls (foes) or kneels (heroes), floating "Defeated" / "Down" |
| Healed | Rises and bounces, green flash, floating "+8" |
| Revived from 0 HP | Stands back up with a golden flash |
| Temp HP gained | Teal shimmer and wobble, floating "+5" |
| Condition applied | Wobble and a flash in the condition's colour (ember for Burning, ice for Frozen, crimson for Dying, Wounded or Doomed) |
| Added mid-scene or revealed | Drops in from above with a bounce, or spins into view |
| Active card | Gently floats and breathes |

"Motion: reduced" on the TV, or the system reduced-motion setting, turns off the movement and keeps only short colour cues.

Tests: 46/46 unit and regression, 16/16 page checks. Firebase and sync code are unchanged from 2.0.1.
