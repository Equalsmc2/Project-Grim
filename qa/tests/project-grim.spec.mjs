import { test, expect } from '../qa/fixtures.mjs';

test('DM navigation and music search', async ({ page }) => {
  await page.goto('/dm.html');
  await page.locator('#dmNav [data-section="music"]').click();
  await expect(page.locator('#pageTitle')).toHaveText('Music library');
  const search = page.getByRole('searchbox', { name: 'Search music' });
  await search.fill('Firelink');
  await expect(page.locator('#musicTracks')).toContainText('Firelink');
  await expect(page.locator('#musicTracks .music-track')).toHaveCount(1);
  await search.fill('QA-no-such-track-93217');
  await expect(page.locator('#musicTracks .music-track')).toHaveCount(0);
});

test('round control updates and persists locally', async ({ page }) => {
  await page.goto('/dm.html');
  await page.locator('#dmNav [data-section="combat"]').click();
  await expect(page.locator('#dmRound')).toHaveText('1');
  await page.getByRole('button', { name: 'Next round', exact: true }).click();
  await expect(page.locator('#dmRound')).toHaveText('2');
  await page.reload();
  await page.locator('#dmNav [data-section="combat"]').click();
  await expect(page.locator('#dmRound')).toHaveText('2');
});

test('stage motion choice persists without cloud access', async ({ page }) => {
  await page.goto('/?webgl=0');
  await page.locator('#stageCameraSettings summary').click();
  const motion = page.getByLabel('Motion preference on this device');
  await motion.selectOption('reduce');
  await page.reload();
  await page.locator('#stageCameraSettings summary').click();
  await expect(motion).toHaveValue('reduce');
  await expect(page.locator('#worldStatus')).toContainText('2D FALLBACK');
});

test('cinematic camera toggle survives environment preset changes', async ({ page }) => {
  await page.goto('/?webgl=0');
  const cinematic = page.locator('#autoPanToggle');
  await expect(cinematic).toHaveAttribute('aria-pressed','false');
  await expect(cinematic).toContainText('Cinematic off');
  await cinematic.click();
  await expect(cinematic).toHaveAttribute('aria-pressed','true');
  await page.locator('#stageCameraSettings summary').click();
  await page.getByLabel('Motion preference on this device').selectOption('reduce');
  await expect(cinematic).toContainText('Cinematic paused');
  await page.getByLabel('Motion preference on this device').selectOption('full');
  await expect(cinematic).toContainText('Cinematic on');
  await page.goto('/dm.html');
  await page.locator('#dmNav [data-section="environment"]').click();
  await page.locator('#environmentEditor [data-env="preset"]').selectOption('Forest');
  await page.goto('/?webgl=0');
  await expect(page.locator('#autoPanToggle')).toHaveAttribute('aria-pressed','true');
  await page.locator('#autoPanToggle').click();
  await page.goto('/dm.html');
  await page.locator('#dmNav [data-section="environment"]').click();
  await page.locator('#environmentEditor [data-env="preset"]').selectOption('Snowfield');
  await page.goto('/?webgl=0');
  await expect(page.locator('#autoPanToggle')).toHaveAttribute('aria-pressed','false');
});

test('camera director settings stay in sync across DM and stage', async ({ page }) => {
  await page.goto('/?webgl=0');
  const panel=page.locator('#stageCameraSettings');
  await panel.locator('summary').click();
  await expect(panel).toHaveAttribute('open','');
  await page.getByLabel('Cinematic shot style').selectOption('sweep');
  const strength=page.getByLabel('Cinematic movement strength');
  await strength.focus();
  await strength.press('End');
  await expect(strength).toHaveValue('2.4');
  await expect(page.locator('#stageCinematicStrengthValue')).toHaveText('2.4×');
  await page.getByLabel('Cinematic movement speed').focus();
  await page.getByLabel('Cinematic movement speed').press('End');
  await expect(page.locator('#stageCinematicSpeedValue')).toHaveText('2.5×');
  await test.info().attach('stage-camera-director-settings',{body:await page.screenshot(),contentType:'image/png'});
  await page.keyboard.press('Escape');
  await expect(panel).not.toHaveAttribute('open','');
  await page.goto('/dm.html');
  await page.locator('#dmNav [data-section="environment"]').click();
  await expect(page.locator('#environmentEditor [data-env="cinematicStyle"]')).toHaveValue('sweep');
  await expect(page.locator('#environmentEditor [data-env="cinematicStrength"]')).toHaveValue('2.4');
  await test.info().attach('dm-camera-director-settings',{body:await page.screenshot(),contentType:'image/png'});
  await page.locator('#environmentEditor [data-env="preset"]').selectOption('Forest');
  await page.locator('#environmentEditor [data-env="cinematicStyle"]').selectOption('orbit');
  await page.goto('/?webgl=0');
  await panel.locator('summary').click();
  await expect(page.getByLabel('Cinematic shot style')).toHaveValue('orbit');
  await expect(strength).toHaveValue('2.4');
  await expect(page.getByLabel('Cinematic movement speed')).toHaveValue('2.5');
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(page.locator('[data-camera-view="ground"]')).toHaveAttribute('aria-pressed','true');
});

test('cinematic camera visibly moves in a running WebGL stage', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('#stageApp')?.classList.contains('webgl-ready') || document.querySelector('#worldStatus')?.textContent?.includes('2D FALLBACK'));
  test.skip(!(await page.locator('#stageApp').evaluate(el=>el.classList.contains('webgl-ready'))),'WebGL unavailable in this browser environment');
  await page.locator('#stageCameraSettings summary').click();
  await page.getByLabel('Motion preference on this device').selectOption('full');
  await page.locator('#stageCameraSettings summary').click();
  await page.locator('#autoPanToggle').click();
  await expect(page.locator('#autoPanToggle')).toHaveAttribute('aria-pressed','true');
  await page.waitForFunction(() => window.grim3DStats?.camera?.cinematicEnabled === true);
  const before=await page.evaluate(()=>window.grim3DStats.camera);
  await page.waitForTimeout(4000);
  const after=await page.evaluate(()=>window.grim3DStats.camera);
  const changedYaw=Math.abs(after.yawDegrees-before.yawDegrees);
  const changedGlide=Math.abs(after.glide-before.glide);
  expect(changedYaw>1||changedGlide>.15,`Cinematic motion was imperceptible: yaw ${changedYaw.toFixed(2)}°, glide ${changedGlide.toFixed(2)}`).toBeTruthy();
});
