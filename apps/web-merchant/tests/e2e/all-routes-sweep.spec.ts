import { test, expect } from "@playwright/test";
import { loginAsMerchant } from "./helpers/merchant";
import { loginAsHub } from "./helpers/hub";
import { loginAsRider, SEEDED_RIDER } from "./helpers/rider";

test.describe("Comprehensive All-Routes & Pages Integrity Sweep", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(240_000);

  test("1. Public Domain: Verify all 12 public & auth pages load cleanly", async ({ page }) => {
    const publicRoutes = [
      { path: "/en", title: /Dhruto/i },
      { path: "/en/about", heading: /about|who we are|story/i },
      { path: "/en/contact", heading: /contact|reach us|get in touch/i },
      { path: "/en/faq", heading: /faq|frequently asked/i },
      { path: "/en/pricing", heading: /pricing|rate|calculator/i },
      { path: "/en/privacy", heading: /privacy/i },
      { path: "/en/services", heading: /services|delivery solution/i },
      { path: "/en/status", heading: /status|infrastructure probe/i },
      { path: "/en/terms", heading: /terms/i },
      { path: "/en/track", heading: /track|tracking/i },
      { path: "/en/workflow", heading: /workflow|how it works|state/i },
      { path: "/en/login", heading: /sign in|log in/i },
      { path: "/en/register", heading: /sign up|register|get started/i },
      { path: "/en/forgot-password", heading: /forgot password|reset password/i },
    ];

    for (const route of publicRoutes) {
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `Route ${route.path} should return HTTP 200`).toBe(200);

      // Verify no crash banner
      await expect(page.locator("body")).not.toContainText("Application error: a client-side exception has occurred");
      await expect(page.locator("body")).not.toContainText("This page could not be found");

      if (route.title) {
        await expect(page).toHaveTitle(route.title);
      }
      if (route.heading) {
        await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test("2. Merchant Domain: Verify all 13 merchant pages load without errors", async ({ page }) => {
    await loginAsMerchant(page);

    const merchantRoutes = [
      "/en/merchant/dashboard",
      "/en/merchant/bookings/new",
      "/en/merchant/parcels",
      "/en/merchant/returns",
      "/en/merchant/calculator",
      "/en/merchant/finance",
      "/en/merchant/analytics",
      "/en/merchant/intelligence",
      "/en/merchant/notifications",
      "/en/merchant/settings",
      "/en/merchant/developer/api-keys",
      "/en/merchant/developer/webhooks",
      "/en/merchant/track",
    ];

    for (const path of merchantRoutes) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `Route ${path} should return HTTP 200`).toBe(200);

      // Verify no client exception or 404
      await expect(page.locator("body")).not.toContainText("Application error: a client-side exception has occurred");
      await expect(page.locator("body")).not.toContainText("This page could not be found");

      // Verify page rendered heading and content
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("3. Hub Manager Domain: Verify all 9 hub pages load without errors", async ({ page }) => {
    await loginAsHub(page, "DHK");

    const hubRoutes = [
      "/en/hub/dashboard",
      "/en/hub/parcels",
      "/en/hub/bags",
      "/en/hub/manifests",
      "/en/hub/scanner",
      "/en/hub/cash",
      "/en/hub/exceptions",
      "/en/hub/notifications",
      "/en/hub/settings",
    ];

    for (const path of hubRoutes) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `Route ${path} should return HTTP 200`).toBe(200);

      await expect(page.locator("body")).not.toContainText("Application error: a client-side exception has occurred");
      await expect(page.locator("body")).not.toContainText("This page could not be found");

      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("4. Rider Domain: Verify all 6 rider pages load without errors", async ({ page }) => {
    await loginAsRider(page, SEEDED_RIDER);

    const riderRoutes = [
      "/en/rider/dashboard",
      "/en/rider/tasks",
      "/en/rider/history",
      "/en/rider/profile",
      "/en/rider/notifications",
      "/en/rider/settings",
    ];

    for (const path of riderRoutes) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `Route ${path} should return HTTP 200`).toBe(200);

      await expect(page.locator("body")).not.toContainText("Application error: a client-side exception has occurred");
      await expect(page.locator("body")).not.toContainText("This page could not be found");

      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("5. Customer Domain: Verify all 4 customer pages load without errors", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator("#login-email").fill("customer@dhruto.com");
    await page.locator("#login-password").fill("dhruto123");
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/en\/customer\/dashboard/, { timeout: 30_000 });

    const customerRoutes = [
      "/en/customer/dashboard",
      "/en/customer/history",
      "/en/customer/settings",
      "/en/customer/track",
    ];

    for (const path of customerRoutes) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `Route ${path} should return HTTP 200`).toBe(200);

      await expect(page.locator("body")).not.toContainText("Application error: a client-side exception has occurred");
      await expect(page.locator("body")).not.toContainText("This page could not be found");

      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("6. Admin Platform Domain: Verify all 13 admin pages load without errors", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator("#login-email").fill("admin@dhruto.com");
    await page.locator("#login-password").fill("dhruto123");
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/en\/admin\/dashboard/, { timeout: 30_000 });

    const adminRoutes = [
      "/en/admin/dashboard",
      "/en/admin/parcels",
      "/en/admin/hub",
      "/en/admin/rider",
      "/en/admin/finance",
      "/en/admin/analytics",
      "/en/admin/analytics/parcels",
      "/en/admin/analytics/delivery",
      "/en/admin/analytics/finance",
      "/en/admin/intelligence",
      "/en/admin/integrations",
      "/en/admin/notifications",
      "/en/admin/settings",
      "/en/admin/track",
    ];

    for (const path of adminRoutes) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `Route ${path} should return HTTP 200`).toBe(200);

      await expect(page.locator("body")).not.toContainText("Application error: a client-side exception has occurred");
      await expect(page.locator("body")).not.toContainText("This page could not be found");

      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
