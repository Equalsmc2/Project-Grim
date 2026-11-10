import { test, expect } from '../qa/fixtures.mjs';
test('local message appears and clears the composer', async ({ page }) => {
  await page.goto('/?local=1');
  await page.getByLabel('Select your operative').selectOption('Max');
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('QA local-only message');
  await page.getByRole('button', { name: 'Send Message', exact: true }).click();
  await expect(page.locator('#chatMessages')).toContainText('QA local-only message');
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('');
});
test('desktop view selection changes selected tab', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'Desktop tab contract only; mobile navigation needs its own flow.');
  await page.goto('/?local=1');
  await page.locator('#combatTab').click();
  await expect(page.locator('#combatTab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#combatView')).toBeVisible();
  await page.locator('#terminalTab').click();
  await expect(page.locator('#terminalTab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#mainDashboard')).toBeVisible();
});
