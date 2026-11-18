/**
 * Automated full-route audit across every role.
 *
 * For each role it logs in through the real UI, then visits every page under
 * that role's route group (plus public pages) and records:
 *   - document HTTP status and final URL (unexpected redirects)
 *   - uncaught page errors and console errors (incl. next-intl MISSING_MESSAGE)
 *   - API responses with status >= 400 and failed network requests
 *   - visible rendering defects ("undefined", "NaN", "[object Object]", "Invalid Date",
 *     error boundaries, 404 screens)
 *   - load time and a full-page screenshot
 * It also checks cross-role isolation: each role opening another role's
 * dashboard must be redirected away.
 *
 * Usage:  node scripts/audit-all-routes.mjs [--headed] [--role=MERCHANT] [--viewport=desktop|mobile|both]
 * Output: <AUDIT_OUT_DIR or ./audit-output>/report.json + summary.md + screenshots/
 */
import fs from "node:fs";
import path from "node:path";
import pkg from "../apps/web-merchant/node_modules/@playwright/test/index.js";

const { chromium } = pkg;

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const API_URL = process.env.API_URL || "http://localhost:4000/api/v1";
const PASSWORD = process.env.AUDIT_PASSWORD || "dhruto123";
const OUT_DIR = path.resolve(process.env.AUDIT_OUT_DIR || "audit-output");
const HEADED = process.argv.includes("--headed");
const ONLY_ROLE = process.argv.find((a) => a.startsWith("--role="))?.split("=")[1];
const VIEWPORT_ARG = process.argv.find((a) => a.startsWith("--viewport="))?.split("=")[1] || "both";

/** Desktop = full-width monitor; mobile = touch phone emulation (rider/customer are mobile-first). */
const VIEWPORTS = {
  desktop: { viewport: { width: 1920, height: 1080 } },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
};
const ACTIVE_VIEWPORTS = VIEWPORT_ARG === "both" ? ["desktop", "mobile"] : [VIEWPORT_ARG];

const ROLES = {
  MERCHANT: { email: "merchant@dhruto.com", group: "(merchant)", home: "/en/merchant/dashboard" },
  HUB_MANAGER: { email: "hubmanager@dhruto.com", group: "(hub)", home: "/en/hub/dashboard" },
  RIDER: { email: "rider@dhruto.com", group: "(rider)", home: "/en/rider/dashboard" },
  CUSTOMER: { email: "customer@dhruto.com", group: "(customer)", home: "/en/customer/dashboard" },
  // Mirrors ROLE_CONFIG.ADMIN.sections in apps/web-merchant/config/roles.ts (supervision access).
  ADMIN: {
    email: "admin@dhruto.com",
    group: "(admin)",
    home: "/en/admin/dashboard",
    canAlsoOpen: ["HUB_MANAGER", "RIDER"], // merchant pages redirect admins (config/roles.ts)
  },
};

const TEXT_DEFECTS = [
  { id: "undefined-text", re: /(^|[\s:(])undefined([\s)]|$)/m },
  { id: "nan-text", re: /(^|[\s৳$:(])NaN([\s%)]|$)/m },
  { id: "object-object", re: /\[object Object\]/ },
  { id: "invalid-date", re: /Invalid Date/ },
  { id: "error-boundary", re: /Something went wrong|Application error|Unhandled Runtime Error/i },
  { id: "not-found-screen", re: /This page could not be found|Page not found/i },
];

const IGNORED_CONSOLE = [/Download the React DevTools/, /favicon/i, /\[HMR\]/, /\[Fast Refresh\]/];

// --------------------------------------------------------------------------
// API helpers for resolving dynamic route params with each role's own data.
// --------------------------------------------------------------------------
async function apiLogin(email) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailOrPhone: email, password: PASSWORD }),
  });
  const json = await res.json();
  return {
    token: json.data?.tokens?.accessToken || json.data?.accessToken,
    user: json.data?.user,
  };
}

async function apiGet(token, p) {
  try {
    const res = await fetch(`${API_URL}${p}`, { headers: { Authorization: `Bearer ${token}` } });
    return (await res.json())?.data;
  } catch {
    return undefined;
  }
}

const firstItem = (d) => (Array.isArray(d) ? d[0] : (d?.items?.[0] ?? d?.data?.[0]));

async function resolveParams(role, email) {
  const { token, user } = await apiLogin(email);
  if (!token) throw new Error(`API login failed for ${role}`);
  const params = { sections: ["delivery", "finance"] };

  const parcel = firstItem(await apiGet(token, "/parcels?limit=5"));
  params.id = parcel?.id;
  params.code = parcel?.trackingCode;
  const conv = firstItem(await apiGet(token, "/chat/conversations?limit=5"));
  params.conversationId = conv?.id;

  if (role === "RIDER") {
    const task = firstItem(await apiGet(token, "/riders/me/tasks"));
    params.taskId = task?.parcelId || task?.id || task?.parcel?.id;
  }
  if (role === "HUB_MANAGER") {
    params.bagId = firstItem(await apiGet(token, "/bags?limit=5"))?.id;
    const hubId = user?.hubId || firstItem(await apiGet(token, "/hubs"))?.id;
    if (hubId) params.manifestId = firstItem(await apiGet(token, `/hubs/${hubId}/manifests`))?.id;
  }
  if (!params.code) {
    const adminTok = (await apiLogin(ROLES.ADMIN.email)).token;
    params.code = firstItem(await apiGet(adminTok, "/parcels?limit=1"))?.trackingCode;
  }
  return params;
}

// --------------------------------------------------------------------------
// Route discovery from the Next.js app directory.
// --------------------------------------------------------------------------
function discoverPages(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return discoverPages(full, base);
    return d.name === "page.tsx" ? [path.relative(base, full).replace(/\\/g, "/")] : [];
  });
}

function routesFor(group, params) {
  const appDir = path.resolve("apps/web-merchant/app/[locale]");
  const out = [];
  const skipped = [];
  for (const file of discoverPages(appDir)) {
    if (!file.startsWith(`${group}/`)) continue;
    let route = "/" + file.replace(/\/page\.tsx$/, "").replace(/\([^)]+\)\/?/g, "");
    route = route.replace(/\/$/, "");
    const variants = route.includes("[section]")
      ? params.sections.map((s) => route.replace("[section]", s))
      : [route];
    for (let r of variants) {
      const repl = {
        "[id]": r.includes("/bags/")
          ? params.bagId
          : r.includes("/manifests/")
            ? params.manifestId
            : r.includes("/tasks/")
              ? params.taskId
              : params.id,
        "[code]": params.code,
        "[conversationId]": params.conversationId,
      };
      let missing = null;
      for (const [k, v] of Object.entries(repl)) {
        if (r.includes(k)) {
          if (!v) missing = k;
          else r = r.replace(k, encodeURIComponent(v));
        }
      }
      if (missing) skipped.push({ route, reason: `no data for ${missing}` });
      else out.push(`/en${r}`);
    }
  }
  return { routes: [...new Set(out)], skipped };
}

// --------------------------------------------------------------------------
// Page probe.
// --------------------------------------------------------------------------
function attachCollectors(page) {
  const bucket = { console: [], pageErrors: [], api: [], failed: [] };
  page.on("console", (m) => {
    if (m.type() !== "error" && m.type() !== "warning") return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    if (m.type() === "warning" && !/MISSING_MESSAGE|hydrat|key/i.test(text)) return;
    bucket.console.push(`${m.type()}: ${text.slice(0, 400)}`);
  });
  page.on("pageerror", (e) => bucket.pageErrors.push(e.message.slice(0, 400)));
  page.on("response", (r) => {
    const url = r.url();
    if (r.status() >= 400 && (url.startsWith(API_URL) || url.includes("/api/"))) {
      bucket.api.push(`${r.request().method()} ${r.status()} ${url.replace(API_URL, "")}`);
    }
  });
  page.on("requestfailed", (r) => {
    const err = r.failure()?.errorText || "";
    if (/ERR_ABORTED/.test(err)) return; // navigation cancellations
    bucket.failed.push(`${r.method()} ${r.url().replace(API_URL, "")} ${err}`);
  });
  return bucket;
}

function reset(b) {
  b.console.length = b.pageErrors.length = b.api.length = b.failed.length = 0;
}

async function probe(page, bucket, role, route, shotDir, vp) {
  reset(bucket);
  const t0 = Date.now();
  let status = 0;
  let navError = null;
  try {
    const resp = await page.goto(`${BASE_URL}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    status = resp?.status() ?? 0;
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
  } catch (e) {
    navError = e.message.split("\n")[0];
  }
  const loadMs = Date.now() - t0;
  const finalPath = new URL(page.url()).pathname;
  const text = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
  const textDefects = TEXT_DEFECTS.filter((d) => d.re.test(text)).map((d) => {
    const m = text.match(d.re);
    const i = m?.index ?? 0;
    return `${d.id}: "…${text.slice(Math.max(0, i - 40), i + 50).replace(/\s+/g, " ")}…"`;
  });
  const overflowPx = await page
    .evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    .catch(() => 0);
  const shot = path.join(shotDir, `${vp}_${role}${route.replace(/[^a-z0-9]+/gi, "_")}.png`);
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});

  const issues = [];
  if (navError) issues.push(`navigation: ${navError}`);
  if (status >= 400) issues.push(`document HTTP ${status}`);
  if (finalPath !== route && !finalPath.startsWith(route))
    issues.push(`redirected to ${finalPath}`);
  if (loadMs > 8000) issues.push(`slow load ${loadMs}ms`);
  if (overflowPx > 2) issues.push(`layout: horizontal overflow ${overflowPx}px`);
  issues.push(...bucket.pageErrors.map((e) => `pageerror: ${e}`));
  issues.push(...[...new Set(bucket.api)].map((e) => `api: ${e}`));
  issues.push(...[...new Set(bucket.failed)].map((e) => `netfail: ${e}`));
  issues.push(...[...new Set(bucket.console)].map((e) => `console ${e}`));
  issues.push(...textDefects.map((e) => `render ${e}`));
  return {
    role,
    viewport: vp,
    route,
    status,
    finalPath,
    loadMs,
    issues,
    screenshot: path.relative(OUT_DIR, shot),
  };
}

async function uiLogin(page, email, home) {
  // Wait for hydration so the submit is handled by React, not a native form post.
  await page.goto(`${BASE_URL}/en/login`, { waitUntil: "networkidle" });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in to dashboard/i }).click();
  try {
    await page.waitForURL((u) => u.pathname.startsWith(home), { timeout: 45000 });
  } catch (e) {
    await page.screenshot({ path: path.join(OUT_DIR, `login-failure-${email}.png`) });
    throw new Error(`${e.message.split("\n")[0]} (stuck at ${page.url()})`);
  }
}

// --------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(path.join(OUT_DIR, "screenshots"), { recursive: true });
  const shotDir = path.join(OUT_DIR, "screenshots");
  const browser = await chromium.launch({ headless: !HEADED });
  const results = [];
  const skipped = [];

  const writeReport = () => {
    const report = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, results, skipped };
    fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, "summary.md"), summarize(report));
  };
  try {
    for (const vp of ACTIVE_VIEWPORTS) {
      console.log(`\n##### VIEWPORT: ${vp} #####`);
      await runViewport(browser, vp, results, skipped, shotDir);
      writeReport(); // persist partial results after each viewport pass
    }
  } finally {
    writeReport();
    await browser.close();
  }
  const bad = results.filter((r) => r.issues.length);
  console.log(
    `\nAudited ${results.length} checks, ${bad.length} with issues, ${skipped.length} skipped.`,
  );
  console.log(`Report: ${path.join(OUT_DIR, "summary.md")}`);
}

async function runViewport(browser, vp, results, skipped, shotDir) {
  // Public pages (anonymous context).
  if (!ONLY_ROLE || ONLY_ROLE === "PUBLIC") {
    const ctx = await browser.newContext(VIEWPORTS[vp]);
    const page = await ctx.newPage();
    const bucket = attachCollectors(page);
    const adminTok = (await apiLogin(ROLES.ADMIN.email)).token;
    const code = firstItem(await apiGet(adminTok, "/parcels?limit=1"))?.trackingCode;
    const groups = ["(public)", "(auth)"];
    const routes = groups.flatMap((g) => routesFor(g, { sections: [], code }).routes);
    for (const r of [...routes, "/en/this-route-does-not-exist"]) {
      const res = await probe(page, bucket, "PUBLIC", r, shotDir, vp);
      // The unknown route is expected to render a 404 screen.
      if (r.endsWith("does-not-exist")) {
        res.issues = res.issues.filter((i) => !/not-found-screen|HTTP 404|api: GET 404/.test(i));
      }
      results.push(res);
      log(res);
    }
    await ctx.close();
  }

  for (const [role, cfg] of Object.entries(ROLES)) {
    if (ONLY_ROLE && ONLY_ROLE !== role) continue;
    console.log(`\n=== ${role} (${vp}) ===`);
    let params;
    try {
      params = await resolveParams(role, cfg.email);
    } catch (e) {
      // API down or restarting: record it and continue with the next role.
      const res = { role, viewport: vp, route: "[setup]", issues: [`setup failed: ${e.message}`] };
      results.push(res);
      log(res);
      continue;
    }
    const { routes, skipped: sk } = routesFor(cfg.group, params);
    if (vp === ACTIVE_VIEWPORTS[0]) skipped.push(...sk.map((s) => ({ role, ...s })));

    const ctx = await browser.newContext(VIEWPORTS[vp]);
    const page = await ctx.newPage();
    const bucket = attachCollectors(page);
    try {
      await uiLogin(page, cfg.email, cfg.home);
    } catch (e) {
      results.push({
        role,
        viewport: vp,
        route: "/en/login",
        issues: [`login failed: ${e.message.split("\n")[0]}`],
      });
      await ctx.close();
      continue;
    }
    for (const r of routes) {
      const res = await probe(page, bucket, role, r, shotDir, vp);
      results.push(res);
      log(res);
    }

    // Cross-role isolation: other roles' dashboards must redirect away (once, first viewport).
    for (const [other, ocfg] of Object.entries(ROLES)) {
      if (other === role || vp !== ACTIVE_VIEWPORTS[0]) continue;
      if (cfg.canAlsoOpen?.includes(other)) continue; // intentionally permitted
      reset(bucket);
      await page.goto(`${BASE_URL}${ocfg.home}`, { waitUntil: "domcontentloaded" }).catch(() => {});
      // Poll for the client-side guard redirect (dev compiles can delay hydration).
      await page
        .waitForURL((u) => !u.pathname.startsWith(ocfg.home), { timeout: 15000 })
        .catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      const landed = new URL(page.url()).pathname;
      const issues = [];
      if (landed.startsWith(ocfg.home))
        issues.push(`ACCESS LEAK: ${role} can open ${other} dashboard`);
      // Requests rejected with 403 mean the wrong-role page mounted before the redirect.
      const forbidden = [...new Set(bucket.api)].filter((a) => / 403 /.test(a));
      if (forbidden.length) issues.push(`wrong-role page mounted, fired: ${forbidden.join(", ")}`);
      const res = {
        role,
        viewport: vp,
        route: `[isolation] ${ocfg.home}`,
        finalPath: landed,
        issues,
      };
      results.push(res);
      log(res);
    }
    await ctx.close();
  }
}

function log(r) {
  const tag = r.issues.length ? `ISSUES(${r.issues.length})` : "OK";
  const ms = r.loadMs ? ` ${r.loadMs}ms` : "";
  console.log(`[${r.viewport ?? "-"}][${r.role}] ${r.route.padEnd(56)} ${tag}${ms}`);
  for (const i of r.issues) console.log(`     - ${i}`);
}

function summarize({ generatedAt, results, skipped }) {
  const lines = [`# Route audit — ${generatedAt}`, ""];
  const bad = results.filter((r) => r.issues.length);
  lines.push(
    `Checks: ${results.length} · with issues: ${bad.length} · skipped: ${skipped.length}`,
    "",
  );
  for (const r of bad) {
    lines.push(`## [${r.viewport ?? "-"}] [${r.role}] ${r.route}`);
    for (const i of r.issues) lines.push(`- ${i}`);
    lines.push("");
  }
  if (skipped.length) {
    lines.push("## Skipped (no seed data for dynamic param)");
    for (const s of skipped) lines.push(`- [${s.role}] ${s.route} — ${s.reason}`);
  }
  return lines.join("\n");
}

main().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(1);
});
