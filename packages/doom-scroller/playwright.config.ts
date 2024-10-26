import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: 'tests/integration',
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    actionTimeout: 5000,
  },
  webServer: {
    command: 'pnpm run serve-test',
    url: 'http://127.0.0.1:3000/tests/integration/test.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    }
  ],
};

export default config;
