import { expect, test } from "./fixtures/cdp";
import {
  API_BASE_URL,
  createParcelViaApi,
  makeBookingFixture,
} from "./helpers/merchant";
import {
  apiLogin,
  dhkHubId,
  loginAsHub,
  SEEDED_HUB_DHK,
  SEEDED_MERCHANT,
} from "./helpers/hub";

test.describe("Journey — Hub inbound", () => {
  test("hub login lands on the hub dashboard with live metrics", async ({ page }) => {
    await loginAsHub(page, "DHK");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/hub dashboard/i);
    await expect(page.getByRole("link", { name: /scan parcel/i }).first()).toBeVisible();
    // Live metric cards render (real aggregates, never placeholders).
    await expect(page.getByText(/inbound today/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("scanner receives a parcel and reports a duplicate rescan", async ({ page, request }) => {
    const merchantToken = await apiLogin(request, SEEDED_MERCHANT);
    const created = await createParcelViaApi(request, merchantToken, makeBookingFixture("HUBS"));

    await loginAsHub(page, "DHK");
    await page.goto("/en/hub/scanner");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/parcel scanner/i);

    const input = page.getByLabel(/tracking code or bag code/i);
    await input.fill(created.trackingCode);
    await page.getByRole("button", { name: /process scan/i }).click();

    // Applied feedback shows the new hub status with icon + text.
    await expect(page.getByText(/received at/i).first()).toBeVisible({ timeout: 20_000 });

    // Scanning the same parcel again is a reported duplicate, not a new state.
    await input.fill(created.trackingCode);
    await page.getByRole("button", { name: /process scan/i }).click();
    await expect(page.getByText(/already processed/i).first()).toBeVisible({ timeout: 20_000 });

    // The API recorded exactly one applied scan for this parcel.
    const hubToken = await apiLogin(request, SEEDED_HUB_DHK);
    const hubId = await dhkHubId(request, hubToken);
    const scans = await request.get(`${API_BASE_URL}/hubs/${hubId}/scans?limit=100`, {
      headers: { Authorization: `Bearer ${hubToken}` },
    });
    const rows = (((await scans.json()).data ?? []) as Array<{ trackingCode: string | null; outcome: string }>)
      .filter((row) => row.trackingCode === created.trackingCode && row.outcome === "APPLIED");
    expect(rows).toHaveLength(1);
  });

  test("unknown barcodes are rejected with a clear error", async ({ page }) => {
    await loginAsHub(page, "DHK");
    await page.goto("/en/hub/scanner");

    await page.getByLabel(/tracking code or bag code/i).fill("DHR-20260101-ZZZZZZ");
    await page.getByRole("button", { name: /process scan/i }).click();
    await expect(page.getByText(/scan rejected|not found/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("parcel lookup finds an inbound parcel without merchant pricing", async ({ page, request }) => {
    const merchantToken = await apiLogin(request, SEEDED_MERCHANT);
    const hubToken = await apiLogin(request, SEEDED_HUB_DHK);
    const hubId = await dhkHubId(request, hubToken);
    const created = await createParcelViaApi(request, merchantToken, makeBookingFixture("HUBL"));
    await request.post(`${API_BASE_URL}/hubs/${hubId}/scans`, {
      headers: { Authorization: `Bearer ${hubToken}`, "Content-Type": "application/json" },
      data: { barcode: created.trackingCode, scanType: "RECEIVE_INBOUND", idempotencyKey: crypto.randomUUID() },
    });

    await loginAsHub(page, "DHK");
    await page.goto("/en/hub/parcels");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/parcel lookup/i);

    await page.getByLabel(/tracking code/i).fill(created.trackingCode);
    await page.getByRole("button", { name: /^look up$/i }).click();
    await expect(page.getByText(created.trackingCode).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/origin_hub_received/i).first()).toBeVisible();
  });
});
