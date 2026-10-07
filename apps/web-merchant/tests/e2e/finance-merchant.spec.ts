import { expect, test } from "./fixtures/cdp";
import { loginAsMerchant } from "./helpers/merchant";

test.describe("Journey — Merchant finance", () => {
  test("wallet shows balances, statement and settlements", async ({ page }) => {
    await loginAsMerchant(page);
    await page.goto("/en/merchant/finance");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/finance/i);
    await expect(page.getByText(/available balance/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tab", { name: /transaction statement/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /payout history/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^settlements$/i })).toBeVisible();

    await page.getByRole("tab", { name: /^settlements$/i }).click();
    await expect(page.getByText(/no settlements yet|gross cod/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("payout request reviews, confirms and can be cancelled", async ({ page }) => {
    await loginAsMerchant(page);
    await page.goto("/en/merchant/finance");

    await page.getByRole("button", { name: /withdraw funds/i }).click();
    await expect(page.getByText(/request payout withdrawal/i)).toBeVisible();

    await page.getByLabel(/account \/ wallet number/i).fill("01700112233");
    await page.getByLabel(/withdrawal amount/i).fill("500");
    await page.getByRole("button", { name: /review payout request/i }).click();

    // Review step shows amount, channel and masked destination before money moves.
    await expect(page.getByText(/review payout request/i).first()).toBeVisible();
    await expect(page.getByText("01700112233")).toBeVisible();
    await page.getByRole("button", { name: /^confirm$/i }).click();
    // Success shows the payout code; the modal then auto-closes.
    await expect(page.getByText(/PAY-\d{6}/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10_000 });

    // Cancel restores the reservation (newest REQUESTED payout is listed first).
    await page.getByRole("tab", { name: /payout history/i }).click();
    await page
      .getByRole("button", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page.getByText(/cancel this payout/i)).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^confirm$/i })
      .click();
    await expect(page.getByText(/cancelled/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
