# Project Grim 2.1: dark fantasy juice

## On the TV
- **Banners.** Each appears in carved Cinzel capitals over a dark band:

  | When | Banner |
  |---|---|
  | Combat starts | **Battle Begins** (with a swelling drone and a boom) |
  | A new round | **Round N** (a deep bell tolls) |
  | A turn passes | The combatant's name slides through ("Takes the turn" / "The foe moves") |
  | A hero drops to 0 HP | **Fallen** in blood red; the screen darkens and a funeral bell rings |
  | Every foe is down | **Foes Vanquished** in gold |
  | The whole party is down | **The Party Has Fallen** |
  | Scene or biome changes (scene mode) | Area-name reveal |

- **Boss health bar.** Shows for the foe taking its turn, or the foe just hit. Name above, dark red bar, a gold trailing chunk that catches up after each hit, and a running damage total.
- **Damage numbers.** Carved serif numerals with an ember or blood gradient. Bigger hits get bigger numbers, and critical hits (30%+ of max HP) punch in and shake. Heals are pale green and temp HP teal; "Felled", "Fallen" and "Risen" appear above the card.
- **Screen feel.**
  - Camera shake on heavy blows and deaths.
  - A red vignette pulse when the party is hurt, a white-red flash on crits, a green wash on heals.
  - Subtle animated film grain.
- **HUD.**
  - Initiative ribbon chips have HP bars with trailing damage, and the active combatant lifts with an ember underline.
  - Carved type for names, titles and dialogue speakers.

## Sound effects
Every sound is synthesised in the browser; there are no audio files.

| Moment | Sound |
|---|---|
| Hit | Dull impact |
| Critical hit | Heavier crunch with reverb |
| Death | Glass shatter and a low fall (plus a funeral bell for heroes) |
| Heal | Soft chime |
| Temp HP | Shimmer |
| Burning / Frozen / other conditions | Flame whoosh / ice tinkle / dark swoosh |
| Turn start | Low bell |
| Round | Deeper bell |
| Handout or dialogue | Page sound |

Volume: GM deck → Scene → "Sound effects on the TV". The TV plays them after "Tap to enable sound". The GM hears them too while monitoring (the speaker button in the dock).

## On the GM deck
- Rows flash and shake on damage and glow on heals; HP and initiative numbers tick when they change.
- The active row slides in.
- Button press feedback, animated tab underline and panel transitions.

## Fixed
- Under the "reduced motion" system setting, banners could finish their fade instantly and stay invisible. They now show without fading.

## Tests
- 47/47 unit and regression, including the new event-detection tests.
- 16/16 page checks.
- 23/23 multi-client sync.
