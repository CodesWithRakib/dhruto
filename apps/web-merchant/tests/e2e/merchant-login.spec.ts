import { test, expect } from "@playwright/test";
import { loginAsMerchant } from "./helpers/merchant";

test.describe("Journey 1 — Merchant login", () => {
  test("an unauthenticated visitor is redirected from the dashboard to login", async ({
    page,
  }) => {
    await page.goto("/en/merchant/dashboard");
    await expect(page).toHaveURL(/\/en\/login/, { timeout: 30_000 });
  });

  test("signing in lands the merchant on their dashboard", async ({ page }) => {
    await loginAsMerchant(page);

    // The dashboard greeting is rendered from the authenticated session.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/welcome back/i);
    await expect(page.getByRole("link", { name: /book a parcel|book shipment/i }).first()).toBeVisible();
  });

  test("login rejects invalid credentials with a translated error", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator("#login-email").fill("not-a-merchant@example.com");
    await page.locator("#login-password").fill("wrong-password");
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/en\/login/);
  });
});
