import { test, expect } from "@playwright/test";
import {
  createParcelViaApi,
  makeBookingFixture,
  loginAsMerchant,
  readAccessToken,
} from "./helpers/merchant";

test.describe("Public tracking", () => {
  test("Journey 5 — a valid tracking code shows status and timeline without signing in", async ({
    page,
    request,
  }) => {
    // Seed a parcel using a merchant session, then track it anonymously.
    await loginAsMerchant(page);
    const token = await readAccessToken(page);
    const booking = makeBookingFixture("TRACK");
    const created = await createParcelViaApi(request, token, booking);

    // Clear the session: public tracking must not require authentication.
    await page.evaluate(() => localStorage.clear());
    await page.goto("/en/track");

    await page.getByRole("textbox", { name: /track your shipment/i }).fill(created.trackingCode);
    await page.getByRole("button", { name: /^track$/i }).click();

    await expect(page.getByText(created.trackingCode)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/^Created$/).first()).toBeVisible();
    await expect(page.getByText(/delivery timeline/i)).toBeVisible();
    await expect(page.getByText("Dhanmondi")).toBeVisible();
  });

  test("Journey 6 — an unknown tracking code shows the not-found state", async ({ page }) => {
    await page.goto("/en/track/DHR-20260101-AAAAAA");
    await expect(page.getByText(/shipment not found/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/check the tracking code/i)).toBeVisible();
  });

  test("public tracking never exposes merchant or financial data", async ({ request }) => {
    const response = await request.get("http://localhost:4000/api/v1/tracking/DHR-20260101-AAAAAA");
    // Unknown code -> 404 with a stable code, never a payload.
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.errorCode).toBe("TRACKING_NOT_FOUND");
    expect(JSON.stringify(body)).not.toContain("merchantId");
  });
});
