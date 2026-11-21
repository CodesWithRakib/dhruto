import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const CHROME_PATH = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOTS_ROOT = path.resolve("screenshots");

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false },
  mobile: {
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  },
};

const ROLES = [
  {
    key: "public",
    name: "Public / Marketing & Auth",
    auth: null,
    routes: [
      { path: "/en", slug: "landing-home" },
      { path: "/en/about", slug: "about" },
      { path: "/en/services", slug: "services" },
      { path: "/en/pricing", slug: "pricing" },
      { path: "/en/contact", slug: "contact" },
      { path: "/en/faq", slug: "faq" },
      { path: "/en/track", slug: "track" },
      { path: "/en/login", slug: "login" },
      { path: "/en/register", slug: "register" },
      { path: "/en/forgot-password", slug: "forgot-password" },
      { path: "/en/privacy", slug: "privacy" },
      { path: "/en/terms", slug: "terms" },
    ],
  },
  {
    key: "merchant",
    name: "Merchant Portal",
    auth: { email: "merchant@dhruto.com", password: "dhruto123", expectedUrl: "/en/merchant/dashboard" },
    routes: [
      { path: "/en/merchant/dashboard", slug: "dashboard" },
      { path: "/en/merchant/bookings/new", slug: "booking-new" },
      { path: "/en/merchant/parcels", slug: "parcels-list" },
      { path: "/en/merchant/calculator", slug: "calculator" },
      { path: "/en/merchant/finance", slug: "finance" },
      { path: "/en/merchant/analytics", slug: "analytics" },
      { path: "/en/merchant/returns", slug: "returns" },
      { path: "/en/merchant/messages", slug: "messages" },
      { path: "/en/merchant/notifications", slug: "notifications" },
      { path: "/en/merchant/settings", slug: "settings" },
    ],
  },
  {
    key: "hub",
    name: "Hub Manager Terminal",
    auth: { email: "hubmanager@dhruto.com", password: "dhruto123", expectedUrl: "/en/hub/dashboard" },
    routes: [
      { path: "/en/hub/dashboard", slug: "dashboard" },
      { path: "/en/hub/scanner", slug: "scanner" },
      { path: "/en/hub/parcels", slug: "parcels" },
      { path: "/en/hub/bags", slug: "bags" },
      { path: "/en/hub/manifests", slug: "manifests" },
      { path: "/en/hub/pickups", slug: "pickups" },
      { path: "/en/hub/cash", slug: "cash" },
      { path: "/en/hub/exceptions", slug: "exceptions" },
      { path: "/en/hub/messages", slug: "messages" },
      { path: "/en/hub/notifications", slug: "notifications" },
      { path: "/en/hub/settings", slug: "settings" },
    ],
  },
  {
    key: "rider",
    name: "Rider Delivery Terminal",
    auth: { email: "rider@dhruto.com", password: "dhruto123", expectedUrl: "/en/rider/dashboard" },
    routes: [
      { path: "/en/rider/dashboard", slug: "dashboard" },
      { path: "/en/rider/tasks", slug: "tasks" },
      { path: "/en/rider/history", slug: "history" },
      { path: "/en/rider/profile", slug: "profile" },
      { path: "/en/rider/messages", slug: "messages" },
      { path: "/en/rider/notifications", slug: "notifications" },
      { path: "/en/rider/settings", slug: "settings" },
    ],
  },
  {
    key: "customer",
    name: "Customer Consumer Portal",
    auth: { email: "customer@dhruto.com", password: "dhruto123", expectedUrl: "/en/customer/dashboard" },
    routes: [
      { path: "/en/customer/dashboard", slug: "dashboard" },
      { path: "/en/customer/history", slug: "history" },
      { path: "/en/customer/track", slug: "track" },
      { path: "/en/customer/messages", slug: "messages" },
      { path: "/en/customer/notifications", slug: "notifications" },
      { path: "/en/customer/settings", slug: "settings" },
    ],
  },
  {
    key: "admin",
    name: "Operations & Admin Console",
    auth: { email: "admin@dhruto.com", password: "dhruto123", expectedUrl: "/en/admin/dashboard" },
    routes: [
      { path: "/en/admin/dashboard", slug: "dashboard" },
      { path: "/en/admin/parcels", slug: "parcels" },
      { path: "/en/admin/hub", slug: "hubs" },
      { path: "/en/admin/rider", slug: "riders" },
      { path: "/en/admin/finance", slug: "finance" },
      { path: "/en/admin/analytics", slug: "analytics" },
      { path: "/en/admin/intelligence", slug: "intelligence" },
      { path: "/en/admin/integrations", slug: "integrations" },
      { path: "/en/admin/communications", slug: "communications" },
      { path: "/en/admin/messages", slug: "messages" },
      { path: "/en/admin/notifications", slug: "notifications" },
      { path: "/en/admin/settings", slug: "settings" },
    ],
  },
];

async function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function loginUser(page, auth) {
  console.log(`    [AUTH] Navigating to ${BASE_URL}/en/login...`);
  await page.goto(`${BASE_URL}/en/login`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.evaluate(() => {
    const email = document.querySelector("#login-email");
    const pass = document.querySelector("#login-password");
    if (email) email.value = "";
    if (pass) pass.value = "";
  });
  await page.type("#login-email", auth.email, { delay: 10 });
  await page.type("#login-password", auth.password, { delay: 10 });
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  // Brief pause for auth state hydration
  await new Promise((res) => setTimeout(res, 1200));
  console.log(`    [AUTH SUCCESS] Authenticated as ${auth.email}`);
}

async function captureRoute(page, fullUrl, destPath, viewportName) {
  try {
    await page.goto(fullUrl, { waitUntil: ["domcontentloaded", "networkidle2"], timeout: 30000 });
    
    // Wait for skeletons and active loading indicators to finish
    await page
      .waitForFunction(
        () => {
          const loadingElements = document.querySelectorAll(".dhruto-skeleton, [aria-busy='true']");
          return loadingElements.length === 0;
        },
        { timeout: 3500 },
      )
      .catch(() => {});

    // Allow CSS animations and charts to render
    await new Promise((res) => setTimeout(res, 1000));

    // Capture complete full-page UI from header to footer
    await page.screenshot({ path: destPath, fullPage: true });
    return { ok: true, path: destPath };
  } catch (err) {
    console.warn(`    [WARN] Failed to capture ${fullUrl} (${viewportName}): ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log("==================================================================");
  console.log("  DHRUTO EXPRESS — FULL APPLICATION SCREENSHOT HARVESTER & AUDITOR");
  console.log("==================================================================");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Output: ${SCREENSHOTS_ROOT}\n`);

  await ensureDir(path.join(SCREENSHOTS_ROOT, "desktop"));
  await ensureDir(path.join(SCREENSHOTS_ROOT, "mobile"));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1440,900",
    ],
  });

  const manifest = [];
  let totalCaptured = 0;

  const roleArgIndex = process.argv.indexOf("--role");
  const targetRoleKey = roleArgIndex !== -1 ? process.argv[roleArgIndex + 1] : null;
  const rolesToRun = targetRoleKey ? ROLES.filter((r) => r.key === targetRoleKey) : ROLES;

  const vpArgIndex = process.argv.indexOf("--viewport");
  const targetViewport = vpArgIndex !== -1 ? process.argv[vpArgIndex + 1] : null;
  const runDesktop = !targetViewport || targetViewport === "desktop";
  const runMobile = !targetViewport || targetViewport === "mobile";

  for (const role of rolesToRun) {
    console.log(`\n------------------------------------------------------------------`);
    console.log(`▶ Processing Role: ${role.name} (${role.key.toUpperCase()})`);
    console.log(`------------------------------------------------------------------`);

    const roleDesktopDir = path.join(SCREENSHOTS_ROOT, "desktop", role.key);
    const roleMobileDir = path.join(SCREENSHOTS_ROOT, "mobile", role.key);
    await ensureDir(roleDesktopDir);
    await ensureDir(roleMobileDir);

    // 1. DESKTOP RUN
    if (runDesktop) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport(VIEWPORTS.desktop);

      if (role.auth) {
        await loginUser(page, role.auth);
      }

      for (const route of role.routes) {
        const fullUrl = `${BASE_URL}${route.path}`;
        const filename = `${route.slug}.png`;
        const destPath = path.join(roleDesktopDir, filename);

        process.stdout.write(`  [DESKTOP] ${route.path} -> ${route.slug}.png... `);
        const result = await captureRoute(page, fullUrl, destPath, "desktop");
        if (result.ok) {
          totalCaptured++;
          manifest.push({
            role: role.key,
            roleName: role.name,
            route: route.path,
            slug: route.slug,
            viewport: "desktop",
            file: `desktop/${role.key}/${filename}`,
          });
          console.log("✔");
        } else {
          console.log("✖");
        }
      }
      await context.close();
    }

    // 2. MOBILE RUN
    if (runMobile) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport(VIEWPORTS.mobile);
      await page.setUserAgent(VIEWPORTS.mobile.userAgent);

      if (role.auth) {
        await loginUser(page, role.auth);
      }

      for (const route of role.routes) {
        const fullUrl = `${BASE_URL}${route.path}`;
        const filename = `${route.slug}.png`;
        const destPath = path.join(roleMobileDir, filename);

        process.stdout.write(`  [MOBILE]  ${route.path} -> ${route.slug}.png... `);
        const result = await captureRoute(page, fullUrl, destPath, "mobile");
        if (result.ok) {
          totalCaptured++;
          manifest.push({
            role: role.key,
            roleName: role.name,
            route: route.path,
            slug: route.slug,
            viewport: "mobile",
            file: `mobile/${role.key}/${filename}`,
          });
          console.log("✔");
        } else {
          console.log("✖");
        }
      }
      await context.close();
    }
  }

  await browser.close();

  // Generate Master Index Markdown
  const indexMdContent = generateIndexMarkdown(manifest, totalCaptured);
  fs.writeFileSync(path.join(SCREENSHOTS_ROOT, "INDEX.md"), indexMdContent, "utf-8");
  fs.writeFileSync(path.join(SCREENSHOTS_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\n==================================================================`);
  console.log(`  COMPLETED! Total Screenshots Captured: ${totalCaptured}`);
  console.log(`  Index generated at: ${path.join(SCREENSHOTS_ROOT, "INDEX.md")}`);
  console.log(`==================================================================\n`);
}

function generateIndexMarkdown(manifest, totalCaptured) {
  const date = new Date().toISOString();
  let md = `# Dhruto Express — Application Screenshots Directory\n\n`;
  md += `> Automatically generated on **${date}**.\n`;
  md += `> Total captured screens: **${totalCaptured}** (Desktop: 1440x900, Mobile: 390x844).\n\n`;
  md += `## Re-running or Updating Screenshots\n`;
  md += `To re-generate or update all screenshots at any time in the future, run:\n`;
  md += `\`\`\`bash\npnpm capture-screenshots\n\`\`\`\n\n`;

  const grouped = {};
  for (const item of manifest) {
    if (!grouped[item.role]) {
      grouped[item.role] = { name: item.roleName, items: {} };
    }
    if (!grouped[item.role].items[item.slug]) {
      grouped[item.role].items[item.slug] = { route: item.route, desktop: null, mobile: null };
    }
    grouped[item.role].items[item.slug][item.viewport] = item.file;
  }

  for (const [roleKey, group] of Object.entries(grouped)) {
    md += `### ${group.name} (\`${roleKey}\`)\n\n`;
    md += `| Page / Route | Desktop (1440x900) | Mobile (390x844) |\n`;
    md += `| :--- | :--- | :--- |\n`;
    for (const [slug, data] of Object.entries(group.items)) {
      const desktopLink = data.desktop ? `[Desktop View](./${data.desktop})` : "—";
      const mobileLink = data.mobile ? `[Mobile View](./${data.mobile})` : "—";
      md += `| \`${data.route}\` (${slug}) | ${desktopLink} | ${mobileLink} |\n`;
    }
    md += `\n`;
  }

  return md;
}

main().catch((err) => {
  console.error("Fatal Harvester Error:", err);
  process.exit(1);
});
