import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 30_000,
  expect: {timeout: 7_000},
  reporter: [['list'], ['html', {open: 'never'}], ['json', {outputFile: 'reports/e2e-results.json'}]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {chromiumSandbox: true},
  },
  projects: [
    {name: 'desktop-chromium', use: {...devices['Desktop Chrome']}},
    {name: 'phone-chromium', use: {...devices['iPhone 13'], defaultBrowserType: 'chromium'}},
  ],
});
