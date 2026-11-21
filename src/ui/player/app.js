// Player desk: phone-first sheet for one party member. Edits go through the
// GM (the Firebase player inbox online, or directly between tabs locally).
import { html, render, useState, useEffect, useRef, useCampaign, Icon, Button, cx, toast } from '../kit.js';
import { createStore } from '../../core/store.js';
import { CONDITIONS } from '../../core/catalog.js';
import { hpState, parseCondition, parseHpEntry, setCondition, removeCondition } from '../../core/rules.js';
import { createSession, resolveConnection } from '../../app/session.js';
import { PortraitStudio } from '../../portrait/maker.js';
import { renderSvg } from '../../portrait/art.js';

const conn = resolveConnection('player');
const store = createStore(conn.online ? { key: `grim:view:${conn.room}`, legacyKey: null, channelName: null } : {});
window.__grim = { store };
let status = { state: 'local', text: 'Same computer' };
const subs = new Set();
let chatDenied = false;
const session = createSession({ store, role: 'player', onStatus: (s) => { status = s; subs.forEach((f) => f()); }, onChatDenied: () => { chatDenied = true; subs.forEach((f) => f()); } });
const PICK_KEY = `grim:player-pick:${conn.online ? conn.room : 'local'}`;
const PLAYER_CONDITIONS = CONDITIONS.filter((c) => !['Persistent damage', 'Controlled'].includes(c.name));

async function send(id, field, value) {
  if (session.cloud) return session.cloud.submitPlayerEdit(id, field, value);
  if (!store.dispatch('player/edit', { id, field, value }, { origin: 'player' }) && field === 'mapMove') throw new Error('Blocked');
  return true;
}

function Stat({ label, field, c, min, max, onSend }) {
  const [v, setV] = useState(null);
  const commit = () => { if (v === null) return; const n = Number(v); setV(null); if (Number.isFinite(n) && n !== c[field]) onSend(field, n); };
  return html`<label class="pstat"><span>${label}</span><input type="number" inputmode="numeric" min=${min} max=${max} value=${v ?? c[field]} onInput=${(e) => setV(e.currentTarget.value)} onBlur=${commit} onKeyDown=${(e) => e.key === 'Enter' && e.currentTarget.blur()} /></label>`;
}

function Sheet({ state, c, onBack }) {
  const [pending, setPending] = useState({});
  const [hpIn, setHpIn] = useState('');
  const [studio, setStudio] = useState(false);
  const [msg, setMsg] = useState('');
  const hp = hpState(c);
  const portrait = state.portraits[c.id];
  const combat = state.meta.mode === 'combat';
  const myTurn = combat && state.combat.activeId === c.id;
  const tactical = combat && state.stage.view === 'tactical';
  const conds = c.conditions.map(parseCondition);
  const listRef = useRef(null);
  useEffect(() => { setPending({}); }, [c]);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [state.chat.length]);
  const onSend = async (field, value) => {
    setPending((p) => ({ ...p, [field]: true }));
    try { await send(c.id, field, value); if (session.cloud && field !== 'mapMove') toast('Sent to the GM'); }
    catch (e) { toast(e.message === 'Blocked' ? 'That square is blocked' : `Not sent: ${e.message}`); }
    setTimeout(() => setPending((p) => ({ ...p, [field]: false })), 1200);
  };
  const applyHp = () => {
    const p = parseHpEntry(hpIn); setHpIn('');
    if (!p) return;
    if (p.kind === 'temp') return onSend('tempHp', p.value);
    if (p.kind === 'set') return onSend('hp', p.value);
    let temp = c.tempHp, dmg = -p.value, next = c.hp;
    if (p.value < 0) { const soak = Math.min(temp, dmg); temp -= soak; next = Math.max(0, c.hp - (dmg - soak)); if (soak) onSend('tempHp', temp); }
    else next = Math.min(c.maxHp, c.hp + p.value);
    onSend('hp', next);
  };
  const toggleCond = (name) => {
    const has = conds.some((x) => x.name === name);
    const def = CONDITIONS.find((x) => x.name === name);
    onSend('conditions', has ? removeCondition(c.conditions, name) : setCondition(c.conditions, name, def?.valued ? 1 : null));
  };
  const stepCond = (x, d) => onSend('conditions', setCondition(c.conditions, x.name, x.value + d));
  const sendChat = async (e) => {
    e.preventDefault();
    const text = msg.trim();
    if (!text) return;
    setMsg('');
    try {
      if (session.cloud) await session.cloud.sendChat({ name: c.name, text });
      else store.dispatch('chat/post', { from: 'player', name: c.name, text });
    } catch { toast(chatDenied ? 'Player chat needs the updated Firebase rules — ask your GM' : 'Message not sent'); }
  };

  return html`<div class="sheet">
    <div class=${cx('sheet-hero', c.faction)}>
      <button type="button" class="back" onClick=${onBack} aria-label="Choose another character"><${Icon} name="arrowLeft" /></button>
      <button type="button" class="hero-portrait" onClick=${() => setStudio(true)} style=${portrait ? `background-image:url(${portrait})` : ''} aria-label="Edit portrait">
        ${portrait ? '' : html`<span dangerouslySetInnerHTML=${{ __html: renderSvg(c.avatar || '', { size: 120, lite: true }) }}></span>`}
        <i><${Icon} name="palette" size=${14} /></i>
      </button>
      <div class="hero-id">
        <h1 class="serif">${c.name}</h1>
        <p>${[c.ancestry, c.className].filter(Boolean).join(' · ')} · Level ${c.level}</p>
      </div>
    </div>
    ${myTurn ? html`<div class="your-turn"><span class="eyebrow">Round ${state.combat.round}</span><b class="serif">It's your turn</b></div>` : null}

    <section class="card hp-card">
      <div class="hp-top"><span class="eyebrow">Hit points</span><span class=${cx('hp-big num', pending.hp && 'is-pending')}>${hp.hp}<small> / ${hp.max}</small>${c.tempHp ? html`<em>+${c.tempHp}</em>` : null}</span></div>
      <div class="hpbar big"><i style=${`width:${hp.ratio * 100}%`} class=${hp.critical ? 'crit' : hp.bloodied ? 'blood' : ''}></i></div>
      <div class="hp-quick">
        ${[-5, -1].map((n) => html`<button type="button" class="dmg" onClick=${() => onSend('hp', Math.max(0, c.hp + n))}>${n}</button>`)}
        <input inputmode="numeric" placeholder="−7 · +5 · t10" value=${hpIn} aria-label="Adjust hit points" onInput=${(e) => setHpIn(e.currentTarget.value)} onKeyDown=${(e) => e.key === 'Enter' && applyHp()} />
        ${[1, 5].map((n) => html`<button type="button" class="heal" onClick=${() => onSend('hp', Math.min(c.maxHp, c.hp + n))}>+${n}</button>`)}
      </div>
    </section>

    <section class="card stats">
      <${Stat} label="AC" field="ac" c=${c} min=${0} max=${99} onSend=${onSend} />
      <${Stat} label="Initiative" field="initiative" c=${c} min=${-100} max=${150} onSend=${onSend} />
      <${Stat} label="Perception" field="perception" c=${c} min=${-20} max=${80} onSend=${onSend} />
      <${Stat} label="Max HP" field="maxHp" c=${c} min=${1} max=${9999} onSend=${onSend} />
      <${Stat} label="Temp HP" field="tempHp" c=${c} min=${0} max=${9999} onSend=${onSend} />
      <${Stat} label="Level" field="level" c=${c} min=${1} max=${20} onSend=${onSend} />
    </section>

    ${tactical ? html`<section class="card move">
      <span class="eyebrow">Move your token</span>
      <div class="dpad">
        <button type="button" class="up" aria-label="Move north" onClick=${() => onSend('mapMove', 'up')}><${Icon} name="arrowUp" size=${22} /></button>
        <button type="button" class="left" aria-label="Move west" onClick=${() => onSend('mapMove', 'left')}><${Icon} name="arrowLeft" size=${22} /></button>
        <span class="dpad-c">5 ft</span>
        <button type="button" class="right" aria-label="Move east" onClick=${() => onSend('mapMove', 'right')}><${Icon} name="arrowRight" size=${22} /></button>
        <button type="button" class="down" aria-label="Move south" onClick=${() => onSend('mapMove', 'down')}><${Icon} name="arrowDown" size=${22} /></button>
      </div>
    </section>` : null}

    <section class="card">
      <span class="eyebrow">Conditions</span>
      <div class="pconds">
        ${conds.map((x) => html`<span class=${cx('cond', x.fx && `fx-${x.fx}`, 'on')}><button type="button" onClick=${() => toggleCond(x.name)}>${x.name}</button>${x.valued ? html`<button type="button" aria-label=${`Lower ${x.name}`} onClick=${() => stepCond(x, -1)}>−</button><b class="num">${x.value}</b><button type="button" aria-label=${`Raise ${x.name}`} onClick=${() => stepCond(x, 1)}>+</button>` : null}</span>`)}
      </div>
      <details class="cond-picker"><summary>Add a condition</summary><div class="pconds">${PLAYER_CONDITIONS.filter((d) => !conds.some((x) => x.name === d.name)).map((d) => html`<button type="button" class="cond" onClick=${() => toggleCond(d.name)}>${d.name}</button>`)}</div></details>
    </section>

    <section class="card pchat">
      <span class="eyebrow">Table chat</span>
      <ol class="chat-list" ref=${listRef}>${state.chat.slice(-30).map((m) => html`<li class=${cx('msg', `from-${m.from}`)}><b>${m.name}</b><span>${m.text}</span></li>`)}</ol>
      <form class="chat-form" onSubmit=${sendChat}><input placeholder=${`Message as ${c.name}`} maxlength="300" value=${msg} onInput=${(e) => setMsg(e.currentTarget.value)} aria-label="Message" /><${Button} type="submit" variant="primary" icon="arrowRight" aria-label="Send" /></form>
    </section>

    ${studio ? html`<${PortraitStudio} code=${c.avatar} name=${c.name} onClose=${() => setStudio(false)} onSave=${(code) => { onSend('avatar', code); setStudio(false); toast(session.cloud ? 'Portrait sent — it appears when the GM is connected' : 'Portrait updated'); }} />` : null}
  </div>`;
}

function App() {
  const state = useCampaign(store);
  const [, force] = useState(0);
  const [pick, setPick] = useState(() => { try { return localStorage.getItem(PICK_KEY) || ''; } catch { return ''; } });
  useEffect(() => { const f = () => force((n) => n + 1); subs.add(f); return () => subs.delete(f); }, []);
  const party = state.characters.filter((c) => c.faction !== 'enemy' && !c.hidden);
  const chosen = party.find((c) => c.id === pick);
  const choose = (id) => { setPick(id); try { localStorage.setItem(PICK_KEY, id); } catch {} };
  return html`<div class="player">
    <header class="ptop">
      <div class="brand"><span class="mark serif">G</span><b>GRIM</b></div>
      <span class=${cx('pconn', `st-${status.state}`)}><i></i>${status.text}</span>
    </header>
    ${chosen ? html`<${Sheet} state=${state} c=${chosen} onBack=${() => choose('')} />` : html`<main class="picker">
      <span class="eyebrow">The party</span>
      <h1 class="serif">Who are you playing?</h1>
      <ul>${party.map((c) => { const hp = hpState(c); const img = state.portraits[c.id]; return html`<li><button type="button" onClick=${() => choose(c.id)}><span class="pk-art" style=${img ? `background-image:url(${img})` : ''}></span><span class="pk-id"><b class="serif">${c.name}</b><small>${[c.ancestry, c.className].filter(Boolean).join(' · ')}</small></span><span class="num pk-hp">${hp.hp}/${hp.max}</span></button></li>`; })}</ul>
      ${!party.length ? html`<p class="hint">${status.state === 'waiting' ? 'Waiting for the GM to open the room.' : 'Your GM has not added party members yet.'}</p>` : html`<p class="hint">Only the GM adds or removes characters. You can edit your own sheet.</p>`}
    </main>`}
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));
session.connect();
