import { test, expect } from "@playwright/test";

test.describe("Live Browser Visual Journey — Watch in Real-Time", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(900_000); // 15 minutes timeout

  // Helper function to pause with visible pacing so user can watch easily
  const visualPause = async (ms = 1200) => {
    await new Promise((r) => setTimeout(r, ms));
  };

  test("Comprehensive Visual Walkthrough across All Roles & Pages", async ({ page }) => {
    // Maximize viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // ========================================================
    // 1. PUBLIC PORTAL & COCKPIT
    // ========================================================
    console.log("==> STEP 1: Visiting Public Home Page...");
    await page.goto("/en");
    await expect(page).toHaveTitle(/Dhruto/i);
    await visualPause(1500);

    // Scroll down to showcase home content
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: "smooth" }));
    await visualPause(1000);
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: "smooth" }));
    await visualPause(1000);

    // Pricing & Interactive Cockpit
    console.log("==> Visiting Pricing & Freight Cockpit...");
    await page.goto("/en/pricing");
    await expect(page.getByRole("heading", { name: /pricing|rate|calculator/i }).first()).toBeVisible();
    await page.evaluate(() => {
      document.getElementById("calculator-cockpit")?.scrollIntoView({ behavior: "smooth" });
    });
    await visualPause(1500);

    // Interact with dynamic 64-District selector in Cockpit
    const toggleDistrictBtn = page.getByRole("button", { name: /toggle district dropdown/i });
    if (await toggleDistrictBtn.isVisible()) {
      await toggleDistrictBtn.click();
      await visualPause(1200);
      await toggleDistrictBtn.click();
      await visualPause(500);
    }

    // Public Tracking
    console.log("==> Visiting Public Tracking Portal...");
    await page.goto("/en/track");
    const trackInput = page.locator("input[name='trackingCode']");
    await expect(trackInput).toBeVisible();
    await trackInput.fill("DHR-2610-00101");
    await visualPause(800);
    await page.getByRole("button", { name: /track/i }).first().click();
    await expect(page).toHaveURL(/\/en\/track\/DHR-2610-00101/, { timeout: 15_000 });
    await visualPause(1500);

    // Infrastructure Probe
    console.log("==> Visiting Infrastructure Probe (Status Page)...");
    await page.goto("/en/status");
    await expect(page.getByText(/infrastructure probe/i)).toBeVisible();
    await visualPause(1200);

    // ========================================================
    // 2. MERCHANT ROLE (Rahim Enterprise)
    // ========================================================
    console.log("==> STEP 2: Logging in as Merchant (merchant@dhruto.com)...");
    await page.goto("/en/login");
    await visualPause(800);
    await page.locator("#login-email").fill("merchant@dhruto.com");
    await visualPause(500);
    await page.locator("#login-password").fill("dhruto123");
    await visualPause(500);
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();

    await expect(page).toHaveURL(/\/en\/merchant\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1500);

    // Toggle chart tabs
    const bookedTab = page.getByRole("button", { name: "Booked" });
    if (await bookedTab.isVisible()) {
      await bookedTab.click();
      await visualPause(1000);
      await page.getByRole("button", { name: "Delivered" }).click();
      await visualPause(1000);
    }

    // Booking a new parcel with dynamic 64-District & Thana Cascaded Selector
    console.log("==> Merchant creating a new shipment booking with dynamic District & Thana...");
    await page.goto("/en/merchant/bookings/new");
    await expect(page.getByRole("heading", { name: /book a parcel/i })).toBeVisible();
    await visualPause(1000);

    const bookingId = `LIVE_${Date.now().toString(36).toUpperCase()}`;
    await page.getByLabel("Recipient full name").fill(`Mahmudul Hasan (${bookingId})`);
    await visualPause(600);
    await page.getByLabel("Recipient mobile number").fill("01799884422");
    await visualPause(600);

    // Dynamic District Selection: choose Chattogram
    const districtInput = page.getByLabel("District", { exact: true });
    await districtInput.fill("Chattogram");
    await visualPause(800);

    // Dynamic Thana Selection: choose Kotwali
    const thanaInput = page.getByLabel("Thana / Upazila");
    await thanaInput.fill("Kotwali");
    await visualPause(800);

    await page.getByLabel("Detailed delivery address").fill("Holding 82, CDA Avenue, GEC Circle");
    await visualPause(600);
    await page.getByLabel("Weight (kg)").fill("2.5");
    await visualPause(600);
    await page.getByLabel("Cash on delivery (BDT)").fill("4500");
    await visualPause(1000);

    // Verify calculated fee is visible
    await expect(page.getByRole("heading", { name: /delivery charge/i })).toBeVisible();
    await expect(page.getByText(/outside dhaka/i).first()).toBeVisible();
    await visualPause(1000);

    // Submit booking
    const submitBtn = page.getByRole("button", { name: /confirm booking/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await submitBtn.click();

    // Booking confirmation
    await expect(page.getByText(/parcel booked successfully/i)).toBeVisible({ timeout: 30_000 });
    console.log("==> Parcel booked successfully! Visual confirmation visible.");
    await visualPause(2000);

    // Shipments List
    console.log("==> Inspecting Merchant Shipments List...");
    await page.goto("/en/merchant/parcels");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Quick filter tabs
    const filterCreated = page.getByRole("button", { name: /^Created/i });
    if (await filterCreated.isVisible()) {
      await filterCreated.click();
      await visualPause(800);
    }
    const filterAll = page.getByRole("button", { name: /^All/i });
    if (await filterAll.isVisible()) {
      await filterAll.click();
      await visualPause(800);
    }

    // Returns & RTO
    console.log("==> Inspecting Merchant Returns & RTO Desk...");
    await page.goto("/en/merchant/returns");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Freight Simulator Cockpit
    console.log("==> Inspecting Merchant Freight Simulator Cockpit...");
    await page.goto("/en/merchant/calculator");
    await expect(page.getByRole("heading", { name: /simulator|calculator/i }).first()).toBeVisible();
    await visualPause(1200);

    // Finance & Wallet Desk
    console.log("==> Inspecting Merchant Finance & Payout Request Modal...");
    await page.goto("/en/merchant/finance");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1000);

    const payoutBtn = page.getByRole("button", { name: /request payout/i });
    if (await payoutBtn.isVisible()) {
      await payoutBtn.click();
      await visualPause(1200);
      const cancelBtn = page.getByRole("button", { name: /cancel|close/i });
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await visualPause(600);
      }
    }

    // Analytics & Cognitive Reports
    console.log("==> Inspecting Merchant Analytics & AI Intelligence...");
    await page.goto("/en/merchant/analytics");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1000);

    await page.goto("/en/merchant/intelligence");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1000);

    // Theme Switcher in Settings
    console.log("==> Testing live Theme Switcher in Merchant Settings...");
    await page.goto("/en/merchant/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(800);

    const emeraldTheme = page.getByRole("button", { name: /emerald green/i });
    if (await emeraldTheme.isVisible()) {
      await emeraldTheme.click();
      await visualPause(1200);
      await page.getByRole("button", { name: /royal purple/i }).click();
      await visualPause(1000);
    }

    // Sign out merchant
    console.log("==> Signing out Merchant...");
    const signOutBtn = page.getByRole("button", { name: /sign out/i }).first();
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      await visualPause(1000);
    }

    // ========================================================
    // 3. HUB MANAGER ROLE (Dhaka Central Hub - DHK)
    // ========================================================
    console.log("==> STEP 3: Logging in as Hub Manager (hubmanager@dhruto.com)...");
    await page.goto("/en/login");
    await page.locator("#login-email").fill("hubmanager@dhruto.com");
    await visualPause(400);
    await page.locator("#login-password").fill("dhruto123");
    await visualPause(400);
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/en\/hub\/dashboard/, { timeout: 30_000 });
    await visualPause(1500);

    // Inbound Scanner
    console.log("==> Inspecting Hub Barcode Scanner...");
    await page.goto("/en/hub/scanner");
    const scanInput = page.getByLabel(/tracking code or bag code/i);
    await expect(scanInput).toBeVisible();
    await scanInput.fill("DHR-2610-00101");
    await visualPause(1200);

    // Line-haul Bags
    console.log("==> Inspecting Line-haul Bag Management...");
    await page.goto("/en/hub/bags");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Route Manifests
    console.log("==> Inspecting Manifest Dispatch & Receiving...");
    await page.goto("/en/hub/manifests");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Station Cash Desk
    console.log("==> Inspecting Hub Station Cash Desk & Rider Hand-in...");
    await page.goto("/en/hub/cash");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Station Exceptions
    console.log("==> Inspecting Station Exceptions Log...");
    await page.goto("/en/hub/exceptions");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Sign out hub
    const hubSignOut = page.getByRole("button", { name: /sign out/i }).first();
    if (await hubSignOut.isVisible()) {
      await hubSignOut.click();
      await visualPause(1000);
    }

    // ========================================================
    // 4. RIDER FLEET ROLE
    // ========================================================
    console.log("==> STEP 4: Logging in as Rider (rider@dhruto.com)...");
    await page.goto("/en/login");
    await page.locator("#login-email").fill("rider@dhruto.com");
    await visualPause(400);
    await page.locator("#login-password").fill("dhruto123");
    await visualPause(400);
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/en\/rider\/dashboard/, { timeout: 30_000 });
    await visualPause(1500);

    // Toggle duty switch
    console.log("==> Toggling Rider On Duty / Off Duty Switch...");
    const dutySwitch = page.getByRole("switch");
    if (await dutySwitch.isVisible()) {
      await dutySwitch.click();
      await visualPause(1000);
      await dutySwitch.click();
      await visualPause(1000);
    }

    // Task run-sheet & filter tabs
    console.log("==> Inspecting Rider Task Run-sheet & Filtering...");
    await page.goto("/en/rider/tasks");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1000);

    const deliveryTab = page.getByRole("tab", { name: /delivery/i });
    if (await deliveryTab.isVisible()) {
      await deliveryTab.click();
      await visualPause(800);
      await page.getByRole("tab", { name: /all/i }).click();
      await visualPause(800);
    }

    // Rider profile & cash-in-hand
    console.log("==> Inspecting Rider Cash Desk & Profile...");
    await page.goto("/en/rider/profile");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Delivery history
    console.log("==> Inspecting Rider Delivery History...");
    await page.goto("/en/rider/history");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Sign out rider
    const riderSignOut = page.getByRole("button", { name: /sign out/i }).first();
    if (await riderSignOut.isVisible()) {
      await riderSignOut.click();
      await visualPause(1000);
    }

    // ========================================================
    // 5. CUSTOMER ROLE
    // ========================================================
    console.log("==> STEP 5: Logging in as Customer (customer@dhruto.com)...");
    await page.goto("/en/login");
    await page.locator("#login-email").fill("customer@dhruto.com");
    await visualPause(400);
    await page.locator("#login-password").fill("dhruto123");
    await visualPause(400);
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/en\/customer\/dashboard/, { timeout: 30_000 });
    await visualPause(1500);

    // Customer History
    console.log("==> Inspecting Customer Past Orders & Digital POD...");
    await page.goto("/en/customer/history");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Customer Settings: Add Address modal with dynamic District & Thana
    console.log("==> Testing Customer Address Modal with dynamic District & Thana...");
    await page.goto("/en/customer/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1000);

    const addAddressBtn = page.getByRole("button", { name: /add new delivery address/i });
    if (await addAddressBtn.isVisible()) {
      await addAddressBtn.click();
      await visualPause(1000);

      const labelInput = page.getByPlaceholder(/my home, my office/i);
      if (await labelInput.isVisible()) {
        await labelInput.fill("Gulshan Residence");
        await visualPause(500);
        await page.getByPlaceholder(/recipient name for this address/i).fill("Nasir Ahmed");
        await visualPause(500);
        await page.getByPlaceholder(/e\.g\. house 14/i).fill("House 19, Road 44, Gulshan 2");
        await visualPause(500);

        // Dynamic District & Thana
        await page.getByPlaceholder(/select or type district/i).fill("Dhaka");
        await visualPause(500);
        await page.getByPlaceholder(/select or type thana/i).fill("Gulshan");
        await visualPause(500);

        await page.getByPlaceholder(/01700000005/i).fill("01799221100");
        await visualPause(600);

        await page.getByRole("button", { name: /save address/i }).click();
        await visualPause(1500);
      }
    }

    // Customer Tracking
    console.log("==> Inspecting Customer Tracking Portal...");
    await page.goto("/en/customer/track");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Sign out customer
    const custSignOut = page.getByRole("button", { name: /sign out/i }).first();
    if (await custSignOut.isVisible()) {
      await custSignOut.click();
      await visualPause(1000);
    }

    // ========================================================
    // 6. ADMIN PLATFORM SUPERVISION ROLE
    // ========================================================
    console.log("==> STEP 6: Logging in as Admin (admin@dhruto.com)...");
    await page.goto("/en/login");
    await page.locator("#login-email").fill("admin@dhruto.com");
    await visualPause(400);
    await page.locator("#login-password").fill("dhruto123");
    await visualPause(400);
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/en\/admin\/dashboard/, { timeout: 30_000 });
    await visualPause(1500);

    // Cross-tenant parcel registry
    console.log("==> Admin inspecting Global Parcel Registry...");
    await page.goto("/en/admin/parcels");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Financial Console & Nationwide Ledger
    console.log("==> Admin inspecting Financial Console & Nationwide Ledger...");
    await page.goto("/en/admin/finance");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Hub Infrastructure
    console.log("==> Admin inspecting 64-District Hub Infrastructure...");
    await page.goto("/en/admin/hub");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Rider Fleet Supervision
    console.log("==> Admin inspecting Rider Fleet Supervision...");
    await page.goto("/en/admin/rider");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Deep Analytics
    console.log("==> Admin inspecting Deep Platform Analytics Sections...");
    await page.goto("/en/admin/analytics");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1000);

    await page.goto("/en/admin/analytics/delivery");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await visualPause(1000);

    await page.goto("/en/admin/analytics/finance");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await visualPause(1000);

    // Cognitive AI Fraud Radar
    console.log("==> Admin inspecting Cognitive AI Fraud Radar...");
    await page.goto("/en/admin/intelligence");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Gateway Integrations
    console.log("==> Admin inspecting Gateway & Integration Health...");
    await page.goto("/en/admin/integrations");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1200);

    // Admin Settings
    console.log("==> Admin inspecting Platform Privilege & Audit Settings...");
    await page.goto("/en/admin/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await visualPause(1500);

    console.log("==> [COMPLETE] Full Visual Walkthrough Finished Successfully!");
  });
});
