import { test, expect } from "@playwright/test";

test.describe("All 5 User Roles — Simultaneous Live Browser Showcase & Actions", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(600_000); // 10 minutes max

  const pace = async (ms = 700) => {
    await new Promise((r) => setTimeout(r, ms));
  };

  test("Simultaneous Multi-Role End-to-End Visual Journey", async ({ browser }) => {
    // 1. Create 5 isolated browser contexts — one for each distinct role
    const merchantCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const hubCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const riderCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const customerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    // Open dedicated pages
    const merchantPage = await merchantCtx.newPage();
    const hubPage = await hubCtx.newPage();
    const riderPage = await riderCtx.newPage();
    const customerPage = await customerCtx.newPage();
    const adminPage = await adminCtx.newPage();

    // ==========================================
    // STEP 1: LOG IN ALL 5 USERS SIMULTANEOUSLY
    // ==========================================
    console.log("--> Logging in Merchant (merchant@dhruto.com)...");
    await merchantPage.goto("/en/login");
    await merchantPage.locator("#login-email").fill("merchant@dhruto.com");
    await merchantPage.locator("#login-password").fill("dhruto123");
    await merchantPage.getByRole("button", { name: /sign in to dashboard/i }).click();

    console.log("--> Logging in Hub Manager (hubmanager@dhruto.com)...");
    await hubPage.goto("/en/login");
    await hubPage.locator("#login-email").fill("hubmanager@dhruto.com");
    await hubPage.locator("#login-password").fill("dhruto123");
    await hubPage.getByRole("button", { name: /sign in to dashboard/i }).click();

    console.log("--> Logging in Rider (rider@dhruto.com)...");
    await riderPage.goto("/en/login");
    await riderPage.locator("#login-email").fill("rider@dhruto.com");
    await riderPage.locator("#login-password").fill("dhruto123");
    await riderPage.getByRole("button", { name: /sign in to dashboard/i }).click();

    console.log("--> Logging in Customer (customer@dhruto.com)...");
    await customerPage.goto("/en/login");
    await customerPage.locator("#login-email").fill("customer@dhruto.com");
    await customerPage.locator("#login-password").fill("dhruto123");
    await customerPage.getByRole("button", { name: /sign in to dashboard/i }).click();

    console.log("--> Logging in Admin (admin@dhruto.com)...");
    await adminPage.goto("/en/login");
    await adminPage.locator("#login-email").fill("admin@dhruto.com");
    await adminPage.locator("#login-password").fill("dhruto123");
    await adminPage.getByRole("button", { name: /sign in to dashboard/i }).click();

    // Verify all 5 reached their respective dashboards
    await expect(merchantPage).toHaveURL(/\/en\/merchant\/dashboard/, { timeout: 30_000 });
    await expect(hubPage).toHaveURL(/\/en\/hub\/dashboard/, { timeout: 30_000 });
    await expect(riderPage).toHaveURL(/\/en\/rider\/dashboard/, { timeout: 30_000 });
    await expect(customerPage).toHaveURL(/\/en\/customer\/dashboard/, { timeout: 30_000 });
    await expect(adminPage).toHaveURL(/\/en\/admin\/dashboard/, { timeout: 30_000 });
    console.log("--> ALL 5 ROLES ARE NOW SIMULTANEOUSLY LOGGED IN IN SEPARATE WINDOWS!");
    await pace(1000);

    // ==========================================
    // STEP 2: MERCHANT COMPLETE USER ACTIONS
    // ==========================================
    console.log("--> [MERCHANT FLOW] Creating a booking with dynamic District & Thana...");
    await merchantPage.bringToFront();
    await merchantPage.goto("/en/merchant/bookings/new");
    await expect(merchantPage.getByRole("heading", { name: /book a parcel/i })).toBeVisible();
    await pace();

    const uniqueCode = `SIMUL_${Date.now().toString(36).toUpperCase()}`;
    await merchantPage.getByLabel("Recipient full name").fill(`Mahmudur Rahman ${uniqueCode}`);
    await merchantPage.getByLabel("Recipient mobile number").fill("01799881122");
    await pace(400);

    // Dynamic cascaded district and thana selection
    await merchantPage.getByLabel("District", { exact: true }).fill("Chattogram");
    await pace(400);
    await merchantPage.getByLabel("Thana / Upazila").fill("Kotwali");
    await pace(400);

    await merchantPage.getByLabel("Detailed delivery address").fill("Plot 15, Nasirabad Commercial Area");
    await merchantPage.getByLabel("Weight (kg)").fill("3.0");
    await merchantPage.getByLabel("Cash on delivery (BDT)").fill("5200");
    await pace(600);

    // Verify calculated fee is displayed
    await expect(merchantPage.getByText(/outside dhaka/i).first()).toBeVisible();
    await pace(400);

    // Confirm booking
    await merchantPage.getByRole("button", { name: /confirm booking/i }).click();
    await expect(merchantPage.getByText(/parcel booked successfully/i)).toBeVisible({ timeout: 30_000 });
    console.log("--> [MERCHANT FLOW] Parcel booked successfully!");
    await pace(1000);

    // View shipments and filter
    await merchantPage.goto("/en/merchant/parcels");
    await expect(merchantPage.getByRole("heading", { level: 1 })).toBeVisible();
    const filterCreated = merchantPage.getByRole("button", { name: /^Created/i });
    if (await filterCreated.isVisible()) {
      await filterCreated.click();
      await pace(600);
    }
    const filterAll = merchantPage.getByRole("button", { name: /^All/i });
    if (await filterAll.isVisible()) {
      await filterAll.click();
      await pace(600);
    }

    // Freight calculator cockpit interaction
    await merchantPage.goto("/en/merchant/calculator");
    await expect(merchantPage.getByRole("heading", { name: /simulator|calculator/i }).first()).toBeVisible();
    await pace(800);

    // Finance & Payout request modal
    await merchantPage.goto("/en/merchant/finance");
    await expect(merchantPage.getByRole("heading", { level: 1 })).toBeVisible();
    const payoutBtn = merchantPage.getByRole("button", { name: /request payout/i });
    if (await payoutBtn.isVisible()) {
      await payoutBtn.click();
      await pace(600);
      const cancelBtn = merchantPage.getByRole("button", { name: /cancel|close/i });
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await pace(400);
      }
    }

    // Theme switcher in settings
    await merchantPage.goto("/en/merchant/settings");
    await expect(merchantPage.getByRole("heading", { level: 1 })).toBeVisible();
    const emeraldTheme = merchantPage.getByRole("button", { name: /emerald green/i });
    if (await emeraldTheme.isVisible()) {
      await emeraldTheme.click();
      await pace(500);
      await merchantPage.getByRole("button", { name: /royal purple/i }).click();
      await pace(500);
    }

    // ==========================================
    // STEP 3: HUB MANAGER COMPLETE USER ACTIONS
    // ==========================================
    console.log("--> [HUB MANAGER FLOW] Inspecting scanner, line-haul bags, manifests & cash desk...");
    await hubPage.bringToFront();
    await hubPage.goto("/en/hub/dashboard");
    await expect(hubPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Inbound Scanner
    await hubPage.goto("/en/hub/scanner");
    const scanInput = hubPage.getByLabel(/tracking code or bag code/i);
    await expect(scanInput).toBeVisible();
    await scanInput.fill("DHR-2610-00101");
    await pace(800);

    // Line-haul bags
    await hubPage.goto("/en/hub/bags");
    await expect(hubPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Manifests
    await hubPage.goto("/en/hub/manifests");
    await expect(hubPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Station Cash desk
    await hubPage.goto("/en/hub/cash");
    await expect(hubPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Exceptions
    await hubPage.goto("/en/hub/exceptions");
    await expect(hubPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // ==========================================
    // STEP 4: RIDER FLEET COMPLETE USER ACTIONS
    // ==========================================
    console.log("--> [RIDER FLOW] Toggling duty status, reviewing run-sheet & cash desk...");
    await riderPage.bringToFront();
    await riderPage.goto("/en/rider/dashboard");
    await expect(riderPage.getByRole("heading", { level: 1 })).toBeVisible();

    // Toggle duty switch
    const dutySwitch = riderPage.getByRole("switch");
    if (await dutySwitch.isVisible()) {
      await dutySwitch.click();
      await pace(500);
      await dutySwitch.click();
      await pace(500);
    }

    // Task run-sheet & tab filtering
    await riderPage.goto("/en/rider/tasks");
    await expect(riderPage.getByRole("heading", { level: 1 })).toBeVisible();
    const deliveryTab = riderPage.getByRole("tab", { name: /delivery/i });
    if (await deliveryTab.isVisible()) {
      await deliveryTab.click();
      await pace(500);
      await riderPage.getByRole("tab", { name: /all/i }).click();
      await pace(500);
    }

    // Rider profile & cash collection
    await riderPage.goto("/en/rider/profile");
    await expect(riderPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // History
    await riderPage.goto("/en/rider/history");
    await expect(riderPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // ==========================================
    // STEP 5: CUSTOMER COMPLETE USER ACTIONS
    // ==========================================
    console.log("--> [CUSTOMER FLOW] Adding address with dynamic District & Thana, tracking...");
    await customerPage.bringToFront();
    await customerPage.goto("/en/customer/dashboard");
    await expect(customerPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // History
    await customerPage.goto("/en/customer/history");
    await expect(customerPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Settings -> Add New Address modal
    await customerPage.goto("/en/customer/settings");
    await expect(customerPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(600);

    const addAddressBtn = customerPage.getByRole("button", { name: /add new delivery address/i });
    if (await addAddressBtn.isVisible()) {
      await addAddressBtn.click();
      await pace(600);

      const labelInput = customerPage.getByPlaceholder(/my home, my office/i);
      if (await labelInput.isVisible()) {
        await labelInput.fill("Dhanmondi Office");
        await customerPage.getByPlaceholder(/recipient name for this address/i).fill("Nasir Ahmed");
        await customerPage.getByPlaceholder(/e\.g\. house 14/i).fill("House 28, Road 7A");

        // Dynamic cascaded district & thana
        await customerPage.getByPlaceholder(/select or type district/i).fill("Dhaka");
        await pace(400);
        await customerPage.getByPlaceholder(/select or type thana/i).fill("Dhanmondi");
        await pace(400);

        await customerPage.getByPlaceholder(/01700000005/i).fill("01711998877");
        await pace(500);

        await customerPage.getByRole("button", { name: /save address/i }).click();
        await pace(1000);
      }
    }

    // Tracking
    await customerPage.goto("/en/customer/track");
    await expect(customerPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // ==========================================
    // STEP 6: ADMIN COMPLETE SUPERVISION ACTIONS
    // ==========================================
    console.log("--> [ADMIN FLOW] Global Command Center, Parcel Registry, Ledger & Analytics...");
    await adminPage.bringToFront();
    await adminPage.goto("/en/admin/dashboard");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Cross-tenant parcel registry
    await adminPage.goto("/en/admin/parcels");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Nationwide financial console
    await adminPage.goto("/en/admin/finance");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Hub infrastructure
    await adminPage.goto("/en/admin/hub");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Rider fleet supervision
    await adminPage.goto("/en/admin/rider");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Deep analytics
    await adminPage.goto("/en/admin/analytics");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    await adminPage.goto("/en/admin/analytics/delivery");
    await expect(adminPage.getByRole("heading").first()).toBeVisible();
    await pace(800);

    await adminPage.goto("/en/admin/analytics/finance");
    await expect(adminPage.getByRole("heading").first()).toBeVisible();
    await pace(800);

    // AI Fraud Radar
    await adminPage.goto("/en/admin/intelligence");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Integrations & Gateways
    await adminPage.goto("/en/admin/integrations");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(800);

    // Admin Settings
    await adminPage.goto("/en/admin/settings");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await pace(1000);

    console.log("--> [SUCCESS] All 5 roles completed full interactive user workflows!");
  });
});
