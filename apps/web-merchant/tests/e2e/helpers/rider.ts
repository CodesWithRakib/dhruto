import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { API_BASE_URL, createParcelViaApi, makeBookingFixture } from "./merchant";
import { apiLogin, SEEDED_MERCHANT } from "./hub";

/** Seeded riders (see apps/api seed data). Password: `dhruto123`. */
export const SEEDED_RIDER = { email: "rider@dhruto.com", password: "dhruto123" };
export const SEEDED_RIDER2 = { email: "rider2@dhruto.com", password: "dhruto123" };
export const SEEDED_MANAGER = { email: "hubmanager@dhruto.com", password: "dhruto123" };

/** Signs a rider in through the real login form. */
export async function loginAsRider(
  page: Page,
  account: { email: string; password: string } = SEEDED_RIDER,
): Promise<void> {
  await page.goto("/en/login");
  await page.locator("#login-email").fill(account.email);
  await page.locator("#login-password").fill(account.password);
  await page.getByRole("button", { name: /sign in to dashboard/i }).click();
  await expect(page).toHaveURL(/\/en\/rider\/dashboard/, { timeout: 30_000 });
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Books a parcel as the merchant and assigns it to a rider via the hub manager. */
export async function assignedParcel(
  request: APIRequestContext,
  riderEmail: string,
  codAmount: number,
): Promise<{ id: string; trackingCode: string; riderToken: string }> {
  const merchantToken = await apiLogin(request, SEEDED_MERCHANT);
  const managerToken = await apiLogin(request, SEEDED_MANAGER);
  const riderToken = await apiLogin(request, { email: riderEmail, password: "dhruto123" });

  const created = await createParcelViaApi(request, merchantToken, {
    ...makeBookingFixture("RDR"),
    codAmount: String(codAmount),
  });

  const me = await request.get(`${API_BASE_URL}/auth/me`, { headers: authHeaders(riderToken) });
  const riderId = ((await me.json()).data.rider.id as string) as string;

  const assigned = await request.post(`${API_BASE_URL}/parcels/${created.id}/assign-rider`, {
    headers: { ...authHeaders(managerToken), "Content-Type": "application/json" },
    data: { riderId },
  });
  if (!assigned.ok()) throw new Error(`Assign failed: ${await assigned.text()}`);

  return { id: created.id, trackingCode: created.trackingCode, riderToken };
}

/** Starts delivery through the API and returns the test-only OTP. */
export async function startDeliveryViaApi(
  request: APIRequestContext,
  riderToken: string,
  parcelId: string,
): Promise<string> {
  const started = await request.post(`${API_BASE_URL}/riders/me/parcels/${parcelId}/start-delivery`, {
    headers: authHeaders(riderToken),
  });
  if (!started.ok()) throw new Error(`Start failed: ${await started.text()}`);
  return ((await started.json()).data.otp as string) as string;
}
