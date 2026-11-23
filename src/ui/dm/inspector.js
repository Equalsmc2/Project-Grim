// Context inspector: combatant, world, map, scene and session panels.
import { html, useState, useEffect, Icon, Button, Segmented, Slider, Toggle, Select, Field, cx, toast, readFileAsDataUrl } from '../kit.js';
import { CONDITIONS, SCENES } from '../../core/catalog.js';
import { PRESETS, ATMOSPHERES, GROUNDS, HILLS, WEATHERS, PROP_SETS, AMBIENCES } from '../../core/environment.js';
import { TERRAIN, MAP_MIN_W, MAP_MAX_W, MAP_MIN_H, MAP_MAX_H, activeMap } from '../../core/battlemap.js';
import { parseCondition, hpState } from '../../core/rules.js';
import { getScene } from '../../core/schema.js';
import { AMBIENCE_TRACKS } from '../../audio/ambience.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const hour = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
const pct = (v) => `${Math.round(v * 100)}%`;

function Section({ title, children, aside }) {
  return html`<section class="isec"><header><h3>${title}</h3>${aside}</header>${children}</section>`;
}

// ------------------------------------------------------------ combatant
export function CombatantPanel({ state, id, dispatch, onPortrait, onSpeak, onRelease }) {
  const c = state.characters.find((x) => x.id === id);
  const [cond, setCond] = useState('');
  if (!c) return html`<div class="empty-panel"><${Icon} name="users" size=${28} /><p>Select a combatant in the initiative list or on the stage.</p></div>`;
  const hp = hpState(c);
  const upd = (patch) => dispatch('char/update', { id, patch });
  const portrait = state.portraits[c.id];
  const conds = c.conditions.map(parseCondition);
  const addCond = (name) => { if (!name) return; const known = CONDITIONS.find((x) => x.name === name); dispatch('char/condition', { id, name, value: known?.valued ? 1 : null }); setCond(''); };
  const isActive = state.meta.mode === 'combat' && state.combat.activeId === id;
  return html`<div class="panel-body">
    <div class="cb-head">
      <button type="button" class="cb-portrait" style=${portrait ? `background-image:url(${portrait})` : ''} onClick=${onPortrait} title="Portrait studio">${portrait ? '' : html`<${Icon} name="palette" size=${22} />`}<span>Edit</span></button>
      <div class="cb-ident">
        <${Field} value=${c.name} maxLength=${48} onCommit=${(v) => upd({ name: v })} aria-label="Name" class="cb-name" />
        <div class="row">
          <${Field} compact value=${c.ancestry} placeholder="Ancestry" maxLength=${35} onCommit=${(v) => upd({ ancestry: v })} aria-label="Ancestry" />
          <${Field} compact value=${c.className} placeholder="Class" maxLength=${35} onCommit=${(v) => upd({ className: v })} aria-label="Class" />
        </div>
        <div class="row">
          <${Segmented} size="sm" label="Side" value=${c.faction} onChange=${(v) => upd({ faction: v })} options=${[{ value: 'player', label: 'Party' }, { value: 'enemy', label: 'Foe' }]} />
          <${Field} compact type="number" value=${c.level} min=${-1} max=${30} onCommit=${(v) => upd({ level: v })} aria-label="Level" placeholder="Lv" />
        </div>
      </div>
    </div>

    <div class="cb-hp">
      <div class="cb-hp-top">
        <span class="eyebrow">Hit points</span>
        <span class="num cb-hp-val">${hp.hp}<small> / ${hp.max}</small>${c.tempHp ? html`<em> +${c.tempHp}</em>` : null}</span>
      </div>
      <div class="hpbar big"><i style=${`width:${hp.ratio * 100}%`} class=${hp.critical ? 'crit' : hp.bloodied ? 'blood' : ''}></i></div>
      <div class="cb-hp-btns">
        ${[-10, -5, -1].map((n) => html`<${Button} size="sm" class="dmg" onClick=${() => dispatch('char/hp', { id, amount: n })}>${n}<//>`)}
        ${[1, 5, 10].map((n) => html`<${Button} size="sm" class="heal" onClick=${() => dispatch('char/hp', { id, amount: n })}>+${n}<//>`)}
      </div>
      <div class="grid3">
        <${Field} compact label="Max HP" type="number" value=${c.maxHp} min=${1} max=${9999} onCommit=${(v) => upd({ maxHp: v })} />
        <${Field} compact label="Current" type="number" value=${c.hp} min=${0} max=${9999} onCommit=${(v) => dispatch('char/hpSet', { id, hp: v })} />
        <${Field} compact label="Temp" type="number" value=${c.tempHp} min=${0} max=${9999} onCommit=${(v) => dispatch('char/temp', { id, value: v })} />
        <${Field} compact label="AC" type="number" value=${c.ac} min=${0} max=${99} onCommit=${(v) => upd({ ac: v })} />
        <${Field} compact label="Initiative" type="number" value=${c.initiative} min=${-100} max=${150} onCommit=${(v) => upd({ initiative: v })} />
        <${Field} compact label="Perception" type="number" value=${c.perception} min=${-20} max=${80} onCommit=${(v) => upd({ perception: v })} />
      </div>
    </div>

    ${c.faction !== 'enemy' ? html`<div class="claim-line">
      <${Icon} name="users" size=${14} />
      ${state.claims[c.id] ? html`<span>Played on a linked phone since ${new Date(state.claims[c.id].at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><${Button} size="sm" onClick=${() => onRelease(c.id)}>Release<//>` : html`<span class="muted">No player device yet · the first phone to pick this sheet owns it</span>`}
    </div>` : null}

    <${Section} title="Conditions">
      <div class="cond-list">
        ${conds.map((x) => html`<span class=${cx('cond', x.fx && `fx-${x.fx}`)}>
          <span>${x.name}</span>
          ${x.valued ? html`<span class="cond-val"><button type="button" aria-label=${`Lower ${x.name}`} onClick=${() => dispatch('char/condition', { id, name: x.name, value: x.value - 1 })}>−</button><b class="num">${x.value}</b><button type="button" aria-label=${`Raise ${x.name}`} onClick=${() => dispatch('char/condition', { id, name: x.name, value: x.value + 1 })}>+</button></span>` : null}
          <button type="button" class="cond-x" aria-label=${`Remove ${x.name}`} onClick=${() => dispatch('char/condition', { id, name: x.name, remove: true })}><${Icon} name="close" size=${12} /></button>
        </span>`)}
        <select class="cond-add" value=${cond} aria-label="Add condition" onChange=${(e) => addCond(e.currentTarget.value)}>
          <option value="">+ Condition</option>
          ${CONDITIONS.filter((x) => !conds.some((y) => y.name === x.name)).map((x) => html`<option value=${x.name}>${x.name}</option>`)}
        </select>
      </div>
    <//>

    <${Section} title="Resources" aside=${c.resources.length < 6 ? html`<${Button} size="sm" icon="plus" onClick=${() => dispatch('char/resource', { id, op: 'add', resource: { label: c.faction === 'enemy' ? 'Legendary' : 'Focus', max: c.faction === 'enemy' ? 3 : 1, reset: c.faction === 'enemy' ? 'round' : 'none' } })}>Add<//>` : null}>
      ${c.resources.length ? c.resources.map((r) => html`<div class="res-row">
        <input class="res-label" value=${r.label} maxlength="24" aria-label="Resource name" onChange=${(e) => dispatch('char/resource', { id, op: 'update', resourceId: r.id, resource: { label: e.currentTarget.value } })} />
        <span class="res-pips">${Array.from({ length: r.max }, (_, i) => html`<button type="button" class=${cx('pip', i < r.current && 'on')} aria-label=${`Set ${r.label} to ${i + 1}`} onClick=${() => dispatch('char/resource', { id, op: 'use', resourceId: r.id, delta: (i < r.current ? i : i + 1) - r.current, label: r.label })}></button>`)}</span>
        <input class="res-max num" type="number" min="0" max="99" value=${r.max} aria-label="Maximum" onChange=${(e) => dispatch('char/resource', { id, op: 'update', resourceId: r.id, resource: { max: Number(e.currentTarget.value) } })} />
        <select value=${r.reset} aria-label="Refresh" onChange=${(e) => dispatch('char/resource', { id, op: 'update', resourceId: r.id, resource: { reset: e.currentTarget.value } })}><option value="round">per round</option><option value="turn">per turn</option><option value="none">manual</option></select>
        <button type="button" class="icon-x" aria-label="Remove resource" onClick=${() => dispatch('char/resource', { id, op: 'remove', resourceId: r.id })}><${Icon} name="close" size=${12} /></button>
      </div>`) : html`<p class="hint">Track legendary actions, focus points, spell slots or reactions. Counters refill per round or per turn automatically.</p>`}
    <//>

    <${Section} title="Notes">
      <textarea class="notes" rows="2" maxlength="400" placeholder="GM-only notes" value=${c.notes} onChange=${(e) => upd({ notes: e.currentTarget.value })}></textarea>
    <//>

    <div class="cb-actions">
      <${Button} icon="target" active=${isActive} disabled=${state.meta.mode !== 'combat'} onClick=${() => dispatch('turn/set', { id })}>Give turn<//>
      <${Button} icon=${c.hidden ? 'eye' : 'eyeOff'} onClick=${() => upd({ hidden: !c.hidden })}>${c.hidden ? 'Reveal' : 'Hide'}<//>
      <${Button} icon="speech" onClick=${() => onSpeak(c)}>Speak<//>
      <${Button} icon="copy" onClick=${() => dispatch('char/duplicate', { id })}>Duplicate<//>
      <${Button} icon="trash" class="danger" onClick=${() => { if (confirm(`Remove ${c.name}?`)) dispatch('char/remove', { id }); }}>Remove<//>
    </div>
  </div>`;
}

// ------------------------------------------------------------ world
export function WorldPanel({ state, dispatch, onExportScenes, onImportScenes }) {
  const e = state.environment;
  const set = (patch) => dispatch('env/set', patch);
  const [snapName, setSnapName] = useState('');
  return html`<div class="panel-body">
    <${Section} title="Biome">
      <div class="chips">${Object.keys(PRESETS).map((p) => html`<button type="button" class=${cx('chipbtn', e.preset === p && 'is-on')} onClick=${() => dispatch('env/preset', { name: p })}>${p}</button>`)}</div>
    <//>
    <${Section} title="Atmosphere">
      <div class="chips">${Object.keys(ATMOSPHERES).map((p) => html`<button type="button" class=${cx('chipbtn', e.atmospherePreset === p && 'is-on')} onClick=${() => dispatch('env/atmosphere', { name: p })}>${p}</button>`)}</div>
      <${Slider} label="Time of day" value=${e.timeOfDay} min=${0} max=${24} step=${0.25} format=${hour} onInput=${(v) => set({ timeOfDay: v })} />
      <div class="row between"><${Toggle} label="Day/night cycle" checked=${e.cycleEnabled} onChange=${(v) => set({ cycleEnabled: v })} />${e.cycleEnabled ? html`<span class="hint num">${e.cycleSpeed}× speed</span>` : null}</div>
      ${e.cycleEnabled ? html`<${Slider} label="Cycle speed (game hours per real hour)" value=${e.cycleSpeed} min=${1} max=${96} step=${1} onInput=${(v) => set({ cycleSpeed: v })} />` : null}
      <${Slider} label="Cloud cover" value=${e.cloudCover} format=${pct} onInput=${(v) => set({ cloudCover: v })} />
      <${Slider} label="Fog" value=${e.fog} format=${pct} onInput=${(v) => set({ fog: v })} />
    <//>
    <${Section} title="Weather">
      <${Select} label="Weather" value=${e.weather} onChange=${(v) => set({ weather: v })} options=${WEATHERS.map((w) => ({ value: w, label: w === 'none' ? 'Clear' : cap(w) }))} />
      <${Slider} label="Intensity" value=${e.intensity} format=${pct} onInput=${(v) => set({ intensity: v })} />
      <div class="grid2">
        <${Slider} label="Wind direction" value=${e.windAngle} min=${0} max=${360} step=${5} format=${(v) => `${v}°`} onInput=${(v) => set({ windAngle: v })} />
        <${Slider} label="Wind speed" value=${e.windSpeed} min=${0} max=${5} step=${0.1} format=${(v) => v.toFixed(1)} onInput=${(v) => set({ windSpeed: v })} />
      </div>
      <${Slider} label="Tree & grass sway (0 = still)" value=${e.sway} format=${(v) => (v === 0 ? 'Still' : pct(v))} onInput=${(v) => set({ sway: v })} />
      <${Slider} label="Ground accumulation (puddles / snow)" value=${e.accumulation} format=${pct} onInput=${(v) => set({ accumulation: v })} />
    <//>
    <${Section} title="Terrain">
      <div class="grid2">
        <${Select} label="Ground" value=${e.ground} onChange=${(v) => set({ ground: v })} options=${GROUNDS.map((g) => ({ value: g, label: g === 'blank' ? 'Graybox' : cap(g) }))} />
        <${Select} label="Hills" value=${e.hills} onChange=${(v) => set({ hills: v })} options=${HILLS.map((g) => ({ value: g, label: cap(g) }))} />
        <${Select} label="Scenery" value=${e.props} onChange=${(v) => set({ props: v })} options=${PROP_SETS.map((g) => ({ value: g, label: cap(g) }))} />
        <div class="field"><span class="field-label">Layout</span><${Button} icon="dice" onClick=${() => dispatch('env/reseed', {})}>New layout<//></div>
      </div>
      <${Slider} label="Scenery density" value=${e.density} format=${pct} onInput=${(v) => set({ density: v })} />
      <${Slider} label="Ground variation" value=${e.variation} format=${pct} onInput=${(v) => set({ variation: v })} />
      <${Toggle} label="Road / path" checked=${e.path} onChange=${(v) => set({ path: v })} />
      ${e.path ? html`<div class="grid2">
        <${Slider} label="Angle" value=${e.pathAngle} min=${-180} max=${180} step=${5} format=${(v) => `${v}°`} onInput=${(v) => set({ pathAngle: v })} />
        <${Slider} label="Width" value=${e.pathWidth} min=${0.5} max=${6} step=${0.1} format=${(v) => v.toFixed(1)} onInput=${(v) => set({ pathWidth: v })} />
        <${Slider} label="Offset X" value=${e.pathX} min=${-7} max=${7} step=${0.25} format=${(v) => v.toFixed(1)} onInput=${(v) => set({ pathX: v })} />
        <${Slider} label="Offset Z" value=${e.pathZ} min=${-4} max=${4} step=${0.25} format=${(v) => v.toFixed(1)} onInput=${(v) => set({ pathZ: v })} />
      </div>` : null}
    <//>
    <${Section} title="Camera director">
      <${Toggle} label="Directed camera on the table display" checked=${e.cinematicPan} onChange=${(v) => set({ cinematicPan: v })} />
      <${Segmented} label="Shot style" value=${e.cinematicStyle} onChange=${(v) => set({ cinematicStyle: v })} options=${[{ value: 'follow', label: 'Follow turn' }, { value: 'orbit', label: 'Orbit' }, { value: 'sweep', label: 'Sweep' }]} />
      <div class="grid2">
        <${Slider} label="Movement" value=${e.cinematicStrength} min=${0.4} max=${2.4} step=${0.1} format=${(v) => `${v.toFixed(1)}×`} onInput=${(v) => set({ cinematicStrength: v })} />
        <${Slider} label="Pace" value=${e.cinematicSpeed} min=${0.35} max=${2.5} step=${0.05} format=${(v) => `${v.toFixed(1)}×`} onInput=${(v) => set({ cinematicSpeed: v })} />
      </div>
      <p class="hint">Follow turn pushes in on whoever acts when the turn passes, then settles back to the group.</p>
    <//>
    <${Section} title="Prepared scenes" aside=${html`<span class="hint num">${state.snapshots.length}/12</span>`}>
      <form class="row" onSubmit=${(ev) => { ev.preventDefault(); dispatch('snapshot/save', { name: snapName || e.preset }); setSnapName(''); toast('Scene saved'); }}>
        <input class="grow" placeholder="Scene name" maxlength="44" value=${snapName} onInput=${(ev) => setSnapName(ev.currentTarget.value)} aria-label="Scene name" />
        <${Button} type="submit" icon="plus">Save<//>
      </form>
      <ul class="snaps">${state.snapshots.map((s) => html`<li><button type="button" class="snap-apply" onClick=${() => dispatch('snapshot/apply', { id: s.id })} title="Apply this scene live"><b>${s.name}</b><small>${s.environment.preset} · ${hour(s.environment.timeOfDay)}${s.environment.weather !== 'none' ? ` · ${s.environment.weather}` : ''}</small></button><button type="button" class="icon-x" aria-label=${`Delete ${s.name}`} onClick=${() => dispatch('snapshot/delete', { id: s.id })}><${Icon} name="trash" size=${13} /></button></li>`)}</ul>
      <div class="row"><${Button} size="sm" icon="download" onClick=${onExportScenes}>Export<//><label class="btn btn-ghost btn-sm"><${Icon} name="upload" /><span>Import</span><input type="file" accept="application/json,.json" hidden onChange=${(ev) => ev.currentTarget.files?.[0] && onImportScenes(ev.currentTarget.files[0])} /></label></div>
    <//>
  </div>`;
}

// ------------------------------------------------------------ map
export function MapPanel({ state, dispatch, tool, setTool }) {
  const m = activeMap(state);
  const tactical = state.stage.view === 'tactical' && state.meta.mode === 'combat';
  return html`<div class="panel-body">
    ${!tactical ? html`<div class="callout"><${Icon} name="map" /><div><b>Tactical view is off.</b> The map is always part of the world; switch to Tactical to see the grid and paint it on the stage.<div class="row"><${Button} size="sm" variant="primary" onClick=${() => { if (state.meta.mode !== 'combat') dispatch('mode/set', { mode: 'combat' }); dispatch('view/set', { view: 'tactical' }); }}>Go tactical<//></div></div></div>` : null}
    <${Section} title="Battle map">
      <div class="row">
        <select class="grow" value=${m.id} aria-label="Active map" onChange=${(e) => dispatch('map/select', { id: e.currentTarget.value })}>${state.battleMaps.maps.map((x) => html`<option value=${x.id}>${x.name} · ${x.width}×${x.height}</option>`)}</select>
        <${Button} icon="plus" title="New map" onClick=${() => dispatch('map/create', {})} />
        <${Button} icon="trash" title="Delete map" disabled=${state.battleMaps.maps.length < 2} onClick=${() => { if (confirm(`Delete ${m.name}?`)) dispatch('map/delete', { id: m.id }); }} />
      </div>
      <${Field} label="Name" value=${m.name} maxLength=${48} onCommit=${(v) => dispatch('map/rename', { name: v })} />
      <div class="grid2">
        <${Field} label=${`Width (${MAP_MIN_W}–${MAP_MAX_W})`} type="number" value=${m.width} min=${MAP_MIN_W} max=${MAP_MAX_W} onCommit=${(v) => dispatch('map/resize', { width: v, height: m.height })} />
        <${Field} label=${`Depth (${MAP_MIN_H}–${MAP_MAX_H})`} type="number" value=${m.height} min=${MAP_MIN_H} max=${MAP_MAX_H} onCommit=${(v) => dispatch('map/resize', { width: m.width, height: v })} />
      </div>
      <p class="hint">Each square is 5 ft · ${m.width * 5} × ${m.height * 5} ft. 32 × 20 is the standard table.</p>
    <//>
    <${Section} title="Tools">
      <${Segmented} label="Tool" value=${tool.kind} onChange=${(v) => setTool({ kind: v })} options=${[{ value: 'select', icon: 'hand', label: 'Move tokens' }, { value: 'paint', icon: 'brush', label: 'Paint terrain' }]} />
      <div class="terrain-grid">${TERRAIN.map((t) => html`<button type="button" class=${cx('terrain', `t-${t.key}`, tool.terrain === t.key && tool.kind === 'paint' && 'is-on')} onClick=${() => setTool({ kind: 'paint', terrain: t.key })} title=${`${t.label}${t.blocked ? ' (blocks movement)' : ''}`}><i></i><span>${t.label}</span></button>`)}</div>
      <p class="hint">${tool.kind === 'paint' ? 'Drag across the stage to paint. "Clear" erases. Ctrl+Z undoes a whole stroke.' : 'Drag a card onto a square to move it. Click a card to select it.'}</p>
      <div class="row"><${Button} size="sm" icon="reset" onClick=${() => dispatch('map/resetPositions', {})}>Reset positions<//><${Button} size="sm" icon="trash" onClick=${() => { if (confirm('Erase all terrain on this map?')) dispatch('map/clear', {}); }}>Clear terrain<//></div>
    <//>
    <${Section} title="Table display">
      <${Toggle} label="TV follows my tactical camera" checked=${state.stage.followGm} onChange=${(v) => dispatch('stage/set', { followGm: v })} />
      <p class="hint">Players on phones can step their own token with the arrow pad while the table is tactical.</p>
    <//>
  </div>`;
}

// ------------------------------------------------------------ scene
export function ScenePanel({ state, dispatch }) {
  const scene = getScene(state);
  return html`<div class="panel-body">
    <${Section} title="Stage">
      <div class="chips">${SCENES.map((s) => html`<button type="button" class=${cx('chipbtn', state.meta.sceneId === s.id && 'is-on')} onClick=${() => dispatch('scene/select', { sceneId: s.id })}>${state.meta.sceneOverrides[s.id]?.name || s.name}</button>`)}</div>
      <${Field} label="Title" value=${scene.name} maxLength=${85} onCommit=${(v) => dispatch('scene/edit', { name: v })} />
      <${Field} label="Subtitle" value=${scene.ambience} maxLength=${110} onCommit=${(v) => dispatch('scene/edit', { ambience: v })} />
      <label class="field"><span class="field-label">Narration</span><textarea rows="3" maxlength="350" value=${scene.description} onChange=${(e) => dispatch('scene/edit', { description: e.currentTarget.value })}></textarea></label>
    <//>
    <${Section} title="Presentation">
      <${Toggle} label="Show cards in scene mode" checked=${state.presentation.showSceneCards} onChange=${(v) => dispatch('pres/set', { showSceneCards: v })} />
      <${Toggle} label="Show labels and initiative on the TV" checked=${state.presentation.showHud} onChange=${(v) => dispatch('pres/set', { showHud: v })} />
      <${Toggle} label="Show chat messages on the TV" checked=${state.presentation.chatOnStage} onChange=${(v) => dispatch('pres/set', { chatOnStage: v })} />
      <${Slider} label="Sound effects on the TV (hits, bells, banners)" value=${state.presentation.sfx} format=${pct} onInput=${(v) => dispatch('pres/set', { sfx: v })} />
      <${Slider} label="Card size" value=${state.presentation.cardScale} min=${0.7} max=${1.4} step=${0.05} format=${pct} onInput=${(v) => dispatch('pres/set', { cardScale: v })} />
    <//>
  </div>`;
}

// ------------------------------------------------------------ session
export function SessionPanel({ state, dispatch, session }) {
  const { online, room, status, links, setOnline, setRoom, publish, exportCampaign, importCampaign, resetDemo, copyRules, backups, releaseClaims, removeLegacyBackup, restoreLegacyRoom } = session;
  const cloud = session.cloud();
  const [list, setList] = useState(null);
  const refresh = () => backups.list().then(setList).catch(() => setList([]));
  useEffect(() => { refresh(); }, [status.text]);
  const claimed = Object.keys(state.claims).length;
  return html`<div class="panel-body">
    <${Section} title="Online play">
      <${Toggle} label="Sync to the TV and phones through Firebase" checked=${online} onChange=${setOnline} />
      <div class=${cx('status-line', `st-${status.state}`)}><i></i><span>${status.text}</span></div>
      <${Field} label="Room" value=${room} maxLength=${60} onCommit=${setRoom} />
      <div class="row wrap">
        <${Button} icon="link" onClick=${() => links.copy('index.html')}>Copy TV link<//>
        <${Button} icon="users" onClick=${() => links.copy('player.html')}>Copy player link<//>
        <${Button} icon="sync" onClick=${publish} disabled=${!online}>Publish now<//>
      </div>
      <p class="hint">No logins. Each room belongs to this browser; players can only edit the allowed fields on party sheets. Without online play, tabs on this computer stay in sync on their own.</p>
    <//>
    <${Section} title="Player devices" aside=${claimed ? html`<${Button} size="sm" onClick=${releaseClaims}>Release all<//>` : null}>
      <p class="hint">${claimed} of ${state.characters.filter((c) => c.faction !== 'enemy').length} party sheets are linked to a phone. Each sheet can be edited from one phone only; release one in the Combatant tab to let someone else take it.${cloud && !cloud.claimsEnforced ? ' Your deployed Firebase rules predate 2.0.1, so this is enforced by this GM browser only — deploy the 2.0.1 rules to enforce it in Firebase too.' : ''}</p>
    <//>
    ${cloud?.hasLegacyBackup ? html`<${Section} title="1.5.8 room copy">
      <p class="hint">This room was upgraded from 1.5.8. The original room is stored inside it, unchanged.</p>
      <div class="row wrap"><${Button} icon="reset" onClick=${restoreLegacyRoom}>Restore 1.5.8 room<//><${Button} icon="trash" class="danger" onClick=${removeLegacyBackup}>Delete the copy<//></div>
    <//>` : null}
    <${Section} title="Safety copies" aside=${html`<${Button} size="sm" icon="sync" title="Refresh" onClick=${refresh} />`}>
      ${list === null ? html`<p class="hint">Loading…</p>` : list.length ? html`<ul class="snaps">${list.slice(0, 8).map((b) => html`<li><div class="snap-apply" style="cursor:default"><b>${b.reason}</b><small>${new Date(b.at).toLocaleString()} · ${b.room || 'local'} · ${Math.max(1, Math.round(b.size / 1024))} KB</small></div><button type="button" class="icon-x" title="Download" aria-label="Download backup" onClick=${() => backups.download(b.id)}><${Icon} name="download" size=${13} /></button><button type="button" class="icon-x" title="Load into the deck" aria-label="Load backup" onClick=${() => backups.restore(b.id)}><${Icon} name="upload" size=${13} /></button></li>`)}</ul>` : html`<p class="hint">Grim saves a copy here automatically whenever syncing would replace one version of a campaign with another.</p>`}
    <//>
    <${Section} title="Backups">
      <div class="row wrap">
        <${Button} icon="download" onClick=${exportCampaign}>Export campaign<//>
        <label class="btn btn-ghost"><${Icon} name="upload" /><span>Import campaign</span><input type="file" accept="application/json,.json" hidden onChange=${(e) => e.currentTarget.files?.[0] && importCampaign(e.currentTarget.files[0])} /></label>
      </div>
      <p class="hint">Exports characters, portraits, maps, environment and prepared scenes as one JSON file. Import can be undone.</p>
    <//>
    <${Section} title="Maintenance">
      <div class="row wrap">
        <${Button} icon="reset" class="danger" onClick=${resetDemo}>Reset to test data<//>
        <${Button} icon="copy" onClick=${copyRules}>Copy Firebase rules<//>
        <a class="btn btn-ghost" href="legacy/dm.html" target="_blank" rel="noopener"><${Icon} name="external" /><span>Open 1.5.8 build</span></a>
      </div>
    <//>
  </div>`;
}

export async function fileToPortrait(file) {
  return readFileAsDataUrl(file, { maxSide: 640, quality: 0.84 });
}
