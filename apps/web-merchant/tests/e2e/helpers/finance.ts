import { expect, type Page } from "@playwright/test";

/** Seeded admin (see apps/api seed data). Password: `dhruto123`. */
export const SEEDED_ADMIN = { email: "admin@dhruto.com", password: "dhruto123" };

/** Signs an admin in through the real login form. */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/en/login");
  await page.locator("#login-email").fill(SEEDED_ADMIN.email);
  await page.locator("#login-password").fill(SEEDED_ADMIN.password);
  await page.getByRole("button", { name: /sign in to dashboard/i }).click();
  await expect(page).toHaveURL(/\/en\/admin\/dashboard/, { timeout: 30_000 });
}
