import { defineConfig, devices } from "@playwright/test";

/**
 * When `PLAYWRIGHT_TEST_BASE_URL` is set the suite runs against an already
 * running server (used for the production build check); otherwise Playwright
 * starts the dev server itself.
 */
const externalBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: externalBaseUrl || "http://localhost:5000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /mobile[\\/].*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Mobile merchant experience: bottom navigation, card lists, filter sheet.
      name: "mobile-chrome",
      testMatch: /mobile[\\/].*\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:5000",
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
