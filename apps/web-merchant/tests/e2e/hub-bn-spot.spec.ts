import { expect, test } from "./fixtures/cdp";
import { loginAsHub } from "./helpers/hub";

test.describe("Bilingual hub", () => {
  test("hub dashboard renders Bangla without fallback gaps", async ({ page }) => {
    await loginAsHub(page, "DHK");
    await page.goto("/bn/hub/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/হাব ড্যাশবোর্ড/i, {
      timeout: 20_000,
    });
    await expect(page.getByText(/আজকের ইনবাউন্ড/i).first()).toBeVisible();
  });
});
