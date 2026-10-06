import { expect, test } from "./fixtures/cdp";
import { loginAsMerchant } from "./helpers/merchant";

test.describe("Bilingual finance", () => {
  test("merchant wallet renders Bangla without fallback gaps", async ({ page }) => {
    await loginAsMerchant(page);
    await page.goto("/bn/merchant/finance");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/ফাইন্যান্স/i, {
      timeout: 20_000,
    });
    await expect(page.getByText(/উপলব্ধ ব্যালেন্স/i).first()).toBeVisible();
  });
});
