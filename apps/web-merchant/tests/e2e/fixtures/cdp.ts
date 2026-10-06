/* eslint-disable react-hooks/rules-of-hooks */
// `use` below is Playwright's fixture callback, not a React hook.
import {
  chromium,
  expect,
  test as base,
  type Browser,
  type BrowserContext,
} from "@playwright/test";

const CDP_URL = process.env.PLAYWRIGHT_CDP_URL || "http://localhost:9222";

/**
 * Runs tests inside the operator's Brave instance (started with
 * `--remote-debugging-port=9222`) when it is available, otherwise falls back
 * to a Playwright-managed Chromium so CI stays green without Brave.
 *
 * Every test receives its own isolated browser context, so parallel workers
 * never share localStorage or cookies even though they share one browser.
 */
export const test = base.extend({
  page: async ({ viewport, userAgent, isMobile, hasTouch }, use) => {
    let cdp: Browser | null = null;
    let context: BrowserContext | null = null;
    let managed: Browser | null = null;

    // Respect the project's device profile (e.g. Pixel 5 for mobile specs).
    const contextOptions = {
      ...(viewport ? { viewport } : {}),
      ...(userAgent ? { userAgent } : {}),
      isMobile: isMobile ?? false,
      hasTouch: hasTouch ?? false,
    };

    try {
      cdp = await chromium.connectOverCDP(CDP_URL, { timeout: 15_000 });
      context = await cdp.newContext(contextOptions);
      const page = await context.newPage();
      await use(page);
      await context.close().catch(() => undefined);
      // Never close the CDP browser itself — it belongs to the operator.
      await cdp.close().catch(() => undefined);
    } catch {
      await context?.close().catch(() => undefined);
      managed = await chromium.launch();
      context = await managed.newContext(contextOptions);
      const page = await context.newPage();
      await use(page);
      await context.close();
      await managed.close();
    }
  },
});

export { expect };
