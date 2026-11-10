import { defineConfig, devices } from '@playwright/test';
import { project } from './qa/project.mjs';

export default defineConfig({
  testDir: './tests',
  testMatch: project.testMatch,
  timeout: 30_000,
  globalTimeout: 10 * 60_000,
  expect: { timeout: 7_000, toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.001 } },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: !!process.env.CI,
  workers: process.env.CI ? 1 : 2,
  outputDir: 'artifacts/test-results',
  snapshotPathTemplate: '{testDir}/baselines/' + project.name + '/{platform}/{projectName}/{testFilePath}/{arg}{ext}',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/html', open: 'never' }],
    ['json', { outputFile: 'artifacts/results.json' }],
    ['junit', { outputFile: 'artifacts/junit.xml' }],
    ['./qa/reporter.mjs']
  ],
  use: {
    baseURL: project.baseURL,
    locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light', reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } }
  ],
  webServer: project.command ? {
    command: project.command, url: project.baseURL, timeout: 90_000,
    reuseExistingServer: false
  } : undefined
});
