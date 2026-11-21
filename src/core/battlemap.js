// Tactical maps: one cell = one 5-ft square. Positioning only; Grim does not
// automate the Pathfinder action economy. Row strings and terrain codes are
// identical to 1.5.8 so saved maps load unchanged.
import { int, isObj, text } from './util.js';

export const MAP_MIN_W = 6, MAP_MAX_W = 48, MAP_MIN_H = 6, MAP_MAX_H = 36, MAP_LIMIT = 16;
export const DEFAULT_MAP_W = 32, DEFAULT_MAP_H = 20;

export const TERRAIN = [
  { key: 'floor', code: '.', label: 'Clear', blocked: false },
  { key: 'wall', code: '#', label: 'Wall', blocked: true },
  { key: 'difficult', code: ':', label: 'Difficult', blocked: false },
  { key: 'water', code: '~', label: 'Water', blocked: false },
  { key: 'cover', code: 'O', label: 'Cover', blocked: true },
  { key: 'tree', code: 'T', label: 'Tree', blocked: true },
  { key: 'rock', code: 'R', label: 'Rock', blocked: true },
  { key: 'bush', code: 'B', label: 'Bush', blocked: false },
  { key: 'log', code: 'L', label: 'Fallen log', blocked: true },
  { key: 'pillar', code: 'P', label: 'Pillar', blocked: true },
  { key: 'ruin', code: 'U', label: 'Ruined stone', blocked: true },
  { key: 'grave', code: 'G', label: 'Gravestone', blocked: true },
  { key: 'mound', code: 'M', label: 'Mound', blocked: false },
];
export const TERRAIN_BY_KEY = new Map(TERRAIN.map((t) => [t.key, t]));
export const TERRAIN_BY_CODE = new Map(TERRAIN.map((t) => [t.code, t]));
export const STEPS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

const cleanId = (v) => String(v || '').replace(/[^a-z0-9-]/gi, '').slice(0, 60);
const inside = (p, w, h) => p && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < w && p.y < h;

export function createMap({ id = 'starter', name = 'Battlefield', width = DEFAULT_MAP_W, height = DEFAULT_MAP_H } = {}) {
  width = int(width, DEFAULT_MAP_W, MAP_MIN_W, MAP_MAX_W);
  height = int(height, DEFAULT_MAP_H, MAP_MIN_H, MAP_MAX_H);
  return { id: cleanId(id) || 'starter', name: text(name, 48) || 'Battlefield', width, height, rows: Array.from({ length: height }, () => '.'.repeat(width)), positions: {} };
}

export function defaultMaps() {
  return { activeId: 'starter', maps: [createMap()] };
}

export function normalizeMaps(candidate, characters = []) {
  const known = new Set(characters.map((c) => String(c.id)));
  const seen = new Set();
  const maps = [];
  const list = Array.isArray(candidate?.maps) ? candidate.maps : isObj(candidate?.maps) ? Object.values(candidate.maps) : [];
  for (const [i, raw] of list.slice(0, MAP_LIMIT).entries()) {
    if (!isObj(raw)) continue;
    const width = int(raw.width, 16, MAP_MIN_W, MAP_MAX_W), height = int(raw.height, 12, MAP_MIN_H, MAP_MAX_H);
    const id = cleanId(raw.id) || `battle-${i}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const rawRows = Array.isArray(raw.rows) ? raw.rows : isObj(raw.rows) ? Object.values(raw.rows) : [];
    const rows = Array.from({ length: height }, (_, y) => {
      const src = typeof rawRows[y] === 'string' ? rawRows[y] : '';
      return Array.from({ length: width }, (_, x) => (TERRAIN_BY_CODE.has(src[x]) ? src[x] : '.')).join('');
    });
    const positions = {};
    if (isObj(raw.positions)) for (const [cid, p] of Object.entries(raw.positions)) if (known.has(cid) && inside(p, width, height)) positions[cid] = { x: p.x, y: p.y };
    maps.push({ id, name: text(raw.name, 48) || 'Battlefield', width, height, rows, positions });
  }
  if (!maps.length) maps.push(createMap());
  const activeId = maps.some((m) => m.id === candidate?.activeId) ? candidate.activeId : maps[0].id;
  return { activeId, maps };
}

export const activeMap = (state) => state.battleMaps?.maps?.find((m) => m.id === state.battleMaps.activeId) || state.battleMaps?.maps?.[0] || null;
export const tileCode = (map, x, y) => (x < 0 || y < 0 || x >= map.width || y >= map.height ? '#' : map.rows[y]?.[x] || '.');
export const tileType = (map, x, y) => TERRAIN_BY_CODE.get(tileCode(map, x, y)) || TERRAIN[0];
export const isBlocked = (map, x, y) => tileType(map, x, y).blocked;

/**
 * Explicit placements win; everyone else gets a stable free square near their
 * side (players on the near/bottom edge, enemies on the far/top edge), ordered
 * by initiative so the board mirrors the cinematic formation.
 */
export function boardPositions(map, characters = []) {
  const positions = new Map(), taken = new Set();
  const key = (x, y) => `${x}:${y}`;
  for (const c of characters) {
    const p = map.positions?.[c.id];
    if (inside(p, map.width, map.height) && !isBlocked(map, p.x, p.y) && !taken.has(key(p.x, p.y))) {
      positions.set(c.id, { x: p.x, y: p.y });
      taken.add(key(p.x, p.y));
    }
  }
  const sides = { player: [], enemy: [] };
  for (const c of characters) if (!positions.has(c.id)) sides[c.faction === 'enemy' ? 'enemy' : 'player'].push(c);
  for (const [side, list] of Object.entries(sides)) {
    list.forEach((c, rank) => {
      const span = Math.max(1, list.length - 1);
      const ax = list.length === 1 ? Math.floor(map.width / 2) : Math.round(map.width * 0.25 + (map.width * 0.5 * rank) / span);
      const ay = side === 'enemy' ? Math.min(2, map.height - 1) : Math.max(0, map.height - 3);
      let best = null, bd = Infinity;
      for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
        if (isBlocked(map, x, y) || taken.has(key(x, y))) continue;
        const d = Math.abs(ax - x) + Math.abs(ay - y) * 1.1;
        if (d < bd) { best = { x, y }; bd = d; }
      }
      if (best) { positions.set(c.id, best); taken.add(key(best.x, best.y)); }
    });
  }
  return positions;
}

export function paintCell(map, x, y, terrainKey, characters = []) {
  const type = TERRAIN_BY_KEY.get(terrainKey);
  if (!map || !type || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
  if (type.blocked && [...boardPositions(map, characters).values()].some((p) => p.x === x && p.y === y)) return false;
  if (tileCode(map, x, y) === type.code) return false;
  map.rows[y] = map.rows[y].slice(0, x) + type.code + map.rows[y].slice(x + 1);
  return true;
}

export function resizeMap(map, width, height) {
  width = int(width, map.width, MAP_MIN_W, MAP_MAX_W);
  height = int(height, map.height, MAP_MIN_H, MAP_MAX_H);
  if (width === map.width && height === map.height) return false;
  map.rows = Array.from({ length: height }, (_, y) => (map.rows[y] || '').slice(0, width).padEnd(width, '.'));
  map.width = width;
  map.height = height;
  for (const [id, p] of Object.entries(map.positions)) if (!inside(p, width, height)) delete map.positions[id];
  return true;
}

export function placeToken(map, characters, id, x, y) {
  if (!map || !characters.some((c) => c.id === id) || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (x < 0 || y < 0 || x >= map.width || y >= map.height || isBlocked(map, x, y)) return false;
  const occupied = [...boardPositions(map, characters)].some(([cid, p]) => cid !== id && p.x === x && p.y === y);
  if (occupied) return false;
  map.positions[id] = { x, y };
  return true;
}

export function stepToken(map, characters, id, direction) {
  const step = STEPS[direction];
  if (!map || !step) return false;
  const from = boardPositions(map, characters).get(id);
  if (!from) return false;
  return placeToken(map, characters, id, from.x + step[0], from.y + step[1]);
}
