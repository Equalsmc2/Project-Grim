import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../src/core/store.js';
import { defaultCampaign, migrateLegacy, normalizeCampaign, isLegacyCampaign } from '../../src/core/schema.js';
import { parseHpEntry, parseCondition, setCondition, applyHp, initiativeOrder } from '../../src/core/rules.js';
import { boardPositions, createMap } from '../../src/core/battlemap.js';
import { encodePlayerEdit } from '../../src/core/commands.js';

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const fresh = (opts = {}) => createStore({ storage: memory(), channelName: null, ...opts });

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const legacyBlob = () => ({
  version: 1, updatedAt: 1700000000000, campaign: 'PROJECT GRIM', subtitle: 'PATHFINDER 2E', mode: 'combat', sceneId: 'forest',
  sceneOverrides: { forest: { name: 'Mire', description: 'Wet', ambience: 'Night' } },
  combat: { round: 4, activeId: 'gob' },
  characters: [
    { id: 'mara', name: 'Mara', ancestry: 'Human', className: 'Fighter', level: 3, maxHp: 46, hp: 30, tempHp: 4, ac: 20, initiative: 22, perception: 8, conditions: ['Frightened 2', 'Prone'], faction: 'player', portrait: PNG, avatar: 'v1-0123456789abcdef' },
    { id: 'gob', name: 'Goblin', ancestry: 'Goblin', className: 'Warrior', level: 1, maxHp: 15, hp: 6, tempHp: 0, ac: 16, initiative: 14, perception: 5, conditions: ['Burning'], faction: 'enemy', hidden: false },
  ],
  environment: { preset: 'Forest', ground: 'grass', weather: 'rain', fog: 0.3, terrainWidth: 32, terrainDepth: 20, bogus: 1 },
  battleMaps: { enabled: true, activeId: 'm1', maps: [{ id: 'm1', name: 'Bridge', width: 32, height: 20, rows: Array.from({ length: 20 }, (_, y) => (y === 5 ? 'T#'.padEnd(32, '.') : '.'.repeat(32))), positions: { mara: { x: 3, y: 17 } } }] },
  presentation: { cardScale: 1.1, showHud: true, showSceneCards: true },
  sceneSnapshots: [{ id: 's1', name: 'Rainy', environment: { weather: 'rain' }, sceneId: 'forest', createdAt: 5 }],
  playerEditCursors: { 'mara/u1/hp': 1700000000001 },
  log: [{ id: 'a', time: 1, text: 'hello' }],
});

test('legacy 1.5.8 campaigns migrate losslessly', () => {
  const v1 = legacyBlob();
  assert.ok(isLegacyCampaign(v1));
  const c = normalizeCampaign(v1);
  assert.equal(c.schema, 2);
  assert.equal(c.meta.mode, 'combat');
  assert.equal(c.meta.sceneId, 'forest');
  assert.equal(c.meta.sceneOverrides.forest.name, 'Mire');
  assert.equal(c.combat.round, 4);
  assert.equal(c.characters.length, 2);
  assert.deepEqual(c.characters[0].conditions, ['Frightened 2', 'Prone']);
  assert.equal(c.characters[0].tempHp, 4);
  assert.equal(c.characters[0].avatar, 'v1-0123456789abcdef');
  assert.equal(c.portraits.mara, PNG, 'portrait moved to its own section');
  assert.equal(c.characters[0].portrait, undefined);
  assert.equal(c.stage.view, 'tactical', 'enabled battle map in combat becomes tactical view');
  assert.equal(c.battleMaps.maps[0].rows[5].slice(0, 2), 'T#');
  assert.deepEqual(c.battleMaps.maps[0].positions.mara, { x: 3, y: 17 });
  assert.equal(c.environment.weather, 'rain');
  assert.equal(c.environment.bogus, undefined);
  assert.equal(c.snapshots[0].name, 'Rainy');
  assert.equal(c.cursors['mara/u1/hp'], 1700000000001);
  assert.equal(c.presentation.cardScale, 1.1);
});

test('store loads the legacy localStorage key and never deletes it', () => {
  const storage = memory();
  storage.setItem('grim:campaign:v1', JSON.stringify(legacyBlob()));
  const store = createStore({ storage, channelName: null });
  assert.equal(store.getState().characters[0].name, 'Mara');
  store.dispatch('char/hp', { id: 'mara', amount: -5 });
  assert.ok(storage.getItem('grim:campaign:v1'), 'legacy data kept for the /legacy build');
  assert.ok(storage.getItem('grim:campaign:v2'));
  const reloaded = createStore({ storage, channelName: null });
  assert.equal(reloaded.getState().characters[0].hp, 29, '4 temp HP soaked first');
  assert.equal(reloaded.getState().portraits.mara, PNG);
});

test('damage soaks temp HP, healing caps at max', () => {
  const c = { hp: 10, maxHp: 20, tempHp: 5 };
  applyHp(c, -8);
  assert.deepEqual([c.hp, c.tempHp], [7, 0]);
  applyHp(c, 100);
  assert.equal(c.hp, 20);
  applyHp(c, -999);
  assert.equal(c.hp, 0);
});

test('quick HP entry syntax', () => {
  assert.deepEqual(parseHpEntry('-7'), { kind: 'delta', value: -7 });
  assert.deepEqual(parseHpEntry('+5'), { kind: 'delta', value: 5 });
  assert.deepEqual(parseHpEntry('12'), { kind: 'set', value: 12 });
  assert.deepEqual(parseHpEntry('t10'), { kind: 'temp', value: 10 });
  assert.equal(parseHpEntry('abc'), null);
});

test('valued conditions', () => {
  assert.deepEqual(parseCondition('frightened 3'), { name: 'Frightened', value: 3, valued: true, fx: null });
  assert.equal(parseCondition('On fire').fx, 'burning');
  let list = setCondition([], 'Frightened', 2);
  list = setCondition(list, 'Frightened', 1);
  assert.deepEqual(list, ['Frightened 1']);
  assert.deepEqual(setCondition(list, 'Frightened', 0), []);
});

test('initiative order is stable for ties', () => {
  const order = initiativeOrder([{ id: 'a', initiative: 10 }, { id: 'b', initiative: 15 }, { id: 'c', initiative: 10 }]);
  assert.deepEqual(order.map((c) => c.id), ['b', 'a', 'c']);
});

test('turn advance wraps rounds, skips hidden, resets per-round and per-turn resources', () => {
  const s = fresh();
  s.dispatch('char/add', { id: 'drake', name: 'Drake', faction: 'enemy', initiative: 30, resources: [{ id: 'leg', label: 'Legendary', max: 3, current: 0, reset: 'turn' }] });
  s.dispatch('char/add', { id: 'ghost', name: 'Ghost', faction: 'enemy', initiative: 29, hidden: true });
  s.dispatch('combat/start');
  assert.equal(s.getState().combat.activeId, 'drake');
  s.dispatch('char/resource', { id: 'drake', op: 'use', resourceId: 'leg', delta: -3 });
  assert.equal(s.getState().characters.find((c) => c.id === 'drake').resources[0].current, 0);
  const visible = s.getState().characters.filter((c) => !c.hidden).length;
  for (let i = 0; i < visible; i++) s.dispatch('turn/next');
  assert.equal(s.getState().combat.round, 2);
  assert.equal(s.getState().combat.activeId, 'drake');
  assert.equal(s.getState().characters.find((c) => c.id === 'drake').resources[0].current, 3, 'per-turn reset at the start of its turn');
  assert.ok(!['ghost'].includes(s.getState().combat.activeId));
});

test('undo/redo covers combat, cards, maps and environment; slider drags coalesce', () => {
  let t = 1000;
  const s = fresh({ now: () => t });
  s.dispatch('char/hp', { id: 'mara', amount: -10 });
  s.dispatch('env/set', { fog: 0.1 }); t += 100;
  s.dispatch('env/set', { fog: 0.2 }); t += 100;
  s.dispatch('env/set', { fog: 0.3 });
  s.dispatch('map/paint', { cells: [[1, 1], [2, 1]], terrain: 'wall', stroke: 'a' });
  assert.equal(s.getState().environment.fog, 0.3);
  s.undo();
  assert.equal(s.getState().battleMaps.maps[0].rows[1].slice(1, 3), '..');
  s.undo();
  assert.equal(s.getState().environment.fog, 0, 'one undo for the whole drag');
  s.undo();
  assert.equal(s.getState().characters.find((c) => c.id === 'mara').hp, 46);
  s.redo();
  assert.equal(s.getState().characters.find((c) => c.id === 'mara').hp, 36);
  assert.ok(s.canRedo);
  s.dispatch('turn/next');
  assert.ok(!s.canRedo, 'a new command clears redo');
});

test('volatile sections (chat, music, camera) are not undoable', () => {
  const s = fresh();
  s.dispatch('chat/post', { from: 'gm', name: 'GM', text: 'Roll perception' });
  assert.ok(!s.canUndo);
  assert.equal(s.getState().chat.length, 1);
  assert.equal(s.dispatch('chat/post', { id: s.getState().chat[0].id, from: 'gm', text: 'dup' }), false, 'duplicate ids are ignored');
});

test('commands touch only their sections (portraits are not re-created)', () => {
  const s = fresh();
  s.dispatch('portrait/set', { id: 'mara', image: PNG });
  const before = s.getState().portraits;
  s.dispatch('char/hp', { id: 'mara', amount: -1 });
  assert.equal(s.getState().portraits, before, 'same object reference');
});

test('remote sections apply only when newer and never enter history', () => {
  const s = fresh();
  s.dispatch('round/set', { round: 3 });
  const rev = s.getState().rev;
  assert.equal(s.applyRemote({ combat: { round: 9, activeId: 'mara' } }, { rev: rev - 1 }), false);
  assert.equal(s.applyRemote({ combat: { round: 9, activeId: 'mara' } }, { rev: rev + 5 }), true);
  assert.equal(s.getState().combat.round, 9);
  assert.equal(s.getState().rev, rev + 5);
  s.undo();
  assert.equal(s.getState().combat.round, 1, 'undo reverts the local round/set, history unaffected by remote');
});

test('tactical map: default board puts enemies far and players near, blocked cells respected', () => {
  const map = createMap({ width: 32, height: 20 });
  map.rows[17] = '#'.repeat(32);
  const pos = boardPositions(map, [{ id: 'p', faction: 'player' }, { id: 'e', faction: 'enemy' }]);
  assert.ok(pos.get('e').y < pos.get('p').y);
  assert.notEqual(pos.get('p').y, 17);
});

test('player edits obey the legacy whitelist and DM-only fields stay DM-only', () => {
  const s = fresh();
  s.dispatch('char/hp', { id: 'mara', amount: -10 });
  assert.equal(s.dispatch('player/edit', { id: 'mara', field: 'hp', value: 9999 }), true);
  assert.equal(s.getState().characters.find((c) => c.id === 'mara').hp, 46);
  assert.equal(s.dispatch('player/edit', { id: 'mara', field: 'faction', value: 'enemy' }), false);
  assert.equal(encodePlayerEdit('conditions', ['Frightened 2', 'Nonsense']), 'Frightened 2');
  assert.equal(encodePlayerEdit('avatar', 'bad'), null);
  s.dispatch('char/add', { id: 'orc', faction: 'enemy' });
  assert.equal(s.dispatch('player/edit', { id: 'orc', field: 'hp', value: 1 }), false, 'players cannot edit enemies');
});

test('player d-pad moves only in tactical combat and never through walls', () => {
  const s = fresh();
  assert.equal(s.dispatch('player/edit', { id: 'mara', field: 'mapMove', value: 'up' }), false);
  s.dispatch('combat/start');
  s.dispatch('view/set', { view: 'tactical' });
  s.dispatch('map/place', { id: 'mara', x: 5, y: 5 });
  s.dispatch('map/paint', { cells: [[5, 4]], terrain: 'wall' });
  assert.equal(s.dispatch('player/edit', { id: 'mara', field: 'mapMove', value: 'up' }), false);
  assert.equal(s.dispatch('player/edit', { id: 'mara', field: 'mapMove', value: 'left' }), true);
  assert.deepEqual(s.getState().battleMaps.maps[0].positions.mara, { x: 4, y: 5 });
});

test('removing a character cleans portraits, positions and passes the turn', () => {
  const s = fresh();
  s.dispatch('combat/start');
  const active = s.getState().combat.activeId;
  s.dispatch('portrait/set', { id: active, image: PNG });
  s.dispatch('map/place', { id: active, x: 1, y: 1 });
  s.dispatch('char/remove', { id: active });
  const st = s.getState();
  assert.ok(!st.portraits[active]);
  assert.ok(!st.battleMaps.maps[0].positions[active]);
  assert.ok(st.combat.activeId && st.combat.activeId !== active);
});

test('scene snapshots save/apply without touching combat', () => {
  const s = fresh();
  s.dispatch('env/preset', { name: 'Forest' });
  s.dispatch('snapshot/save', { name: 'Woods', id: 'w' });
  s.dispatch('env/preset', { name: 'Desert' });
  s.dispatch('char/hp', { id: 'mara', amount: -3 });
  s.dispatch('snapshot/apply', { id: 'w' });
  assert.equal(s.getState().environment.ground, 'grass');
  assert.equal(s.getState().characters.find((c) => c.id === 'mara').hp, 43);
});

test('default campaign is fully normalized', () => {
  const d = defaultCampaign(1);
  assert.deepEqual(normalizeCampaign(d).characters, d.characters);
  assert.ok(migrateLegacy(legacyBlob()).portraits.mara);
});
