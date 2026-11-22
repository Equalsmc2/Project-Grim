import test from 'node:test';
import assert from 'node:assert/strict';
import { diffEvents } from '../../src/stage/events.js';
import { defaultCampaign } from '../../src/core/schema.js';

const base = () => { const s = defaultCampaign(1); s.meta.mode = 'combat'; s.characters.push({ ...s.characters[0], id: 'foe', name: 'Ghoul', faction: 'enemy', hp: 20, maxHp: 20, conditions: [] }); return s; };
const clone = (x) => JSON.parse(JSON.stringify(x));

test('damage, crits, heals and temp HP', () => {
  const a = base(), b = clone(a);
  b.characters.find((c) => c.id === 'foe').hp = 12;
  b.characters.find((c) => c.id === 'mara').hp = 10;
  b.characters.find((c) => c.id === 'sable').tempHp = 5;
  const ev = diffEvents(a, b);
  assert.ok(ev.some((e) => e.type === 'damage' && e.id === 'foe' && e.amount === 8 && e.crit && e.enemy));
  assert.ok(ev.some((e) => e.type === 'damage' && e.id === 'mara' && e.amount === 36 && e.crit && !e.enemy));
  assert.ok(ev.some((e) => e.type === 'shield' && e.id === 'sable' && e.amount === 5));
});

test('down, victory, revive, turn, round, combat start', () => {
  const a = base(), b = clone(a);
  b.characters.find((c) => c.id === 'foe').hp = 0;
  const ev = diffEvents(a, b);
  assert.ok(ev.some((e) => e.type === 'down' && e.enemy));
  assert.ok(ev.some((e) => e.type === 'victory'));
  const c = clone(b); c.characters.find((x) => x.id === 'foe').hp = 3;
  assert.ok(diffEvents(b, c).some((e) => e.type === 'revive'));
  const d = clone(a); d.combat.activeId = 'mara'; d.combat.round = 2;
  const ev2 = diffEvents(a, d);
  assert.ok(ev2.some((e) => e.type === 'turn' && e.id === 'mara'));
  assert.ok(ev2.some((e) => e.type === 'round' && e.round === 2));
  const scene = clone(a); scene.meta.mode = 'scene';
  assert.ok(diffEvents(scene, a).some((e) => e.type === 'combatStart'));
});

test('a condition value change is not a new condition; hidden combatants make no noise', () => {
  const a = base(); a.characters[0].conditions = ['Frightened 2'];
  const b = clone(a); b.characters[0].conditions = ['Frightened 1'];
  assert.ok(!diffEvents(a, b).some((e) => e.type === 'condition'));
  const h = clone(a); h.characters[0].hidden = true;
  const h2 = clone(h); h2.characters[0].hp = 1;
  assert.ok(!diffEvents(h, h2).some((e) => e.type === 'damage'));
});
