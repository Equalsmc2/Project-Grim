import test from 'node:test';
import assert from 'node:assert/strict';
import { planFormation, cellToWorld, worldToCell } from '../../src/stage/formation.js';
import { decode, encode, isCode, randomRecipe, renderSvg, optionCount, FEATURES, DEFAULT_RECIPE } from '../../src/portrait/art.js';

const mk = (n, p) => Array.from({ length: n }, (_, i) => ({ id: `${p}${i}` }));

test('formation: players in front of enemies, initiative order left to right', () => {
  const f = planFormation({ players: mk(4, 'p'), enemies: mk(3, 'e'), mapW: 32, mapH: 20 });
  const ps = [0, 1, 2, 3].map((i) => f.get(`p${i}`));
  const es = [0, 1, 2].map((i) => f.get(`e${i}`));
  for (const p of ps) for (const e of es) assert.ok(p.z > e.z, 'party is nearer the camera');
  for (let i = 1; i < ps.length; i++) assert.ok(ps[i].x > ps[i - 1].x, 'left-to-right by initiative');
  for (let i = 1; i < es.length; i++) assert.ok(es[i].x > es[i - 1].x);
});

test('formation: large encounters shrink, then wrap, and never overlap', () => {
  const f = planFormation({ players: mk(6, 'p'), enemies: mk(20, 'e'), mapW: 32, mapH: 20 });
  assert.equal(f.size, 26);
  const pts = [...f.values()];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const a = pts[i], b = pts[j];
    const sameRow = Math.abs(a.z - b.z) < 0.01;
    if (sameRow) assert.ok(Math.abs(a.x - b.x) >= 1.6 * Math.min(a.scale, b.scale) - 1e-6, 'cards in a row do not overlap');
  }
  assert.ok(Math.max(...pts.map((p) => p.row)) >= 1, 'wraps into a second enemy row');
  assert.ok(pts.every((p) => p.scale >= 0.69), 'cards never shrink below ~70%');
});

test('cell/world conversion round-trips on a 32x20 map', () => {
  for (const [x, y] of [[0, 0], [31, 19], [15, 10]]) {
    const w = cellToWorld(x, y, 32, 20);
    assert.deepEqual(worldToCell(w.x, w.z, 32, 20), { x, y });
  }
});

test('portrait codes: every 1.5.8 code decodes, and recipes round-trip', () => {
  assert.ok(isCode('v1-0123456789abcdef'));
  for (let i = 0; i < 200; i++) {
    const r = randomRecipe();
    assert.deepEqual(decode(encode(r)), r);
    assert.match(encode(r), /^v1-[0-9a-z]{16}$/, 'still accepted by the Firebase rule');
  }
  const old = decode('v1-21100001010010');
  for (const k of Object.keys(FEATURES)) assert.ok(old[k] >= 0 && old[k] < optionCount(k), k);
  assert.deepEqual(decode('not-a-code'), DEFAULT_RECIPE);
});

test('portrait SVG renders for every option of every feature', () => {
  for (const k of Object.keys(FEATURES)) for (let i = 0; i < optionCount(k); i++) {
    const svg = renderSvg({ ...DEFAULT_RECIPE, [k]: i }, { lite: true });
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${k}=${i}`);
    assert.ok(!/NaN|undefined/.test(svg), `${k}=${i} produced invalid geometry`);
  }
});
