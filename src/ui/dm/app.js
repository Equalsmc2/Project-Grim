// GM command deck.
import { html, render, useState, useEffect, useRef, useCallback, useCampaign, Icon, Button, Segmented, Popover, Field, cx, toast } from '../kit.js';
import { createStore } from '../../core/store.js';
import { defaultCampaign, normalizeCampaign, getScene } from '../../core/schema.js';
import { createSession, getOptions, setOptions, newRoomId, shareUrl } from '../../app/session.js';
import { startPortraitService, markRendered } from '../../portrait/service.js';
import { PortraitStudio } from '../../portrait/maker.js';
import { renderImage } from '../../portrait/art.js';
import { Rail } from './rail.js';
import { CombatantPanel, WorldPanel, MapPanel, ScenePanel, SessionPanel, fileToPortrait } from './inspector.js';
import { Dock } from './dock.js';
import { createAudioDirector } from '../../audio/director.js';

const store = createStore();
window.__grim = { store };
const dispatch = (type, payload, opts) => store.dispatch(type, payload, opts);

let world = null;
const worldListeners = new Set();
const session = createSession({
  store, role: 'gm',
  onStatus: (s) => { sessionStatus = s; statusListeners.forEach((f) => f(s)); },
  onRoomChanged: (room) => toast(`This room belonged to another browser. Moved your campaign to ${room}.`),
});
let sessionStatus = { state: 'local', text: 'Local · this computer' };
const statusListeners = new Set();
startPortraitService(store);
const audio = createAudioDirector({ store });

function useStatus() {
  const [s, set] = useState(sessionStatus);
  useEffect(() => { statusListeners.add(set); return () => statusListeners.delete(set); }, []);
  return s;
}

function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function readJson(file) { return JSON.parse(await file.text()); }

// ------------------------------------------------------------ stage preview
function StagePreview({ state, selectedId, onSelect, tool }) {
  const host = useRef(null);
  const [err, setErr] = useState('');
  const [quality, setQuality] = useState(() => localStorage.getItem('grim:gm-quality') || 'balanced');
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    let w;
    import('../../stage/world.js').then(({ createWorld }) => {
      try {
        w = createWorld(host.current, {
          role: 'gm', quality,
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          onEvent: (e) => {
            if (e.type === 'select') onSelect(e.id);
            else if (e.type === 'move') { if (!dispatch('map/place', { id: e.id, x: e.x, y: e.y })) toast('That square is blocked or taken'); }
            else if (e.type === 'paint') dispatch('map/paint', { cells: e.cells, terrain: e.terrain, stroke: e.stroke });
            else if (e.type === 'pose') dispatch('camera/pose', { pose: e.pose });
            else if (e.type === 'cell') onSelect('');
          },
        });
        world = w;
        w.setCampaign(store.getState());
        worldListeners.forEach((f) => f(w));
      } catch (e) { console.error(e); setErr('3D preview unavailable in this browser (WebGL). The table display may still work on the TV.'); }
    });
    return () => { w?.dispose(); world = null; };
  }, []);
  useEffect(() => { world?.setCampaign(state); }, [state]);
  useEffect(() => { world?.setSelected(selectedId); }, [selectedId]);
  useEffect(() => { world?.setTool(tool); }, [tool]);
  useEffect(() => { world?.setQuality(quality); try { localStorage.setItem('grim:gm-quality', quality); } catch {} }, [quality]);
  const tactical = state.meta.mode === 'combat' && state.stage.view === 'tactical';
  return html`<section class=${cx('preview', paused && 'is-paused')} aria-label="Live stage preview">
    <div class="preview-host" ref=${host}></div>
    ${err ? html`<div class="preview-err">${err}</div>` : null}
    <div class="preview-bar">
      <span class="preview-tag"><i></i>${tactical ? 'Tactical · drag cards onto squares' : state.meta.mode === 'combat' ? 'Cinematic · table view' : 'Scene · table view'}</span>
      <div class="row">
        <${Button} size="sm" icon="cam" title="Reset camera" onClick=${() => world?.resetCamera()} />
        <select class="mini" value=${quality} aria-label="Preview quality" onChange=${(e) => setQuality(e.currentTarget.value)}><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select>
      </div>
    </div>
    ${tactical && tool.kind === 'paint' ? html`<div class="paint-hint">Painting <b>${tool.terrain}</b> · drag across squares</div>` : null}
  </section>`;
}

// ------------------------------------------------------------ add combatant
function AddCombatant({ onClose, onAdded }) {
  const [f, setF] = useState({ name: '', faction: 'enemy', maxHp: 20, ac: 15, initiative: 10, perception: 5, level: 1, count: 1 });
  const set = (k) => (e) => setF({ ...f, [k]: e.currentTarget.type === 'number' ? Number(e.currentTarget.value) : e.currentTarget.value });
  const submit = (e) => {
    e.preventDefault();
    let last = '';
    for (let i = 0; i < Math.max(1, Math.min(12, f.count)); i++) {
      const name = f.name ? (f.count > 1 ? `${f.name} ${i + 1}` : f.name) : undefined;
      const before = new Set(store.getState().characters.map((c) => c.id));
      dispatch('char/add', { name, faction: f.faction, maxHp: f.maxHp, hp: f.maxHp, ac: f.ac, initiative: f.initiative, perception: f.perception, level: f.level });
      last = store.getState().characters.find((c) => !before.has(c.id))?.id || last;
    }
    onAdded(last);
    onClose();
  };
  return html`<form class="addform" onSubmit=${submit}>
    <h3>Add combatant</h3>
    <div class="seg"><button type="button" class=${cx('seg-item', f.faction === 'enemy' && 'is-on')} onClick=${() => setF({ ...f, faction: 'enemy' })}>Foe</button><button type="button" class=${cx('seg-item', f.faction === 'player' && 'is-on')} onClick=${() => setF({ ...f, faction: 'player' })}>Party</button></div>
    <label class="field"><span class="field-label">Name</span><input value=${f.name} maxlength="48" placeholder=${f.faction === 'enemy' ? 'Goblin Warrior' : 'Hero name'} onInput=${set('name')} autofocus /></label>
    <div class="grid3">
      <label class="field field-compact"><span class="field-label">HP</span><input type="number" min="1" max="9999" value=${f.maxHp} onInput=${set('maxHp')} /></label>
      <label class="field field-compact"><span class="field-label">AC</span><input type="number" min="0" max="99" value=${f.ac} onInput=${set('ac')} /></label>
      <label class="field field-compact"><span class="field-label">Level</span><input type="number" min="-1" max="30" value=${f.level} onInput=${set('level')} /></label>
      <label class="field field-compact"><span class="field-label">Initiative</span><input type="number" value=${f.initiative} onInput=${set('initiative')} /></label>
      <label class="field field-compact"><span class="field-label">Perception</span><input type="number" value=${f.perception} onInput=${set('perception')} /></label>
      <label class="field field-compact"><span class="field-label">Count</span><input type="number" min="1" max="12" value=${f.count} onInput=${set('count')} /></label>
    </div>
    <div class="row end"><${Button} onClick=${onClose}>Cancel<//><${Button} type="submit" variant="primary" icon="plus">Add<//></div>
  </form>`;
}

// ------------------------------------------------------------ app
const TABS = [
  { id: 'combatant', icon: 'users', label: 'Combatant' },
  { id: 'world', icon: 'sun', label: 'World' },
  { id: 'map', icon: 'map', label: 'Map' },
  { id: 'scene', icon: 'scene', label: 'Scene' },
  { id: 'session', icon: 'link', label: 'Session' },
];

function App() {
  const state = useCampaign(store);
  const status = useStatus();
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState('combatant');
  const [tool, setTool] = useState({ kind: 'select', terrain: 'wall' });
  const [adding, setAdding] = useState(false);
  const [studio, setStudio] = useState(null);
  const [overlayPreset, setOverlayPreset] = useState(null);
  const [monitor, setMonitor] = useState(false);
  const [opts, setOpts] = useState(getOptions());
  const [, force] = useState(0);
  useEffect(() => audio.setEnabled(monitor), [monitor]);

  const select = useCallback((id) => { setSelectedId(id); if (id) setTab('combatant'); }, []);
  useEffect(() => { if (selectedId && !state.characters.some((c) => c.id === selectedId)) setSelectedId(''); }, [state.characters]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target.closest?.('input,textarea,select,[contenteditable]');
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); return; }
      if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); store.redo(); return; }
      if (typing || mod || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'n') dispatch('turn/next');
      else if (k === 'p') dispatch('turn/prev');
      else if (k === 'c') dispatch('mode/set', { mode: 'combat' });
      else if (k === 's') dispatch('mode/set', { mode: 'scene' });
      else if (k === 't') { if (store.getState().meta.mode !== 'combat') dispatch('mode/set', { mode: 'combat' }); dispatch('view/set', { view: store.getState().stage.view === 'tactical' ? 'cinematic' : 'tactical' }); }
      else if (k === 'escape') { setSelectedId(''); setTool({ ...tool, kind: 'select' }); }
      else if (k === 'b') setTool({ ...tool, kind: tool.kind === 'paint' ? 'select' : 'paint' });
      else return;
      e.preventDefault();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [tool]);

  const combat = state.meta.mode === 'combat';
  const active = state.characters.find((c) => c.id === state.combat.activeId);
  const scene = getScene(state);

  const sessionApi = {
    online: opts.online, room: opts.room, status,
    links: { copy: async (page) => { const url = shareUrl(page, opts.room); try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { prompt('Copy this link', url); } } },
    setOnline: (v) => { const next = setOptions({ online: v, room: v && opts.room === 'grim-demo' ? newRoomId() : opts.room }); setOpts(next); session.connect(); },
    setRoom: (v) => { const next = setOptions({ room: String(v).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'grim-demo' }); setOpts(next); session.connect(); },
    publish: async () => { const ok = await session.cloud?.flush(); toast(ok ? 'Published' : 'Not published yet — check the connection'); },
    exportCampaign: () => { const { log, camera, cursors, ...rest } = store.getState(); download(`grim-campaign-${new Date().toISOString().slice(0, 10)}.json`, rest); },
    importCampaign: async (file) => { try { const data = normalizeCampaign(await readJson(file)); dispatch('campaign/replace', { campaign: data, label: `Imported ${file.name}` }); toast('Campaign imported · Ctrl+Z to undo'); } catch (e) { toast(`Import failed: ${e.message}`, 'error'); } },
    resetDemo: () => { if (confirm('Replace the campaign with the test data? You can undo this.')) dispatch('campaign/replace', { campaign: defaultCampaign(), label: 'Reset to test data' }); },
    copyRules: async () => { const text = await (await fetch('firebase-rtdb.rules.json')).text().catch(() => ''); try { await navigator.clipboard.writeText(text); toast('Rules copied'); } catch { prompt('Rules', text); } },
  };

  const openStudio = (c) => setStudio({ id: c.id, name: c.name, code: c.avatar });

  return html`<div class="deck">
    <header class="topbar">
      <div class="brand"><span class="mark serif">G</span><span class="brand-text"><b>GRIM</b><small>Game master</small></span></div>
      <${Segmented} label="Presentation mode" value=${state.meta.mode} onChange=${(m) => dispatch('mode/set', { mode: m })} options=${[{ value: 'scene', label: 'Scene', title: 'Scene mode [S]' }, { value: 'combat', label: 'Combat', title: 'Combat mode [C]' }]} />
      <${Segmented} label="Camera" value=${combat ? state.stage.view : 'cinematic'} onChange=${(v) => dispatch('view/set', { view: v })} options=${[{ value: 'cinematic', label: 'Cinematic', disabled: !combat }, { value: 'tactical', label: 'Tactical', disabled: !combat, title: 'Toggle tactical [T]' }]} />
      <div class="turnbox">
        ${combat ? html`
          <div class="round"><span class="eyebrow">Round</span><button type="button" aria-label="Previous round" onClick=${() => dispatch('round/set', { round: state.combat.round - 1 })}>−</button><b class="num">${state.combat.round}</b><button type="button" aria-label="Next round" onClick=${() => dispatch('round/set', { round: state.combat.round + 1 })}>+</button></div>
          <${Button} icon="prev" title="Previous turn [P]" onClick=${() => dispatch('turn/prev')} />
          <button type="button" class="turn-now" onClick=${() => active && select(active.id)} title="Select the active combatant"><span class="eyebrow">Turn</span><b>${active ? active.name : '—'}</b></button>
          <${Button} variant="primary" icon="next" title="Next turn [N]" onClick=${() => dispatch('turn/next')}>Next<//>
        ` : html`<div class="scene-now"><span class="eyebrow">On stage</span><b class="serif">${scene.name}</b></div><${Button} variant="primary" icon="sword" onClick=${() => dispatch('combat/start')}>Start combat<//>`}
      </div>
      <div class="top-right">
        <${Button} icon="undo" title=${store.canUndo ? `Undo ${store.undoLabel} (Ctrl+Z)` : 'Nothing to undo'} disabled=${!store.canUndo} onClick=${() => store.undo()} />
        <${Button} icon="redo" title=${store.canRedo ? `Redo ${store.redoLabel} (Ctrl+Shift+Z)` : 'Nothing to redo'} disabled=${!store.canRedo} onClick=${() => store.redo()} />
        <button type="button" class=${cx('sync', `st-${status.state}`)} onClick=${() => setTab('session')} title=${status.text}><i></i><span>${status.state === 'local' ? 'Local' : status.state === 'live' ? 'Live' : status.state === 'pending' ? 'Saving' : status.state === 'connecting' ? 'Connecting' : 'Check sync'}</span></button>
        <a class="btn btn-ghost" href=${opts.online ? shareUrl('index.html', opts.room) : 'index.html'} target="_blank" rel="noopener" title="Open the table display"><${Icon} name="scene" /><span>TV</span></a>
        <a class="btn btn-ghost" href=${opts.online ? shareUrl('player.html', opts.room) : 'player.html'} target="_blank" rel="noopener" title="Open player sheets"><${Icon} name="users" /><span>Players</span></a>
      </div>
    </header>

    <${Rail} state=${state} dispatch=${dispatch} selectedId=${selectedId} onSelect=${select} onAdd=${() => setAdding(true)} />
    <${Popover} open=${adding} onClose=${() => setAdding(false)} class="pop-add"><${AddCombatant} onClose=${() => setAdding(false)} onAdded=${(id) => id && select(id)} /><//>

    <${StagePreview} state=${state} selectedId=${selectedId} onSelect=${select} tool=${tool} />

    <aside class="inspector" aria-label="Inspector">
      <nav class="tabs" role="tablist">${TABS.map((t) => html`<button type="button" role="tab" aria-selected=${String(tab === t.id)} class=${cx('tab', tab === t.id && 'is-on')} onClick=${() => setTab(t.id)} title=${t.label}><${Icon} name=${t.icon} /><span>${t.label}</span></button>`)}</nav>
      <div class="inspector-body">
        ${tab === 'combatant' ? html`<${CombatantPanel} state=${state} id=${selectedId} dispatch=${dispatch} onPortrait=${() => openStudio(state.characters.find((c) => c.id === selectedId))} onSpeak=${(c) => setOverlayPreset({ kind: 'dialogue', characterId: c.id })} />` : null}
        ${tab === 'world' ? html`<${WorldPanel} state=${state} dispatch=${dispatch} onExportScenes=${() => download('grim-prepared-scenes.json', { version: 2, snapshots: state.snapshots })} onImportScenes=${async (f) => { try { const d = await readJson(f); dispatch('snapshot/import', { list: d.snapshots || d.sceneSnapshots || d }); toast('Scenes imported'); } catch (e) { toast(`Import failed: ${e.message}`); } }} />` : null}
        ${tab === 'map' ? html`<${MapPanel} state=${state} dispatch=${dispatch} tool=${tool} setTool=${(t) => setTool({ ...tool, ...t })} />` : null}
        ${tab === 'scene' ? html`<${ScenePanel} state=${state} dispatch=${dispatch} />` : null}
        ${tab === 'session' ? html`<${SessionPanel} state=${state} dispatch=${dispatch} session=${sessionApi} />` : null}
      </div>
    </aside>

    <${Dock} state=${state} dispatch=${dispatch} overlayPreset=${overlayPreset} setOverlayPreset=${setOverlayPreset} monitor=${monitor} setMonitor=${setMonitor} />

    ${studio ? html`<${PortraitStudio} code=${studio.code} name=${studio.name}
      onClose=${() => setStudio(null)}
      onUpload=${async (file) => { try { const image = await fileToPortrait(file); dispatch('portrait/set', { id: studio.id, image, avatar: '' }); setStudio(null); } catch (e) { toast(e.message); } }}
      onSave=${async (code) => { try { const image = await renderImage(code); dispatch('portrait/set', { id: studio.id, image, avatar: code }); markRendered(studio.id, code); setStudio(null); } catch (e) { toast(e.message); } }} />` : null}
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));
session.connect();
