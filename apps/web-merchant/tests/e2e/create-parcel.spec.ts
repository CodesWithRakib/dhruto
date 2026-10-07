import { test, expect } from "@playwright/test";
import {
  authedApi,
  fillBookingForm,
  loginAsMerchant,
  makeBookingFixture,
  readAccessToken,
} from "./helpers/merchant";

test.describe("Journey 2 — Create a parcel", () => {
  test("books a parcel, shows the authoritative price and returns a tracking code", async ({
    page,
    request,
  }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);
    const api = await authedApi(request, token);

    await page.goto("/en/merchant/bookings/new");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/book a parcel/i);

    const booking = makeBookingFixture("BOOK");
    await fillBookingForm(page, booking);

    // The delivery charge is asked of the API and only displayed by the UI.
    const quoteResponse = await api.post("/pricing/calculate", {
      district: booking.district,
      thana: booking.thana,
      weight: Number(booking.weight),
      codAmount: Number(booking.codAmount),
    });
    expect(quoteResponse.ok()).toBeTruthy();
    const quote = (await quoteResponse.json()).data as {
      totalFee: number;
      baseFee: number;
    };

    await expect(page.getByText("Total delivery charge")).toBeVisible();
    // Scope to the total row: the base fee can be identical to the total, so a
    // bare text match is ambiguous (base fee + total both render the same ৳).
    const totalRow = page.locator("div:has(> span:text-is('Total delivery charge'))");
    await expect(totalRow).toContainText(
      `৳${quote.totalFee.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`,
    );

    await page.getByRole("button", { name: /confirm booking/i }).click();

    // Success panel with the persisted parcel.
    await expect(page.getByText(/parcel booked successfully/i)).toBeVisible({ timeout: 30_000 });
    const trackingCode = await page
      .locator("p.font-mono")
      .filter({ hasText: /^DHR-\d{8}-[0-9A-Z]{6}$/ })
      .first()
      .innerText();
    expect(trackingCode).toMatch(/^DHR-\d{8}-[0-9A-Z]{6}$/);

    // The persisted parcel must carry server-calculated pricing and canonical phone.
    const listResponse = await api.get(
      `/parcels?search=${encodeURIComponent(booking.recipientName)}`,
    );
    const list = (await listResponse.json()).data as Array<{
      id: string;
      trackingCode: string;
      deliveryFee: number;
      recipientPhone: string;
      status: string;
    }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.trackingCode).toBe(trackingCode);
    expect(list[0]?.deliveryFee).toBe(quote.totalFee);
    expect(list[0]?.status).toBe("CREATED");
    expect(list[0]?.recipientPhone).toBe(booking.recipientPhone);
  });

  test("rejects an invalid Bangladeshi phone number before submitting", async ({ page }) => {
    await loginAsMerchant(page);
    await page.goto("/en/merchant/bookings/new");

    const booking = makeBookingFixture("BAD");
    await fillBookingForm(page, { ...booking, recipientPhone: "12345" });
    await page.getByRole("button", { name: /confirm booking/i }).click();

    await expect(page.getByText(/invalid bangladesh mobile number/i)).toBeVisible();
    // No success panel, and no request was accepted.
    await expect(page.getByText(/parcel booked successfully/i)).toHaveCount(0);
  });
});

test.describe("Journey 7 — Duplicate submission", () => {
  test("a double click on confirm creates exactly one parcel", async ({ page, request }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);
    const api = await authedApi(request, token);

    await page.goto("/en/merchant/bookings/new");
    const booking = makeBookingFixture("DUP");
    await fillBookingForm(page, booking);

    const confirm = page.getByRole("button", { name: /confirm booking|creating booking/i });
    await confirm.click();
    // Second, impatient click while the first request is still in flight. The
    // button is disabled during submission (so a real user cannot double-submit),
    // so this forces the click to exercise the API's idempotency guard. The
    // timeout is capped because on success the form is replaced by the success
    // panel and the button unmounts — an unbounded click would retry until the
    // test times out instead of failing fast.
    await confirm.click({ force: true, timeout: 500 }).catch(() => undefined);

    await expect(page.getByText(/parcel booked successfully/i)).toBeVisible({ timeout: 30_000 });

    const listResponse = await api.get(
      `/parcels?search=${encodeURIComponent(booking.recipientName)}`,
    );
    const list = (await listResponse.json()).data as unknown[];
    expect(list).toHaveLength(1);
  });
});
