import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIREBASE_RULES } from '../../src/sync/rules.js';

const file = JSON.parse(readFileSync(new URL('../../firebase-rtdb.rules.json', import.meta.url), 'utf8'));
const deployed = JSON.parse(readFileSync(new URL('./e2e/rules-deployed-1.5.8.json', import.meta.url), 'utf8'));

test('embedded rules (Copy rules button) equal firebase-rtdb.rules.json', () => {
  assert.deepEqual(FIREBASE_RULES, file, 'run: node tools/sync-rules.mjs');
});

test('2.0.1 rules never loosen the 1.5.8 room rules', () => {
  assert.deepEqual(file.rules.grim.rooms, deployed.rules.grim.rooms);
  assert.equal(file.rules['.read'], false);
  assert.equal(file.rules['.write'], false);
});

test('player edits now require the character claim; the rest of the 1.5.8 condition is kept', () => {
  const now = file.rules.grim.playerEdits.$roomId.$characterId.$uid.$field;
  const before = deployed.rules.grim.playerEdits.$roomId.$characterId.$uid.$field;
  assert.match(now['.write'], /grim\/claims.*\$characterId.*uid'\)\.val\(\) === auth\.uid/);
  assert.equal(now['.write'].replace(" root.child('grim/claims').child($roomId).child($characterId).child('uid').val() === auth.uid &&", ''), before['.write']);
  assert.equal(now['.validate'], before['.validate']);
});

test('the preserved 1.5.8 build refuses to read or write a room upgraded to 2.0', () => {
  const src = readFileSync(new URL('../../assets/grim-158/firebase-sync.js', import.meta.url), 'utf8');
  assert.match(src, /remote&&remote\.schema===2\)\{upgradedTo2=true;/, 'snapshot guard');
  assert.match(src, /const canWrite=\(\)=>alive&&dm&&!upgradedTo2&&/, 'write guard');
});
