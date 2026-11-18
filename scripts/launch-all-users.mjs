import pkg from "../apps/web-merchant/node_modules/@playwright/test/index.js";
const { chromium } = pkg;

async function main() {
  console.log("\n================================================================");
  console.log("   DHRUTO EXPRESS — 5 ROLES SIMULTANEOUS LIVE BROWSER LAUNCH");
  console.log("================================================================\n");

  // Real Google Chrome with DevTools auto-opened on every tab so network,
  // console and WebSocket traffic for each role is visible from the start.
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || "chrome",
    headless: false,
    slowMo: 200,
    args: ["--start-maximized", "--auto-open-devtools-for-tabs"],
  });

  const roles = [
    {
      name: "1. Merchant (Rahim Enterprise)",
      email: "merchant@dhruto.com",
      url: "http://localhost:5000/en/merchant/dashboard",
    },
    {
      name: "2. Hub Manager (Dhaka Central Hub - DHK)",
      email: "hubmanager@dhruto.com",
      url: "http://localhost:5000/en/hub/dashboard",
    },
    {
      name: "3. Rider (Rider Fleet)",
      email: "rider@dhruto.com",
      url: "http://localhost:5000/en/rider/dashboard",
    },
    {
      name: "4. Customer (Consumer Portal)",
      email: "customer@dhruto.com",
      url: "http://localhost:5000/en/customer/dashboard",
    },
    {
      name: "5. Admin (Global Command Center)",
      email: "admin@dhruto.com",
      url: "http://localhost:5000/en/admin/dashboard",
    },
  ];

  for (const role of roles) {
    console.log(`--> Logging in ${role.name} (${role.email})...`);
    // viewport: null lets the page fill the maximized window (full width).
    const ctx = await browser.newContext({ viewport: null });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5000/en/login");
    await page.locator("#login-email").fill(role.email);
    await page.locator("#login-password").fill("dhruto123");
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await page.waitForURL(role.url, { timeout: 30000 });
    console.log(`    [SUCCESS] ${role.name} is now live at: ${role.url}`);
  }

  console.log("\n================================================================");
  console.log("  ALL 5 USERS ARE OPEN & LOGGED IN SIMULTANEOUSLY ON YOUR SCREEN!");
  console.log("  You can now switch between windows, test and view any flow live.");
  console.log("================================================================\n");

  // Keep browser open
  await new Promise(() => {});
}

main().catch(console.error);
