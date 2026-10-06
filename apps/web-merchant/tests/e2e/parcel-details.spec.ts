import { test, expect } from "@playwright/test";
import {
  API_BASE_URL,
  createParcelViaApi,
  loginAsMerchant,
  makeBookingFixture,
  readAccessToken,
} from "./helpers/merchant";

test.describe("Journey 4 — Parcel details and label", () => {
  test("shows the shipment, its history timeline and a printable 4x6 label", async ({
    page,
    request,
  }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);
    const booking = makeBookingFixture("DETAIL");
    const created = await createParcelViaApi(request, token, booking);

    await page.goto(`/en/merchant/parcels/${created.id}`);

    // Header
    await expect(page.getByText(created.trackingCode)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/^Created$/).first()).toBeVisible();

    // Sections required by the spec.
    await expect(page.getByText(/recipient/i).first()).toBeVisible();
    await expect(page.getByText(booking.recipientName)).toBeVisible();
    await expect(page.getByText(/delivery charge/i).first()).toBeVisible();
    await expect(page.getByText("৳1,000")).toBeVisible();

    // Immutable history is rendered and records the merchant as the actor.
    await expect(page.getByText(/status history/i).first()).toBeVisible();
    await expect(page.getByText(/recorded by MERCHANT/i)).toBeVisible();

    // The label renders the same parcel data as the details view.
    await page.getByRole("link", { name: /print label/i }).click();
    await expect(page).toHaveURL(new RegExp(`/en/merchant/parcels/${created.id}/label`));

    const label = page.locator(".dhruto-label");
    await expect(label).toBeVisible({ timeout: 20_000 });
    await expect(label).toContainText(created.trackingCode);
    await expect(label).toContainText("DHRUTO");
    await expect(label).toContainText(booking.recipientName);
    await expect(label).toContainText("Dhanmondi");
    await expect(label).toContainText("1,000");

    // Barcode must be a real Code128 SVG that renders the tracking code (the
    // lucide truck icon in the header is an SVG too, so match on the code text).
    await expect(label.locator("svg").filter({ hasText: created.trackingCode })).toBeVisible();
  });

  test("a parcel owned by another merchant is reported as not found", async ({
    page,
    request,
  }) => {
    // The seeded second merchant owns parcels the first merchant must not see.
    const otherLogin = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { emailOrPhone: "merchant2@dhruto.com", password: "dhruto123" },
    });
    const otherBody = (await otherLogin.json()) as {
      data: { accessToken?: string; tokens?: { accessToken?: string } };
    };
    const otherToken = otherBody.data.tokens?.accessToken ?? otherBody.data.accessToken;
    if (!otherToken) throw new Error("merchant2 login returned no access token");

    const foreign = await createParcelViaApi(request, otherToken, makeBookingFixture("FOREIGN"));

    await loginAsMerchant(page);
    await page.goto(`/en/merchant/parcels/${foreign.id}`);
    await expect(page.getByText(/shipment not found/i)).toBeVisible({ timeout: 20_000 });
  });
});
