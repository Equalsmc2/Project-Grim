// The campaign store: commands in, normalized sections out.
//
//  - Only the sections a command declares are cloned, so a 200 KB portrait
//    map is never copied for an HP change.
//  - Every undoable command is recorded with before/after section values;
//    rapid repeats of the same control (slider drags, typing) coalesce.
//  - Local persistence and same-browser tab sync are built in; network sync
//    attaches through subscribe()/applyRemote().
import { COMMANDS } from './commands.js';
import { defaultCampaign, normalizeCampaign, normalizeSection, SECTIONS, VOLATILE } from './schema.js';
import { clone, equal, uid } from './util.js';

const COALESCE_MS = 900;
const HISTORY_LIMIT = 120;

export function createStore({
  storage = safeStorage(),
  key = 'grim:campaign:v2',
  legacyKey = 'grim:campaign:v1',
  channelName = 'grim-campaign-v2',
  initial = null,
  now = () => Date.now(),
  historyLimit = HISTORY_LIMIT,
} = {}) {
  const tabId = uid('tab');
  let migratedFromLegacy = false;
  let state = initial ? normalizeCampaign(initial) : load();
  const subs = new Set();
  const undoStack = [], redoStack = [];
  let lastEntry = null;
  if (migratedFromLegacy) persist(null);
  const channel = channelName && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : null;

  function load() {
    if (!storage) return defaultCampaign();
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        try { parsed.portraits = JSON.parse(storage.getItem(key + ':portraits') || '{}'); } catch {}
        return normalizeCampaign(parsed);
      }
      const legacy = legacyKey && storage.getItem(legacyKey);
      if (legacy) {
        migratedFromLegacy = true;
        return normalizeCampaign(JSON.parse(legacy));
      }
    } catch (e) {
      console.warn('[grim] stored campaign unreadable, starting fresh', e);
    }
    return defaultCampaign();
  }

  function persist(sections) {
    if (!storage) return;
    try {
      const { portraits, ...rest } = state;
      storage.setItem(key, JSON.stringify(rest));
      if (!sections || sections.includes('portraits')) storage.setItem(key + ':portraits', JSON.stringify(portraits));
    } catch (e) {
      console.warn('[grim] could not save campaign locally', e);
    }
  }

  function emit(change) {
    for (const fn of subs) {
      try { fn(state, change); } catch (e) { console.error('[grim] subscriber failed', e); }
    }
  }

  /** Replace sections in the immutable state and notify. */
  function commit(sections, values, { origin, type, rev, label, broadcast = true }) {
    const next = { ...state };
    for (const s of sections) next[s] = values[s];
    next.rev = rev ?? state.rev + 1;
    next.updatedAt = now();
    if (label) {
      next.log = [...state.log, { id: `${next.rev}`, time: next.updatedAt, text: label }].slice(-40);
      if (!sections.includes('log')) sections = [...sections, 'log'];
    }
    state = next;
    persist(sections);
    if (broadcast && channel) {
      const payload = {};
      for (const s of sections) payload[s] = state[s];
      try { channel.postMessage({ from: tabId, rev: state.rev, sections: payload }); } catch (e) { console.warn('[grim] tab broadcast failed', e); }
    }
    emit({ type, sections, origin, rev: state.rev });
  }

  function dispatch(type, payload = {}, { origin = 'local' } = {}) {
    const cmd = COMMANDS[type];
    if (!cmd) throw new Error(`Unknown command ${type}`);
    const draft = { ...state };
    for (const s of cmd.sections) draft[s] = clone(state[s]);
    let result;
    try {
      result = cmd.apply.call(cmd, draft, payload);
    } catch (e) {
      console.error(`[grim] command ${type} failed`, e);
      return false;
    }
    if (result === false) return false;
    const changed = [];
    const values = {};
    for (const s of cmd.sections) {
      const v = normalizeSection(s, draft[s], draft);
      if (!equal(v, state[s])) { changed.push(s); values[s] = v; }
    }
    if (!changed.length) return false;
    if (cmd.undoable && changed.some((s) => !VOLATILE.has(s))) record(cmd, payload, changed, values);
    const label = cmd.label?.(payload, state);
    commit(changed, values, { origin, type, label });
    return true;
  }

  function record(cmd, payload, changed, values) {
    const key = cmd.coalesce?.(payload) || null;
    const t = now();
    const tracked = changed.filter((s) => !VOLATILE.has(s));
    if (key && lastEntry && lastEntry.key === key && t - lastEntry.at < COALESCE_MS && undoStack.at(-1) === lastEntry) {
      for (const s of tracked) {
        if (!(s in lastEntry.before)) lastEntry.before[s] = state[s];
        lastEntry.after[s] = values[s];
      }
      lastEntry.at = t;
    } else {
      const before = {}, after = {};
      for (const s of tracked) { before[s] = state[s]; after[s] = values[s]; }
      lastEntry = { key, at: t, label: cmd.label?.(payload, state) || describe(cmd.type), before, after };
      undoStack.push(lastEntry);
      if (undoStack.length > historyLimit) undoStack.shift();
    }
    redoStack.length = 0;
  }

  function travel(from, to, dir) {
    const entry = from.pop();
    if (!entry) return false;
    to.push(entry);
    lastEntry = null;
    const values = dir === 'undo' ? entry.before : entry.after;
    const sections = Object.keys(values);
    const resolved = {};
    for (const s of sections) resolved[s] = normalizeSection(s, values[s], { ...state, ...values });
    commit(sections, resolved, { origin: 'local', type: dir, label: `${dir === 'undo' ? 'Undo' : 'Redo'}: ${entry.label}` });
    return true;
  }

  /** Sections received from another tab or the network. Never recorded in history. */
  function applyRemote(sections, { rev, origin = 'remote', force = false } = {}) {
    if (!force && typeof rev === 'number' && rev <= state.rev) return false;
    const names = Object.keys(sections).filter((s) => SECTIONS.includes(s));
    if (!names.length) return false;
    const values = {};
    const ctx = { ...state, ...sections };
    if ('characters' in sections) ctx.characters = normalizeSection('characters', sections.characters, ctx);
    const changed = [];
    for (const s of names) {
      const v = s === 'characters' ? ctx.characters : normalizeSection(s, sections[s], ctx);
      if (!equal(v, state[s])) { changed.push(s); values[s] = v; }
    }
    if (!changed.length) {
      if (typeof rev === 'number' && rev > state.rev) state = { ...state, rev };
      return false;
    }
    commit(changed, values, { origin, type: 'remote', rev: typeof rev === 'number' ? Math.max(rev, state.rev) : state.rev + 1, broadcast: origin !== 'tab' });
    return true;
  }

  function replaceAll(campaign, { origin = 'remote', keepHistory = false } = {}) {
    const next = normalizeCampaign(campaign);
    const values = {};
    for (const s of SECTIONS) values[s] = next[s];
    if (!keepHistory) { undoStack.length = 0; redoStack.length = 0; lastEntry = null; }
    commit(SECTIONS, values, { origin, type: 'replace', rev: Math.max(next.rev, state.rev + 1) });
  }

  if (channel) {
    channel.onmessage = (e) => {
      const m = e.data;
      if (!m || m.from === tabId || typeof m.rev !== 'number' || !m.sections) return;
      applyRemote(m.sections, { rev: m.rev, origin: 'tab' });
    };
  }

  return {
    tabId,
    getState: () => state,
    dispatch,
    subscribe(fn, { immediate = true } = {}) {
      subs.add(fn);
      if (immediate) fn(state, { type: 'initial', sections: SECTIONS, origin: 'initial', rev: state.rev });
      return () => subs.delete(fn);
    },
    undo: () => travel(undoStack, redoStack, 'undo'),
    redo: () => travel(redoStack, undoStack, 'redo'),
    get canUndo() { return undoStack.length > 0; },
    get canRedo() { return redoStack.length > 0; },
    get undoLabel() { return undoStack.at(-1)?.label || ''; },
    get redoLabel() { return redoStack.at(-1)?.label || ''; },
    applyRemote,
    replaceAll,
    dispose() { channel?.close(); subs.clear(); },
  };
}

function describe(type) {
  return type.replace(/[/:]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function safeStorage() {
  try {
    const s = globalThis.localStorage;
    const k = '__grim_probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}
