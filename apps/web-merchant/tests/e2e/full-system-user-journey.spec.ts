import { test, expect } from "@playwright/test";
import { loginAsMerchant, makeBookingFixture, fillBookingForm } from "./helpers/merchant";
import { loginAsHub } from "./helpers/hub";
import { loginAsRider, SEEDED_RIDER } from "./helpers/rider";

test.describe("Full System Automated User Journey — All Roles & Features", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  test("1. Public User Journey: Home, Tracking, Services, Pricing, and Infrastructure Status", async ({
    page,
  }) => {
    // 1. Visit Home
    await page.goto("/en");
    await expect(page).toHaveTitle(/Dhruto/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 2. Public Tracking
    await page.goto("/en/track");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const trackingInput = page.locator("input[name='trackingCode']");
    await expect(trackingInput).toBeVisible();

    // Look up seeded parcel DHR-2610-00101
    await trackingInput.fill("DHR-2610-00101");
    await page.getByRole("button", { name: /track/i }).first().click();
    await expect(page).toHaveURL(/\/en\/track\/DHR-2610-00101/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /DHR-2610-00101/i })).toBeVisible({ timeout: 15_000 });

    // 3. Services Page
    await page.goto("/en/services");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 4. Pricing & Rate Calculator
    await page.goto("/en/pricing");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 5. Live Infrastructure Probe (Status Page)
    await page.goto("/en/status");
    await expect(page.getByText(/infrastructure probe/i)).toBeVisible();
  });

  test("2. Merchant Journey: Dashboard, Booking, Parcels, Returns, Finance, Analytics, Developer", async ({
    page,
  }) => {
    // 1. Login
    await loginAsMerchant(page);
    await expect(page).toHaveURL(/\/en\/merchant\/dashboard/);

    // 2. Dashboard KPIs & Content
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 3. Create a New Booking
    await page.goto("/en/merchant/bookings/new");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const booking = makeBookingFixture("JOURNEY");
    await fillBookingForm(page, booking);

    // Wait for fee calculation and submit
    const submitBtn = page.getByRole("button", { name: /confirm booking/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await submitBtn.click();

    // Booking Success confirmation
    await expect(page.getByText(/parcel booked successfully/i)).toBeVisible({ timeout: 30_000 });

    // 4. Shipment Registry
    await page.goto("/en/merchant/parcels");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 5. Returns & RTO Management
    await page.goto("/en/merchant/returns");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 6. Finance & Wallet Desk
    await page.goto("/en/merchant/finance");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 7. Merchant Analytics
    await page.goto("/en/merchant/analytics");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 8. Cognitive Intelligence
    await page.goto("/en/merchant/intelligence");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 9. Developer Webhooks & API Keys
    await page.goto("/en/merchant/developer/webhooks");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/en/merchant/developer/api-keys");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("3. Hub Manager Journey: Station Dashboard, Inbound Scanner, Bags, Manifests, Cash Desk", async ({
    page,
  }) => {
    // 1. Login as Hub Manager
    await loginAsHub(page, "DHK");
    await expect(page).toHaveURL(/\/en\/hub\/dashboard/);

    // 2. Station Dashboard
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 3. Hub Barcode Scanner
    await page.goto("/en/hub/scanner");
    await expect(page.getByLabel(/tracking code or bag code/i)).toBeVisible();

    // 4. Line-haul Bag Management
    await page.goto("/en/hub/bags");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 5. Manifest Dispatch & Receiving
    await page.goto("/en/hub/manifests");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 6. Hub Cash Desk & Hand-in Reconciliation
    await page.goto("/en/hub/cash");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 7. Operations Exceptions Log
    await page.goto("/en/hub/exceptions");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("4. Rider Journey: Dashboard, Tasks, Duty State, Profile & Cash Hand-in", async ({
    page,
  }) => {
    // 1. Login as Rider
    await loginAsRider(page, SEEDED_RIDER);
    await expect(page).toHaveURL(/\/en\/rider\/dashboard/);

    // 2. Rider Dashboard
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 3. Rider Task Run-sheet
    await page.goto("/en/rider/tasks");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 4. Rider Profile & Cash Hand-in Desk
    await page.goto("/en/rider/profile");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 5. Rider Delivery History
    await page.goto("/en/rider/history");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("5. Customer Journey: Dashboard, Tracked Deliveries, Reschedule, History & POD", async ({
    page,
  }) => {
    // 1. Customer Login
    await page.goto("/en/login");
    await page.locator("#login-email").fill("customer@dhruto.com");
    await page.locator("#login-password").fill("dhruto123");
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/en\/customer\/dashboard/, { timeout: 30_000 });

    // 2. Customer Dashboard & Incoming Deliveries
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/sync live status|verified recipient/i).first()).toBeVisible();

    // 3. Customer History
    await page.goto("/en/customer/history");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 4. Customer Profile & Addresses
    await page.goto("/en/customer/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("6. Admin Platform Supervision Journey: Global Command Center & Network Desks", async ({
    page,
  }) => {
    // 1. Admin Login
    await page.goto("/en/login");
    await page.locator("#login-email").fill("admin@dhruto.com");
    await page.locator("#login-password").fill("dhruto123");
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/en\/admin\/dashboard/, { timeout: 30_000 });

    // 2. Platform Command Center
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 3. Global Parcel Registry (Cross-Tenant)
    await page.goto("/en/admin/parcels");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 4. Financial Console & Nationwide Ledger
    await page.goto("/en/admin/finance");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 5. Hub Station Infrastructure
    await page.goto("/en/admin/hub");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 6. Rider Fleet Supervision
    await page.goto("/en/admin/rider");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 7. Platform Analytics
    await page.goto("/en/admin/analytics");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 8. AI Risk & Fraud Radar
    await page.goto("/en/admin/intelligence");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 9. Webhooks & Developer Gateways
    await page.goto("/en/admin/integrations");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 10. Admin Identity & Privilege Settings
    await page.goto("/en/admin/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
