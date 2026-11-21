// UI kit: Preact + htm (vendored, no build step) and small shared components.
import { h, html, render, useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from '../../vendor/preact-htm.js';
export { h, html, render, useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect };

/** Subscribe a component to the store; re-renders on every committed change. */
export function useCampaign(store) {
  const [state, set] = useState(store.getState());
  useEffect(() => store.subscribe((s) => set(s), { immediate: false }), [store]);
  return state;
}

export const cx = (...a) => a.filter(Boolean).join(' ');

// Stroke icons, 20×20 grid. Drawn for Grim; no external icon font.
const P = {
  undo: 'M7 6 3 10l4 4M3 10h9a5 5 0 0 1 0 10h-2',
  redo: 'm13 6 4 4-4 4m4-4H8a5 5 0 0 0 0 10h2',
  next: 'M5 4l8 6-8 6V4zM15 4v12',
  prev: 'M15 4 7 10l8 6V4zM5 4v12',
  plus: 'M10 4v12M4 10h12',
  minus: 'M4 10h12',
  close: 'M5 5l10 10M15 5 5 15',
  eye: 'M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6zm8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l14 14M8.5 5.2A8 8 0 0 1 10 5c5 0 8 5 8 5a14 14 0 0 1-2.4 3M5.4 6.4A14 14 0 0 0 2 10s3 6 8 6a8 8 0 0 0 3-.6M8.6 8.6a2 2 0 0 0 2.8 2.8',
  dice: 'M4 4h12v12H4zM7.5 7.5h.01M12.5 12.5h.01M12.5 7.5h.01M7.5 12.5h.01',
  sword: 'M14 3h3v3l-9 9-3-3 9-9zM4 13l3 3M3 17l2-2',
  map: 'M2 5l5-2 6 2 5-2v12l-5 2-6-2-5 2V5zM7 3v12M13 5v12',
  sun: 'M10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM10 1v2M10 17v2M1 10h2M17 10h2M3.6 3.6l1.4 1.4M15 15l1.4 1.4M3.6 16.4 5 15M15 5l1.4-1.4',
  scene: 'M3 4h14v10H3zM6 17h8M10 14v3',
  link: 'M8 12l4-4M7 9 5 11a3 3 0 0 0 4 4l2-2M13 11l2-2a3 3 0 0 0-4-4L9 7',
  users: 'M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1 17c0-3 3-5 6-5s6 2 6 5M14 4a3 3 0 0 1 0 5M16 12c2 1 3 3 3 5',
  music: 'M7 15V4l10-2v11M7 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 13a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  play: 'M6 4l10 6-10 6V4z',
  pause: 'M6 4h3v12H6zM11 4h3v12h-3z',
  stop: 'M5 5h10v10H5z',
  chat: 'M3 4h14v9H8l-4 3v-3H3V4z',
  speech: 'M4 4h12v8H9l-3 3v-3H4V4zM7 8h6',
  title: 'M4 5h12M10 5v10M7 15h6',
  image: 'M3 4h14v12H3zM3 13l4-4 4 4 2-2 4 4M13 8h.01',
  wind: 'M2 8h10a3 3 0 1 0-3-3M2 12h13a3 3 0 1 1-3 3',
  cam: 'M3 6h10v8H3zM13 9l4-2v6l-4-2',
  target: 'M10 2v4M10 14v4M2 10h4M14 10h4M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  brush: 'M14 3l3 3-8 8-3-3 8-8zM6 11c-2 0-3 2-3 4 2 0 4-1 4-3',
  hand: 'M7 10V4a1.5 1.5 0 0 1 3 0v5M10 9V3a1.5 1.5 0 0 1 3 0v6M13 9V5a1.5 1.5 0 0 1 3 0v7c0 4-2 6-5 6-2 0-3-1-4-2l-3-4a1.5 1.5 0 0 1 2.3-1.9L7 11',
  trash: 'M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10',
  copy: 'M7 7h9v9H7zM4 13V4h9',
  more: 'M5 10h.01M10 10h.01M15 10h.01',
  gear: 'M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM10 1.5v2.5M10 16v2.5M1.5 10H4M16 10h2.5M4 4l1.8 1.8M14.2 14.2 16 16M4 16l1.8-1.8M14.2 5.8 16 4',
  sync: 'M16 7a6 6 0 0 0-11-2M4 13a6 6 0 0 0 11 2M16 3v4h-4M4 17v-4h4',
  skull: 'M10 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 10 2zM7.5 9h.01M12.5 9h.01M9 13h2',
  shield: 'M10 2 3 5v5c0 4 3 7 7 8 4-1 7-4 7-8V5l-7-3z',
  heart: 'M10 17s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 17 8c0 4.7-7 9-7 9z',
  bolt: 'M11 2 4 11h5l-1 7 7-9h-5l1-7z',
  flame: 'M10 18a5 5 0 0 0 5-5c0-4-5-6-4-11-3 2-6 5-6 10a5 5 0 0 0 5 6z',
  snow: 'M10 2v16M3 6l14 8M3 14l14-8',
  arrowUp: 'M10 16V4M5 9l5-5 5 5',
  arrowDown: 'M10 4v12M5 11l5 5 5-5',
  arrowLeft: 'M16 10H4M9 5l-5 5 5 5',
  arrowRight: 'M4 10h12M11 5l5 5-5 5',
  external: 'M11 3h6v6M17 3l-8 8M14 12v5H3V6h5',
  upload: 'M10 14V3M5 8l5-5 5 5M3 17h14',
  download: 'M10 3v11M5 9l5 5 5-5M3 17h14',
  fullscreen: 'M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4',
  volume: 'M3 8h3l4-4v12l-4-4H3V8zM13 7a4 4 0 0 1 0 6M15.5 5a7 7 0 0 1 0 10',
  mute: 'M3 8h3l4-4v12l-4-4H3V8zM13 8l4 4M17 8l-4 4',
  search: 'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM17 17l-3.5-3.5',
  palette: 'M10 2a8 8 0 1 0 0 16c1 0 1.5-.7 1.5-1.5S11 15 11 14s.7-1.5 1.5-1.5H15a3 3 0 0 0 3-3C18 5.5 14.4 2 10 2zM6 9h.01M8 6h.01M12 6h.01M14 9h.01',
  wand: 'M3 17 13 7M12 3v2M17 8h-2M15.5 4.5 14 6M9 3l.5 1.5M17 11l-1.5-.5',
  crown: 'M3 15h14M3 15l-1-9 5 4 3-6 3 6 5-4-1 9',
  reset: 'M4 10a6 6 0 1 0 2-4.5M4 3v3h3',
};
export function Icon({ name, size = 16, title, ...rest }) {
  return html`<svg class="ic" width=${size} height=${size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden=${title ? undefined : 'true'} role=${title ? 'img' : undefined} ...${rest}>${title ? html`<title>${title}</title>` : null}<path d=${P[name] || ''} /></svg>`;
}

export function Button({ children, icon, variant = 'ghost', size, active, class: klass, ...rest }) {
  return html`<button type="button" class=${cx('btn', `btn-${variant}`, size && `btn-${size}`, active && 'is-active', !children && 'btn-icon', klass)} aria-pressed=${active === undefined ? undefined : String(!!active)} ...${rest}>${icon ? html`<${Icon} name=${icon} />` : null}${children ? html`<span>${children}</span>` : null}</button>`;
}

export function Segmented({ value, options, onChange, label, size }) {
  return html`<div class=${cx('seg', size && `seg-${size}`)} role="radiogroup" aria-label=${label}>
    ${options.map((o) => html`<button type="button" role="radio" aria-checked=${String(o.value === value)} class=${cx('seg-item', o.value === value && 'is-on')} disabled=${o.disabled} title=${o.title} onClick=${() => onChange(o.value)}>${o.icon ? html`<${Icon} name=${o.icon} />` : null}${o.label ? html`<span>${o.label}</span>` : null}</button>`)}
  </div>`;
}

/** Slider with live value; reports continuous changes (history coalesces them). */
export function Slider({ label, value, min = 0, max = 1, step = 0.01, format = (v) => v, onInput }) {
  return html`<label class="slider">
    <span class="slider-head"><span>${label}</span><output>${format(value)}</output></span>
    <input type="range" min=${min} max=${max} step=${step} value=${value} onInput=${(e) => onInput(Number(e.currentTarget.value))} />
  </label>`;
}

export function Toggle({ label, checked, onChange, hint }) {
  return html`<label class="toggle" title=${hint}>
    <input type="checkbox" checked=${checked} onChange=${(e) => onChange(e.currentTarget.checked)} />
    <span class="toggle-track"><span class="toggle-thumb"></span></span>
    <span class="toggle-label">${label}</span>
  </label>`;
}

export function Select({ label, value, options, onChange, compact }) {
  return html`<label class=${cx('field', compact && 'field-compact')}>
    ${label ? html`<span class="field-label">${label}</span>` : null}
    <select value=${value} onChange=${(e) => onChange(e.currentTarget.value)}>
      ${options.map((o) => (typeof o === 'string' ? html`<option value=${o}>${o}</option>` : html`<option value=${o.value}>${o.label}</option>`))}
    </select>
  </label>`;
}

/** Text/number input that commits on blur/Enter and shows local edits while typing. */
export function Field({ label, value, onCommit, type = 'text', min, max, maxLength, placeholder, compact, align, inputMode, ...rest }) {
  const [draft, setDraft] = useState(null);
  const shown = draft ?? (value ?? '');
  const commit = () => {
    if (draft === null) return;
    const v = type === 'number' ? (draft === '' ? null : Number(draft)) : draft;
    setDraft(null);
    if (v !== null && v !== value) onCommit(v);
  };
  return html`<label class=${cx('field', compact && 'field-compact')}>
    ${label ? html`<span class="field-label">${label}</span>` : null}
    <input type=${type} value=${shown} min=${min} max=${max} maxlength=${maxLength} placeholder=${placeholder} inputmode=${inputMode} style=${align ? `text-align:${align}` : undefined}
      onInput=${(e) => setDraft(e.currentTarget.value)} onBlur=${commit}
      onKeyDown=${(e) => { if (e.key === 'Enter') { commit(); e.currentTarget.blur(); } if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); } }} ...${rest} />
  </label>`;
}

/** Floating panel anchored to a trigger; closes on outside click or Escape. */
export function Popover({ open, onClose, children, class: klass, anchor = 'bottom' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.('[data-popover-trigger]')) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  if (!open) return null;
  return html`<div ref=${ref} class=${cx('popover', `popover-${anchor}`, klass)} role="dialog">${children}</div>`;
}

let toastTimer = 0;
export function toast(text, kind = 'info') {
  let el = document.getElementById('grimToast');
  if (!el) { el = document.createElement('div'); el.id = 'grimToast'; el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.textContent = text;
  el.dataset.kind = kind;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
}

export function readFileAsDataUrl(file, { maxSide = 768, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unreadable image')); };
    img.src = url;
  });
}
