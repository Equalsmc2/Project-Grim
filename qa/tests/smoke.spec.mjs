import { test, expect } from '../qa/fixtures.mjs';
import { project } from '../qa/project.mjs';

for (const route of project.routes) {
  test(`${route.name}: loads and fits viewport`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.ok(), 'Route must respond successfully').toBeTruthy();
    await expect(page.locator(route.ready)).toBeVisible();
    if (route.readyText) await expect(page.locator(route.ready)).toHaveText(route.readyText);
    await expect(page).not.toHaveTitle('');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), {
      message: 'Page must not have horizontal overflow'
    }).toBe(true);
  });
  test(`${route.name}: @visual`, async ({ page }, testInfo) => {
    await page.goto(route.path);
    await expect(page.locator(route.ready)).toBeVisible();
    if (route.readyText) await expect(page.locator(route.ready)).toHaveText(route.readyText);
    await page.evaluate(() => document.fonts.ready);
    const options = { fullPage: true, animations: 'disabled', mask: (project.masks || []).map(s => page.locator(s)) };
    if (project.visual === 'compare') {
      await expect(page).toHaveScreenshot(`${route.name}.png`, options);
    } else {
      await testInfo.attach(`${route.name}-capture-NOT-compared`, {
        body: await page.screenshot(options), contentType: 'image/png'
      });
      testInfo.annotations.push({ type: 'visual-mode', description: 'capture only; no regression comparison' });
    }
  });
}
