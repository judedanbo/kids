import { defineConfig, devices } from '@playwright/test';

// Ensure Chromium can find system libraries extracted for Playwright
const extraLibPath = '/tmp/libs/extracted/usr/lib/x86_64-linux-gnu';
if (process.env.LD_LIBRARY_PATH) {
  if (!process.env.LD_LIBRARY_PATH.includes(extraLibPath)) {
    process.env.LD_LIBRARY_PATH = `${extraLibPath}:${process.env.LD_LIBRARY_PATH}`;
  }
} else {
  process.env.LD_LIBRARY_PATH = extraLibPath;
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm --filter platform preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'mobile',
      use: {
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'tablet',
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'desktop',
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
