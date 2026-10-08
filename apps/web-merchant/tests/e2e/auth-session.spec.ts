import { test, expect } from "@playwright/test";
import { loginAsMerchant } from "./helpers/merchant";

test.describe("Journey - Session lifecycle and role isolation", () => {
  test("logout revokes the session and protected consoles bounce to login", async ({ page }) => {
    await loginAsMerchant(page);

    await page.getByRole("button", { name: /user account menu/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    await page.getByRole("button", { name: /yes, sign out/i }).click();
    await expect(page).toHaveURL(/\/en\/login/, { timeout: 30_000 });

    // Credentials and cached session are gone from the browser.
    expect(await page.evaluate(() => localStorage.getItem("dhruto_access_token"))).toBeNull();

    // A direct deep link to a console returns to login, not the data.
    await page.goto("/en/merchant/parcels");
    await expect(page).toHaveURL(/\/en\/login/, { timeout: 30_000 });
  });

  test("a merchant cannot open the admin console", async ({ page }) => {
    await loginAsMerchant(page);

    await page.goto("/en/admin/parcels");
    await expect(page).toHaveURL(/\/en\/merchant\/dashboard/, { timeout: 30_000 });
  });
});
