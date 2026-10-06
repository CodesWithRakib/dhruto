import { expect, test } from "./fixtures/cdp";
import { loginAsHub, apiLogin, SEEDED_MERCHANT, SEEDED_HUB_DHK } from "./helpers/hub";
import { assignedParcel, startDeliveryViaApi, SEEDED_RIDER } from "./helpers/rider";
import { API_BASE_URL, createParcelViaApi, makeBookingFixture } from "./helpers/merchant";

test.describe("Journey — Hub cash desk", () => {
  test("hub verifies counted cash and settles to the merchant", async ({ page, request }) => {
    const merchantToken = await apiLogin(request, SEEDED_MERCHANT);
    const booking = makeBookingFixture("FINH");
    const created = await createParcelViaApi(request, merchantToken, {
      ...booking,
      codAmount: "2000",
    });

    // Deliver and hand in through the API to reach the cash desk state.
    const managerToken = await apiLogin(request, SEEDED_HUB_DHK);
    const riderToken = await apiLogin(request, SEEDED_RIDER);
    const me = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${riderToken}` },
    });
    const riderId = ((await me.json()).data.rider.id as string) as string;
    await request.post(`${API_BASE_URL}/parcels/${created.id}/assign-rider`, {
      headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
      data: { riderId },
    });
    const started = await request.post(
      `${API_BASE_URL}/riders/me/parcels/${created.id}/start-delivery`,
      { headers: { Authorization: `Bearer ${riderToken}` } },
    );
    const otp = ((await started.json()).data.otp as string) as string;
    await request.post(`${API_BASE_URL}/riders/me/deliveries/${created.id}/complete`, {
      headers: { Authorization: `Bearer ${riderToken}`, "Content-Type": "application/json" },
      data: { otp, codAmountCollected: 2000 },
    });
    await request.post(`${API_BASE_URL}/riders/me/cash/hand-in`, {
      headers: { Authorization: `Bearer ${riderToken}`, "Content-Type": "application/json" },
      data: {},
    });

    await loginAsHub(page, "DHK");
    await page.goto("/en/hub/cash");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/hub cash desk/i);
    await expect(page.getByText(created.trackingCode).first()).toBeVisible({ timeout: 20_000 });

    // Verify with the exact counted amount.
    await page
      .locator("li", { hasText: created.trackingCode })
      .getByRole("button", { name: /verify cash/i })
      .click();
    await expect(page.getByText(/verify cash and settle/i)).toBeVisible();
    await page.getByLabel(/counted amount/i).fill("2000");
    await page.getByRole("dialog").getByRole("button", { name: /^confirm$/i }).click();
    // Success toast confirms settlement; the row leaves the pending list.
    await expect(page.getByText(/settled/i).first()).toBeVisible({ timeout: 20_000 });
    await page.keyboard.press("Escape");
    await expect(
      page.locator("li", { hasText: created.trackingCode }),
    ).toBeHidden({ timeout: 20_000 });
  });

  test("a counted shortfall opens a discrepancy instead of settling silently", async ({
    page,
    request,
  }) => {
    const parcel = await assignedParcel(request, "rider@dhruto.com", 3000);
    const otp = await startDeliveryViaApi(request, parcel.riderToken, parcel.id);
    await request.post(`${API_BASE_URL}/riders/me/deliveries/${parcel.id}/complete`, {
      headers: { Authorization: `Bearer ${parcel.riderToken}`, "Content-Type": "application/json" },
      data: { otp, codAmountCollected: 3000 },
    });
    await request.post(`${API_BASE_URL}/riders/me/cash/hand-in`, {
      headers: { Authorization: `Bearer ${parcel.riderToken}`, "Content-Type": "application/json" },
      data: {},
    });

    await loginAsHub(page, "DHK");
    await page.goto("/en/hub/cash");
    await expect(page.getByText(parcel.trackingCode).first()).toBeVisible({ timeout: 20_000 });

    await page
      .locator("li", { hasText: parcel.trackingCode })
      .getByRole("button", { name: /verify cash/i })
      .click();
    await page.getByLabel(/counted amount/i).fill("2900");
    await page.getByRole("dialog").getByRole("button", { name: /^confirm$/i }).click();
    await expect(page.getByText(/variance|discrepancy/i).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: /discrepancies/i }).click();
    await expect(page.getByText(/short/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
