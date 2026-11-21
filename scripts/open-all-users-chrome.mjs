import puppeteer from "puppeteer-core";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const CHROME_PATH = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const ROLES = [
  {
    name: "1. Merchant (Rahim Enterprise)",
    email: "merchant@dhruto.com",
    dashboardUrl: `${BASE_URL}/en/merchant/dashboard`,
  },
  {
    name: "2. Hub Manager (Dhaka Central Hub)",
    email: "hubmanager@dhruto.com",
    dashboardUrl: `${BASE_URL}/en/hub/dashboard`,
  },
  {
    name: "3. Rider (Rider Fleet)",
    email: "rider@dhruto.com",
    dashboardUrl: `${BASE_URL}/en/rider/dashboard`,
  },
  {
    name: "4. Customer (Consumer Portal)",
    email: "customer@dhruto.com",
    dashboardUrl: `${BASE_URL}/en/customer/dashboard`,
  },
  {
    name: "5. Admin (Operations Console)",
    email: "admin@dhruto.com",
    dashboardUrl: `${BASE_URL}/en/admin/dashboard`,
  },
];

async function main() {
  console.log("================================================================");
  console.log("  LAUNCHING REAL CHROME WITH ALL 5 USERS LOGGED IN SIMULTANEOUSLY");
  console.log("================================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: null,
    args: [
      "--start-maximized",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  for (const role of ROLES) {
    console.log(`--> Logging in ${role.name} (${role.email})...`);
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    
    await page.goto(`${BASE_URL}/en/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#login-email", { timeout: 15000 });
    
    await page.type("#login-email", role.email, { delay: 15 });
    await page.type("#login-password", "dhruto123", { delay: 15 });
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

    await page.goto(role.dashboardUrl, { waitUntil: "domcontentloaded" });
    console.log(`    [SUCCESS] ${role.name} is LIVE at ${role.dashboardUrl}`);
  }

  console.log("\n================================================================");
  console.log("  ALL 5 USERS ARE NOW OPEN & LOGGED IN SIMULTANEOUSLY IN CHROME!");
  console.log("  You can view, switch between, and test all 5 dashboards live.");
  console.log("================================================================\n");

  // Keep script alive indefinitely
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("Launcher error:", err);
  process.exit(1);
});
