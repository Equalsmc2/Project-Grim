// Small, dependency-free helpers shared by every layer.

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
export const int = (v, fallback, lo, hi) =>
  Number.isFinite(Number(v)) ? clamp(Math.trunc(Number(v)), lo, hi) : fallback;
export const text = (v, max = 80) =>
  String(v ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, max);
export const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
export const clone = (v) => (v === undefined ? undefined : structuredCloneSafe(v));

function structuredCloneSafe(v) {
  if (typeof structuredClone === 'function') return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}

export function uid(prefix = 'id') {
  let r = '';
  try {
    r = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  } catch {
    r = Math.random().toString(36).slice(2, 12);
  }
  return `${prefix}-${Date.now().toString(36)}${r}`.slice(0, 40);
}

export function escapeHtml(x) {
  return String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Deep equality for plain JSON data. */
export function equal(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || !a || !b || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!equal(a[k], b[k])) return false;
  return true;
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value = '') {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function d20() {
  const bytes = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return (bytes[0] % 20) + 1;
  }
  return Math.floor(Math.random() * 20) + 1;
}

/** Strip undefined (Firebase rejects it) and functions, keep plain data. */
export function toPlain(v) {
  return v === undefined ? null : JSON.parse(JSON.stringify(v));
}
