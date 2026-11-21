// Multi-client synchronization test: GM, TV and two players in separate
// browser profiles, talking through the local Firebase emulator with the
// project's real security rules.
//
//   node tests/v2/e2e/sync.e2e.mjs
// Requires: Java, firebase-tools (FIREBASE_BIN or `npx firebase-tools`),
// Playwright with Chromium (and optionally Firefox: BROWSER=firefox).
import { spawn } from 'node:child_process';
import { mkdtempSync, copyFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const pw = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const WEB = 'http://127.0.0.1:4179';
const EMU = '127.0.0.1:9000:9099';
const ROOM = `e2e-${Date.now().toString(36)}`;
const browserName = process.env.BROWSER || 'chromium';
// RULES=deployed runs against the rules currently live for 1.5.8; RULES=current (default) against 2.0.1.
const RULESET = process.env.RULES === 'deployed' ? 'deployed' : 'current';
const RULES_FILE = RULESET === 'deployed' ? join(dirname(fileURLToPath(import.meta.url)), 'rules-deployed-1.5.8.json') : null;
const NEW = RULESET === 'current';
const results = [];
const procs = [];

async function waitFor(url, ms = 60000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { const r = await fetch(url); if (r.status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 400)); }
  throw new Error(`timeout waiting for ${url}`);
}
async function poll(fn, ms = 12000, label = 'condition') {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) { try { last = await fn(); if (last) return last; } catch (e) { last = e; } await new Promise((r) => setTimeout(r, 200)); }
  throw new Error(`timed out: ${label} (last: ${last})`);
}
async function step(name, fn) {
  const t = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message }); console.log(`FAIL  ${name}\n      ${e.message}`); }
}

// ------------------------------------------------------------ infrastructure
const dir = mkdtempSync(join(tmpdir(), 'grim-emu-'));
copyFileSync(RULES_FILE || join(root, 'firebase-rtdb.rules.json'), join(dir, 'rules.json'));
console.log(`Rules under test: ${RULESET === 'deployed' ? 'currently deployed (1.5.8)' : 'Project Grim 2.0.1'}`);
writeFileSync(join(dir, 'firebase.json'), JSON.stringify({ database: { rules: 'rules.json' }, emulators: { database: { port: 9000, host: '127.0.0.1' }, auth: { port: 9099, host: '127.0.0.1' }, ui: { enabled: false } } }));
const fbBin = process.env.FIREBASE_BIN || 'npx';
const fbArgs = process.env.FIREBASE_BIN ? [] : ['-y', 'firebase-tools@13'];
procs.push(spawn(fbBin, [...fbArgs, 'emulators:start', '--only', 'database,auth', '--project', 'project-grim-ef4f0'], { cwd: dir, stdio: 'ignore' }));
procs.push(spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: '4179', GRIM_TEST: '1' }, stdio: 'ignore' }));
const cleanup = () => { for (const p of procs) try { p.kill('SIGTERM'); } catch {} };
process.on('exit', cleanup);

await waitFor(`${WEB}/dm.html`);
await waitFor('http://127.0.0.1:9000/.json?ns=project-grim-ef4f0-default-rtdb', 120000);
await waitFor('http://127.0.0.1:9099/', 60000);

const browser = await pw[browserName].launch(browserName === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
const sdkDir = process.env.FIREBASE_SDK_DIR || join(root, 'node_modules/firebase');
async function context() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  // Serve the Firebase web SDK locally when the CDN is unreachable from the test runner.
  if (existsSync(sdkDir)) await ctx.route('https://www.gstatic.com/firebasejs/10.14.1/*', (route) => route.fulfill({ path: join(sdkDir, new URL(route.request().url()).pathname.split('/').pop()), contentType: 'text/javascript' }));
  return ctx;
}
const errors = [];
async function open(ctx, path, init) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  if (init) await page.addInitScript(init);
  await page.goto(`${WEB}/${path}`);
  return page;
}
const S = (page) => page.evaluate(() => window.__grim.store.getState());
const D = (page, type, payload) => page.evaluate(([t, p]) => window.__grim.store.dispatch(t, p), [type, payload]);

const gmCtx = await context();
let gm = await open(gmCtx, `dm.html?emulator=${EMU}`, `localStorage.setItem('grim:options:v1', JSON.stringify({online:true, room:'${ROOM}'}))`);
const tvCtx = await context();
const p1Ctx = await context();
const p2Ctx = await context();
let tv, p1, p2;

await step('GM creates and owns a new room', async () => {
  await poll(() => gm.evaluate(() => document.querySelector('.sync')?.className.includes('st-live')), 30000, 'GM live');
});

await step('TV receives the campaign (characters, scene)', async () => {
  await D(gm, 'char/add', { id: 'drake', name: 'Drake', faction: 'enemy', initiative: 30, maxHp: 80 });
  tv = await open(tvCtx, `index.html?online=1&room=${ROOM}&emulator=${EMU}`);
  await poll(async () => (await S(tv)).characters.some((c) => c.id === 'drake'), 20000, 'TV has Drake');
});

await step('combat, damage and conditions reach the TV', async () => {
  await D(gm, 'combat/start');
  await D(gm, 'char/hp', { id: 'drake', amount: -17 });
  await D(gm, 'char/condition', { id: 'drake', name: 'Burning' });
  await poll(async () => { const s = await S(tv); const d = s.characters.find((c) => c.id === 'drake'); return s.meta.mode === 'combat' && d.hp === 63 && d.conditions.includes('Burning'); }, 10000, 'TV state');
});

await step('overlay opens and dismisses on the TV', async () => {
  await D(gm, 'overlay/show', { kind: 'title', title: 'Chapter Two' });
  await poll(() => tv.evaluate(() => document.querySelector('.ov-title h1')?.textContent === 'Chapter Two'), 10000, 'title visible');
  await D(gm, 'overlay/hide');
  await poll(() => tv.evaluate(() => !document.querySelector('.ov-title')), 10000, 'title gone');
});

await step('tactical switch and map edits reach the TV', async () => {
  await D(gm, 'view/set', { view: 'tactical' });
  await D(gm, 'map/paint', { cells: [[3, 3], [4, 3]], terrain: 'wall' });
  await poll(async () => { const s = await S(tv); return s.stage.view === 'tactical' && s.battleMaps.maps[0].rows[3].slice(3, 5) === '##'; }, 10000, 'TV map');
});

await step('player edits go through the inbox and the GM applies them', async () => {
  p1 = await open(p1Ctx, `player.html?online=1&room=${ROOM}&emulator=${EMU}`);
  await poll(async () => (await S(p1)).characters.length > 0, 20000, 'player loaded');
  await p1.click('text=Fighter 02');
  await p1.fill('[aria-label="Adjust hit points"]', '-7');
  await p1.press('[aria-label="Adjust hit points"]', 'Enter');
  await poll(async () => (await S(gm)).characters.find((c) => c.id === 'ilyra').hp === 25, 15000, 'GM applied player HP');
  await poll(async () => (await S(tv)).characters.find((c) => c.id === 'ilyra').hp === 25, 15000, 'TV shows player HP');
});

await step('player token movement in tactical view', async () => {
  const before = (await S(gm)).battleMaps.maps[0];
  await p1.click('[aria-label="Move north"]');
  await poll(async () => { const m = (await S(gm)).battleMaps.maps[0]; return m.positions.ilyra && JSON.stringify(m.positions.ilyra) !== JSON.stringify(before.positions.ilyra); }, 15000, 'moved');
});

await step(NEW ? 'player chat reaches the GM and the TV, named after the claimed character' : 'player chat is refused cleanly by the deployed rules; GM chat still works', async () => {
  await p1.fill('[aria-label="Message"]', 'I hold the line');
  await p1.press('[aria-label="Message"]', 'Enter');
  if (NEW) {
    await poll(async () => (await S(gm)).chat.some((m) => m.text === 'I hold the line' && m.name === 'Fighter 02'), 15000, 'GM chat');
    await poll(async () => (await S(tv)).chat.some((m) => m.text === 'I hold the line'), 15000, 'TV chat');
  } else {
    await poll(() => p1.evaluate(() => document.getElementById('grimToast')?.textContent.includes('updated Firebase rules')), 10000, 'denied message shown');
    await D(gm, 'chat/post', { from: 'gm', name: 'GM', text: 'GM chat works' });
    await poll(async () => (await S(tv)).chat.some((m) => m.text === 'GM chat works'), 15000, 'GM chat on TV');
    assert.ok(!(await S(gm)).chat.some((m) => m.text === 'I hold the line'));
  }
});

await step('ownership: the claimed sheet shows as taken on a second phone', async () => {
  p2 = await open(p2Ctx, `player.html?online=1&room=${ROOM}&emulator=${EMU}`);
  await poll(async () => (await S(p2)).characters.length > 0, 20000, 'p2 loaded');
  await poll(() => p2.evaluate(() => [...document.querySelectorAll('.picker li button')].some((b) => b.textContent.includes('Fighter 02') && b.textContent.includes('another phone'))), 15000, 'shown as taken');
  await p2.click('text=Fighter 02', { force: true }); // the button is aria-disabled; force the tap anyway
  await p2.waitForTimeout(800);
  assert.ok(await p2.evaluate(() => !document.querySelector('.sheet')), 'p2 cannot open the claimed sheet');
});

await step(NEW ? 'ownership: a forged edit from another phone is denied by Firebase' : 'ownership: a forged edit from another phone is ignored by the GM (deployed rules)', async () => {
  const res = await p2.evaluate(async (room) => {
    const { getDatabase, ref, set } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js');
    const { getApps } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    const app = getApps()[0];
    const uid = window.__grim.session.cloud.uid;
    try { await set(ref(getDatabase(app), `grim/playerEdits/${room}/ilyra/${uid}/hp`), { value: 1, revision: Date.now() }); return 'WRITTEN'; } catch (e) { return e.code || e.message; }
  }, ROOM);
  if (NEW) assert.match(String(res), /permission/i);
  else assert.equal(res, 'WRITTEN', 'the old rules accept the write; the GM must reject it');
  await new Promise((r) => setTimeout(r, 2500));
  assert.equal((await S(gm)).characters.find((c) => c.id === 'ilyra').hp, 25, 'HP unchanged');
  assert.equal((await S(tv)).characters.find((c) => c.id === 'ilyra').hp, 25);
});

await step('ownership: the second phone can claim and play a free character', async () => {
  await p2.click('text=Fighter 03');
  await p2.waitForSelector('.sheet');
  await p2.fill('[aria-label="Adjust hit points"]', '-2');
  await p2.press('[aria-label="Adjust hit points"]', 'Enter');
  await poll(async () => (await S(gm)).characters.find((c) => c.id === 'borin').hp === 50, 15000, 'p2 edit applied');
});

await step('ownership: after the GM releases a sheet, another phone can take it', async () => {
  await D(gm, 'claims/release', { id: 'ilyra' });
  await poll(async () => !(await S(p2)).claims.ilyra, 15000, 'release visible');
  await p2.click('[aria-label="Choose another character"]');
  await p2.click('text=Fighter 02');
  await p2.waitForSelector('.sheet');
  await p2.fill('[aria-label="Adjust hit points"]', '+3');
  await p2.press('[aria-label="Adjust hit points"]', 'Enter');
  await poll(async () => (await S(gm)).characters.find((c) => c.id === 'ilyra').hp === 28, 15000, 'new owner edit applied');
  const p2uid = await p2.evaluate(() => window.__grim.session.cloud.uid);
  await poll(async () => (await S(gm)).claims.ilyra?.uid === p2uid, 15000, 'claim moved');
  // The previous phone is bounced back to the picker.
  await poll(() => p1.evaluate(() => !document.querySelector('.sheet')), 15000, 'p1 bounced');
  await D(gm, 'claims/release', { id: 'ilyra' });
});

await step('authorization: a player cannot write the room or edit enemies', async () => {
  const res = await p1.evaluate(async (room) => {
    const { getDatabase, ref, set, update } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js');
    const { getApps } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    const db = getDatabase(getApps()[0]);
    const out = {};
    try { await update(ref(db, `grim/rooms/${room}`), { mode: 'scene' }); out.room = 'WRITTEN'; } catch (e) { out.room = e.code || e.message; }
    try { await set(ref(db, `grim/rooms/${room}/s/characters`), []); out.chars = 'WRITTEN'; } catch (e) { out.chars = e.code || e.message; }
    try { await set(ref(db, `grim/playerEdits/${room}/drake/someone-else/hp`), { value: 1, revision: Date.now() }); out.spoof = 'WRITTEN'; } catch (e) { out.spoof = e.code || e.message; }
    return out;
  }, ROOM);
  assert.match(String(res.room), /permission/i);
  assert.match(String(res.chars), /permission/i);
  assert.match(String(res.spoof), /permission/i, 'cannot write as another uid');
  // A legitimate edit aimed at an enemy is written to the inbox but ignored by the GM.
  await p1.evaluate(async () => { try { await window.__grimCloudProbe; } catch {} });
  const hp = (await S(gm)).characters.find((c) => c.id === 'drake').hp;
  assert.equal(hp, 63);
});

await step('TV refresh restores the full state', async () => {
  await tv.reload();
  await poll(async () => { const s = await S(tv); return s.characters.find((c) => c.id === 'ilyra')?.hp === 28 && s.stage.view === 'tactical'; }, 20000, 'restored');
});

await step('GM offline edits are kept and published on reconnect', async () => {
  await gmCtx.setOffline(true);
  await D(gm, 'char/hp', { id: 'drake', amount: -3 });
  await D(gm, 'round/set', { round: 4 });
  await new Promise((r) => setTimeout(r, 1500));
  await gmCtx.setOffline(false);
  await gm.evaluate(() => dispatchEvent(new Event('online')));
  await poll(async () => { const s = await S(tv); return s.combat.round === 4 && s.characters.find((c) => c.id === 'drake').hp === 60; }, 25000, 'published after reconnect');
});

await step('GM refresh mid-session keeps everything (no rollback)', async () => {
  await D(gm, 'char/hp', { id: 'mara', amount: -11 });
  await gm.reload();
  await poll(() => gm.evaluate(() => document.querySelector('.sync')?.className.includes('st-live')), 30000, 'GM live again');
  const s = await S(gm);
  assert.equal(s.characters.find((c) => c.id === 'mara').hp, 35);
  assert.equal(s.combat.round, 4);
});

await step('burst of 40 rapid updates converges on the TV', async () => {
  await gm.evaluate(() => { const st = window.__grim.store; for (let i = 0; i < 40; i++) st.dispatch('env/set', { fog: (i + 1) / 40 }); });
  await gm.evaluate(() => { const st = window.__grim.store; for (let i = 0; i < 10; i++) st.dispatch('turn/next'); });
  const gs = await S(gm);
  try { await poll(async () => { const s = await S(tv); return s.environment.fog === 1 && s.combat.activeId === gs.combat.activeId && s.combat.round === gs.combat.round; }, 15000, 'converged'); }
  catch (e) { const s = await S(tv); const g = await S(gm); throw new Error(`${e.message} tv=${JSON.stringify([s.rev, s.environment.fog, s.combat])} gm=${JSON.stringify([g.rev, g.environment.fog, g.combat])} gmStatus=${await gm.evaluate(() => document.querySelector('.sync')?.title)}`); }
});

await step('duplicate and out-of-order snapshots are ignored', async () => {
  const s = await S(tv);
  const applied = await tv.evaluate((rev) => window.__grim.store.applyRemote({ combat: { round: 1, activeId: 'mara' } }, { rev: rev - 3 }), s.rev);
  assert.equal(applied, false);
  assert.equal((await S(tv)).combat.round, s.combat.round);
});

await step('a second GM browser cannot take over the room', async () => {
  const otherCtx = await context();
  const other = await open(otherCtx, `dm.html?emulator=${EMU}`, `localStorage.setItem('grim:options:v1', JSON.stringify({online:true, room:'${ROOM}'}))`);
  await poll(async () => (await other.evaluate(() => JSON.parse(localStorage.getItem('grim:options:v1')).room)) !== ROOM, 30000, 'moved to own room');
  await new Promise((r) => setTimeout(r, 1500));
  const s = await S(tv);
  assert.ok(s.characters.some((c) => c.id === 'drake'), 'original room untouched');
  await otherCtx.close();
});

await step('second player sees GM changes live', async () => {
  await D(gm, 'char/hp', { id: 'ilyra', amount: -1 });
  const hp = (await S(gm)).characters.find((c) => c.id === 'ilyra').hp;
  await poll(async () => (await S(p2)).characters.find((c) => c.id === 'ilyra')?.hp === hp, 20000, 'p2 state');
});

await step('legacy 1.5.8 room owned by this GM upgrades in place', async () => {
  const uid = await gm.evaluate(async () => { const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'); const { getApps } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'); return getAuth(getApps()[0]).currentUser.uid; });
  const legacyRoom = `${ROOM}-old`;
  const blob = { dmUid: uid, version: 1, mode: 'combat', sceneId: 'forest', updatedAt: Date.now(), combat: { round: 7, activeId: 'old1' }, characters: [{ id: 'old1', name: 'Old Knight', faction: 'player', hp: 10, maxHp: 30, initiative: 12 }], environment: { preset: 'Ruins', ground: 'stone' }, battleMaps: { enabled: true, activeId: 'm', maps: [{ id: 'm', name: 'Old map', width: 20, height: 12, rows: Array(12).fill('.'.repeat(20)), positions: {} }] } };
  const r = await fetch(`http://127.0.0.1:9000/grim/rooms/${legacyRoom}.json?ns=project-grim-ef4f0-default-rtdb`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: JSON.stringify(blob) });
  assert.equal(r.status, 200);
  await gm.evaluate((room) => { localStorage.setItem('grim:options:v1', JSON.stringify({ online: true, room })); localStorage.removeItem(`grim:sync:${room}`); }, legacyRoom);
  await gm.close();
  gm = await open(gmCtx, `dm.html?emulator=${EMU}`);
  try { await poll(async () => { const s = await S(gm); return s.characters.some((c) => c.name === 'Old Knight') && s.combat.round === 7 && s.stage.view === 'tactical'; }, 30000, 'migrated'); }
  catch (e) { const s = await S(gm); throw new Error(`${e.message} gm=${JSON.stringify([s.characters.map((c) => c.name), s.combat, s.stage, s.meta.mode])} status=${await gm.evaluate(() => document.querySelector('.sync')?.title)} room=${await gm.evaluate(() => localStorage.getItem('grim:options:v1'))}`); }
  const stored = await (await fetch(`http://127.0.0.1:9000/grim/rooms/${legacyRoom}.json?ns=project-grim-ef4f0-default-rtdb`, { headers: { Authorization: 'Bearer owner' } })).json();
  assert.equal(stored.schema, 2);
  assert.equal(stored.dmUid, uid);
  assert.deepEqual(stored.legacyBackup.data.characters[0].name, 'Old Knight', 'original 1.5.8 room kept inside the upgraded room');
  assert.equal(stored.legacyBackup.data.combat.round, 7);
  const local = await gm.evaluate(async () => (await import('/src/sync/backups.js')).listBackups());
  assert.ok(local.some((b) => b.reason === '1.5.8 room before upgrade'), 'local safety copy saved');
  // A later edit (partial write) must not drop the 1.5.8 copy.
  await D(gm, 'round/set', { round: 8 });
  await new Promise((r) => setTimeout(r, 1500));
  const after = await (await fetch(`http://127.0.0.1:9000/grim/rooms/${legacyRoom}.json?ns=project-grim-ef4f0-default-rtdb`, { headers: { Authorization: 'Bearer owner' } })).json();
  assert.equal(after.s.combat.round, 8);
  assert.ok(after.legacyBackup, 'copy survives normal sync');
  // Restoring puts the exact 1.5.8 room back for the legacy build.
  await gm.evaluate(() => window.__grim.session.cloud.restoreLegacyRoom());
  const restored = await (await fetch(`http://127.0.0.1:9000/grim/rooms/${legacyRoom}.json?ns=project-grim-ef4f0-default-rtdb`, { headers: { Authorization: 'Bearer owner' } })).json();
  assert.equal(restored.schema, undefined);
  assert.equal(restored.characters[0].name, 'Old Knight');
  assert.equal(restored.combat.round, 7);
  assert.equal(restored.dmUid, uid);
});

await step('switching the GM deck to another room it owns takes the cloud copy (no overwrite) and backs up the local one', async () => {
  const uid = await gm.evaluate(() => window.__grim.session.cloud?.uid || null) || await gm.evaluate(async () => { const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'); const { getApps } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'); return getAuth(getApps()[0]).currentUser.uid; });
  const other = `${ROOM}-other`;
  const v2 = { dmUid: uid, mode: 'scene', sceneId: 'chapel', schema: 2, rev: 1, updatedAt: Date.now(), s: { characters: [{ id: 'z1', name: 'Zara of Room B', faction: 'player', hp: 9, maxHp: 9 }], meta: { mode: 'scene', sceneId: 'chapel' } } };
  const r = await fetch(`http://127.0.0.1:9000/grim/rooms/${other}.json?ns=project-grim-ef4f0-default-rtdb`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: JSON.stringify(v2) });
  assert.equal(r.status, 200);
  const before = (await S(gm)).characters.map((c) => c.name);
  await gm.evaluate((room) => localStorage.setItem('grim:options:v1', JSON.stringify({ online: true, room })), other);
  await gm.evaluate(() => window.__grim.session.connect());
  await poll(async () => (await S(gm)).characters.some((c) => c.name === 'Zara of Room B'), 20000, 'adopted room B');
  const stored = await (await fetch(`http://127.0.0.1:9000/grim/rooms/${other}.json?ns=project-grim-ef4f0-default-rtdb`, { headers: { Authorization: 'Bearer owner' } })).json();
  assert.equal(stored.s.characters[0].name, 'Zara of Room B', 'room B was not overwritten by the local campaign');
  const local = await gm.evaluate(async () => (await import('/src/sync/backups.js')).listBackups());
  assert.ok(local.some((b) => b.reason === 'This device before first sync with this room'), 'local campaign saved first');
  assert.ok(before.length > 0);
});

await step('no uncaught page errors', async () => { assert.deepEqual(errors, []); });

await browser.close();
cleanup();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} multi-client checks passed (${browserName}, ${RULESET === 'deployed' ? 'deployed 1.5.8 rules' : '2.0.1 rules'}).`);
writeFileSync(join(root, 'qa-reports', `e2e-sync-${browserName}-${RULESET}.json`), JSON.stringify({ browser: browserName, rules: RULESET, at: new Date().toISOString(), results }, null, 2));
process.exit(failed.length ? 1 : 0);
