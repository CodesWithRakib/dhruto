import { test, expect } from "@playwright/test";

test.describe("Public site", () => {
  test("home page renders the hero and tracking entry point", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("h1")).toBeVisible();
    // The hero embeds a quick tracking search, so a text input is present.
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test("tracking page renders", async ({ page }) => {
    await page.goto("/en/track");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("unknown route shows the styled 404", async ({ page }) => {
    await page.goto("/en/this-route-does-not-exist");
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });
});

test.describe("Legacy route redirects", () => {
  const cases: [string, string][] = [
    ["/en/dashboard", "/en/merchant/dashboard"],
    ["/en/parcels", "/en/merchant/parcels"],
    ["/en/bookings/new", "/en/merchant/bookings/new"],
    ["/en/finance", "/en/merchant/finance"],
    ["/en/hub", "/en/hub/dashboard"],
    ["/en/rider", "/en/rider/dashboard"],
  ];

  for (const [from, to] of cases) {
    test(`${from} returns a permanent redirect to ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(response.headers()["location"]).toContain(to);
    });
  }
});
