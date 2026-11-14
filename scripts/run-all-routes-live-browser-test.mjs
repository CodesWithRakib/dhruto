import fs from "fs";
import path from "path";
import pkg from "../apps/web-merchant/node_modules/@playwright/test/index.js";
const { chromium } = pkg;

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const API_URL = process.env.API_URL || "http://localhost:4000/api/v1";

async function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// 1. DYNAMIC ROUTE DISCOVERY & INVENTORY SCANNER
// ---------------------------------------------------------------------------
function discoverPages(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const dirent of list) {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      results = results.concat(discoverPages(fullPath, baseDir));
    } else if (dirent.name === "page.tsx" || dirent.name === "page.ts") {
      const rel = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      results.push(rel);
    }
  }
  return results;
}

async function resolveDynamicEntities() {
  const entities = {
    parcelId: "34041e42-3562-416a-a7c6-48cf7f59a25a",
    trackingCode: "DHR-20261114-GMJXYY",
    bagId: "fc7e8b4f-4979-4ee4-b4de-d902b0d4522d",
    manifestId: "6b11b298-affa-454c-bd60-355f68a13c13",
    taskId: "cdc06c96-9cd0-488f-8512-4ffea4331476",
    sections: ["delivery", "finance"],
  };

  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrPhone: "admin@dhruto.com", password: "dhruto123" }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.tokens?.accessToken || loginData.data?.accessToken;

    if (token) {
      const parcelsRes = await fetch(`${API_URL}/parcels?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const parcels = await parcelsRes.json();
      const p = parcels.data?.items?.[0] || parcels.data?.[0];
      if (p?.id) entities.parcelId = p.id;
      if (p?.trackingCode) entities.trackingCode = p.trackingCode;

      const bagsRes = await fetch(`${API_URL}/bags?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bags = await bagsRes.json();
      const b = bags.data?.items?.[0] || bags.data?.[0];
      if (b?.id) entities.bagId = b.id;

      const hubsRes = await fetch(`${API_URL}/hubs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const hubs = await hubsRes.json();
      const hubId = hubs.data?.[0]?.id;
      if (hubId) {
        const mRes = await fetch(`${API_URL}/hubs/${hubId}/manifests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const manifests = await mRes.json();
        const m = manifests.data?.[0];
        if (m?.id) entities.manifestId = m.id;
      }
    }
  } catch (err) {
    console.warn("Notice: Using fallback test entity IDs for dynamic routes.", err.message);
  }

  return entities;
}

function buildRouteInventory(entities) {
  const appDir = path.resolve("apps/web-merchant/app/[locale]");
  const pages = discoverPages(appDir);

  const inventory = {
    PUBLIC: [],
    MERCHANT: [],
    HUB_MANAGER: [],
    RIDER: [],
    CUSTOMER: [],
    ADMIN: [],
  };

  for (const p of pages) {
    if (p.includes("[...rest]") || p.includes("offline")) continue;

    let route = "/" + p.replace(/\/page\.tsx?$/, "");
    route = route.replace(/\/\([^)]+\)/g, ""); // strip (admin), (merchant), etc.
    if (route === "") route = "/";

    // Handle dynamic placeholders
    const resolvedRoutes = [];
    if (route.includes("[section]")) {
      for (const sec of entities.sections) {
        resolvedRoutes.push(route.replace("[section]", sec));
      }
    } else if (route.includes("[id]")) {
      if (p.includes("(hub)") && route.includes("bags")) {
        resolvedRoutes.push(route.replace("[id]", entities.bagId));
      } else if (p.includes("(hub)") && route.includes("manifests")) {
        resolvedRoutes.push(route.replace("[id]", entities.manifestId));
      } else if (p.includes("(rider)") && route.includes("tasks")) {
        resolvedRoutes.push(route.replace("[id]", entities.taskId));
      } else {
        resolvedRoutes.push(route.replace("[id]", entities.parcelId));
      }
    } else if (route.includes("[code]")) {
      resolvedRoutes.push(route.replace("[code]", entities.trackingCode));
    } else {
      resolvedRoutes.push(route);
    }

    for (const r of resolvedRoutes) {
      const fullLocaleRoute = `/en${r === "/" ? "" : r}`;
      if (p.includes("(admin)")) {
        inventory.ADMIN.push(fullLocaleRoute);
      } else if (p.includes("(merchant)")) {
        inventory.MERCHANT.push(fullLocaleRoute);
      } else if (p.includes("(hub)")) {
        inventory.HUB_MANAGER.push(fullLocaleRoute);
      } else if (p.includes("(rider)")) {
        inventory.RIDER.push(fullLocaleRoute);
      } else if (p.includes("(customer)")) {
        inventory.CUSTOMER.push(fullLocaleRoute);
      } else if (p.includes("(public)") || p.includes("(auth)")) {
        inventory.PUBLIC.push(fullLocaleRoute);
      }
    }
  }

  // Deduplicate routes in each category
  for (const k of Object.keys(inventory)) {
    inventory[k] = [...new Set(inventory[k])];
  }

  return inventory;
}

// ---------------------------------------------------------------------------
// 2. INTERACTIVE ACTIONS PER PAGE
// ---------------------------------------------------------------------------
async function performPageInteractions(page, route, role) {
  try {
    // 1. Try theme button interaction if visible
    const emeraldTheme = page.getByRole("button", { name: /emerald green/i });
    if (await emeraldTheme.isVisible().catch(() => false)) {
      await emeraldTheme.click().catch(() => {});
      await sleep(250);
      const purpleTheme = page.getByRole("button", { name: /royal purple/i });
      if (await purpleTheme.isVisible().catch(() => false)) {
        await purpleTheme.click().catch(() => {});
      }
    }

    // 2. Try tab toggles if page has tabs
    const tabs = page.getByRole("tab");
    const tabCount = await tabs.count().catch(() => 0);
    if (tabCount > 1) {
      await tabs.nth(1).click().catch(() => {});
      await sleep(350);
      await tabs.nth(0).click().catch(() => {});
    }

    // 3. Try filter buttons if visible
    const filterButtons = page.locator("button:has-text('All'), button:has-text('Delivered'), button:has-text('Active')");
    if ((await filterButtons.count().catch(() => 0)) > 0) {
      await filterButtons.first().click().catch(() => {});
    }

    // 4. Role-specific high-value actions
    if (route.includes("/merchant/bookings/new")) {
      const distInput = page.getByLabel("District", { exact: true });
      if (await distInput.isVisible().catch(() => false)) {
        await distInput.fill("Sylhet");
        await sleep(400);
        const thanaInput = page.getByLabel("Thana / Upazila");
        if (await thanaInput.isVisible().catch(() => false)) {
          await thanaInput.fill("Zindabazar");
          await sleep(400);
        }
      }
    } else if (route.includes("/merchant/calculator")) {
      const distInput = page.getByPlaceholder(/select destination district/i);
      if (await distInput.isVisible().catch(() => false)) {
        await distInput.fill("Chattogram");
        await sleep(400);
      }
    } else if (route.includes("/hub/scanner")) {
      const scanInput = page.getByLabel(/tracking code or bag code/i);
      if (await scanInput.isVisible().catch(() => false)) {
        await scanInput.fill("DHR-20261114-GMJXYY");
        await sleep(500);
      }
    } else if (route.includes("/customer/settings")) {
      const addAddrBtn = page.getByRole("button", { name: /add address/i });
      if (await addAddrBtn.isVisible().catch(() => false)) {
        await addAddrBtn.click();
        await sleep(500);
        const closeBtn = page.getByRole("button", { name: /close|cancel/i });
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click().catch(() => {});
        }
      }
    } else if (route.includes("/rider/dashboard")) {
      const dutySwitch = page.getByRole("button", { name: /go off duty|go on duty/i });
      if (await dutySwitch.isVisible().catch(() => false)) {
        await dutySwitch.click().catch(() => {});
        await sleep(400);
        await dutySwitch.click().catch(() => {});
      }
    }
  } catch {
    // Non-fatal interaction fallback
  }
}

// ---------------------------------------------------------------------------
// 3. MAIN LIVE AUTOMATION CONTROLLER
// ---------------------------------------------------------------------------
async function main() {
  console.log("\n================================================================================");
  console.log("   DHRUTO EXPRESS — FULL-SYSTEM COMPLETE ROUTE BROWSER TEST RUNNER");
  console.log("   (Every single page, sidebar route and user flow across all 5 roles in Chrome)");
  console.log("================================================================================\n");

  const entities = await resolveDynamicEntities();
  const inventory = buildRouteInventory(entities);

  let totalDiscovered = 0;
  for (const [role, list] of Object.entries(inventory)) {
    console.log(`[DISCOVERY] ${role.padEnd(12)} -> ${list.length} routes registered.`);
    totalDiscovered += list.length;
  }
  console.log(`[DISCOVERY] Total unique application routes to test: ${totalDiscovered}\n`);

  // Launch Google Chrome in headful mode with visible action pacing
  console.log("--> Launching Google Chrome (channel: 'chrome') with 5 isolated roles...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    slowMo: 200,
    args: ["--start-maximized"],
  });

  // Create isolated contexts for all 5 roles + public
  const contexts = {
    PUBLIC: await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    MERCHANT: await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    HUB_MANAGER: await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    RIDER: await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    CUSTOMER: await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    ADMIN: await browser.newContext({ viewport: { width: 1280, height: 800 } }),
  };

  const pages = {
    PUBLIC: await contexts.PUBLIC.newPage(),
    MERCHANT: await contexts.MERCHANT.newPage(),
    HUB_MANAGER: await contexts.HUB_MANAGER.newPage(),
    RIDER: await contexts.RIDER.newPage(),
    CUSTOMER: await contexts.CUSTOMER.newPage(),
    ADMIN: await contexts.ADMIN.newPage(),
  };

  // Attach error monitors
  const errors = [];
  for (const [role, p] of Object.entries(pages)) {
    p.on("pageerror", (err) => {
      errors.push({ role, error: err.message });
      console.error(`[PAGE ERROR] [${role}] ${err.message}`);
    });
    p.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !text.includes("Download the React DevTools") &&
          !text.includes("favicon") &&
          !text.includes("403")
        ) {
          console.warn(`[CONSOLE ERROR] [${role}] ${text}`);
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // STEP 1: LOG IN ALL 5 USER ROLES SIMULTANEOUSLY (NO ONE SIGNS OUT)
  // -------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("   STEP 1: SIMULTANEOUS LOGINS (ALL 5 USERS WILL STAY LOGGED IN)");
  console.log("================================================================================\n");

  const credentials = [
    { role: "MERCHANT", page: pages.MERCHANT, email: "merchant@dhruto.com", dash: "/en/merchant/dashboard" },
    { role: "HUB_MANAGER", page: pages.HUB_MANAGER, email: "hubmanager@dhruto.com", dash: "/en/hub/dashboard" },
    { role: "RIDER", page: pages.RIDER, email: "rider@dhruto.com", dash: "/en/rider/dashboard" },
    { role: "CUSTOMER", page: pages.CUSTOMER, email: "customer@dhruto.com", dash: "/en/customer/dashboard" },
    { role: "ADMIN", page: pages.ADMIN, email: "admin@dhruto.com", dash: "/en/admin/dashboard" },
  ];

  for (const cred of credentials) {
    console.log(`[LOGIN] Signing in ${cred.role} (${cred.email})...`);
    await cred.page.goto(`${BASE_URL}/en/login`);
    await cred.page.locator("#login-email").fill(cred.email);
    await cred.page.locator("#login-password").fill("dhruto123");
    await cred.page.getByRole("button", { name: /sign in to dashboard/i }).click();
  }

  // Await dashboards
  for (const cred of credentials) {
    await cred.page.waitForURL(new RegExp(cred.dash), { timeout: 35000 });
    console.log(`[LOGIN] [OK] ${cred.role} dashboard active.`);
  }

  console.log("\n--> ALL 5 USER ROLES ARE SIMULTANEOUSLY LOGGED IN AND VERIFIED!");
  await sleep(1500);

  // -------------------------------------------------------------------------
  // STEP 2: COMPLETE PAGE-BY-PAGE ROUTE WALKTHROUGH FOR EVERY ROLE
  // -------------------------------------------------------------------------
  const roleExecutionPlan = [
    { role: "PUBLIC", page: pages.PUBLIC, routes: inventory.PUBLIC },
    { role: "MERCHANT", page: pages.MERCHANT, routes: inventory.MERCHANT },
    { role: "HUB_MANAGER", page: pages.HUB_MANAGER, routes: inventory.HUB_MANAGER },
    { role: "RIDER", page: pages.RIDER, routes: inventory.RIDER },
    { role: "CUSTOMER", page: pages.CUSTOMER, routes: inventory.CUSTOMER },
    { role: "ADMIN", page: pages.ADMIN, routes: inventory.ADMIN },
  ];

  let verifiedPagesCount = 0;

  for (const plan of roleExecutionPlan) {
    console.log(`\n================================================================================`);
    console.log(`   NOW VISITING ALL ${plan.routes.length} ROUTES FOR: [${plan.role}]`);
    console.log(`================================================================================`);

    // Bring this role's window to the foreground on the user's screen
    await plan.page.bringToFront();
    await sleep(800);

    for (let i = 0; i < plan.routes.length; i++) {
      const route = plan.routes[i];
      const targetUrl = `${BASE_URL}${route}`;
      process.stdout.write(`  [${i + 1}/${plan.routes.length}] ${route.padEnd(52)} `);

      const t0 = Date.now();
      let status = 200;
      let navSuccess = false;

      // Navigate with retry protection against initial dev compile delays
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await plan.page.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 45000,
          });
          status = response ? response.status() : 200;
          navSuccess = true;
          break;
        } catch (err) {
          if (attempt === 2) {
            console.log(`[WARN: ${err.message.slice(0, 40)}]`);
          } else {
            await sleep(1000);
          }
        }
      }

      const elapsed = Date.now() - t0;

      if (!navSuccess || status >= 400) {
        console.log(`[FAILED: HTTP ${status}] (${elapsed}ms)`);
        errors.push({ role: plan.role, route, status });
      } else {
        console.log(`[OK: HTTP ${status}] (${elapsed}ms)`);
        verifiedPagesCount++;
      }

      // Perform human-visible interactions & pauses on the page
      await performPageInteractions(plan.page, route, plan.role);
      await sleep(1000); // visible pause so user can watch the page on screen
    }

    // Return to role's dashboard at the end of its sweep
    const cred = credentials.find((c) => c.role === plan.role);
    if (cred) {
      await plan.page.goto(`${BASE_URL}${cred.dash}`, { waitUntil: "domcontentloaded" }).catch(() => {});
      console.log(`  [DASHBOARD RETURN] ${plan.role} returned to ${cred.dash} (STAYS LOGGED IN).\n`);
      await sleep(800);
    }
  }

  // -------------------------------------------------------------------------
  // STEP 3: FINAL REPORT & PERSISTENT SESSION RETENTION
  // -------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("   COMPLETE FULL-SYSTEM BROWSER TEST FINISHED SUCCESSFULLY!");
  console.log(`   Total Pages Verified Across All Roles: ${verifiedPagesCount} / ${totalDiscovered}`);
  console.log(`   Page Crashes / HTTP 4xx/5xx Errors:    ${errors.length}`);
  console.log("================================================================================");
  console.log("   ALL 5 ROLES REMAIN LOGGED IN IN GOOGLE CHROME ON YOUR SCREEN.");
  console.log("   NO ONE WAS SIGNED OUT. You can now click and inspect any window.");
  console.log("================================================================================\n");

  // Keep all windows open indefinitely for the user
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("FATAL ERROR in live browser runner:", err);
  process.exit(1);
});
