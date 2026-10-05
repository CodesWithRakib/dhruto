import { test, expect } from "@playwright/test";

test.describe("Merchant Booking Flow Smoke Test", () => {
  test("should render booking page and form elements properly", async ({ page }) => {
    await page.goto("/merchant/bookings/new");

    // Verify page title
    await expect(page.locator("h1")).toContainText("Book a Parcel");

    // Verify essential form inputs are visible
    await expect(page.locator('input[placeholder="e.g. Tanvir Ahmed"]')).toBeVisible();
    await expect(page.locator('input[placeholder="01712345678"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. Dhaka"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. Dhanmondi"]')).toBeVisible();
    await expect(
      page.locator('input[placeholder="House, road, sector, or landmark details"]'),
    ).toBeVisible();

    // Verify submit button is rendered
    const submitBtn = page.locator('button:has-text("Confirm Booking")');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });
});
