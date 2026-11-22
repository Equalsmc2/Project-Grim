// Turns two consecutive campaign states into presentation events (sounds,
// banners, boss bar, screen effects). Pure: no DOM, no Three.js.

/**
 * @returns {Array<{type:string, id?:string, name?:string, enemy?:boolean, amount?:number, fraction?:number, crit?:boolean, round?:number, condition?:string}>}
 */
export function diffEvents(prev, next) {
  if (!prev || !next) return [];
  const out = [];
  const before = new Map(prev.characters.map((c) => [c.id, c]));
  const combatNow = next.meta.mode === 'combat', combatBefore = prev.meta.mode === 'combat';
  if (combatNow && !combatBefore) out.push({ type: 'combatStart' });
  if (!combatNow && combatBefore) out.push({ type: 'combatEnd' });
  if (next.meta.sceneId !== prev.meta.sceneId || (next.meta.sceneOverrides[next.meta.sceneId]?.name || '') !== (prev.meta.sceneOverrides[prev.meta.sceneId]?.name || '')) out.push({ type: 'scene' });
  if (next.environment.preset !== prev.environment.preset) out.push({ type: 'biome', name: next.environment.preset });
  if (combatNow && combatBefore && next.combat.round > prev.combat.round) out.push({ type: 'round', round: next.combat.round });
  if (combatNow && next.combat.activeId !== prev.combat.activeId && next.combat.activeId) {
    const c = next.characters.find((x) => x.id === next.combat.activeId);
    if (c && !c.hidden) out.push({ type: 'turn', id: c.id, name: c.name, enemy: c.faction === 'enemy' });
  }
  let anyDown = false;
  for (const c of next.characters) {
    const p = before.get(c.id);
    if (!p || c.hidden) continue;
    const enemy = c.faction === 'enemy';
    const max = Math.max(1, c.maxHp);
    const lost = p.hp - c.hp + Math.max(0, (p.tempHp || 0) - (c.tempHp || 0));
    if (lost > 0) out.push({ type: 'damage', id: c.id, name: c.name, enemy, amount: lost, fraction: lost / max, crit: lost >= max * 0.3 });
    if (c.hp > p.hp) out.push({ type: 'heal', id: c.id, name: c.name, enemy, amount: c.hp - p.hp });
    if ((c.tempHp || 0) > (p.tempHp || 0)) out.push({ type: 'shield', id: c.id, name: c.name, enemy, amount: c.tempHp - p.tempHp });
    if (p.hp > 0 && c.hp <= 0) { out.push({ type: 'down', id: c.id, name: c.name, enemy }); anyDown = true; }
    if (p.hp <= 0 && c.hp > 0) out.push({ type: 'revive', id: c.id, name: c.name, enemy });
    for (const cond of c.conditions) if (!p.conditions.includes(cond) && !p.conditions.some((x) => x.split(' ')[0] === cond.split(' ')[0])) out.push({ type: 'condition', id: c.id, name: c.name, enemy, condition: cond });
    if (p.hidden === false && c.hidden) continue;
  }
  for (const c of next.characters) { const p = before.get(c.id); if (p && p.hidden && !c.hidden) out.push({ type: 'reveal', id: c.id, name: c.name, enemy: c.faction === 'enemy' }); }
  if (anyDown && combatNow) {
    const foes = next.characters.filter((c) => c.faction === 'enemy' && !c.hidden);
    const party = next.characters.filter((c) => c.faction !== 'enemy' && !c.hidden);
    if (foes.length && foes.every((c) => c.hp <= 0)) out.push({ type: 'victory' });
    else if (party.length && party.every((c) => c.hp <= 0)) out.push({ type: 'wipe' });
  }
  if (next.overlay.kind !== 'none' && next.overlay.id !== prev.overlay.id) out.push({ type: 'overlay', kind: next.overlay.kind });
  return out;
}
