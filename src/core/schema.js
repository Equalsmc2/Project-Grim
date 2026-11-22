// Campaign schema v2 and lossless migration from the 1.5.8 (v1) blob.
//
// The campaign is split into named SECTIONS. Every command declares which
// sections it touches; those are the only parts cloned, persisted, undone
// and sent over the network.
import { ACCENTS, DEMO_CHARACTERS, SCENES } from './catalog.js';
import { defaultMaps, normalizeMaps } from './battlemap.js';
import { normalizeEnvironment } from './environment.js';
import { normalizeConditions, normalizeResource } from './rules.js';
import { clamp, int, isObj, num, text } from './util.js';
import { normalizeMusic } from '../audio/music-playback.js';

export const SCHEMA = 2;
export const SECTIONS = ['meta', 'stage', 'characters', 'portraits', 'combat', 'environment', 'battleMaps', 'music', 'presentation', 'overlay', 'chat', 'snapshots', 'log', 'cursors', 'camera', 'claims'];
/** Sections that are never part of undo history. */
export const VOLATILE = new Set(['log', 'chat', 'camera', 'cursors', 'music', 'claims']);

const asArray = (v) => (Array.isArray(v) ? v : isObj(v) ? Object.keys(v).sort((a, b) => Number(a) - Number(b)).map((k) => v[k]) : []);
const safeImg = (x) => (typeof x === 'string' && /^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(x) && x.length < 1_500_000 ? x : '');

export function normalizeCharacter(c, i = 0) {
  const maxHp = int(c?.maxHp, 10, 1, 9999);
  const id = String(c?.id || `c-${i}`).replace(/[^a-z0-9-]/gi, '').slice(0, 60) || `c-${i}`;
  return {
    id,
    name: text(c?.name, 48) || 'Unnamed',
    ancestry: text(c?.ancestry, 35),
    className: text(c?.className, 35),
    level: int(c?.level, 1, -1, 30),
    maxHp,
    hp: int(c?.hp, maxHp, 0, maxHp),
    tempHp: int(c?.tempHp, 0, 0, 9999),
    ac: int(c?.ac, 10, 0, 99),
    initiative: int(c?.initiative, 0, -100, 150),
    perception: int(c?.perception, 0, -20, 80),
    conditions: normalizeConditions(c?.conditions),
    faction: c?.faction === 'enemy' ? 'enemy' : 'player',
    accent: ACCENTS.includes(c?.accent) ? c.accent : 'ember',
    symbol: text(c?.symbol, 4),
    hidden: !!c?.hidden,
    avatar: typeof c?.avatar === 'string' && /^v1-[0-9a-z]{16}$/.test(c.avatar) ? c.avatar : '',
    resources: asArray(c?.resources).slice(0, 6).map(normalizeResource),
    notes: text(c?.notes, 400),
  };
}

export function defaultCampaign(now = Date.now()) {
  return {
    schema: SCHEMA,
    rev: 0,
    updatedAt: now,
    meta: { campaign: 'PROJECT GRIM', subtitle: 'PATHFINDER 2E', mode: 'scene', sceneId: 'chapel', sceneOverrides: {} },
    stage: { view: 'cinematic', followGm: true, director: 'auto' },
    characters: DEMO_CHARACTERS.map(normalizeCharacter),
    portraits: {},
    combat: { round: 1, activeId: 'sable' },
    environment: normalizeEnvironment(),
    battleMaps: defaultMaps(),
    music: normalizeMusic(),
    presentation: { cardScale: 1, showHud: true, showSceneCards: false, chatOnStage: true, sfx: 0.7 },
    overlay: { kind: 'none', id: '', title: '', text: '', speaker: '', characterId: '', image: '', at: 0 },
    chat: [],
    snapshots: [],
    log: [{ id: 'intro', time: now, text: 'Stage ready.' }],
    cursors: {},
    camera: { pose: null, at: 0 },
    claims: {},
  };
}

function normalizeMeta(m) {
  const overrides = {};
  if (isObj(m?.sceneOverrides)) for (const [k, v] of Object.entries(m.sceneOverrides)) {
    if (!SCENES.some((s) => s.id === k) || !isObj(v)) continue;
    overrides[k] = { name: text(v.name, 85), description: String(v.description || '').slice(0, 350), ambience: text(v.ambience, 110) };
  }
  return {
    campaign: text(m?.campaign, 60) || 'PROJECT GRIM',
    subtitle: text(m?.subtitle, 60) || 'PATHFINDER 2E',
    mode: m?.mode === 'combat' ? 'combat' : 'scene',
    sceneId: SCENES.some((s) => s.id === m?.sceneId) ? m.sceneId : 'chapel',
    sceneOverrides: overrides,
  };
}

function normalizeOverlay(o) {
  const kind = ['none', 'dialogue', 'title', 'handout'].includes(o?.kind) ? o.kind : 'none';
  return {
    kind,
    id: text(o?.id, 40),
    title: text(o?.title, 90),
    text: String(o?.text || '').slice(0, 800),
    speaker: text(o?.speaker, 48),
    characterId: text(o?.characterId, 60),
    image: safeImg(o?.image),
    at: Math.max(0, num(o?.at)),
  };
}

export function normalizeChatMessage(m) {
  if (!isObj(m)) return null;
  const t = String(m.text || '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '').trim().slice(0, 300);
  if (!t) return null;
  return {
    id: text(m.id, 60) || `m-${num(m.at)}`,
    from: ['gm', 'player', 'system'].includes(m.from) ? m.from : 'player',
    name: text(m.name, 48) || 'Player',
    text: t,
    at: Math.max(0, num(m.at)),
    toStage: m.toStage !== false,
    whisper: text(m.whisper, 60),
  };
}

function normalizeSnapshot(v) {
  if (!isObj(v) || !text(v.id, 50)) return null;
  return {
    id: text(v.id, 50),
    name: text(v.name, 44) || 'Untitled scene',
    environment: normalizeEnvironment(v.environment),
    sceneId: SCENES.some((s) => s.id === v.sceneId) ? v.sceneId : 'chapel',
    sceneOverride: isObj(v.sceneOverride) ? { name: text(v.sceneOverride.name, 85), description: String(v.sceneOverride.description || '').slice(0, 350), ambience: text(v.sceneOverride.ambience, 110) } : null,
    createdAt: Math.max(0, num(v.createdAt)),
  };
}

/** Normalizes one section. Used for local loads, tab messages and cloud snapshots. */
export function normalizeSection(name, value, campaign) {
  const d = defaultCampaign(0);
  switch (name) {
    case 'meta': return normalizeMeta(value);
    case 'stage': return {
      view: value?.view === 'tactical' ? 'tactical' : 'cinematic',
      followGm: value?.followGm !== false,
      director: ['auto', 'manual'].includes(value?.director) ? value.director : 'auto',
    };
    case 'characters': {
      const seen = new Set();
      return asArray(value).slice(0, 60).map(normalizeCharacter).filter((c) => !seen.has(c.id) && seen.add(c.id));
    }
    case 'portraits': {
      const out = {};
      if (isObj(value)) for (const [k, v] of Object.entries(value)) { const img = safeImg(v); if (img) out[k.slice(0, 60)] = img; }
      return out;
    }
    case 'combat': return { round: int(value?.round, 1, 1, 9999), activeId: text(value?.activeId, 60) };
    case 'environment': return normalizeEnvironment(value);
    case 'battleMaps': return normalizeMaps(value, campaign?.characters || []);
    case 'music': return normalizeMusic(value);
    case 'presentation': return {
      cardScale: clamp(num(value?.cardScale, 1), 0.7, 1.4),
      showHud: value?.showHud !== false,
      showSceneCards: !!value?.showSceneCards,
      chatOnStage: value?.chatOnStage !== false,
      sfx: clamp(num(value?.sfx, 0.7), 0, 1),
    };
    case 'overlay': return normalizeOverlay(value);
    case 'chat': return asArray(value).map(normalizeChatMessage).filter(Boolean).sort((a, b) => a.at - b.at).slice(-80);
    case 'snapshots': return asArray(value).map(normalizeSnapshot).filter(Boolean).slice(-12);
    case 'log': return asArray(value).filter(isObj).map((l) => ({ id: text(l.id, 40), time: num(l.time), text: text(l.text, 160) })).slice(-40);
    case 'cursors': {
      const out = {};
      // Firebase keys may not contain '/', so 1.5.8 cursor keys are rewritten with '|'.
      if (isObj(value)) for (const [k, v] of Object.entries(value)) if (Number.isSafeInteger(Number(v))) out[k.replace(/[/.#$[\]]/g, '|').slice(0, 160)] = Number(v);
      return out;
    }
    case 'claims': {
      // characterId -> { uid, at }: which player device may edit that party sheet.
      const out = {};
      if (isObj(value)) for (const [k, v] of Object.entries(value)) {
        const id = String(k).replace(/[^a-z0-9-]/gi, '').slice(0, 60);
        if (id && isObj(v) && typeof v.uid === 'string' && v.uid && v.uid.length <= 128) out[id] = { uid: v.uid, at: Math.max(0, num(v.at)) };
      }
      return out;
    }
    case 'camera': return { pose: isObj(value?.pose) ? normalizePose(value.pose) : null, at: num(value?.at) };
    default: return d[name];
  }
}

export function normalizePose(p) {
  return {
    x: clamp(num(p.x), -200, 200), y: clamp(num(p.y), -50, 200), z: clamp(num(p.z), -200, 200),
    yaw: clamp(num(p.yaw), -Math.PI * 4, Math.PI * 4), pitch: clamp(num(p.pitch, 0.5), 0.02, 1.56), dist: clamp(num(p.dist, 20), 2, 160),
  };
}

export function isLegacyCampaign(raw) {
  return isObj(raw) && raw.schema !== SCHEMA && (Array.isArray(raw.characters) || 'mode' in raw || 'sceneId' in raw || raw.version === 1);
}

/** v1 (1.5.8) blob -> v2 sections. Portraits move to their own section. */
export function migrateLegacy(v1) {
  const chars = asArray(v1.characters);
  const portraits = {};
  for (const c of chars) { const img = safeImg(c?.portrait); if (img && c?.id) portraits[String(c.id)] = img; }
  const legacyTactical = !!v1.battleMaps?.enabled;
  return {
    schema: SCHEMA,
    rev: 0,
    updatedAt: num(v1.updatedAt, Date.now()),
    meta: { campaign: v1.campaign, subtitle: v1.subtitle, mode: v1.mode, sceneId: v1.sceneId, sceneOverrides: v1.sceneOverrides },
    stage: { view: legacyTactical && v1.mode === 'combat' ? 'tactical' : 'cinematic', followGm: true },
    characters: chars,
    portraits,
    combat: v1.combat,
    environment: v1.environment,
    battleMaps: v1.battleMaps,
    music: v1.music,
    presentation: v1.presentation,
    overlay: null,
    chat: [],
    snapshots: v1.sceneSnapshots,
    log: v1.log,
    cursors: v1.playerEditCursors,
    camera: null,
  };
}

/** Full normalization of any stored or received campaign (v1 or v2). */
export function normalizeCampaign(raw) {
  if (!isObj(raw)) return defaultCampaign();
  const src = isLegacyCampaign(raw) ? migrateLegacy(raw) : raw;
  const out = { schema: SCHEMA, rev: Math.max(0, int(src.rev, 0, 0, Number.MAX_SAFE_INTEGER)), updatedAt: num(src.updatedAt, Date.now()) };
  out.characters = normalizeSection('characters', src.characters ?? defaultCampaign(0).characters, out);
  for (const name of SECTIONS) if (name !== 'characters') out[name] = normalizeSection(name, src[name], out);
  // Drop portraits that no longer belong to a character.
  const ids = new Set(out.characters.map((c) => c.id));
  for (const k of Object.keys(out.portraits)) if (!ids.has(k)) delete out.portraits[k];
  return out;
}

export function getScene(c) {
  const base = SCENES.find((s) => s.id === c.meta.sceneId) || SCENES[0];
  const o = c.meta.sceneOverrides?.[base.id] || {};
  return { ...base, name: o.name || base.name, description: o.description ?? base.description, ambience: o.ambience || base.ambience };
}
