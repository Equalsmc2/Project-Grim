// Initiative rail: always visible, one dense row per combatant.
import { html, useState, Icon, Button, cx } from '../kit.js';
import { initiativeOrder, parseHpEntry, hpState, parseCondition } from '../../core/rules.js';

function HpEntry({ c, dispatch }) {
  const [v, setV] = useState('');
  const submit = () => {
    const p = parseHpEntry(v);
    setV('');
    if (!p) return;
    if (p.kind === 'delta') dispatch('char/hp', { id: c.id, amount: p.value });
    else if (p.kind === 'temp') dispatch('char/temp', { id: c.id, value: p.value });
    else dispatch('char/hpSet', { id: c.id, hp: p.value });
  };
  return html`<input class="hp-entry" value=${v} placeholder="±" aria-label=${`Adjust HP for ${c.name}. -7 damage, +5 heal, t10 temp, 20 set`} title="-7 damage · +5 heal · t10 temp HP · 20 set"
    inputmode="numeric" onClick=${(e) => e.stopPropagation()} onInput=${(e) => setV(e.currentTarget.value)}
    onKeyDown=${(e) => { e.stopPropagation(); if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setV(''); e.currentTarget.blur(); } }} onBlur=${submit} />`;
}

function Row({ c, state, selected, active, rank, dispatch, onSelect }) {
  const hp = hpState(c);
  const portrait = state.portraits[c.id];
  const enemy = c.faction === 'enemy';
  const conds = c.conditions.map(parseCondition);
  return html`<li class=${cx('rail-row', enemy ? 'is-foe' : 'is-pc', selected && 'is-selected', active && 'is-active', c.hidden && 'is-hidden', hp.down && 'is-down')}
    onClick=${() => onSelect(c.id)} aria-current=${active ? 'true' : undefined}>
    <span class="rail-init num" title="Initiative">${c.initiative}</span>
    <span class="rail-portrait" style=${portrait ? `background-image:url(${portrait})` : ''}>${portrait ? '' : (c.symbol || c.name.slice(0, 2)).toUpperCase()}</span>
    <span class="rail-main">
      <span class="rail-name">${c.hidden ? html`<${Icon} name="eyeOff" size=${12} title="Hidden from the table" />` : null}${c.name}</span>
      <span class="rail-hp">
        <span class="hpbar"><i style=${`width:${hp.ratio * 100}%`} class=${hp.critical ? 'crit' : hp.bloodied ? 'blood' : ''}></i>${c.tempHp ? html`<b style=${`width:${Math.min(100, (c.tempHp / hp.max) * 100)}%`}></b>` : null}</span>
        <span class="num">${hp.hp}<small>/${hp.max}</small>${c.tempHp ? html`<em>+${c.tempHp}</em>` : null}</span>
      </span>
      ${conds.length ? html`<span class="rail-conds">${conds.slice(0, 4).map((x) => html`<i class=${cx('chip', x.fx && `fx-${x.fx}`)}>${x.name}${x.value ? ` ${x.value}` : ''}</i>`)}${conds.length > 4 ? html`<i class="chip">+${conds.length - 4}</i>` : null}</span>` : null}
      ${c.resources.length ? html`<span class="rail-res">${c.resources.map((r) => html`<span class="pips" title=${`${r.label} ${r.current}/${r.max}`}>${r.label.slice(0, 3)} ${Array.from({ length: Math.min(r.max, 6) }, (_, i) => html`<i class=${i < r.current ? 'on' : ''}></i>`)}</span>`)}</span>` : null}
    </span>
    <span class="rail-side">
      <span class="rail-ac num" title="Armor Class"><${Icon} name="shield" size=${12} />${c.ac}</span>
      <${HpEntry} c=${c} dispatch=${dispatch} />
    </span>
    ${active ? html`<span class="rail-turn" aria-hidden="true"></span>` : null}
  </li>`;
}

export function Rail({ state, dispatch, selectedId, onSelect, onAdd }) {
  const combat = state.meta.mode === 'combat';
  const list = combat ? initiativeOrder(state.characters) : state.characters;
  const visible = list.filter((c) => !c.hidden);
  const rank = new Map(visible.map((c, i) => [c.id, i + 1]));
  const players = state.characters.filter((c) => c.faction !== 'enemy').length;
  return html`<aside class="rail" aria-label="Initiative">
    <header class="rail-head">
      <div><span class="eyebrow">${combat ? 'Initiative' : 'Cast'}</span><span class="rail-count num">${players} PC · ${state.characters.length - players} foes</span></div>
      <div class="row">
        <${Button} icon="dice" title="Roll initiative for everyone (d20 + Perception)" onClick=${() => dispatch('init/roll', {})} />
        <${Button} icon="plus" title="Add a combatant" onClick=${onAdd} data-popover-trigger />
      </div>
    </header>
    <ol class="rail-list">
      ${list.map((c) => html`<${Row} key=${c.id} c=${c} state=${state} rank=${rank.get(c.id)} selected=${c.id === selectedId} active=${combat && c.id === state.combat.activeId} dispatch=${dispatch} onSelect=${onSelect} />`)}
    </ol>
    ${!state.characters.length ? html`<p class="empty">No combatants yet.</p>` : null}
  </aside>`;
}
