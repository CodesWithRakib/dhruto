import { expect, test } from "./fixtures/cdp";
import { loginAsRider } from "./helpers/rider";

test.describe("Bilingual rider", () => {
  test("rider dashboard renders Bangla without fallback gaps", async ({ page }) => {
    await loginAsRider(page);
    await page.goto("/bn/rider/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/রাইডার ড্যাশবোর্ড/i, {
      timeout: 20_000,
    });
    await expect(page.getByText(/সংগ্রহের COD/i).first()).toBeVisible();
  });
});
