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
  const motion = page.getByLabel('Motion preference on this device');
  await motion.selectOption('reduce');
  await page.reload();
  await expect(motion).toHaveValue('reduce');
  await expect(page.locator('#worldStatus')).toContainText('2D FALLBACK');
});
