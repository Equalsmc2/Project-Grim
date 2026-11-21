// Static game/presentation catalogs. Pathfinder 2e condition names follow the
// Core Rulebook / Player Core; Grim tracks them, it does not adjudicate them.

/** valued: the condition carries a number (Frightened 2). */
export const CONDITIONS = [
  { name: 'Blinded' },
  { name: 'Clumsy', valued: true },
  { name: 'Concealed' },
  { name: 'Confused' },
  { name: 'Controlled' },
  { name: 'Dazzled' },
  { name: 'Deafened' },
  { name: 'Doomed', valued: true },
  { name: 'Drained', valued: true },
  { name: 'Dying', valued: true },
  { name: 'Encumbered' },
  { name: 'Enfeebled', valued: true },
  { name: 'Fascinated' },
  { name: 'Fatigued' },
  { name: 'Fleeing' },
  { name: 'Frightened', valued: true },
  { name: 'Grabbed' },
  { name: 'Hidden' },
  { name: 'Immobilized' },
  { name: 'Invisible' },
  { name: 'Off-guard' },
  { name: 'Paralyzed' },
  { name: 'Persistent damage' },
  { name: 'Petrified' },
  { name: 'Prone' },
  { name: 'Quickened' },
  { name: 'Restrained' },
  { name: 'Sickened', valued: true },
  { name: 'Slowed', valued: true },
  { name: 'Stunned', valued: true },
  { name: 'Stupefied', valued: true },
  { name: 'Unconscious' },
  { name: 'Undetected' },
  { name: 'Wounded', valued: true },
  // Presentation conditions used by the stage effects.
  { name: 'Burning', fx: 'burning' },
  { name: 'Frozen', fx: 'frozen' },
];
export const CONDITION_MAP = new Map(CONDITIONS.map((c) => [c.name.toLowerCase(), c]));

/** Legacy 1.5.8 player-edit whitelist; kept so old rooms validate identically. */
export const LEGACY_CONDITIONS = ['Frightened', 'Off-guard', 'Prone', 'Stunned', 'Dying', 'Wounded', 'Slowed', 'Sickened', 'Clumsy', 'Enfeebled', 'Drained', 'Grabbed', 'Burning', 'Frozen'];

export const SCENES = [
  { id: 'chapel', name: 'Training Grid', kicker: 'Stage 01', description: 'A neutral test environment for checking layout and camera framing.', ambience: 'Neutral light' },
  { id: 'forest', name: 'White Studio', kicker: 'Stage 02', description: 'A plain backdrop for checking readability and contrast.', ambience: 'Neutral light' },
  { id: 'archive', name: 'Graybox', kicker: 'Stage 03', description: 'A middle-gray space for checking spacing and proportions.', ambience: 'Neutral light' },
  { id: 'court', name: 'Black Studio', kicker: 'Stage 04', description: 'A dark neutral stage for testing contrast.', ambience: 'Neutral light' },
];

export const ACCENTS = ['ember', 'gold', 'violet', 'teal', 'rose', 'slate', 'moss', 'blood'];

export const DEMO_CHARACTERS = [
  { id: 'mara', name: 'Fighter 01', ancestry: 'Human', className: 'Fighter', level: 3, maxHp: 46, hp: 46, tempHp: 0, ac: 20, initiative: 22, perception: 8, faction: 'player', symbol: '01' },
  { id: 'ilyra', name: 'Fighter 02', ancestry: 'Elf', className: 'Witch', level: 3, maxHp: 32, hp: 32, tempHp: 0, ac: 17, initiative: 18, perception: 7, faction: 'player', symbol: '02' },
  { id: 'borin', name: 'Fighter 03', ancestry: 'Dwarf', className: 'Champion', level: 3, maxHp: 52, hp: 52, tempHp: 0, ac: 22, initiative: 16, perception: 6, faction: 'player', symbol: '03' },
  { id: 'sable', name: 'Fighter 04', ancestry: 'Human', className: 'Rogue', level: 3, maxHp: 36, hp: 36, tempHp: 0, ac: 19, initiative: 25, perception: 9, faction: 'player', symbol: '04' },
];
