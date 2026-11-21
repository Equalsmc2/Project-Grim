// Pathfinder 2e bookkeeping helpers. These track numbers the GM already
// decided on; they never roll attacks or adjudicate outcomes.
import { CONDITION_MAP } from './catalog.js';
import { clamp, int, num, text } from './util.js';

/** "Frightened 2" -> {name:'Frightened', value:2}. Unknown names are kept as free text. */
export function parseCondition(raw) {
  const s = text(raw, 40);
  const m = /^(.*?)(?:\s+(\d{1,2}))?$/.exec(s);
  const base = (m?.[1] || s).trim();
  const known = CONDITION_MAP.get(base.toLowerCase());
  const name = known ? known.name : base;
  const value = known?.valued ? clamp(int(m?.[2], 1, 0, 99), 1, 99) : null;
  return { name, value, valued: !!known?.valued, fx: known?.fx || inferFx(name) };
}
function inferFx(name) {
  const n = name.toLowerCase();
  if (/burn|fire|ignite|flame/.test(n)) return 'burning';
  if (/frozen|freeze|frost|ice\b|cold/.test(n)) return 'frozen';
  return null;
}
export const formatCondition = ({ name, value }) => (value ? `${name} ${value}` : name);

export function normalizeConditions(list) {
  const arr = Array.isArray(list) ? list : typeof list === 'string' ? list.split(',') : list && typeof list === 'object' ? Object.values(list) : [];
  const out = new Map();
  for (const raw of arr) {
    const c = parseCondition(raw);
    if (!c.name) continue;
    out.set(c.name.toLowerCase(), formatCondition(c));
  }
  return [...out.values()].slice(0, 24);
}

export function conditionFx(conditions = []) {
  const fx = new Set();
  for (const c of conditions) {
    const p = parseCondition(c);
    if (p.fx) fx.add(p.fx);
  }
  return fx;
}

/** Set or add a condition; value <= 0 removes a valued condition. */
export function setCondition(conditions, name, value = null) {
  const list = normalizeConditions(conditions).filter((c) => parseCondition(c).name.toLowerCase() !== String(name).toLowerCase());
  const parsed = parseCondition(value ? `${name} ${value}` : name);
  if (parsed.valued && value !== null && Number(value) <= 0) return list;
  list.push(formatCondition(parsed));
  return list;
}
export function removeCondition(conditions, name) {
  return normalizeConditions(conditions).filter((c) => parseCondition(c).name.toLowerCase() !== String(name).toLowerCase());
}

/** Damage soaks temporary HP first. Healing caps at max HP. */
export function applyHp(c, amount) {
  amount = Math.trunc(num(amount));
  const max = Math.max(1, num(c.maxHp, 1));
  if (amount < 0) {
    let hit = -amount;
    const shield = Math.min(Math.max(0, num(c.tempHp)), hit);
    c.tempHp = Math.max(0, num(c.tempHp) - shield);
    hit -= shield;
    c.hp = Math.max(0, num(c.hp) - hit);
  } else {
    c.hp = Math.min(max, num(c.hp) + amount);
  }
  return c;
}

/**
 * Parses the quick-entry syntax used in the initiative rail:
 *   "-7" damage, "+5" heal, "12" set HP, "t10" temp HP, "=20" set HP.
 */
export function parseHpEntry(input) {
  const s = String(input || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return null;
  let m;
  if ((m = /^t(?:emp)?\+?(\d{1,4})$/.exec(s))) return { kind: 'temp', value: Number(m[1]) };
  if ((m = /^([+-])(\d{1,4})$/.exec(s))) return { kind: 'delta', value: m[1] === '-' ? -Number(m[2]) : Number(m[2]) };
  if ((m = /^=?(\d{1,4})$/.exec(s))) return { kind: 'set', value: Number(m[1]) };
  return null;
}

export function hpState(c) {
  const max = Math.max(1, num(c.maxHp, 1)), hp = clamp(num(c.hp), 0, max);
  const ratio = hp / max;
  return { hp, max, ratio, down: hp <= 0, bloodied: ratio <= 0.5 && hp > 0, critical: ratio <= 0.25 && hp > 0 };
}

/** Initiative order: higher first; ties keep roster order (stable sort). */
export function initiativeOrder(characters) {
  return characters
    .map((c, i) => ({ c, i }))
    .sort((a, b) => num(b.c.initiative) - num(a.c.initiative) || a.i - b.i)
    .map((x) => x.c);
}

/** Resources (GM-defined counters such as "Legendary 3/3" or "Focus 1/1"). */
export function normalizeResource(r, i = 0) {
  const max = int(r?.max, 1, 0, 99);
  return {
    id: String(r?.id || `res-${i}`).replace(/[^a-z0-9-]/gi, '').slice(0, 30) || `res-${i}`,
    label: text(r?.label, 24) || 'Resource',
    max,
    current: int(r?.current, max, 0, max),
    reset: ['round', 'turn', 'none'].includes(r?.reset) ? r.reset : 'none',
  };
}
