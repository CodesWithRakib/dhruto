import { test, expect } from "@playwright/test";
import { loginAsMerchant } from "./helpers/merchant";

test.describe("Merchant Booking Flow Smoke Test", () => {
  test("renders the booking page with every required field", async ({ page }) => {
    await loginAsMerchant(page);
    await page.goto("/en/merchant/bookings/new");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Book a Parcel");

    await expect(page.getByLabel("Recipient full name")).toBeVisible();
    await expect(page.getByLabel("Recipient mobile number")).toBeVisible();
    await expect(page.getByLabel("District", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Thana / Upazila")).toBeVisible();
    await expect(page.getByLabel("Detailed delivery address")).toBeVisible();
    await expect(page.getByLabel("Weight (kg)")).toBeVisible();
    await expect(page.getByLabel("Cash on delivery (BDT)")).toBeVisible();

    // Pricing panel exists but offers no quote until destination/weight are set.
    await expect(page.getByText(/total delivery charge/i)).toHaveCount(0);
    await expect(page.getByText(/enter the destination and weight/i)).toBeVisible();

    const submit = page.getByRole("button", { name: /confirm booking/i });
    await expect(submit).toBeVisible();
    await expect(submit).toBeEnabled();
  });
});
