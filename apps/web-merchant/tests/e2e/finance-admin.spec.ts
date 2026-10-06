import { expect, test } from "./fixtures/cdp";
import { loginAsAdmin } from "./helpers/finance";
import { apiLogin, SEEDED_MERCHANT } from "./helpers/hub";

test.describe("Journey — Admin finance operations", () => {
  test("finance console shows overview, journal and reconciliation check", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/en/admin/finance");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/finance operations/i);
    await expect(page.getByText(/total cod collected/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tab", { name: /journal/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /payouts/i })).toBeVisible();

    await page.getByRole("tab", { name: /reconciliation check/i }).click();
    await expect(page.getByText(/financial invariants hold|mismatches/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("admin approves and completes a merchant payout", async ({ page, request }) => {
    const merchantToken = await apiLogin(request, SEEDED_MERCHANT);

    // Request a payout through the API, decide through the UI.
    const created = await request.post("http://localhost:4000/api/v1/finance/payouts/request", {
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      data: {
        amount: 300,
        payoutMethod: "BKASH",
        accountDetails: { accountNumber: "01700998811" },
      },
    });
    const payoutCode = ((await created.json()).data.payoutCode as string) as string;
    expect(payoutCode).toMatch(/PAY-\d{6}/);

    await loginAsAdmin(page);
    await page.goto("/en/admin/finance");
    await expect(page.getByText(payoutCode).first()).toBeVisible({ timeout: 20_000 });

    await page
      .locator("li", { hasText: payoutCode })
      .getByRole("button", { name: /^approve$/i })
      .click();
    await expect(page.getByText(/approve this payout/i)).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: /^confirm$/i }).click();
    await expect(page.getByText(/approved/i).first()).toBeVisible({ timeout: 20_000 });

    await page
      .locator("li", { hasText: payoutCode })
      .getByRole("button", { name: /^confirm$/i })
      .click();
    await page.getByLabel(/provider reference/i).fill("BKP-TEST-001");
    await page.getByRole("dialog").getByRole("button", { name: /^confirm$/i }).click();
    await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
