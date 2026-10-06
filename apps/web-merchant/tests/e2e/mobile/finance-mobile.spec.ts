import { expect, test } from "../fixtures/cdp";
import type { Page } from "@playwright/test";
import { loginAsMerchant } from "../helpers/merchant";
import { loginAsHub } from "../helpers/hub";

/** Fails when the page scrolls horizontally — the main mobile layout bug. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
}

test.describe("Mobile finance experience", () => {
  test("merchant wallet and payout flow fit a phone viewport", async ({ page }) => {
    await loginAsMerchant(page);
    await page.goto("/en/merchant/finance");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/finance/i);
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: /withdraw funds/i }).click();
    await expect(page.getByText(/request payout withdrawal/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const submitBox = await page
      .getByRole("button", { name: /review payout request|confirm/i })
      .first()
      .boundingBox();
    expect(submitBox?.height ?? 0).toBeGreaterThanOrEqual(36);
  });

  test("hub cash desk renders cards without overflow", async ({ page }) => {
    await loginAsHub(page, "DHK");
    await page.goto("/en/hub/cash");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/hub cash desk/i);
    await expectNoHorizontalOverflow(page);

    await page.getByRole("tab", { name: /batches/i }).click();
    await expectNoHorizontalOverflow(page);
  });
});
