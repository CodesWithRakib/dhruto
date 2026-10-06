import { expect, type Page, type APIRequestContext } from "@playwright/test";

/** Seeded development merchant (see apps/api seed data). Password: `dhruto123`. */
export const SEEDED_MERCHANT = {
  email: "merchant@dhruto.com",
  password: "dhruto123",
};

export const API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL || "http://localhost:4000/api/v1";

/** Signs a merchant in through the real login form and waits for the dashboard. */
export async function loginAsMerchant(page: Page): Promise<void> {
  await page.goto("/en/login");
  // Targeted by id: the password field also has a "Show password" toggle button
  // whose accessible name would otherwise collide with a label query.
  await page.locator("#login-email").fill(SEEDED_MERCHANT.email);
  await page.locator("#login-password").fill(SEEDED_MERCHANT.password);
  await page.getByRole("button", { name: /sign in to dashboard/i }).click();
  await expect(page).toHaveURL(/\/en\/merchant\/dashboard/, { timeout: 30_000 });
}

/** Reads the access token the app persisted after login. */
export async function readAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem("dhruto_access_token"));
  if (!token) throw new Error("No access token found in localStorage after login");
  return token;
}

/** Unique, non-personal marker so parallel runs never collide. */
export function uniqueMarker(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

export interface BookingFixture {
  recipientName: string;
  recipientPhone: string;
  district: string;
  thana: string;
  deliveryAddress: string;
  weight: string;
  codAmount: string;
}

/** Valid Bangladesh booking values, unique per call. */
export function makeBookingFixture(prefix = "E2E"): BookingFixture {
  const marker = uniqueMarker(prefix);
  return {
    recipientName: `Test Recipient ${marker}`,
    recipientPhone: `017${String(Date.now()).slice(-8)}`,
    district: "Dhaka",
    thana: "Dhanmondi",
    deliveryAddress: `House 12, Road 5, Dhanmondi ${marker}`,
    weight: "1",
    codAmount: "1000",
  };
}

/** Fills the create-booking form (labels come from the English catalog). */
export async function fillBookingForm(page: Page, booking: BookingFixture): Promise<void> {
  await page.getByLabel("Recipient full name").fill(booking.recipientName);
  await page.getByLabel("Recipient mobile number").fill(booking.recipientPhone);
  await page.getByLabel("District", { exact: true }).fill(booking.district);
  await page.getByLabel("Thana / Upazila").fill(booking.thana);
  await page.getByLabel("Detailed delivery address").fill(booking.deliveryAddress);
  await page.getByLabel("Weight (kg)").fill(booking.weight);
  await page.getByLabel("Cash on delivery (BDT)").fill(booking.codAmount);
}

/**
 * Creates a parcel through the real API so list/detail/tracking journeys start
 * from known data without paying the UI booking cost.
 */
export async function createParcelViaApi(
  request: APIRequestContext,
  token: string,
  booking: BookingFixture,
): Promise<{ id: string; trackingCode: string; deliveryFee: number }> {
  const response = await request.post(`${API_BASE_URL}/parcels`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": crypto.randomUUID(),
      "Content-Type": "application/json",
    },
    data: {
      recipientName: booking.recipientName,
      recipientPhone: booking.recipientPhone,
      district: booking.district,
      thana: booking.thana,
      deliveryAddress: booking.deliveryAddress,
      weight: Number(booking.weight),
      codAmount: Number(booking.codAmount),
    },
  });

  if (!response.ok()) {
    throw new Error(`Parcel seed failed: ${response.status()} ${await response.text()}`);
  }

  return (await response.json()).data as {
    id: string;
    trackingCode: string;
    deliveryFee: number;
  };
}

/** Authorised JSON request against the API. */
export async function authedApi(
  request: APIRequestContext,
  token: string,
): Promise<{ get: (path: string) => Promise<import("@playwright/test").APIResponse>; post: (path: string, data: unknown, headers?: Record<string, string>) => Promise<import("@playwright/test").APIResponse> }> {
  const headers = { Authorization: `Bearer ${token}` };
  return {
    get: (path) => request.get(`${API_BASE_URL}${path}`, { headers }),
    post: (path, data, extraHeaders) =>
      request.post(`${API_BASE_URL}${path}`, {
        headers: { ...headers, ...extraHeaders },
        data,
      }),
  };
}
