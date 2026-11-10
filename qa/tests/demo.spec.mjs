import { test, expect } from '../qa/fixtures.mjs';

test('menu opens, navigates, and closes', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('link', { name: 'Contact' }).click();
  await expect(page).toHaveURL(/#contact$/);
  await menu.click();
  await expect(page.getByRole('navigation')).toBeHidden();
});

test('form rejects empty input and shows successful submission', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toBeEmpty();
  await page.getByLabel('Email').fill('tester@example.test');
  await page.getByLabel('Message', { exact: true }).fill('Automated QA example');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toHaveText('Message received.');
});

test('menu is usable with desktop keyboard', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'Hardware keyboard tab order is outside this mobile touch profile.');
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Contact' })).toBeFocused();
});
