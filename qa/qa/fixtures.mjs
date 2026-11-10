import { test as base, expect } from '@playwright/test';
import { project } from './project.mjs';

export const test = base.extend({
  diagnostics: [async ({ page, context }, use) => {
    const issues = [];
    const ignored = (kind, message) => (kind === 'network' ? project.allowedNetworkErrors : project.allowedConsoleErrors)?.some(pattern => new RegExp(pattern).test(message));
    const record = (kind, message) => { if (!ignored(kind, message)) issues.push({ kind, message }); };
    const origin = new URL(project.baseURL).origin;
    if (project.blockExternal) await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === origin || !/^https?:$/.test(url.protocol) ? route.continue() : route.fulfill({ status: 204, body: '' });
    });
    page.on('pageerror', error => record('pageerror', error.message));
    page.on('console', message => { if (message.type() === 'error') record('console', message.text()); });
    page.on('response', response => { if (response.status() >= 400) record('network', `${response.status()} ${response.url()}`); });
    page.on('requestfailed', request => record('network', `${request.failure()?.errorText} ${request.url()}`));
    await use(issues);
  }, { auto: true }]
});
test.afterEach(async ({ diagnostics }, testInfo) => {
  await testInfo.attach('browser-diagnostics', { body: JSON.stringify(diagnostics, null, 2), contentType: 'application/json' });
  expect(diagnostics, 'Unexpected browser errors; inspect browser-diagnostics attachment').toEqual([]);
});
export { expect };
