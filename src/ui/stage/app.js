// Table display (TV). Read-only: it renders whatever the GM publishes.
import { html, render, useState, useEffect, useRef, useCampaign, Icon, cx } from '../kit.js';
import { createStore } from '../../core/store.js';
import { getScene } from '../../core/schema.js';
import { initiativeOrder, hpState } from '../../core/rules.js';
import { activeMap } from '../../core/battlemap.js';
import { createSession, resolveConnection } from '../../app/session.js';
import { createAudioDirector } from '../../audio/director.js';
import { TRACK_MAP } from '../../audio/music-playback.js';
import { importMusicArchives } from '../../audio/music-local.js';
import { diffEvents } from '../../stage/events.js';
import { createSfx, playEvents } from '../../audio/sfx.js';

const sfx = createSfx();
document.fonts?.load('900 64px Cinzel').catch(() => {});
document.fonts?.load('700 64px Cinzel').catch(() => {});

/** Presentation event bus for the TV: banners, boss bar, screen pulses, sounds. */
const eventSubs = new Set();
function startEventBus(store) {
  window.__grim.sfx = sfx;
  let prevState = null;
  store.subscribe((s, change) => {
    if (change.type === 'initial' || change.type === 'replace') { prevState = s; return; }
    const events = diffEvents(prevState, s);
    prevState = s;
    if (!events.length) return;
    playEvents(sfx, events);
    eventSubs.forEach((f) => f(events, s));
  }, { immediate: true });
}
function useEvents(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => { const h = (e, s) => ref.current(e, s); eventSubs.add(h); return () => eventSubs.delete(h); }, []);
}

// Banner: one at a time; the bigger moment wins.
const BANNERS = {
  combatStart: { cls: 'b-ember', ms: 3200, rank: 3 },
  round: { cls: 'b-round', ms: 1800, rank: 1 },
  turn: { cls: 'b-turn', ms: 1700, rank: 0 },
  fallen: { cls: 'b-death', ms: 4200, rank: 5 },
  victory: { cls: 'b-gold', ms: 4200, rank: 6 },
  wipe: { cls: 'b-death', ms: 5000, rank: 7 },
  area: { cls: 'b-area', ms: 4200, rank: 2 },
};
function Banner({ state, reduced }) {
  const [b, setB] = useState(null);
  const timer = useRef(0);
  const show = (kind, title, sub = '') => {
    const def = BANNERS[kind];
    setB((cur) => {
      if (cur && BANNERS[cur.kind].rank > def.rank && Date.now() < cur.until) return cur;
      clearTimeout(timer.current);
      const ms = reduced ? Math.min(def.ms, 1800) : def.ms;
      timer.current = setTimeout(() => setB(null), ms);
      return { kind, title, sub, id: Math.random(), until: Date.now() + ms, ms };
    });
  };
  useEvents((events, s) => {
    for (const e of events) {
      if (e.type === 'combatStart') show('combatStart', 'Battle Begins', 'Round 1');
      else if (e.type === 'victory') show('victory', 'Foes Vanquished');
      else if (e.type === 'wipe') show('wipe', 'The Party Has Fallen');
      else if (e.type === 'down' && !e.enemy) show('fallen', 'Fallen', e.name);
      else if (e.type === 'round') show('round', `Round ${e.round}`);
      else if (e.type === 'turn' && s.presentation.showHud) show('turn', e.name, e.enemy ? 'The foe moves' : 'Takes the turn');
      else if ((e.type === 'scene' || e.type === 'biome') && s.meta.mode === 'scene') show('area', getScene(s).name, getScene(s).ambience);
    }
  });
  if (!b) return null;
  const def = BANNERS[b.kind];
  return html`<div class=${cx('banner', def.cls)} key=${b.id} style=${`--ms:${b.ms}ms`} aria-live="polite">
    <span class="banner-band"></span>
    ${b.kind === 'turn' || b.kind === 'round' || b.kind === 'area' ? html`<span class="banner-rule"></span>` : null}
    <h2>${b.title}</h2>
    ${b.sub ? html`<p>${b.sub}</p>` : null}
    ${b.kind === 'area' ? html`<span class="banner-rule"></span>` : null}
  </div>`;
}

/** Boss-style health bar for the foe in focus, with a trailing chunk for recent damage. */
function BossBar({ state }) {
  const [focus, setFocus] = useState(null);
  const [hit, setHit] = useState({ total: 0, at: 0 });
  const lastId = useRef('');
  useEvents((events) => {
    for (const e of events) {
      if (e.type === 'damage' && e.enemy) {
        setFocus({ id: e.id, until: Date.now() + 7000 });
        setHit((h) => ({ total: (lastId.current === e.id && Date.now() - h.at < 2500 ? h.total : 0) + e.amount, at: Date.now() }));
        lastId.current = e.id;
      }
    }
  });
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(t); }, []);
  const active = state.characters.find((c) => c.id === state.combat.activeId);
  const id = focus && Date.now() < focus.until ? focus.id : active?.faction === 'enemy' && !active.hidden ? active.id : '';
  const c = state.characters.find((x) => x.id === id);
  if (!c || state.meta.mode !== 'combat' || state.overlay.kind === 'dialogue') return null;
  const hp = hpState(c);
  const showHit = lastId.current === c.id && Date.now() - hit.at < 2200 && hit.total > 0;
  return html`<div class=${cx('bossbar', hp.down && 'is-down')} key=${c.id}>
    <div class="bb-head"><span class="bb-name">${c.name}</span>${showHit ? html`<span class="bb-hit num" key=${hit.at}>${hit.total}</span>` : null}</div>
    <div class="bb-track"><i class="bb-trail" style=${`width:${hp.ratio * 100}%`}></i><i class="bb-fill" style=${`width:${hp.ratio * 100}%`}></i></div>
  </div>`;
}

/** Full-screen hurt / heal pulses and a brief white flash on heavy blows. */
function Pulse() {
  const [p, setP] = useState(null);
  useEvents((events) => {
    const party = events.filter((e) => !e.enemy);
    let kind = null;
    if (events.some((e) => e.type === 'down' && !e.enemy)) kind = 'doom';
    else if (events.some((e) => e.type === 'damage' && e.crit)) kind = 'crit';
    else if (party.some((e) => e.type === 'damage')) kind = 'hurt';
    else if (party.some((e) => e.type === 'heal' || e.type === 'revive')) kind = 'heal';
    if (kind) setP({ kind, id: Math.random() });
  });
  return p ? html`<div class=${cx('pulse', `p-${p.kind}`)} key=${p.id} aria-hidden="true"></div>` : null;
}

const conn = resolveConnection('stage');
// Online viewers keep their own cache so they never overwrite the GM's local campaign.
// Displays read the GM's local copy (same computer) but never write it; the cloud fills in on other devices.
const store = createStore({ persistLocal: false });
window.__grim = { store };
startEventBus(store);
let sessionStatus = { state: 'local', text: 'Local' };
const statusSubs = new Set();
const session = createSession({ store, role: 'stage', onStatus: (s) => { sessionStatus = s; statusSubs.forEach((f) => f(s)); } });
let audioStatus = null;
const audioSubs = new Set();
const audio = createAudioDirector({ store, onStatus: (s) => { audioStatus = s; audioSubs.forEach((f) => f(s)); } });

const pref = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const savePref = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

function World({ state, quality, reduced, onStats }) {
  const host = useRef(null);
  const world = useRef(null);
  const [failed, setFailed] = useState(new URLSearchParams(location.search).get('webgl') === '0');
  useEffect(() => {
    if (failed) return;
    let w;
    import('../../stage/world.js').then(({ createWorld }) => {
      try {
        w = createWorld(host.current, { role: 'stage', quality, reducedMotion: reduced, onEvent: () => {} });
        world.current = w;
        window.__grim.world = w;
        w.setCampaign(store.getState());
      } catch (e) { console.error(e); setFailed(true); }
    }).catch(() => setFailed(true));
    return () => { w?.dispose(); world.current = null; };
  }, [failed]);
  useEffect(() => { world.current?.setCampaign(state); }, [state]);
  useEffect(() => { world.current?.setQuality(quality); }, [quality]);
  useEffect(() => { world.current?.setReducedMotion(reduced); }, [reduced]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === '0') world.current?.resetCamera(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  return failed ? html`<${Fallback} state=${state} />` : html`<div class="world" ref=${host}></div>`;
}

/** 2D table when WebGL is unavailable: still shows every card and the turn. */
function Fallback({ state }) {
  const combat = state.meta.mode === 'combat';
  const list = (combat ? initiativeOrder(state.characters) : state.characters).filter((c) => !c.hidden && (combat || state.presentation.showSceneCards));
  const row = (side) => list.filter((c) => (side === 'enemy') === (c.faction === 'enemy'));
  const card = (c) => { const hp = hpState(c); const img = state.portraits[c.id]; return html`<div class=${cx('fb-card', c.faction === 'enemy' && 'foe', combat && c.id === state.combat.activeId && 'active', hp.down && 'down')}><div class="fb-art" style=${img ? `background-image:url(${img})` : ''}></div><b class="serif">${c.name}</b><span class="num">HP ${hp.hp}/${hp.max} · AC ${c.ac}</span></div>`; };
  return html`<div class="fallback"><div class="fb-row">${row('enemy').map(card)}</div><div class="fb-row">${row('player').map(card)}</div><p class="fb-note">3D is unavailable on this display; showing the table in 2D.</p></div>`;
}

function Ribbon({ state }) {
  const order = initiativeOrder(state.characters).filter((c) => !c.hidden);
  const ref = useRef(null);
  useEffect(() => { ref.current?.querySelector('.is-active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }, [state.combat.activeId]);
  return html`<ol class="ribbon" ref=${ref} aria-label="Initiative order">
    ${order.map((c) => { const hp = hpState(c); const img = state.portraits[c.id]; return html`<li key=${c.id} class=${cx('rb', c.faction === 'enemy' ? 'foe' : 'pc', c.id === state.combat.activeId && 'is-active', hp.down && 'is-down')}>
      <span class="rb-art" style=${img ? `background-image:url(${img})` : ''}>${img ? '' : c.name.slice(0, 1)}</span>
      <span class="rb-text"><span class="rb-name">${c.name}</span><span class="rb-hp"><i class="rb-trail" style=${`width:${hp.ratio * 100}%`}></i><i class="rb-fill" style=${`width:${hp.ratio * 100}%`}></i></span></span>
      <span class="rb-init num">${c.initiative}</span>
    </li>`; })}
  </ol>`;
}

function Typewriter({ text, id, reduced }) {
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (reduced) { setN(text.length); return; }
    setN(0);
    let i = 0;
    const t = setInterval(() => { i += 2; setN(Math.min(text.length, i)); if (i >= text.length) clearInterval(t); }, 28);
    return () => clearInterval(t);
  }, [id, text]);
  return html`<p class="dlg-text">${text.slice(0, n)}<span class="dlg-rest">${text.slice(n)}</span></p>`;
}

function Overlay({ state, reduced }) {
  const o = state.overlay;
  const [shown, setShown] = useState(o);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (o.kind === 'none') { if (shown.kind !== 'none') { setLeaving(true); const t = setTimeout(() => { setShown(o); setLeaving(false); }, reduced ? 0 : 420); return () => clearTimeout(t); } }
    else { setShown(o); setLeaving(false); }
  }, [o.id, o.kind]);
  if (shown.kind === 'none') return null;
  const speakerImg = shown.characterId ? state.portraits[shown.characterId] : '';
  if (shown.kind === 'dialogue') return html`<div class=${cx('ov ov-dialogue', leaving && 'leaving')} key=${shown.id}>
    ${speakerImg ? html`<div class="dlg-portrait" style=${`background-image:url(${speakerImg})`}></div>` : null}
    <div class="dlg-body"><span class="dlg-speaker serif">${shown.speaker || 'Narrator'}</span><${Typewriter} text=${shown.text} id=${shown.id} reduced=${reduced} /></div>
  </div>`;
  if (shown.kind === 'title') return html`<div class=${cx('ov ov-title', leaving && 'leaving')} key=${shown.id}><span class="rule"></span><h1 class="serif">${shown.title}</h1>${shown.text ? html`<p>${shown.text}</p>` : null}<span class="rule"></span></div>`;
  return html`<div class=${cx('ov ov-handout', leaving && 'leaving')} key=${shown.id}><figure><img src=${shown.image} alt=${shown.title || 'Handout'} />${shown.title ? html`<figcaption class="serif">${shown.title}</figcaption>` : null}</figure></div>`;
}

function ChatToasts({ state }) {
  const [items, setItems] = useState([]);
  const seen = useRef(new Set(state.chat.map((m) => m.id)));
  useEffect(() => {
    if (!state.presentation.chatOnStage) return;
    const fresh = state.chat.filter((m) => !seen.current.has(m.id) && m.toStage);
    state.chat.forEach((m) => seen.current.add(m.id));
    if (!fresh.length) return;
    setItems((cur) => [...cur, ...fresh].slice(-4));
    const ids = fresh.map((m) => m.id);
    setTimeout(() => setItems((cur) => cur.filter((m) => !ids.includes(m.id))), 12000);
  }, [state.chat]);
  return html`<ol class="toasts" aria-live="polite">${items.map((m) => html`<li class=${cx('ct', `from-${m.from}`)}><b>${m.name}</b><span>${m.text}</span></li>`)}</ol>`;
}

function useIdle(ms = 3200) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let t;
    const wake = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), ms); };
    wake();
    for (const ev of ['pointermove', 'pointerdown', 'keydown']) addEventListener(ev, wake);
    return () => { clearTimeout(t); for (const ev of ['pointermove', 'pointerdown', 'keydown']) removeEventListener(ev, wake); };
  }, []);
  return idle;
}

function App() {
  const state = useCampaign(store);
  const [status, setStatus] = useState(sessionStatus);
  const [quality, setQuality] = useState(pref('grim:quality:v1', 'balanced'));
  const [motion, setMotion] = useState(pref('grim:motion:v1', 'system'));
  const [hideHud, setHideHud] = useState(pref('grim:hideHud', 'false') === 'true');
  const [sound, setSound] = useState(false);
  const [aStatus, setAStatus] = useState(audioStatus);
  const idle = useIdle();
  useEffect(() => { statusSubs.add(setStatus); audioSubs.add(setAStatus); return () => { statusSubs.delete(setStatus); audioSubs.delete(setAStatus); }; }, []);
  const systemReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduced = motion === 'reduce' || (motion === 'system' && systemReduced);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input,select,textarea')) return;
      const k = e.key.toLowerCase();
      if (k === 'f') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
      if (k === 'h') setHideHud((v) => { savePref('grim:hideHud', String(!v)); return !v; });
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  const toggleSound = () => { const v = !sound; setSound(v); audio.setEnabled(v); if (v) { sfx.unlock(); sfx.play('reveal'); } };
  useEffect(() => { sfx.setVolume(sound ? state.presentation.sfx : 0); }, [sound, state.presentation.sfx]);

  const combat = state.meta.mode === 'combat';
  const tactical = combat && state.stage.view === 'tactical';
  const scene = getScene(state);
  const active = state.characters.find((c) => c.id === state.combat.activeId);
  const showHud = state.presentation.showHud && !hideHud;
  const needsSound = !sound && (state.music.playing || state.environment.ambience !== 'none' || state.presentation.sfx > 0);
  const track = state.music.playing ? TRACK_MAP.get(state.music.trackId) : null;

  return html`<div class=${cx('stage', idle && 'is-idle', reduced && 'reduced')}>
    <${World} state=${state} quality=${quality} reduced=${reduced} />
    <div class="vignette" aria-hidden="true"></div>
    <div class="grain" aria-hidden="true"></div>
    <${Pulse} />
    ${showHud && !combat && state.overlay.kind !== 'title' ? html`<section class="scene-card" key=${scene.id + scene.name}>
      <span class="eyebrow">${scene.kicker}${scene.ambience ? html` · ${scene.ambience}` : ''}</span>
      <h1 class="serif">${scene.name}</h1>
      ${scene.description ? html`<p>${scene.description}</p>` : null}
    </section>` : null}
    ${showHud && combat ? html`<header class="combat-head">
      <div class="round-pill"><span class="eyebrow">Round</span><b class="num">${state.combat.round}</b></div>
      ${active && !active.hidden ? html`<div class=${cx('turn-pill', active.faction === 'enemy' && 'foe')} key=${active.id}><span class="eyebrow">${active.faction === 'enemy' ? 'Foe acts' : 'Your turn'}</span><b class="serif">${active.name}</b></div>` : null}
      ${tactical ? html`<div class="map-pill"><span class="eyebrow">Battle map</span><b>${activeMap(state)?.name}</b></div>` : null}
    </header>` : null}
    ${showHud && combat ? html`<${BossBar} state=${state} />` : null}
    ${showHud && combat ? html`<${Ribbon} state=${state} />` : null}
    <${Banner} state=${state} reduced=${reduced} />
    <${Overlay} state=${state} reduced=${reduced} />
    <${ChatToasts} state=${state} />
    ${needsSound ? html`<button type="button" class="sound-gate" onClick=${toggleSound}><${Icon} name="volume" size=${18} /><span>Tap to enable sound</span></button>` : null}
    <div class="viewer-controls" role="toolbar" aria-label="Display settings">
      <button type="button" onClick=${toggleSound} title=${sound ? 'Mute this display' : 'Enable sound'} aria-pressed=${String(sound)}><${Icon} name=${sound ? 'volume' : 'mute'} /></button>
      <select value=${quality} aria-label="Graphics quality" onChange=${(e) => { setQuality(e.currentTarget.value); savePref('grim:quality:v1', e.currentTarget.value); }}><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select>
      <select value=${motion} aria-label="Motion" onChange=${(e) => { setMotion(e.currentTarget.value); savePref('grim:motion:v1', e.currentTarget.value); }}><option value="system">Motion: system</option><option value="reduce">Motion: reduced</option><option value="full">Motion: full</option></select>
      <label class="vc-file" title="Load personal soundtrack ZIPs into this display"><${Icon} name="music" /><input type="file" accept=".zip,application/zip" multiple hidden onChange=${async (e) => { const f = [...e.currentTarget.files]; if (!f.length) return; try { await importMusicArchives(f); audio.setEnabled(sound); alert('Soundtracks stored on this display.'); } catch (err) { alert(err.message); } }} /></label>
      <button type="button" title="Reset camera [0]" onClick=${() => window.__grim.world?.resetCamera()}><${Icon} name="cam" /></button>
      <button type="button" title="Hide labels [H]" aria-pressed=${String(hideHud)} onClick=${() => setHideHud((v) => { savePref('grim:hideHud', String(!v)); return !v; })}><${Icon} name=${hideHud ? 'eye' : 'eyeOff'} /></button>
      <button type="button" title="Fullscreen [F]" onClick=${() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}><${Icon} name="fullscreen" /></button>
      <span class=${cx('conn', `st-${status.state}`)} title=${status.text}><i></i>${status.text}</span>
      ${track ? html`<span class="np-mini"><${Icon} name="music" size=${13} />${track.title}</span>` : null}
      ${aStatus?.type === 'missing' && aStatus.channel === 'music' ? html`<span class="np-mini warn">Track not installed on this device</span>` : null}
    </div>
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));
session.connect();
