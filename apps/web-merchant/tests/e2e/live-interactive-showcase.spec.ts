import { test, expect } from "@playwright/test";
import { loginAsMerchant } from "./helpers/merchant";
import { loginAsHub } from "./helpers/hub";
import { loginAsRider, SEEDED_RIDER } from "./helpers/rider";

test.describe("Full Live Interactive User Journey — All Roles & Actions", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(300_000);

  // Helper to give visible human pacing when running headed
  const pace = async (ms = 500) => {
    await new Promise((r) => setTimeout(r, ms));
  };

  test("1. Merchant: Full End-to-End Workflow with Dynamic Booking & Operations", async ({ page }) => {
    // 1. Login
    await loginAsMerchant(page);
    await expect(page).toHaveURL(/\/en\/merchant\/dashboard/);
    await pace();

    // 2. Dashboard interactions: toggle shipment activity chart
    const bookedTab = page.getByRole("button", { name: "Booked" });
    if (await bookedTab.isVisible()) {
      await bookedTab.click();
      await pace(400);
      await page.getByRole("button", { name: "Delivered" }).click();
      await pace(400);
    }

    // 3. New Booking with Dynamic 64-District & Thana Cascaded Dropdown
    await page.goto("/en/merchant/bookings/new");
    await expect(page.getByRole("heading", { name: /book a parcel/i })).toBeVisible();

    const uniqueId = `SHOWCASE_${Date.now().toString(36).toUpperCase()}`;
    await page.getByLabel("Recipient full name").fill(`Karim Ullah ${uniqueId}`);
    await page.getByLabel("Recipient mobile number").fill("01711223344");
    await pace(300);

    // Dynamic District Selection: choose Chattogram
    const districtInput = page.getByLabel("District", { exact: true });
    await districtInput.fill("Chattogram");
    await pace(300);

    // Dynamic Thana Selection: choose Kotwali
    const thanaInput = page.getByLabel("Thana / Upazila");
    await thanaInput.fill("Kotwali");
    await pace(300);

    await page.getByLabel("Detailed delivery address").fill("Holding 82, CDA Avenue, GEC Circle");
    await page.getByLabel("Weight (kg)").fill("2.5");
    await page.getByLabel("Cash on delivery (BDT)").fill("4500");
    await pace(500);

    // Verify calculated delivery charge section is updated
    await expect(page.getByRole("heading", { name: /delivery charge/i })).toBeVisible();
    await expect(page.getByText(/outside dhaka/i).first()).toBeVisible();

    // Submit booking
    const submitBtn = page.getByRole("button", { name: /confirm booking/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await submitBtn.click();

    // Verify success confirmation with tracking code
    await expect(page.getByText(/parcel booked successfully/i)).toBeVisible({ timeout: 30_000 });
    await pace(1000);

    // 4. Shipment Registry: filter by quick tabs & search
    await page.goto("/en/merchant/parcels");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    const filterCreated = page.getByRole("button", { name: /^Created/i });
    if (await filterCreated.isVisible()) {
      await filterCreated.click();
      await pace(500);
    }
    const filterAll = page.getByRole("button", { name: /^All/i });
    if (await filterAll.isVisible()) {
      await filterAll.click();
      await pace(500);
    }

    // 5. Returns & RTO Management
    await page.goto("/en/merchant/returns");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 6. Interactive Freight Calculator Cockpit
    await page.goto("/en/merchant/calculator");
    await expect(page.getByRole("heading", { name: /simulator|calculator/i }).first()).toBeVisible();
    await pace();

    // 7. Finance & Wallet Desk: open withdrawal modal
    await page.goto("/en/merchant/finance");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    const payoutBtn = page.getByRole("button", { name: /request payout/i });
    if (await payoutBtn.isVisible()) {
      await payoutBtn.click();
      await pace(500);
      // Close modal
      const cancelBtn = page.getByRole("button", { name: /cancel|close/i });
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await pace(300);
      }
    }

    // 8. Analytics & Reports
    await page.goto("/en/merchant/analytics");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 9. Cognitive Intelligence
    await page.goto("/en/merchant/intelligence");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 10. Settings & Theme switcher
    await page.goto("/en/merchant/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const emeraldTheme = page.getByRole("button", { name: /emerald green/i });
    if (await emeraldTheme.isVisible()) {
      await emeraldTheme.click();
      await pace(400);
      await page.getByRole("button", { name: /royal purple/i }).click();
      await pace(400);
    }
  });

  test("2. Hub Manager: Inbound Scanner, Bagging, Manifests & Cash Reconciliation", async ({ page }) => {
    // 1. Hub Login
    await loginAsHub(page, "DHK");
    await expect(page).toHaveURL(/\/en\/hub\/dashboard/);
    await pace();

    // 2. Station Dashboard
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 3. Scanner Station
    await page.goto("/en/hub/scanner");
    const scanInput = page.getByLabel(/tracking code or bag code/i);
    await expect(scanInput).toBeVisible();
    await scanInput.fill("DHR-2610-00101");
    await pace(500);

    // 4. Line-haul Bags
    await page.goto("/en/hub/bags");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 5. Manifests Dispatch
    await page.goto("/en/hub/manifests");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 6. Cash Desk Hand-in
    await page.goto("/en/hub/cash");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 7. Operations Exceptions
    await page.goto("/en/hub/exceptions");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();
  });

  test("3. Rider Fleet: Duty Toggle, Task Run-sheet, Delivery History & Cash Desk", async ({ page }) => {
    // 1. Rider Login
    await loginAsRider(page, SEEDED_RIDER);
    await expect(page).toHaveURL(/\/en\/rider\/dashboard/);
    await pace();

    // 2. Rider Dashboard: Duty switch toggle
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const dutySwitch = page.getByRole("switch");
    if (await dutySwitch.isVisible()) {
      await dutySwitch.click();
      await pace(400);
      await dutySwitch.click();
      await pace(400);
    }

    // 3. Rider Task Run-sheet & Filter tabs
    await page.goto("/en/rider/tasks");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    const deliveryTab = page.getByRole("tab", { name: /delivery/i });
    if (await deliveryTab.isVisible()) {
      await deliveryTab.click();
      await pace(400);
      await page.getByRole("tab", { name: /all/i }).click();
      await pace(400);
    }

    // 4. Rider Profile & Cash in Hand
    await page.goto("/en/rider/profile");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 5. Delivery History
    await page.goto("/en/rider/history");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();
  });

  test("4. Customer: Incoming Deliveries, Address Book with Dynamic Picker & Tracking", async ({ page }) => {
    // 1. Customer Login
    await page.goto("/en/login");
    await page.locator("#login-email").fill("customer@dhruto.com");
    await page.locator("#login-password").fill("dhruto123");
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/en\/customer\/dashboard/, { timeout: 30_000 });
    await pace();

    // 2. Customer Dashboard & Tracked Deliveries
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 3. Customer Delivery History
    await page.goto("/en/customer/history");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 4. Customer Settings: Add New Address with Dynamic District & Thana
    await page.goto("/en/customer/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    const addAddressBtn = page.getByRole("button", { name: /add new delivery address/i });
    if (await addAddressBtn.isVisible()) {
      await addAddressBtn.click();
      await pace(500);

      // Fill address modal fields
      const labelInput = page.getByPlaceholder(/my home, my office/i);
      if (await labelInput.isVisible()) {
        await labelInput.fill("Mirpur Residence");
        await page.getByPlaceholder(/recipient name for this address/i).fill("Adnan Chowdhury");
        await page.getByPlaceholder(/e\.g\. house 14/i).fill("House 42, Road 11, Block D");

        // Dynamic District & Thana in modal
        await page.getByPlaceholder(/select or type district/i).fill("Dhaka");
        await pace(300);
        await page.getByPlaceholder(/select or type thana/i).fill("Mirpur");
        await pace(300);

        await page.getByPlaceholder(/01700000005/i).fill("01799001122");
        await pace(400);

        // Click Save Address
        await page.getByRole("button", { name: /save address/i }).click();
        await pace(800);
      }
    }

    // 5. Customer Tracking
    await page.goto("/en/customer/track");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();
  });

  test("5. Admin Command Center: Supervision, Network Ledger, Fleet & Deep Analytics", async ({ page }) => {
    // 1. Admin Login
    await page.goto("/en/login");
    await page.locator("#login-email").fill("admin@dhruto.com");
    await page.locator("#login-password").fill("dhruto123");
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/en\/admin\/dashboard/, { timeout: 30_000 });
    await pace();

    // 2. Global Platform Command Center
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 3. Cross-Tenant Parcel Registry
    await page.goto("/en/admin/parcels");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 4. Financial Console & Nationwide Ledger
    await page.goto("/en/admin/finance");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 5. Hub Station Infrastructure
    await page.goto("/en/admin/hub");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 6. Rider Fleet Supervision
    await page.goto("/en/admin/rider");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 7. Platform Analytics: click deep sections
    await page.goto("/en/admin/analytics");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    await page.goto("/en/admin/analytics/delivery");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await pace();

    await page.goto("/en/admin/analytics/finance");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await pace();

    // 8. AI Risk Radar
    await page.goto("/en/admin/intelligence");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 9. Integrations & Developer Gateways
    await page.goto("/en/admin/integrations");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace();

    // 10. Platform Settings & Audit
    await page.goto("/en/admin/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);
  });
});
