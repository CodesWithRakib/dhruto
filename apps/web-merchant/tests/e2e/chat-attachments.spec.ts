import { expect, test, type Browser, type Page } from "@playwright/test";
import { API_BASE_URL, loginAsMerchant, readAccessToken } from "./helpers/merchant";
import { loginAsRider } from "./helpers/rider";

/**
 * Phase 6 browser journeys (attachments, voice, authorization, recovery).
 *
 * Requires the ISOLATED stack described in docs/communication/PHASE-6-TEST-REPORT.md:
 * disposable PostgreSQL + Redis + LocalStack S3, the built API and the
 * built web app, and a parcel of the seeded merchant assigned to the seeded
 * rider (`CHAT_E2E_PARCEL_ID`). Skipped unless `CHAT_E2E=1`, so the regular
 * E2E suite is unaffected.
 */

test.skip(!process.env.CHAT_E2E, "Requires the isolated Phase 6 stack (CHAT_E2E=1)");
test.describe.configure({ mode: "serial" });
// Phase 8: browser-aware media setup so the suite also runs on Firefox/WebKit
// (Chromium fake-device flags and the "microphone" grant are Chromium-only;
// Firefox gets fake streams via prefs in playwright.crossbrowser.config.ts).
const CHROMIUM_FAKE_MEDIA = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
];
test.use({
  launchOptions: [
    async ({ browserName, launchOptions }, provide) =>
      provide(
        browserName === "chromium"
          ? { ...launchOptions, args: [...(launchOptions.args ?? []), ...CHROMIUM_FAKE_MEDIA] }
          : launchOptions,
      ),
    { scope: "worker" },
  ],
  permissions: async ({ browserName }, provide) =>
    provide(browserName === "chromium" ? ["microphone"] : []),
});
const micPermissions = (browserName: string) => (browserName === "chromium" ? ["microphone"] : []);

const PARCEL_ID = process.env.CHAT_E2E_PARCEL_ID ?? "";

// 2×2 PNG (valid image so the browser actually renders it).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

let conversationUrlPath = "";
let conversationId = "";

async function composerFiles(page: Page) {
  return page.locator("#chat-composer-files");
}

async function waitForSendEnabled(page: Page) {
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled({ timeout: 30_000 });
}

async function riderPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    permissions: micPermissions(browser.browserType().name()),
  });
  const page = await context.newPage();
  await loginAsRider(page);
  return page;
}

test("merchant opens the parcel conversation and sends an image", async ({ page }) => {
  expect(PARCEL_ID, "CHAT_E2E_PARCEL_ID must be set").not.toBe("");
  await loginAsMerchant(page);
  await page.goto(`/en/merchant/parcels/${PARCEL_ID}`);
  await page.getByRole("button", { name: "Message about this parcel" }).click();
  await expect(page).toHaveURL(/\/en\/merchant\/messages\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  conversationUrlPath = new URL(page.url()).pathname;
  conversationId = conversationUrlPath.split("/").pop() ?? "";

  await (
    await composerFiles(page)
  ).setInputFiles({ name: "package-photo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("package-photo.png")).toBeVisible();
  await waitForSendEnabled(page);
  await page.getByLabel("Message", { exact: true }).fill("Package photo");
  await page.getByRole("button", { name: "Send message" }).click();

  const image = page.getByRole("log").getByAltText("package-photo.png");
  await expect(image).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 30_000 })
    .toBeGreaterThan(0);
  await expect(page.getByRole("log").getByText("Package photo")).toBeVisible();
});

test("the image opens in a preview", async ({ page }) => {
  await loginAsMerchant(page);
  await page.goto(conversationUrlPath);
  await page.getByRole("button", { name: "Open image package-photo.png" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByAltText("package-photo.png")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("a PDF uploads, sends and downloads", async ({ page }) => {
  await loginAsMerchant(page);
  await page.goto(conversationUrlPath);
  await (
    await composerFiles(page)
  ).setInputFiles({ name: "invoice.pdf", mimeType: "application/pdf", buffer: PDF });
  await waitForSendEnabled(page);
  await page.getByRole("button", { name: "Send message" }).click();
  const card = page.getByRole("log").getByText("invoice.pdf");
  await expect(card).toBeVisible({ timeout: 30_000 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download invoice.pdf" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("invoice.pdf");
  expect(page.url()).toContain(conversationUrlPath); // never navigated away
});

let voiceSent = false;

test("a voice message records (fake microphone), uploads and plays", async ({
  page,
  browserName,
}) => {
  // WebKit has no headless fake microphone; voice capture is verified on Chromium and Firefox.
  test.skip(browserName === "webkit", "No fake microphone available in headless WebKit");
  await loginAsMerchant(page);
  await page.goto(conversationUrlPath);
  await page.getByRole("button", { name: "Record a voice message" }).click();
  await expect(page.getByText(/Recording \d+:\d{2}/)).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Stop and send" }).click();
  await expect(page.getByRole("log").locator("audio").first()).toBeVisible({ timeout: 30_000 });
  voiceSent = true;
});

test("another authorized participant (the assigned rider) sees all attachments", async ({
  browser,
}) => {
  const rider = await riderPage(browser);
  await rider.goto(`/en/rider/messages/${conversationId}`);
  const log = rider.getByRole("log");
  const image = log.getByAltText("package-photo.png");
  await expect(image).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 30_000 })
    .toBeGreaterThan(0);
  await expect(log.getByText("invoice.pdf")).toBeVisible();
  if (voiceSent) await expect(log.locator("audio").first()).toBeVisible();
  await rider.context().close();
});

test("an unauthorized user cannot retrieve the attachment", async ({ page, request }) => {
  await loginAsMerchant(page);
  const token = await readAccessToken(page);
  const history = await request.get(
    `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const items = ((await history.json()).data.items ?? []) as Array<{
    attachments: Array<{ id: string; kind: string }>;
  }>;
  const imageId = items.flatMap((m) => m.attachments).find((a) => a.kind === "image")?.id;
  expect(imageId).toBeTruthy();

  // A different merchant (registered just now) — another tenant.
  const unique = Date.now().toString(36);
  const registered = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      name: "Other Merchant",
      email: `other-${unique}@e2e.test`,
      phone: `0139${String(Date.now()).slice(-7)}`,
      password: "Sup3r-secret-pass!",
      businessName: "Other Shop",
    },
  });
  expect(registered.ok(), await registered.text()).toBeTruthy();
  const otherToken = ((await registered.json()).data.tokens?.accessToken ?? "") as string;
  expect(otherToken).not.toBe("");
  const denied = await request.get(`${API_BASE_URL}/chat/attachments/${imageId}/download`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  expect(denied.status()).toBe(404);
  const anonymous = await request.get(`${API_BASE_URL}/chat/attachments/${imageId}/download`);
  expect(anonymous.status()).toBe(401);
});

test("reload and reconnect preserve history; text-only messaging still works in realtime", async ({
  page,
  browser,
}) => {
  await loginAsMerchant(page);
  await page.goto(conversationUrlPath);
  await page.reload();
  const log = page.getByRole("log");
  await expect(log.getByAltText("package-photo.png")).toBeVisible({ timeout: 30_000 });
  await expect(log.getByText("invoice.pdf")).toBeVisible();

  const rider = await riderPage(browser);
  await rider.goto(`/en/rider/messages/${conversationId}`);
  await expect(rider.getByRole("log").getByText("invoice.pdf")).toBeVisible({ timeout: 30_000 });

  // Realtime: merchant text appears for the rider without a reload.
  await page.getByLabel("Message", { exact: true }).fill("Text still works");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(rider.getByRole("log").getByText("Text still works")).toBeVisible({
    timeout: 20_000,
  });

  // Reconnect: messages sent while the rider is offline arrive after recovery.
  await rider.context().setOffline(true);
  await page.getByLabel("Message", { exact: true }).fill("Sent while you were offline");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(log.getByText("Sent while you were offline")).toBeVisible();
  await rider.context().setOffline(false);
  await expect(rider.getByRole("log").getByText("Sent while you were offline")).toBeVisible({
    timeout: 45_000,
  });
  await rider.context().close();
});
