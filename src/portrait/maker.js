// Portrait studio: a modal used by the GM (any character) and by players
// (their own character). Produces a recipe code; the GM's browser turns codes
// into card images.
import { html, useState, useMemo, useEffect, useRef, Icon, Button, cx } from '../ui/kit.js';
import { GROUPS, FEATURES, PALETTES, decode, encode, randomRecipe, renderSvg, optionLabels, DEFAULT_RECIPE } from './art.js';

const isPalette = (key) => !Array.isArray(FEATURES[key][1]);

function Svg({ recipe, size, lite }) {
  const markup = useMemo(() => renderSvg(recipe, { size, lite }), [JSON.stringify(recipe), size, lite]);
  return html`<span class="pm-svg" style=${`width:${size}px;height:${size}px`} dangerouslySetInnerHTML=${{ __html: markup }}></span>`;
}

export function PortraitStudio({ code = '', name = 'Character', onSave, onClose, onUpload, saving = false }) {
  const [recipe, setRecipe] = useState(() => decode(code));
  const [group, setGroup] = useState(GROUPS[0].id);
  const [key, setKey] = useState(GROUPS[0].keys[0]);
  const history = useRef([]);
  const dialog = useRef(null);
  const g = GROUPS.find((x) => x.id === group);
  useEffect(() => { dialog.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { const prev = history.current.pop(); if (prev) { setRecipe(prev); e.preventDefault(); } }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  const set = (patch) => { history.current.push(recipe); if (history.current.length > 60) history.current.shift(); setRecipe({ ...recipe, ...patch }); };
  const pickGroup = (id) => { setGroup(id); setKey(GROUPS.find((x) => x.id === id).keys[0]); };
  const labels = optionLabels(key);

  return html`<div class="pm-overlay" onClick=${(e) => e.target === e.currentTarget && onClose()}>
    <div class="pm-dialog" role="dialog" aria-modal="true" aria-label=${`Portrait studio for ${name}`} tabIndex="-1" ref=${dialog}>
      <header class="pm-head">
        <div><span class="eyebrow">Portrait studio</span><h2 class="serif">${name}</h2></div>
        <${Button} icon="close" aria-label="Close" onClick=${onClose} />
      </header>
      <div class="pm-body">
        <section class="pm-preview">
          <div class="pm-frame"><${Svg} recipe=${recipe} size=${300} /></div>
          <div class="pm-preview-actions">
            <${Button} icon="dice" onClick=${() => set(randomRecipe())}>Random<//>
            <${Button} icon="wand" title="Randomise but keep lineage" onClick=${() => set(randomRecipe(Math.random, { skin: recipe.skin, ears: recipe.ears, horns: recipe.horns, tusks: recipe.tusks, face: recipe.face }))}>Vary<//>
            <${Button} icon="undo" title="Undo (Ctrl+Z)" disabled=${!history.current.length} onClick=${() => { const p = history.current.pop(); if (p) setRecipe(p); }} />
            <${Button} icon="reset" title="Reset" onClick=${() => set({ ...DEFAULT_RECIPE })} />
          </div>
          ${onUpload ? html`<label class="btn btn-ghost pm-upload"><${Icon} name="upload" /><span>Use an image instead</span><input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange=${(e) => e.currentTarget.files?.[0] && onUpload(e.currentTarget.files[0])} /></label>` : null}
        </section>
        <section class="pm-controls">
          <nav class="pm-tabs" role="tablist">
            ${GROUPS.map((x) => html`<button type="button" role="tab" aria-selected=${String(x.id === group)} class=${cx('pm-tab', x.id === group && 'is-on')} onClick=${() => pickGroup(x.id)}>${x.label}</button>`)}
          </nav>
          <div class="pm-keys">
            ${g.keys.map((k) => html`<button type="button" class=${cx('pm-key', k === key && 'is-on')} onClick=${() => setKey(k)}>
              <span>${FEATURES[k][0]}</span>
              ${isPalette(k) ? html`<i class="pm-dot" style=${`background:${PALETTES[FEATURES[k][1]][recipe[k]][1]}`}></i>` : html`<small>${optionLabels(k)[recipe[k]]}</small>`}
            </button>`)}
          </div>
          <div class=${cx('pm-options', isPalette(key) && 'is-palette')}>
            ${isPalette(key)
              ? PALETTES[FEATURES[key][1]].map(([label, color], i) => html`<button type="button" class=${cx('pm-swatch', recipe[key] === i && 'is-on')} title=${label} aria-label=${label} aria-pressed=${String(recipe[key] === i)} style=${`--c:${color}`} onClick=${() => set({ [key]: i })}><span></span><small>${label}</small></button>`)
              : labels.map((label, i) => html`<button type="button" class=${cx('pm-option', recipe[key] === i && 'is-on')} aria-pressed=${String(recipe[key] === i)} onClick=${() => set({ [key]: i })}><${Svg} recipe=${{ ...recipe, [key]: i }} size=${84} lite=${true} /><small>${label}</small></button>`)}
          </div>
        </section>
      </div>
      <footer class="pm-foot">
        <span class="muted">Recipe <code>${encode(recipe)}</code></span>
        <div class="row">
          <${Button} onClick=${onClose}>Cancel<//>
          <${Button} variant="primary" disabled=${saving} onClick=${() => onSave(encode(recipe))}>${saving ? 'Saving…' : 'Use portrait'}<//>
        </div>
      </footer>
    </div>
  </div>`;
}
