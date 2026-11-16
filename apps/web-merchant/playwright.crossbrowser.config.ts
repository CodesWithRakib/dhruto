import { defineConfig, devices } from "@playwright/test";

/**
 * Phase 8 cross-browser / responsive QA for the communication suites.
 * Runs only against an already running isolated stack (PLAYWRIGHT_TEST_BASE_URL);
 * the default `playwright.config.ts` is unchanged.
 *
 *   npx playwright test --config playwright.crossbrowser.config.ts --project=firefox tests/e2e/chat-attachments.spec.ts
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        // Fake media devices so voice recording can be exercised headlessly.
        launchOptions: {
          firefoxUserPrefs: {
            "media.navigator.streams.fake": true,
            "media.navigator.permission.disabled": true,
          },
        },
      },
    },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "tablet", use: { ...devices["iPad (gen 7)"], browserName: "chromium" } },
    { name: "phone", use: { ...devices["Pixel 5"] } },
  ],
});
