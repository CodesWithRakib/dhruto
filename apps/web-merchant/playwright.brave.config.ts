import { defineConfig, devices } from "@playwright/test";

/**
 * Temporary Phase 7 runner: same journeys as the default config, but the
 * browser is the installed Brave binary (per project testing instruction).
 * Deleted after the Phase 7 run; do not extend.
 */
const BRAVE =
  "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:5000",
    trace: "retain-on-failure",
    launchOptions: { executablePath: BRAVE },
  },
  projects: [
    {
      name: "brave",
      testIgnore: /mobile[\\/].*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
