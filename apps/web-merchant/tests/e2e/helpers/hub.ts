import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { API_BASE_URL, createParcelViaApi, makeBookingFixture, readAccessToken } from "./merchant";

/** Seeded hub operators (see apps/api seed data). Password: `dhruto123`. */
export const SEEDED_HUB_DHK = { email: "hubmanager@dhruto.com", password: "dhruto123" };
export const SEEDED_HUB_CTG = { email: "hubmanager_ctg@dhruto.com", password: "dhruto123" };
export const SEEDED_MERCHANT = { email: "merchant@dhruto.com", password: "dhruto123" };

/** Signs a hub operator in through the real login form. */
export async function loginAsHub(page: Page, which: "DHK" | "CTG" = "DHK"): Promise<void> {
  const account = which === "DHK" ? SEEDED_HUB_DHK : SEEDED_HUB_CTG;
  await page.goto("/en/login");
  await page.locator("#login-email").fill(account.email);
  await page.locator("#login-password").fill(account.password);
  await page.getByRole("button", { name: /sign in to dashboard/i }).click();
  await expect(page).toHaveURL(/\/en\/hub\/dashboard/, { timeout: 30_000 });
}

/** Logs in through the API and returns the access token. */
export async function apiLogin(
  request: APIRequestContext,
  account: { email: string; password: string },
): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { emailOrPhone: account.email, password: account.password },
  });
  if (!response.ok()) throw new Error(`Hub API login failed: ${await response.text()}`);
  const body = await response.json();
  return body.data.tokens.accessToken as string;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function hubIdFor(request: APIRequestContext, token: string, code: string): Promise<string> {
  const response = await request.get(`${API_BASE_URL}/hubs`, { headers: authHeaders(token) });
  if (!response.ok()) throw new Error(`List hubs failed: ${await response.text()}`);
  const hubs = ((await response.json()).data ?? []) as Array<{ id: string; code: string }>;
  // DHK operator sees only DHK; fall back to the destinations list for CTG.
  const direct = hubs.find((hub) => hub.code === code);
  if (direct) return direct.id;
  const dest = await request.get(`${API_BASE_URL}/hubs/destinations`, { headers: authHeaders(token) });
  const all = ((await dest.json()).data ?? []) as Array<{ id: string; code: string }>;
  const found = all.find((hub) => hub.code === code);
  if (!found) throw new Error(`Hub ${code} not visible`);
  return found.id;
}

export async function dhkHubId(request: APIRequestContext, token: string): Promise<string> {
  return hubIdFor(request, token, "HUB-DHK-01");
}

export async function ctgHubId(request: APIRequestContext, token: string): Promise<string> {
  return hubIdFor(request, token, "HUB-CTG-01");
}

/** Books a parcel as the merchant and receives it at DHK. */
export async function inboundParcel(
  request: APIRequestContext,
  merchantToken: string,
  hubToken: string,
  hubId: string,
): Promise<{ id: string; trackingCode: string }> {
  const created = await createParcelViaApi(request, merchantToken, makeBookingFixture("HUB"));
  const scan = await request.post(`${API_BASE_URL}/hubs/${hubId}/scans`, {
    headers: { ...authHeaders(hubToken), "Content-Type": "application/json" },
    data: { barcode: created.trackingCode, scanType: "RECEIVE_INBOUND", idempotencyKey: crypto.randomUUID() },
  });
  if (!scan.ok()) throw new Error(`Inbound scan failed: ${scan.status()} ${await scan.text()}`);
  return { id: created.id, trackingCode: created.trackingCode };
}

export async function createBag(
  request: APIRequestContext,
  hubToken: string,
  hubId: string,
  destinationHubId: string,
): Promise<{ id: string; bagCode: string }> {
  const response = await request.post(`${API_BASE_URL}/hubs/${hubId}/bags`, {
    headers: { ...authHeaders(hubToken), "Content-Type": "application/json" },
    data: { destinationHubId },
  });
  if (!response.ok()) throw new Error(`Create bag failed: ${await response.text()}`);
  return (await response.json()).data;
}

export async function addParcelToBag(
  request: APIRequestContext,
  hubToken: string,
  bagId: string,
  trackingCode: string,
): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/bags/${bagId}/parcels`, {
    headers: { ...authHeaders(hubToken), "Content-Type": "application/json" },
    data: { parcelTrackingCode: trackingCode },
  });
  if (!response.ok()) throw new Error(`Add parcel failed: ${await response.text()}`);
}

export async function sealBag(request: APIRequestContext, hubToken: string, bagId: string): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/bags/${bagId}/seal`, {
    headers: { ...authHeaders(hubToken), "Content-Type": "application/json" },
    data: { sealTag: `SEAL-${Date.now().toString().slice(-6)}` },
  });
  if (!response.ok()) throw new Error(`Seal bag failed: ${await response.text()}`);
}

export async function createManifest(
  request: APIRequestContext,
  hubToken: string,
  hubId: string,
  destinationHubId: string,
  bagIds: string[],
): Promise<{ id: string; manifestCode: string }> {
  const response = await request.post(`${API_BASE_URL}/hubs/${hubId}/manifests`, {
    headers: { ...authHeaders(hubToken), "Content-Type": "application/json" },
    data: { destinationHubId, bagIds, vehicleNumber: `DHK-CTG-${Date.now().toString().slice(-6)}` },
  });
  if (!response.ok()) throw new Error(`Create manifest failed: ${await response.text()}`);
  return (await response.json()).data;
}

export async function dispatchManifest(
  request: APIRequestContext,
  hubToken: string,
  manifestId: string,
): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/manifests/${manifestId}/dispatch`, {
    headers: authHeaders(hubToken),
  });
  if (!response.ok()) throw new Error(`Dispatch failed: ${await response.text()}`);
}

export async function receiveManifest(
  request: APIRequestContext,
  hubToken: string,
  manifestId: string,
  scannedBagCodes: string[],
  allowPartial = false,
): Promise<{ status: string }> {
  const response = await request.post(`${API_BASE_URL}/manifests/${manifestId}/receive`, {
    headers: { ...authHeaders(hubToken), "Content-Type": "application/json" },
    data: { scannedBagCodes, allowPartial },
  });
  if (!response.ok()) {
    throw new Error(`Receive failed: ${response.status()} ${await response.text()}`);
  }
  return (await response.json()).data;
}

export { readAccessToken };
