// Every change to a campaign is a named command. A command declares the
// sections it touches; the store clones only those, applies the command,
// normalizes the result, records undo history and syncs only those sections.
import { CONDITION_MAP, SCENES } from './catalog.js';
import { activeMap, createMap, MAP_LIMIT, paintCell, placeToken, resizeMap, stepToken } from './battlemap.js';
import { normalizeEnvironment, withAtmosphere, withPreset } from './environment.js';
import { applyHp, initiativeOrder, normalizeResource, parseCondition, removeCondition, setCondition } from './rules.js';
import { normalizeCharacter, normalizeChatMessage } from './schema.js';
import { clamp, d20, int, isObj, num, text, uid } from './util.js';

const C = {};
/** @param {string} type @param {{sections:string[], apply:Function, label?:Function, coalesce?:Function, undoable?:boolean}} def */
function def(type, d) { C[type] = { type, undoable: true, ...d }; }
export const COMMANDS = C;

const char = (s, id) => s.characters.find((c) => c.id === id);
const visibleOrder = (s) => initiativeOrder(s.characters.filter((c) => !c.hidden));
const nameOf = (s, id) => char(s, id)?.name || 'Combatant';

function resetResources(c, kind) {
  for (const r of c.resources || []) if (r.reset === kind) r.current = r.max;
}

// ---------------------------------------------------------------- mode / scene
def('mode/set', {
  sections: ['meta', 'stage'],
  label: (p) => (p.mode === 'combat' ? 'Combat on stage' : 'Scene on stage'),
  apply(s, { mode }) {
    if (!['scene', 'combat'].includes(mode) || s.meta.mode === mode) return false;
    s.meta.mode = mode;
    if (mode === 'scene') s.stage.view = 'cinematic';
  },
});
def('view/set', {
  sections: ['stage'],
  label: (p) => (p.view === 'tactical' ? 'Tactical view' : 'Cinematic view'),
  apply(s, { view }) {
    if (!['cinematic', 'tactical'].includes(view) || s.stage.view === view) return false;
    s.stage.view = view;
  },
});
def('stage/set', {
  sections: ['stage'],
  apply(s, patch) {
    if ('followGm' in patch) s.stage.followGm = !!patch.followGm;
    if ('director' in patch) s.stage.director = patch.director;
  },
});
def('scene/select', {
  sections: ['meta'],
  label: (p) => `Scene: ${SCENES.find((x) => x.id === p.sceneId)?.name || p.sceneId}`,
  apply(s, { sceneId }) {
    if (!SCENES.some((x) => x.id === sceneId) || s.meta.sceneId === sceneId) return false;
    s.meta.sceneId = sceneId;
  },
});
def('scene/edit', {
  sections: ['meta'],
  coalesce: (p) => `scene/edit:${Object.keys(p).join()}`,
  apply(s, patch) {
    const id = s.meta.sceneId;
    const cur = { ...(s.meta.sceneOverrides[id] || {}) };
    for (const k of ['name', 'description', 'ambience']) if (k in patch) cur[k] = String(patch[k] ?? '');
    s.meta.sceneOverrides[id] = cur;
  },
});

// ---------------------------------------------------------------- characters
def('char/add', {
  sections: ['characters', 'combat'],
  label: (p) => `Added ${p.name || (p.faction === 'enemy' ? 'enemy' : 'player')}`,
  apply(s, p) {
    const enemies = s.characters.filter((c) => c.faction === 'enemy').length;
    const players = s.characters.length - enemies;
    const enemy = p.faction === 'enemy';
    const c = normalizeCharacter({
      id: p.id || uid(enemy ? 'foe' : 'pc'),
      name: p.name || (enemy ? `Enemy ${String(enemies + 1).padStart(2, '0')}` : `Hero ${String(players + 1).padStart(2, '0')}`),
      ancestry: p.ancestry ?? (enemy ? 'Creature' : 'Human'), className: p.className ?? (enemy ? 'Monster' : 'Fighter'),
      level: p.level ?? 1, maxHp: p.maxHp ?? 20, hp: p.hp ?? p.maxHp ?? 20, ac: p.ac ?? 15, initiative: p.initiative ?? 10,
      perception: p.perception ?? 5, faction: enemy ? 'enemy' : 'player', symbol: p.symbol ?? '', accent: p.accent,
      resources: p.resources, hidden: p.hidden,
    }, s.characters.length);
    if (s.characters.some((x) => x.id === c.id)) return false;
    s.characters.push(c);
    if (!s.combat.activeId) s.combat.activeId = c.id;
  },
});
def('char/remove', {
  sections: ['characters', 'combat', 'portraits', 'battleMaps'],
  label: (p, s) => `Removed ${nameOf(s, p.id)}`,
  apply(s, { id }) {
    const i = s.characters.findIndex((c) => c.id === id);
    if (i < 0) return false;
    if (s.combat.activeId === id) {
      const order = visibleOrder(s);
      const at = order.findIndex((c) => c.id === id);
      s.combat.activeId = order.filter((c) => c.id !== id)[Math.max(0, at) % Math.max(1, order.length - 1)]?.id || '';
    }
    s.characters.splice(i, 1);
    delete s.portraits[id];
    for (const m of s.battleMaps.maps) delete m.positions[id];
  },
});
def('char/duplicate', {
  sections: ['characters', 'portraits'],
  label: (p, s) => `Duplicated ${nameOf(s, p.id)}`,
  apply(s, { id, newId }) {
    const src = char(s, id);
    if (!src) return false;
    const base = src.name.replace(/\s+\d+$/, '');
    const n = s.characters.filter((c) => c.name.startsWith(base)).length + 1;
    const copy = normalizeCharacter({ ...src, id: newId || uid(src.faction === 'enemy' ? 'foe' : 'pc'), name: `${base} ${n}`, hp: src.maxHp, tempHp: 0, conditions: [] });
    s.characters.splice(s.characters.indexOf(src) + 1, 0, copy);
    if (s.portraits[id]) s.portraits[copy.id] = s.portraits[id];
  },
});
def('char/update', {
  sections: ['characters'],
  coalesce: (p) => `char/update:${p.id}:${Object.keys(p.patch || {}).sort().join()}`,
  apply(s, { id, patch }) {
    const c = char(s, id);
    if (!c || !isObj(patch)) return false;
    const allowed = ['name', 'ancestry', 'className', 'level', 'maxHp', 'hp', 'tempHp', 'ac', 'initiative', 'perception', 'faction', 'accent', 'symbol', 'hidden', 'avatar', 'notes'];
    for (const k of allowed) if (k in patch) c[k] = patch[k];
    if ('maxHp' in patch && num(c.hp) > num(c.maxHp)) c.hp = c.maxHp;
  },
});
def('char/hp', {
  sections: ['characters'],
  label: (p, s) => (p.amount < 0 ? `${nameOf(s, p.id)} takes ${-p.amount}` : `${nameOf(s, p.id)} heals ${p.amount}`),
  apply(s, { id, amount }) {
    const c = char(s, id);
    if (!c || !num(amount)) return false;
    applyHp(c, amount);
  },
});
def('char/hpSet', {
  sections: ['characters'],
  label: (p, s) => `${nameOf(s, p.id)} HP ${p.hp}`,
  apply(s, { id, hp }) {
    const c = char(s, id);
    if (!c) return false;
    c.hp = clamp(int(hp, c.hp, 0, 9999), 0, c.maxHp);
  },
});
def('char/temp', {
  sections: ['characters'],
  label: (p, s) => `${nameOf(s, p.id)} temp HP ${p.value}`,
  apply(s, { id, value }) {
    const c = char(s, id);
    if (!c) return false;
    c.tempHp = int(value, 0, 0, 9999);
  },
});
def('char/condition', {
  sections: ['characters'],
  label: (p, s) => (p.remove ? `${nameOf(s, p.id)}: ${p.name} ended` : `${nameOf(s, p.id)}: ${p.value ? `${p.name} ${p.value}` : p.name}`),
  apply(s, { id, name, value = null, remove = false }) {
    const c = char(s, id);
    if (!c || !text(name, 40)) return false;
    c.conditions = remove ? removeCondition(c.conditions, name) : setCondition(c.conditions, name, value);
  },
});
def('char/resource', {
  sections: ['characters'],
  coalesce: (p) => `res:${p.id}:${p.resourceId}`,
  label: (p, s) => (p.op === 'use' ? `${nameOf(s, p.id)} uses ${p.label || 'a resource'}` : undefined),
  apply(s, { id, op, resourceId, resource, delta = -1 }) {
    const c = char(s, id);
    if (!c) return false;
    c.resources ||= [];
    const r = c.resources.find((x) => x.id === resourceId);
    if (op === 'add') {
      if (c.resources.length >= 6) return false;
      c.resources.push(normalizeResource({ ...resource, id: resourceId || uid('res').slice(0, 30) }, c.resources.length));
    } else if (op === 'remove') {
      if (!r) return false;
      c.resources = c.resources.filter((x) => x !== r);
    } else if (op === 'update') {
      if (!r) return false;
      Object.assign(r, normalizeResource({ ...r, ...resource }));
    } else if (op === 'use') {
      if (!r) return false;
      r.current = clamp(r.current + delta, 0, r.max);
    } else return false;
  },
});
def('char/reorder', {
  sections: ['characters'],
  apply(s, { id, beforeId }) {
    const i = s.characters.findIndex((c) => c.id === id);
    if (i < 0) return false;
    const [c] = s.characters.splice(i, 1);
    const j = beforeId ? s.characters.findIndex((x) => x.id === beforeId) : -1;
    s.characters.splice(j < 0 ? s.characters.length : j, 0, c);
  },
});
def('portrait/set', {
  sections: ['portraits', 'characters'],
  label: (p, s) => `Portrait for ${nameOf(s, p.id)}`,
  apply(s, { id, image, avatar }) {
    const c = char(s, id);
    if (!c) return false;
    if (image) s.portraits[id] = image; else delete s.portraits[id];
    if (avatar !== undefined) c.avatar = avatar || '';
  },
});

// ---------------------------------------------------------------- combat
def('combat/start', {
  sections: ['meta', 'combat', 'characters'],
  label: () => 'Combat started',
  apply(s) {
    s.meta.mode = 'combat';
    s.combat.round = 1;
    s.combat.activeId = visibleOrder(s)[0]?.id || '';
    for (const c of s.characters) resetResources(c, 'round');
  },
});
def('combat/end', {
  sections: ['meta', 'stage'],
  label: () => 'Combat ended',
  apply(s) {
    s.meta.mode = 'scene';
    s.stage.view = 'cinematic';
  },
});
function advance(s, dir) {
  const order = visibleOrder(s);
  if (!order.length) return false;
  let i = order.findIndex((c) => c.id === s.combat.activeId);
  if (i < 0) i = dir > 0 ? -1 : 0;
  let next = i + dir;
  if (next >= order.length) { next = 0; s.combat.round += 1; for (const c of s.characters) resetResources(c, 'round'); }
  if (next < 0) { next = order.length - 1; s.combat.round = Math.max(1, s.combat.round - 1); }
  s.combat.activeId = order[next].id;
  if (dir > 0) resetResources(char(s, order[next].id), 'turn');
}
def('turn/next', { sections: ['combat', 'characters'], label: (_, s) => 'Next turn', apply: (s) => advance(s, 1) });
def('turn/prev', { sections: ['combat', 'characters'], label: () => 'Previous turn', apply: (s) => advance(s, -1) });
def('turn/set', {
  sections: ['combat'],
  label: (p, s) => `Spotlight: ${nameOf(s, p.id)}`,
  apply(s, { id }) {
    if (!char(s, id) || s.combat.activeId === id) return false;
    s.combat.activeId = id;
  },
});
def('round/set', {
  sections: ['combat'],
  label: (p) => `Round ${p.round}`,
  apply(s, { round }) {
    const r = int(round, s.combat.round, 1, 9999);
    if (r === s.combat.round) return false;
    s.combat.round = r;
  },
});
def('init/roll', {
  sections: ['characters', 'combat'],
  label: (p) => (p.enemiesOnly ? 'Rolled enemy initiative' : 'Rolled initiative'),
  apply(s, { enemiesOnly = false, rolls }) {
    for (const c of s.characters) {
      if (enemiesOnly && c.faction !== 'enemy') continue;
      const roll = rolls?.[c.id] ?? d20();
      c.initiative = roll + num(c.perception);
    }
    s.combat.activeId = visibleOrder(s)[0]?.id || '';
  },
});

// ---------------------------------------------------------------- environment
def('env/set', {
  sections: ['environment'],
  coalesce: (p) => `env:${Object.keys(p).sort().join()}`,
  apply(s, patch) {
    const next = normalizeEnvironment({ ...s.environment, ...patch, ...(('timeOfDay' in patch || 'cycleEnabled' in patch) && (patch.cycleEnabled ?? s.environment.cycleEnabled) ? { timeEpoch: Date.now() } : {}) });
    if (!('atmospherePreset' in patch) && ['timeOfDay', 'cloudCover', 'fog', 'weather'].some((k) => k in patch)) next.atmospherePreset = 'Custom';
    s.environment = next;
  },
});
def('env/preset', {
  sections: ['environment'],
  label: (p) => `Environment: ${p.name}`,
  apply(s, { name }) { s.environment = withPreset(s.environment, name); },
});
def('env/atmosphere', {
  sections: ['environment'],
  label: (p) => `Atmosphere: ${p.name}`,
  apply(s, { name }) { s.environment = withAtmosphere(s.environment, name); },
});
def('env/reseed', {
  sections: ['environment'],
  label: () => 'New terrain seed',
  apply(s, { seed }) { s.environment.seed = int(seed, Math.floor(Math.random() * 2e9) + 1, 1, 2147483647); },
});

// ---------------------------------------------------------------- battle maps
const withMap = (fn) => (s, p) => { const m = activeMap(s); if (!m) return false; return fn(s, m, p); };
def('map/create', {
  sections: ['battleMaps'],
  label: (p) => `New map ${p.name || ''}`.trim(),
  apply(s, { id, name, width, height }) {
    if (s.battleMaps.maps.length >= MAP_LIMIT) return false;
    const map = createMap({ id: id || uid('map'), name: name || `Battlefield ${s.battleMaps.maps.length + 1}`, width, height });
    s.battleMaps.maps.push(map);
    s.battleMaps.activeId = map.id;
  },
});
def('map/select', {
  sections: ['battleMaps'],
  apply(s, { id }) {
    if (!s.battleMaps.maps.some((m) => m.id === id) || s.battleMaps.activeId === id) return false;
    s.battleMaps.activeId = id;
  },
});
def('map/rename', { sections: ['battleMaps'], coalesce: () => 'map/rename', apply: withMap((s, m, { name }) => { m.name = text(name, 48) || m.name; }) });
def('map/delete', {
  sections: ['battleMaps'],
  label: () => 'Deleted map',
  apply(s, { id }) {
    if (s.battleMaps.maps.length <= 1) return false;
    s.battleMaps.maps = s.battleMaps.maps.filter((m) => m.id !== id);
    if (!s.battleMaps.maps.some((m) => m.id === s.battleMaps.activeId)) s.battleMaps.activeId = s.battleMaps.maps[0].id;
  },
});
def('map/resize', {
  sections: ['battleMaps'],
  label: (p) => `Map ${p.width}×${p.height}`,
  apply: withMap((s, m, { width, height }) => resizeMap(m, width, height) || false),
});
def('map/paint', {
  sections: ['battleMaps'],
  coalesce: (p) => `map/paint:${p.stroke || ''}`,
  apply: withMap((s, m, { cells, terrain }) => {
    let changed = false;
    for (const [x, y] of cells || []) changed = paintCell(m, x, y, terrain, s.characters) || changed;
    return changed || false;
  }),
});
def('map/clear', { sections: ['battleMaps'], label: () => 'Cleared map terrain', apply: withMap((s, m) => { m.rows = m.rows.map((r) => '.'.repeat(r.length)); }) });
def('map/place', {
  sections: ['battleMaps'],
  label: (p, s) => `Moved ${nameOf(s, p.id)}`,
  apply: withMap((s, m, { id, x, y }) => placeToken(m, s.characters, id, x, y) || false),
});
def('map/step', {
  sections: ['battleMaps'],
  apply: withMap((s, m, { id, direction }) => stepToken(m, s.characters, id, direction) || false),
});
def('map/resetPositions', { sections: ['battleMaps'], label: () => 'Reset token positions', apply: withMap((s, m) => { m.positions = {}; }) });

// ---------------------------------------------------------------- presentation, overlays, chat
def('pres/set', {
  sections: ['presentation'],
  coalesce: (p) => `pres:${Object.keys(p).join()}`,
  apply(s, patch) { Object.assign(s.presentation, patch); },
});
def('overlay/show', {
  sections: ['overlay'],
  undoable: false,
  label: (p) => (p.kind === 'title' ? `Title card: ${p.title}` : p.kind === 'handout' ? `Handout: ${p.title || 'image'}` : `${p.speaker || 'Narrator'} speaks`),
  apply(s, p) {
    s.overlay = { kind: p.kind, id: uid('ov'), title: p.title || '', text: p.text || '', speaker: p.speaker || '', characterId: p.characterId || '', image: p.image || '', at: Date.now() };
  },
});
def('overlay/hide', {
  sections: ['overlay'],
  undoable: false,
  apply(s) {
    if (s.overlay.kind === 'none') return false;
    s.overlay = { ...s.overlay, kind: 'none', at: Date.now() };
  },
});
def('chat/post', {
  sections: ['chat'],
  undoable: false,
  apply(s, m) {
    const msg = normalizeChatMessage({ id: m.id || uid('m'), at: m.at || Date.now(), ...m });
    if (!msg || s.chat.some((x) => x.id === msg.id)) return false;
    s.chat.push(msg);
    s.chat = s.chat.sort((a, b) => a.at - b.at).slice(-80);
  },
});
def('chat/clear', { sections: ['chat'], undoable: false, apply(s) { if (!s.chat.length) return false; s.chat = []; } });

// ---------------------------------------------------------------- music (volatile)
def('music/set', {
  sections: ['music'],
  undoable: false,
  apply(s, patch) { s.music = { ...s.music, ...patch }; },
});

// ---------------------------------------------------------------- prepared scenes
def('snapshot/save', {
  sections: ['snapshots'],
  label: (p) => `Saved scene "${p.name}"`,
  apply(s, { name, id }) {
    const sceneId = s.meta.sceneId;
    const snap = { id: id || uid('snap'), name: text(name, 44) || s.environment.preset, environment: s.environment, sceneId, sceneOverride: s.meta.sceneOverrides[sceneId] || null, createdAt: Date.now() };
    s.snapshots = [...s.snapshots.filter((x) => x.id !== snap.id), snap].slice(-12);
  },
});
def('snapshot/apply', {
  sections: ['environment', 'meta'],
  label: (p, s) => `Applied "${s.snapshots.find((x) => x.id === p.id)?.name || 'scene'}"`,
  apply(s, { id, snapshot }) {
    const snap = snapshot || s.snapshots.find((x) => x.id === id);
    if (!snap) return false;
    s.environment = normalizeEnvironment(snap.environment);
    s.meta.sceneId = snap.sceneId;
    if (snap.sceneOverride) s.meta.sceneOverrides[snap.sceneId] = { ...snap.sceneOverride };
    else delete s.meta.sceneOverrides[snap.sceneId];
  },
});
def('snapshot/delete', {
  sections: ['snapshots'],
  apply(s, { id }) {
    const before = s.snapshots.length;
    s.snapshots = s.snapshots.filter((x) => x.id !== id);
    if (before === s.snapshots.length) return false;
  },
});
def('snapshot/import', {
  sections: ['snapshots'],
  label: (p) => `Imported ${p.list?.length || 0} scenes`,
  apply(s, { list }) {
    if (!Array.isArray(list)) return false;
    const byId = new Map(s.snapshots.map((x) => [x.id, x]));
    for (const v of list) if (isObj(v) && v.id) byId.set(String(v.id), v);
    s.snapshots = [...byId.values()].slice(-12);
  },
});

// ---------------------------------------------------------------- camera (volatile, GM -> TV)
def('camera/pose', {
  sections: ['camera'],
  undoable: false,
  apply(s, { pose }) { s.camera = { pose, at: Date.now() }; },
});

// ---------------------------------------------------------------- player intents
/** Fields a player may change on their own sheet (same whitelist as the Firebase rules). */
export const PLAYER_FIELDS = {
  level: [1, 20], maxHp: [1, 9999], hp: [0, 9999], tempHp: [0, 9999], ac: [0, 99], initiative: [-100, 150], perception: [-20, 80],
};
export const PLAYER_TEXT = { name: 48, ancestry: 35, className: 35 };
export const PLAYER_EDIT_FIELDS = [...Object.keys(PLAYER_FIELDS), ...Object.keys(PLAYER_TEXT), 'conditions', 'avatar', 'mapMove'];

export function normalizePlayerEdit(field, value) {
  if (field === 'avatar') return typeof value === 'string' && /^v1-[0-9a-z]{16}$/.test(value) ? value : null;
  if (field === 'mapMove') return ['up', 'down', 'left', 'right'].includes(value) ? value : null;
  if (field in PLAYER_TEXT) { const t = text(value, PLAYER_TEXT[field]); return t || null; }
  if (field === 'conditions') {
    const names = Array.isArray(value) ? value : String(value ?? '').split(',');
    return names.map((x) => parseCondition(x)).filter((c) => c.name && CONDITION_MAP.has(c.name.toLowerCase())).map((c) => (c.value ? `${c.name} ${c.value}` : c.name)).slice(0, 14);
  }
  const range = PLAYER_FIELDS[field];
  if (!range || value === '' || value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return clamp(Math.trunc(Number(value)), range[0], range[1]);
}
/** Encodes for the Firebase inbox (conditions travel as a CSV string). */
export function encodePlayerEdit(field, value) {
  const v = normalizePlayerEdit(field, value);
  if (v === null) return null;
  return field === 'conditions' ? v.join(',').slice(0, 220) : v;
}

def('player/edit', {
  sections: ['characters', 'battleMaps'],
  coalesce: (p) => `player:${p.id}:${p.field}`,
  label: (p, s) => (p.field === 'mapMove' ? undefined : `${nameOf(s, p.id)} updated ${p.field}`),
  apply(s, { id, field, value }) {
    const c = s.characters.find((x) => x.id === id && x.faction !== 'enemy');
    if (!c) return false;
    const v = normalizePlayerEdit(field, value);
    if (v === null) return false;
    if (field === 'mapMove') {
      if (s.meta.mode !== 'combat' || s.stage.view !== 'tactical') return false;
      return stepToken(activeMap(s), s.characters, id, v) || false;
    }
    if (field === 'avatar') { c.avatar = v; return; }
    if (field === 'conditions') {
      // Players manage standard conditions; GM-only free-text conditions survive.
      const custom = c.conditions.filter((x) => !CONDITION_MAP.has(parseCondition(x).name.toLowerCase()));
      c.conditions = [...v, ...custom];
      return;
    }
    c[field] = v;
    if (field === 'maxHp' && c.hp > v) c.hp = v;
    if (field === 'hp') c.hp = Math.min(v, c.maxHp);
  },
});

def('cursors/set', {
  sections: ['cursors'],
  undoable: false,
  apply(s, { cursors }) { Object.assign(s.cursors, cursors); },
});

// ---------------------------------------------------------------- whole campaign
def('campaign/replace', {
  sections: ['meta', 'stage', 'characters', 'portraits', 'combat', 'environment', 'battleMaps', 'presentation', 'snapshots'],
  label: (p) => p.label || 'Campaign replaced',
  apply(s, { campaign }) {
    if (!isObj(campaign)) return false;
    for (const k of this.sections) if (k in campaign) s[k] = campaign[k];
  },
});
