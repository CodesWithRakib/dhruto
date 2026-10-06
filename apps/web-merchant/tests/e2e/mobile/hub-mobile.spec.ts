import { expect, test } from "../fixtures/cdp";
import type { Page } from "@playwright/test";
import { loginAsHub } from "../helpers/hub";

/** Fails when the page scrolls horizontally — the main mobile layout bug. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
}

test.describe("Mobile hub experience", () => {
  test("dashboard fits a phone viewport with a usable bottom bar", async ({ page }) => {
    await loginAsHub(page, "DHK");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/hub dashboard/i);
    await expectNoHorizontalOverflow(page);

    // Bottom navigation reaches every operational surface.
    const nav = page.getByRole("navigation").last();
    await expect(nav.getByRole("link", { name: /scanner/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /bags/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /manifests/i })).toBeVisible();

    const scannerBox = await nav.getByRole("link", { name: /scanner/i }).boundingBox();
    expect(scannerBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("scanner input stays usable on a phone", async ({ page }) => {
    await loginAsHub(page, "DHK");
    await page.goto("/en/hub/scanner");

    const input = page.getByLabel(/tracking code or bag code/i);
    await expect(input).toBeVisible();
    await input.fill("DHR-20260101-ZZZZZZ");
    await expect(page.getByRole("button", { name: /process scan/i })).toBeEnabled();
    await expectNoHorizontalOverflow(page);
  });

  test("bags and manifests render cards without overflow", async ({ page }) => {
    await loginAsHub(page, "DHK");

    await page.goto("/en/hub/bags");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/transit bags/i);
    await expectNoHorizontalOverflow(page);

    await page.goto("/en/hub/manifests");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/dispatch manifests/i);
    await expectNoHorizontalOverflow(page);

    await page.goto("/en/hub/exceptions");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/exceptions/i);
    await expectNoHorizontalOverflow(page);
  });
});
