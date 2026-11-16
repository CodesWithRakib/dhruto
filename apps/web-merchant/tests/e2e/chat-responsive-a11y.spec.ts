import { expect, test, type Page, type APIRequestContext } from "@playwright/test";
import { API_BASE_URL } from "./helpers/merchant";
import { apiLogin } from "./helpers/hub";

/**
 * Phase 8 responsive + accessibility checks for the communication UI.
 * Automated checks only (no screen reader was used): horizontal overflow per
 * viewport, keyboard reachability, dialog focus management, accessible names,
 * live region for announcements and a computed WCAG text-contrast scan.
 * Requires the isolated stack (CHAT_E2E=1) and CHAT_E2E_PARCEL_ID.
 */
test.skip(!process.env.CHAT_E2E, "Requires the isolated stack (CHAT_E2E=1)");
test.describe.configure({ mode: "serial" });

const PASSWORD = "dhruto123";
const PARCEL_ID = process.env.CHAT_E2E_PARCEL_ID ?? "";
let conversationId = "";

async function login(page: Page, email: string, landing: RegExp) {
  // Wait for hydration: a click before React attaches the submit handler is ignored (seen on WebKit).
  await page.goto("/en/login", { waitUntil: "networkidle" });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in to dashboard/i }).click();
  await expect(page).toHaveURL(landing, { timeout: 30_000 });
}

async function noHorizontalOverflow(page: Page, label: string) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `${label}: page scrolls horizontally (${scroll} > ${client})`).toBeLessThanOrEqual(
    client + 1,
  );
}

async function unnamedButtons(page: Page, scope: string): Promise<string[]> {
  return page.locator(`${scope} button:visible`).evaluateAll((els) =>
    els
      .filter((el) => {
        const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();
        const labelledBy = el.getAttribute("aria-labelledby");
        return !name && !labelledBy && !el.getAttribute("title");
      })
      .map((el) => el.outerHTML.slice(0, 120)),
  );
}

/** WCAG 2.x contrast of visible text against its effective background. */
async function contrastScan(page: Page, scope: string) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return { checked: 0, below3: [] as string[], below45: [] as string[] };
    const parse = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m || !m[1]) return null;
      const parts = m[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number);
      if (parts.length < 3) return null;
      return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 1 };
    };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const bgOf = (el: Element | null): { r: number; g: number; b: number } => {
      for (let n = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c.a > 0.5) return c;
      }
      return { r: 255, g: 255, b: 255 };
    };
    const below3: string[] = [];
    const below45: string[] = [];
    let checked = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    while (walker.nextNode()) {
      const el = walker.currentNode.parentElement;
      if (!el || seen.has(el) || !walker.currentNode.textContent?.trim()) continue;
      seen.add(el);
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (
        style.visibility === "hidden" ||
        style.display === "none" ||
        rect.width === 0 ||
        el.closest("[aria-hidden=true],.sr-only")
      )
        continue;
      const fg = parse(style.color);
      if (!fg) continue;
      const bg = bgOf(el);
      const lf = lum(fg);
      const lb = lum(bg);
      const ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
      const large =
        parseFloat(style.fontSize) >= 24 ||
        (parseFloat(style.fontSize) >= 18.66 && +style.fontWeight >= 700);
      checked += 1;
      const text = `${ratio.toFixed(2)} "${walker.currentNode.textContent.trim().slice(0, 40)}"`;
      if (ratio < 3) below3.push(text);
      else if (!large && ratio < 4.5) below45.push(text);
    }
    return { checked, below3, below45 };
  }, scope);
}

async function openThread(request: APIRequestContext) {
  const merchant = await apiLogin(request, { email: "merchant@dhruto.com", password: PASSWORD });
  const customer = await apiLogin(request, { email: "customer@dhruto.com", password: PASSWORD });
  const res = await request.post(`${API_BASE_URL}/chat/conversations`, {
    headers: { Authorization: `Bearer ${merchant}` },
    data: { type: "PARCEL_DELIVERY", parcelId: PARCEL_ID },
  });
  conversationId = (await res.json()).data.id;
  await request.post(`${API_BASE_URL}/chat/conversations`, {
    headers: { Authorization: `Bearer ${customer}` },
    data: { type: "PARCEL_DELIVERY", parcelId: PARCEL_ID },
  });
}

test.beforeAll(async ({ request }) => {
  expect(PARCEL_ID).not.toBe("");
  await openThread(request);
});

test("admin Communication Center: layout, keyboard tabs, labels, contrast", async ({
  page,
}, info) => {
  await login(page, "admin@dhruto.com", /\/en\/admin\/dashboard/);
  await page.goto("/en/admin/communications?tab=overview");
  await expect(page.getByRole("heading", { name: "Communication Center" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Conversations", { exact: true })).toBeVisible();
  await noHorizontalOverflow(page, "communications overview");
  await info.attach("communications", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  // Keyboard: focus the active tab and move with the arrow key (roving tabindex).
  await page.getByRole("tab", { name: "Overview" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Inbox" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("search", { name: "Inbox filters" })).toBeVisible();
  await noHorizontalOverflow(page, "communications inbox");

  expect(await unnamedButtons(page, "main")).toEqual([]);
  const contrast = await contrastScan(page, "main");
  await info.attach("contrast-admin", {
    body: JSON.stringify(contrast, null, 1),
    contentType: "application/json",
  });
  expect(contrast.checked).toBeGreaterThan(10);
  expect(contrast.below3, "text below 3:1 contrast").toEqual([]);
});

test("workspace reason gate and dialogs: focus trapped, Escape closes, focus restored", async ({
  page,
}) => {
  await login(page, "admin@dhruto.com", /\/en\/admin\/dashboard/);
  await page.goto(`/en/admin/communications/${conversationId}`);
  const reason = page.getByLabel("Reason");
  await expect(reason).toBeFocused({ timeout: 30_000 }); // autofocus on the gate
  await reason.fill("Accessibility QA case 4471 review");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Open conversation" })).toBeFocused();
  await page.keyboard.press("Enter");
  // The history region is labelled even when the conversation has no messages yet.
  await expect(page.getByRole("region", { name: "Message history (audited)" })).toBeVisible({
    timeout: 30_000,
  });
  await noHorizontalOverflow(page, "workspace");

  const escalate = page
    .getByRole("region", { name: "Escalation" })
    .getByRole("button", { name: "Escalate" });
  await escalate.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")))
    .toBe(true);
  for (let i = 0; i < 6; i += 1) await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")),
    "focus escaped the dialog",
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(escalate).toBeFocused();
  expect(await unnamedButtons(page, "main")).toEqual([]);
});

test("participant messenger: layout, labelled composer, keyboard send, live announcements", async ({
  page,
}, info) => {
  await login(page, "customer@dhruto.com", /\/en\/customer/);
  await page.goto(`/en/customer/messages/${conversationId}`);
  const composer = page.getByLabel("Message", { exact: true });
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await noHorizontalOverflow(page, "messenger");
  const text = `keyboard send ${Date.now()}`;
  await composer.fill(text);
  await composer.press("Enter");
  await expect(page.getByRole("log").getByText(text)).toBeVisible({ timeout: 30_000 });
  await expect(composer).toBeFocused();
  // Toast region (sonner) exposes a polite live region for error/success announcements.
  expect(await page.locator("[aria-live]").count()).toBeGreaterThan(0);
  expect(await unnamedButtons(page, "main")).toEqual([]);
  const contrast = await contrastScan(page, "main");
  await info.attach("contrast-messenger", {
    body: JSON.stringify(contrast, null, 1),
    contentType: "application/json",
  });
  expect(contrast.below3, "text below 3:1 contrast").toEqual([]);
  await info.attach("messenger", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
