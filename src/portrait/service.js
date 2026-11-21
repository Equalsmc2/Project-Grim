// GM-side portrait rendering: whenever a character carries a recipe code
// (set in the studio, or sent by a player from their phone), the GM browser
// paints it to an image and publishes it in the portraits section.
import { isCode, PORTRAIT_VERSION, renderImage } from './art.js';

const KEY = 'grim:portrait-art:v2';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = (m) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {} };

export function startPortraitService(store) {
  const jobs = new Set();
  const run = (state) => {
    const done = read();
    for (const c of state.characters) {
      if (!isCode(c.avatar)) continue;
      const tag = `${c.avatar}:${PORTRAIT_VERSION}`;
      if (done[c.id] === tag && state.portraits[c.id]) continue;
      const job = `${c.id}/${tag}`;
      if (jobs.has(job)) continue;
      jobs.add(job);
      renderImage(c.avatar).then((image) => {
        const cur = store.getState().characters.find((x) => x.id === c.id);
        if (!cur || cur.avatar !== c.avatar) return;
        store.dispatch('portrait/set', { id: c.id, image });
        const m = read();
        m[c.id] = tag;
        write(m);
      }).catch((e) => console.warn('[grim] portrait render failed', e)).finally(() => jobs.delete(job));
    }
  };
  return store.subscribe((s, change) => { if (change.sections.includes('characters') || change.type === 'initial' || change.type === 'replace') run(s); });
}

/** Marks a portrait as already rendered for a code (used right after the GM saves in the studio). */
export function markRendered(id, code) {
  const m = read();
  m[id] = `${code}:${PORTRAIT_VERSION}`;
  write(m);
}
