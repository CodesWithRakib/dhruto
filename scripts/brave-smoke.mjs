/**
 * Brave smoke test (Phase 8) — runs against the user's Brave profile via CDP.
 *
 * Launch Brave first:
 *   brave.exe --remote-debugging-port=9222 --user-data-dir="$env:LOCALAPPDATA\BraveAutomation"
 *
 * Usage: node scripts/brave-smoke.mjs [webBaseUrl] [apiBaseUrl]
 * Requires: API :4000 (seeded), web :5000 production build.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const WEB = process.argv[2] ?? "http://localhost:5000";
const API = process.argv[3] ?? "http://localhost:4000/api/v1";
const SHOTS = `${process.env.TEMP ?? process.env.TMPDIR ?? "/tmp"}/opencode/`;

const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.connectOverCDP("http://localhost:9222");
const context = browser.contexts()[0] ?? (await browser.newContext());
const page = await context.newPage();

try {
  // 1. Login through the real form.
  await page.goto(`${WEB}/en/login`, { waitUntil: "networkidle" });
  await page.locator("#login-email").fill("merchant@dhruto.com");
  await page.locator("#login-password").fill("dhruto123");
  await page.getByRole("button", { name: /sign in to dashboard/i }).click();
  await page.waitForURL(/\/en\/merchant\/dashboard/, { timeout: 30000 });
  check("merchant login → dashboard", true);
  await page.screenshot({ path: `${SHOTS}brave-01-dashboard.png` });

  // 2. Merchant analytics renders real KPIs (no static numbers).
  await page.goto(`${WEB}/en/merchant/analytics`, { waitUntil: "networkidle" });
  await page.getByText("Store Analytics").first().waitFor({ timeout: 20000 });
  check("merchant analytics renders", true);
  await page.screenshot({ path: `${SHOTS}brave-02-analytics.png`, fullPage: true });

  // 3. Parcel details show the Phase 6 intelligence panel (API-backed).
  const token = await page.evaluate(() => localStorage.getItem("dhruto_access_token"));
  const listRes = await fetch(`${API}/parcels?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token?.replace(/^["']|["']$/g, "")}` },
  });
  const listBody = await listRes.json();
  const parcelId = listBody.data?.[0]?.id;
  check("parcel id resolved via API", !!parcelId, parcelId ?? "none");
  if (parcelId) {
    await page.goto(`${WEB}/en/merchant/parcels/${parcelId}`, { waitUntil: "networkidle" });
    await page.getByText("Delivery intelligence").first().waitFor({ timeout: 25000 });
    check("parcel intelligence panel renders", true);
    await page.screenshot({ path: `${SHOTS}brave-03-parcel.png`, fullPage: true });
  }

  // 4. No horizontal page overflow at desktop + mobile widths.
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${WEB}/en/merchant/analytics`, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`no horizontal overflow @${width}px`, overflow <= 1, `overflow=${overflow}px`);
  }
} catch (err) {
  check("smoke flow completed", false, String(err).split("\n")[0]);
} finally {
  await page.close().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nSMOKE ${failed.length === 0 ? "PASS" : "FAIL"} (${checks.length - failed.length}/${checks.length})`);
process.exit(failed.length === 0 ? 0 : 1);
