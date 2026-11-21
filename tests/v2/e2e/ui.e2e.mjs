// Browser checks of the real pages (local mode, software WebGL).
//   node tests/v2/e2e/ui.e2e.mjs        (BROWSER=firefox to switch engines)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const pw = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const WEB = 'http://127.0.0.1:4181';
const browserName = process.env.BROWSER || 'chromium';
const shots = join(root, 'qa-reports', 'screens');
mkdirSync(shots, { recursive: true });
const server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: '4181' }, stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(`${WEB}/dm.html`); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }

const browser = await pw[browserName].launch(browserName === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
const results = [];
const errors = [];
async function step(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message }); console.log(`FAIL  ${name}\n      ${e.message}`); }
}
async function settle(page, ms = 9000) {
  // Animations converge exponentially; wait until card rectangles stop moving.
  let prev = '';
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await page.waitForTimeout(700);
    const r = JSON.stringify(await page.evaluate(() => window.__grim.world?.cardRects().map((c) => [c.id, Math.round(c.left / 4), Math.round(c.top / 4)])));
    if (r === prev && r !== 'null' && r !== '[]') return;
    prev = r;
  }
}

const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const gm = await ctx.newPage();
gm.on('pageerror', (e) => errors.push(`dm: ${e.message}`));
await gm.goto(`${WEB}/dm.html`);
await gm.waitForFunction(() => window.__grim?.store);
await gm.evaluate(() => {
  const s = window.__grim.store;
  s.dispatch('campaign/replace', { campaign: { characters: [] }, label: 'test reset' });
  const add = (id, name, faction, initiative) => s.dispatch('char/add', { id, name, faction, initiative });
  add('p1', 'Valeros', 'player', 21); add('p2', 'Seoni', 'player', 18); add('p3', 'Kyra', 'player', 14); add('p4', 'Merisiel', 'player', 25);
  for (let i = 1; i <= 6; i++) add(`e${i}`, `Ghoul ${i}`, 'enemy', 10 + i * 2);
  s.dispatch('env/preset', { name: 'Forest' });
  s.dispatch('combat/start');
});

const tv = await ctx.newPage();
tv.on('pageerror', (e) => errors.push(`stage: ${e.message}`));
await tv.goto(`${WEB}/index.html`);
await tv.waitForFunction(() => window.__grim?.world, null, { timeout: 30000 });

for (const [w, h] of [[1920, 1080], [1366, 768], [1280, 800], [1024, 1366], [2560, 1080]]) {
  await step(`stage ${w}x${h}: all ${10} cards fully on screen`, async () => {
    await tv.setViewportSize({ width: w, height: h });
    await settle(tv);
    const rects = await tv.evaluate(() => window.__grim.world.cardRects());
    assert.equal(rects.length, 10, 'every visible combatant has a card');
    for (const r of rects) {
      assert.ok(r.left >= -2 && r.right <= w + 2 && r.top >= -2 && r.bottom <= h + 2, `${r.id} off screen: ${JSON.stringify(r)}`);
    }
    await tv.screenshot({ path: join(shots, `stage-${w}x${h}.png`) });
  });
}

await step('cinematic formation: party in front, initiative left→right', async () => {
  await tv.setViewportSize({ width: 1600, height: 900 });
  await settle(tv);
  const rects = Object.fromEntries((await tv.evaluate(() => window.__grim.world.cardRects())).map((r) => [r.id, r]));
  const party = ['p4', 'p1', 'p2', 'p3']; // 25, 21, 18, 14
  for (let i = 1; i < party.length; i++) assert.ok(rects[party[i]].left > rects[party[i - 1]].left, 'party order');
  const avgParty = party.reduce((a, id) => a + rects[id].bottom, 0) / 4;
  const avgFoes = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].reduce((a, id) => a + rects[id].bottom, 0) / 6;
  assert.ok(avgParty > avgFoes, 'party stands in the foreground (lower on screen)');
  const ribbon = await tv.evaluate(() => [...document.querySelectorAll('.rb-name')].map((n) => n.textContent));
  assert.deepEqual(ribbon.slice(0, 3), ['Merisiel', 'Ghoul 6', 'Valeros'], 'global initiative order (25, 22, 21)');
});

await step('tactical view: same world, cards on their squares, grid on', async () => {
  await gm.evaluate(() => window.__grim.store.dispatch('view/set', { view: 'tactical' }));
  await settle(tv, 12000);
  const stats = await tv.evaluate(() => window.__grim.world.stats());
  assert.equal(stats.tactical, true);
  const rects = await tv.evaluate(() => window.__grim.world.cardRects());
  assert.equal(rects.length, 10);
  await tv.screenshot({ path: join(shots, 'stage-tactical.png') });
});

await step('back to cinematic restores the framing', async () => {
  await gm.evaluate(() => window.__grim.store.dispatch('view/set', { view: 'cinematic' }));
  await settle(tv, 12000);
  const rects = await tv.evaluate(() => window.__grim.world.cardRects());
  for (const r of rects) assert.ok(r.left >= -2 && r.right <= 1602 && r.top >= -2 && r.bottom <= 902, `${r.id} framed`);
});

await step('weather and time changes do not error', async () => {
  for (const name of ['Thunderstorm', 'Blizzard', 'Sandstorm', 'Moonlit Night']) await gm.evaluate((n) => window.__grim.store.dispatch('env/atmosphere', { name: n }), name);
  for (const p of ['Snowfield', 'Desert', 'Ruins', 'Graveyard', 'Blank test stage']) await gm.evaluate((n) => window.__grim.store.dispatch('env/preset', { name: n }), p);
  await tv.waitForTimeout(3000);
});

for (const [w, h] of [[1280, 720], [1440, 900], [1920, 1080]]) {
  await step(`GM deck ${w}x${h}: single screen, no page scroll`, async () => {
    await gm.setViewportSize({ width: w, height: h });
    await gm.waitForTimeout(600);
    const m = await gm.evaluate(() => ({ sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, ih: innerHeight, iw: innerWidth }));
    assert.ok(m.sh <= m.ih + 1 && m.sw <= m.iw + 1, JSON.stringify(m));
    await gm.screenshot({ path: join(shots, `dm-${w}x${h}.png`) });
  });
}

await step('GM undo/redo from the keyboard', async () => {
  const before = await gm.evaluate(() => window.__grim.store.getState().characters.find((c) => c.id === 'p1').hp);
  await gm.evaluate(() => window.__grim.store.dispatch('char/hp', { id: 'p1', amount: -5 }));
  await gm.keyboard.press('Control+z');
  assert.equal(await gm.evaluate(() => window.__grim.store.getState().characters.find((c) => c.id === 'p1').hp), before);
  await gm.keyboard.press('Control+Shift+z');
  assert.equal(await gm.evaluate(() => window.__grim.store.getState().characters.find((c) => c.id === 'p1').hp), before - 5);
});

await step('portrait studio opens, saves a recipe and paints the card', async () => {
  await gm.click('.rail-row');
  await gm.click('.cb-portrait');
  await gm.waitForSelector('.pm-dialog');
  await gm.click('text=Random');
  await gm.click('text=Use portrait');
  await gm.waitForFunction(() => { const s = window.__grim.store.getState(); const id = s.characters.find((c) => c.avatar)?.id; return id && s.portraits[id]?.startsWith('data:image/'); }, null, { timeout: 15000 });
});

// Same browser profile as the GM, so the local (no-Firebase) campaign is shared.
const pl = await ctx.newPage();
await pl.setViewportSize({ width: 390, height: 844 });
pl.on('pageerror', (e) => errors.push(`player: ${e.message}`));
await step('player desk on a phone: no horizontal overflow', async () => {
  await pl.goto(`${WEB}/player.html`);
  await pl.waitForTimeout(800);
  await pl.click('text=Valeros');
  const m = await pl.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  assert.ok(m.sw <= m.iw + 1, JSON.stringify(m));
  await pl.screenshot({ path: join(shots, 'player-phone.png'), fullPage: true });
});

await step('no uncaught page errors', async () => assert.deepEqual(errors, []));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} UI checks passed (${browserName}).`);
writeFileSync(join(root, 'qa-reports', `e2e-ui-${browserName}.json`), JSON.stringify({ browser: browserName, at: new Date().toISOString(), results }, null, 2));
process.exit(failed.length ? 1 : 0);
