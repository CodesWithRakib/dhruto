import pkg from "../apps/web-merchant/node_modules/@playwright/test/index.js";
const { chromium } = pkg;

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

async function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("\n========================================================================");
  console.log("   DHRUTO EXPRESS — REAL-TIME 5-ROLE LIVE GOOGLE CHROME AUTOMATION");
  console.log("   (All 5 users will log in and STAY logged in simultaneously across windows)");
  console.log("========================================================================\n");

  // Launch Google Chrome in headful mode with visible action pacing
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    slowMo: 300,
    args: ["--start-maximized"],
  });

  // 1. Create 5 isolated browser contexts — each has its own independent session & storage
  console.log("--> Initializing 5 independent browser contexts for all roles...");
  const merchantCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const hubCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const riderCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const customerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  const merchantPage = await merchantCtx.newPage();
  const hubPage = await hubCtx.newPage();
  const riderPage = await riderCtx.newPage();
  const customerPage = await customerCtx.newPage();
  const adminPage = await adminCtx.newPage();

  // ========================================================================
  // STEP 1: LOG IN ALL 5 USERS SIMULTANEOUSLY (NO ONE EVER SIGNS OUT)
  // ========================================================================
  console.log("\n[1/5] Logging in Merchant (merchant@dhruto.com)...");
  await merchantPage.goto(`${BASE_URL}/en/login`);
  await merchantPage.locator("#login-email").fill("merchant@dhruto.com");
  await merchantPage.locator("#login-password").fill("dhruto123");
  await merchantPage.getByRole("button", { name: /sign in to dashboard/i }).click();

  console.log("[2/5] Logging in Hub Manager (hubmanager@dhruto.com)...");
  await hubPage.goto(`${BASE_URL}/en/login`);
  await hubPage.locator("#login-email").fill("hubmanager@dhruto.com");
  await hubPage.locator("#login-password").fill("dhruto123");
  await hubPage.getByRole("button", { name: /sign in to dashboard/i }).click();

  console.log("[3/5] Logging in Rider (rider@dhruto.com)...");
  await riderPage.goto(`${BASE_URL}/en/login`);
  await riderPage.locator("#login-email").fill("rider@dhruto.com");
  await riderPage.locator("#login-password").fill("dhruto123");
  await riderPage.getByRole("button", { name: /sign in to dashboard/i }).click();

  console.log("[4/5] Logging in Customer (customer@dhruto.com)...");
  await customerPage.goto(`${BASE_URL}/en/login`);
  await customerPage.locator("#login-email").fill("customer@dhruto.com");
  await customerPage.locator("#login-password").fill("dhruto123");
  await customerPage.getByRole("button", { name: /sign in to dashboard/i }).click();

  console.log("[5/5] Logging in Admin (admin@dhruto.com)...");
  await adminPage.goto(`${BASE_URL}/en/login`);
  await adminPage.locator("#login-email").fill("admin@dhruto.com");
  await adminPage.locator("#login-password").fill("dhruto123");
  await adminPage.getByRole("button", { name: /sign in to dashboard/i }).click();

  // Wait for all 5 to reach their dashboards
  await merchantPage.waitForURL(/\/en\/merchant\/dashboard/, { timeout: 30000 });
  await hubPage.waitForURL(/\/en\/hub\/dashboard/, { timeout: 30000 });
  await riderPage.waitForURL(/\/en\/rider\/dashboard/, { timeout: 30000 });
  await customerPage.waitForURL(/\/en\/customer\/dashboard/, { timeout: 30000 });
  await adminPage.waitForURL(/\/en\/admin\/dashboard/, { timeout: 30000 });

  console.log("\n========================================================================");
  console.log("   ALL 5 USER ROLES ARE NOW SIMULTANEOUSLY LOGGED IN IN GOOGLE CHROME!");
  console.log("========================================================================\n");
  await sleep(1500);

  // ========================================================================
  // STEP 2: MERCHANT WINDOW — LIVE INTERACTIONS & ACTIONS
  // ========================================================================
  console.log("==> [WINDOW 1: MERCHANT] Performing live actions...");
  await merchantPage.bringToFront();
  await sleep(1000);

  // Toggle chart tabs
  const bookedTab = merchantPage.getByRole("button", { name: "Booked" });
  if (await bookedTab.isVisible()) {
    await bookedTab.click();
    await sleep(800);
    await merchantPage.getByRole("button", { name: "Delivered" }).click();
    await sleep(800);
  }

  // Create new booking with dynamic 64-District & Thana selector
  console.log("    -> Merchant opening booking form & selecting dynamic District and Thana...");
  await merchantPage.goto(`${BASE_URL}/en/merchant/bookings/new`);
  await sleep(1000);

  const marker = `CHROME_${Date.now().toString(36).toUpperCase()}`;
  await merchantPage.getByLabel("Recipient full name").fill(`Tanvir Hasan (${marker})`);
  await sleep(400);
  await merchantPage.getByLabel("Recipient mobile number").fill("01799887766");
  await sleep(400);

  // Dynamic District selection
  await merchantPage.getByLabel("District", { exact: true }).fill("Chattogram");
  await sleep(600);

  // Dynamic Thana selection
  await merchantPage.getByLabel("Thana / Upazila").fill("Kotwali");
  await sleep(600);

  await merchantPage.getByLabel("Detailed delivery address").fill("Holding 82, CDA Avenue, GEC Circle");
  await sleep(400);
  await merchantPage.getByLabel("Weight (kg)").fill("2.5");
  await sleep(400);
  await merchantPage.getByLabel("Cash on delivery (BDT)").fill("4500");
  await sleep(800);

  // Submit booking
  await merchantPage.getByRole("button", { name: /confirm booking/i }).click();
  console.log("    -> Booking submitted! Awaiting confirmation...");
  await sleep(2000);

  // Shipments List
  console.log("    -> Merchant inspecting Shipments List & filters...");
  await merchantPage.goto(`${BASE_URL}/en/merchant/parcels`);
  await sleep(1000);

  // Returns & RTO
  console.log("    -> Merchant inspecting Returns & RTO Desk...");
  await merchantPage.goto(`${BASE_URL}/en/merchant/returns`);
  await sleep(1000);

  // Freight Calculator Simulator
  console.log("    -> Merchant inspecting Freight Calculator Cockpit...");
  await merchantPage.goto(`${BASE_URL}/en/merchant/calculator`);
  await sleep(1000);

  // Finance & Wallet
  console.log("    -> Merchant inspecting Finance & Payout Request Modal...");
  await merchantPage.goto(`${BASE_URL}/en/merchant/finance`);
  await sleep(1000);
  const payoutBtn = merchantPage.getByRole("button", { name: /request payout/i });
  if (await payoutBtn.isVisible()) {
    await payoutBtn.click();
    await sleep(1000);
    const cancelBtn = merchantPage.getByRole("button", { name: /cancel|close/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await sleep(600);
    }
  }

  // Theme Switcher in Settings
  console.log("    -> Merchant testing live Theme Switcher...");
  await merchantPage.goto(`${BASE_URL}/en/merchant/settings`);
  await sleep(800);
  const emeraldTheme = merchantPage.getByRole("button", { name: /emerald green/i });
  if (await emeraldTheme.isVisible()) {
    await emeraldTheme.click();
    await sleep(1000);
    await merchantPage.getByRole("button", { name: /royal purple/i }).click();
    await sleep(800);
  }

  // Return to Dashboard and stay logged in!
  await merchantPage.goto(`${BASE_URL}/en/merchant/dashboard`);
  console.log("    [OK] Merchant window remains logged in at Dashboard!\n");
  await sleep(1000);

  // ========================================================================
  // STEP 3: HUB MANAGER WINDOW — LIVE INTERACTIONS & ACTIONS
  // ========================================================================
  console.log("==> [WINDOW 2: HUB MANAGER] Performing live actions...");
  await hubPage.bringToFront();
  await sleep(1000);

  // Inbound Scanner
  console.log("    -> Hub Manager testing Inbound Barcode Scanner...");
  await hubPage.goto(`${BASE_URL}/en/hub/scanner`);
  const scanInput = hubPage.getByLabel(/tracking code or bag code/i);
  if (await scanInput.isVisible()) {
    await scanInput.fill("DHR-2610-00101");
    await sleep(1200);
  }

  // Line-haul Bags
  console.log("    -> Hub Manager inspecting Line-haul Bags...");
  await hubPage.goto(`${BASE_URL}/en/hub/bags`);
  await sleep(1000);

  // Manifests Dispatch
  console.log("    -> Hub Manager inspecting Manifests...");
  await hubPage.goto(`${BASE_URL}/en/hub/manifests`);
  await sleep(1000);

  // Cash Desk
  console.log("    -> Hub Manager inspecting Station Cash Desk & Hand-in...");
  await hubPage.goto(`${BASE_URL}/en/hub/cash`);
  await sleep(1000);

  // Exceptions
  console.log("    -> Hub Manager inspecting Operational Exceptions...");
  await hubPage.goto(`${BASE_URL}/en/hub/exceptions`);
  await sleep(1000);

  // Return to Dashboard and stay logged in!
  await hubPage.goto(`${BASE_URL}/en/hub/dashboard`);
  console.log("    [OK] Hub Manager window remains logged in at Dashboard!\n");
  await sleep(1000);

  // ========================================================================
  // STEP 4: RIDER FLEET WINDOW — LIVE INTERACTIONS & ACTIONS
  // ========================================================================
  console.log("==> [WINDOW 3: RIDER] Performing live actions...");
  await riderPage.bringToFront();
  await sleep(1000);

  // Toggle Duty Switch
  console.log("    -> Rider toggling On Duty / Off Duty switch...");
  const dutySwitch = riderPage.getByRole("switch");
  if (await dutySwitch.isVisible()) {
    await dutySwitch.click();
    await sleep(1000);
    await dutySwitch.click();
    await sleep(800);
  }

  // Tasks Run-sheet & Filter Tabs
  console.log("    -> Rider inspecting Run-sheet tasks & filtering...");
  await riderPage.goto(`${BASE_URL}/en/rider/tasks`);
  await sleep(1000);
  const deliveryTab = riderPage.getByRole("tab", { name: /delivery/i });
  if (await deliveryTab.isVisible()) {
    await deliveryTab.click();
    await sleep(800);
    await riderPage.getByRole("tab", { name: /all/i }).click();
    await sleep(800);
  }

  // Rider Profile & Cash in Hand
  console.log("    -> Rider inspecting Cash in Hand Desk...");
  await riderPage.goto(`${BASE_URL}/en/rider/profile`);
  await sleep(1000);

  // Delivery History
  console.log("    -> Rider inspecting Delivery History...");
  await riderPage.goto(`${BASE_URL}/en/rider/history`);
  await sleep(1000);

  // Return to Dashboard and stay logged in!
  await riderPage.goto(`${BASE_URL}/en/rider/dashboard`);
  console.log("    [OK] Rider window remains logged in at Dashboard!\n");
  await sleep(1000);

  // ========================================================================
  // STEP 5: CUSTOMER WINDOW — LIVE INTERACTIONS & ACTIONS
  // ========================================================================
  console.log("==> [WINDOW 4: CUSTOMER] Performing live actions...");
  await customerPage.bringToFront();
  await sleep(1000);

  // History & Digital POD
  console.log("    -> Customer inspecting Past Deliveries & Receipts...");
  await customerPage.goto(`${BASE_URL}/en/customer/history`);
  await sleep(1000);

  // Settings & Address Modal with Dynamic District & Thana
  console.log("    -> Customer adding new Address with dynamic District & Thana...");
  await customerPage.goto(`${BASE_URL}/en/customer/settings`);
  await sleep(1000);

  const addAddressBtn = customerPage.getByRole("button", { name: /add new delivery address/i });
  if (await addAddressBtn.isVisible()) {
    await addAddressBtn.click();
    await sleep(1000);

    const labelInput = customerPage.getByPlaceholder(/my home, my office/i);
    if (await labelInput.isVisible()) {
      await labelInput.fill("Mirpur Residence");
      await sleep(400);
      await customerPage.getByPlaceholder(/recipient name for this address/i).fill("Nasir Ahmed");
      await sleep(400);
      await customerPage.getByPlaceholder(/e\.g\. house 14/i).fill("House 42, Road 11, Block D");
      await sleep(400);

      // Dynamic District & Thana
      await customerPage.getByPlaceholder(/select or type district/i).fill("Dhaka");
      await sleep(500);
      await customerPage.getByPlaceholder(/select or type thana/i).fill("Mirpur");
      await sleep(500);

      await customerPage.getByPlaceholder(/01700000005/i).fill("01799221100");
      await sleep(500);

      await customerPage.getByRole("button", { name: /save address/i }).click();
      console.log("    -> Address saved successfully!");
      await sleep(1500);
    }
  }

  // Tracking Portal
  console.log("    -> Customer inspecting Tracking Portal...");
  await customerPage.goto(`${BASE_URL}/en/customer/track`);
  await sleep(1000);

  // Return to Dashboard and stay logged in!
  await customerPage.goto(`${BASE_URL}/en/customer/dashboard`);
  console.log("    [OK] Customer window remains logged in at Dashboard!\n");
  await sleep(1000);

  // ========================================================================
  // STEP 6: ADMIN WINDOW — LIVE SUPERVISION & ACTIONS
  // ========================================================================
  console.log("==> [WINDOW 5: ADMIN] Performing live supervision...");
  await adminPage.bringToFront();
  await sleep(1000);

  // Cross-tenant Parcel Registry
  console.log("    -> Admin inspecting Cross-tenant Parcel Registry...");
  await adminPage.goto(`${BASE_URL}/en/admin/parcels`);
  await sleep(1000);

  // Nationwide Financial Console & Ledger
  console.log("    -> Admin inspecting Nationwide Financial Console & Ledger...");
  await adminPage.goto(`${BASE_URL}/en/admin/finance`);
  await sleep(1000);

  // Hub Infrastructure
  console.log("    -> Admin inspecting 64-District Hub Infrastructure...");
  await adminPage.goto(`${BASE_URL}/en/admin/hub`);
  await sleep(1000);

  // Rider Fleet Oversight
  console.log("    -> Admin inspecting Rider Fleet Supervision...");
  await adminPage.goto(`${BASE_URL}/en/admin/rider`);
  await sleep(1000);

  // Deep Analytics Sections
  console.log("    -> Admin inspecting Deep Analytics (Delivery & Finance)...");
  await adminPage.goto(`${BASE_URL}/en/admin/analytics`);
  await sleep(800);
  await adminPage.goto(`${BASE_URL}/en/admin/analytics/delivery`);
  await sleep(800);
  await adminPage.goto(`${BASE_URL}/en/admin/analytics/finance`);
  await sleep(800);

  // AI Fraud Radar
  console.log("    -> Admin inspecting Cognitive AI Fraud Radar...");
  await adminPage.goto(`${BASE_URL}/en/admin/intelligence`);
  await sleep(1000);

  // Integrations & Gateways
  console.log("    -> Admin inspecting Gateway & Integration Health...");
  await adminPage.goto(`${BASE_URL}/en/admin/integrations`);
  await sleep(1000);

  // Settings & Privilege Audit
  console.log("    -> Admin inspecting Platform Privilege & Audit Settings...");
  await adminPage.goto(`${BASE_URL}/en/admin/settings`);
  await sleep(1000);

  // Return to Dashboard and stay logged in!
  await adminPage.goto(`${BASE_URL}/en/admin/dashboard`);
  console.log("    [OK] Admin window remains logged in at Dashboard!\n");
  await sleep(1000);

  console.log("\n========================================================================");
  console.log("  SUCCESS: ALL 5 USER ROLES ARE OPEN & LOGGED IN IN GOOGLE CHROME!");
  console.log("  No one is signed out. All 5 windows are active on your desktop.");
  console.log("  You can now switch between windows, test and view any flow live.");
  console.log("========================================================================\n");

  // Keep all windows open indefinitely so the user can watch & interact
  await new Promise(() => {});
}

main().catch(console.error);
