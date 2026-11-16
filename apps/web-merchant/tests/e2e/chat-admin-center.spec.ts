import { execSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { API_BASE_URL } from "./helpers/merchant";
import { apiLogin } from "./helpers/hub";

/**
 * Phase 7 browser journeys — Admin Communication Center.
 *
 * Requires the ISOLATED stack in docs/communication/PHASE-7-TEST-REPORT.md
 * (disposable PostgreSQL + Redis + LocalStack S3 + a REAL clamd container,
 * built API and web app, seeded users, `admin@dhruto.com` holding the
 * restricted-attachment grants, `admin2@dhruto.com` without grants, and a
 * parcel of the seeded merchant assigned to the seeded rider and addressed
 * to the seeded customer). Skipped unless `CHAT_E2E=1`.
 */

test.skip(!process.env.CHAT_E2E, "Requires the isolated Phase 7 stack (CHAT_E2E=1)");
test.describe.configure({ mode: "serial" });

const PARCEL_ID = process.env.CHAT_E2E_PARCEL_ID ?? "";
const TRACKING = process.env.CHAT_E2E_TRACKING_CODE ?? "";
const CLAMAV_CONTAINER = process.env.CHAT_E2E_CLAMAV_CONTAINER ?? "";
const PASSWORD = "dhruto123";
const REASON = "E2E case 7781: customer complaint review";
const NOTE = `E2E-INTERNAL-${randomUUID().slice(0, 8)}`;
const STAFF_TEXT = `Operations team here ${randomUUID().slice(0, 6)}`;

let conversationId = "";
let merchantMessageId = "";
const tokens: Record<string, string> = {};

async function login(page: Page, email: string, landing: RegExp): Promise<void> {
  // Wait for hydration: a click before React attaches the submit handler is ignored (seen on WebKit).
  await page.goto("/en/login", { waitUntil: "networkidle" });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in to dashboard/i }).click();
  await expect(page).toHaveURL(landing, { timeout: 30_000 });
}

const api = (request: APIRequestContext, who: string) => {
  const headers = { Authorization: `Bearer ${tokens[who]}` };
  return {
    get: (path: string) => request.get(`${API_BASE_URL}${path}`, { headers }),
    post: (path: string, data: unknown) =>
      request.post(`${API_BASE_URL}${path}`, { headers, data }),
  };
};

async function uploadAndSend(
  request: APIRequestContext,
  name: string,
  body: string,
): Promise<string> {
  const bytes = Buffer.from(body);
  const ticket = await api(request, "merchant").post(
    `/chat/conversations/${conversationId}/attachments`,
    {
      originalFilename: name,
      mimeType: "application/pdf",
      sizeBytes: bytes.byteLength,
      checksumSha256: createHash("sha256").update(bytes).digest("hex"),
    },
  );
  expect(ticket.status()).toBe(201);
  const t = (await ticket.json()).data;
  const put = await request.fetch(t.upload.url, {
    method: "PUT",
    headers: t.upload.headers,
    data: bytes,
  });
  expect(put.status()).toBe(200);
  expect(
    (
      await api(request, "merchant").post(`/chat/attachments/${t.attachment.id}/complete`, {})
    ).status(),
  ).toBe(200);
  const sent = await api(request, "merchant").post(
    `/chat/conversations/${conversationId}/messages`,
    {
      clientMessageId: randomUUID(),
      type: "FILE",
      attachmentIds: [t.attachment.id],
    },
  );
  expect(sent.status()).toBe(201);
  return t.attachment.id as string;
}

test.beforeAll(async ({ request }) => {
  expect(PARCEL_ID, "CHAT_E2E_PARCEL_ID must be set").not.toBe("");
  for (const [who, email] of [
    ["admin", "admin@dhruto.com"],
    ["admin2", "admin2@dhruto.com"],
    ["merchant", "merchant@dhruto.com"],
    ["customer", "customer@dhruto.com"],
    ["manager", "hubmanager@dhruto.com"],
  ] as const) {
    tokens[who] = await apiLogin(request, { email, password: PASSWORD });
  }
  // Participants create the parcel thread through the normal API.
  const opened = await api(request, "merchant").post("/chat/conversations", {
    type: "PARCEL_DELIVERY",
    parcelId: PARCEL_ID,
  });
  conversationId = (await opened.json()).data.id;
  await api(request, "customer").post("/chat/conversations", {
    type: "PARCEL_DELIVERY",
    parcelId: PARCEL_ID,
  });
  const sent = await api(request, "merchant").post(
    `/chat/conversations/${conversationId}/messages`,
    {
      clientMessageId: randomUUID(),
      type: "TEXT",
      content: "Your parcel ships today",
    },
  );
  merchantMessageId = (await sent.json()).data.id;
});

test("1. an authorized admin opens the Communication Center with live metrics", async ({
  page,
}) => {
  await login(page, "admin@dhruto.com", /\/en\/admin\/dashboard/);
  await page.getByRole("link", { name: "Communication Center" }).first().click();
  await expect(page.getByRole("heading", { name: "Communication Center" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Conversations", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Attachment security" })).toBeVisible();
});

test("2. the admin filters and searches the operational inbox", async ({ page }) => {
  await login(page, "admin@dhruto.com", /\/en\/admin\/dashboard/);
  await page.goto("/en/admin/communications?tab=inbox");
  await page.getByLabel("Type").first().selectOption("PARCEL_DELIVERY");
  await page.getByLabel("Search").first().fill(TRACKING.toLowerCase());
  await page.getByRole("button", { name: "Search" }).first().click();
  const results = page.getByRole("list", { name: "Conversations" });
  await expect(results.getByRole("link")).toHaveCount(1, { timeout: 15_000 });
  await expect(results.getByRole("link", { name: new RegExp(`Parcel ${TRACKING}`) })).toBeVisible();
  // Non-participant: metadata only, no preview of the merchant's message.
  await expect(results.getByText("Your parcel ships today")).toHaveCount(0);
});

test("3-4. the admin opens the conversation with a reason, joins visibly and sends a staff message", async ({
  page,
  request,
}) => {
  await login(page, "admin@dhruto.com", /\/en\/admin\/dashboard/);
  await page.goto(`/en/admin/communications/${conversationId}`);
  await expect(page.getByRole("heading", { name: "Open conversation as staff" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByLabel("Reason").fill(REASON);
  await page.getByRole("button", { name: "Open conversation" }).click();
  const history = page.getByRole("list", { name: "Message history (audited)" });
  await expect(history.getByText("Your parcel ships today")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Join as staff" }).click();
  await page.getByRole("dialog").getByLabel("Reason").fill(REASON);
  await page.getByRole("dialog").getByRole("button", { name: "Join conversation" }).click();
  await page.getByRole("link", { name: "Open in messenger" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/admin/messages/${conversationId}$`), {
    timeout: 30_000,
  });
  await page.getByLabel("Message", { exact: true }).fill(STAFF_TEXT);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log").getByText(STAFF_TEXT)).toBeVisible({ timeout: 30_000 });

  // The customer sees it, sent by the admin (platform role ADMIN, moderator).
  // The bubble appears optimistically; wait until the server has persisted it.
  type Item = { content: string | null; senderId: string | null };
  let staffMsg: Item | undefined;
  await expect
    .poll(
      async () => {
        const res = await api(request, "customer").get(
          `/chat/conversations/${conversationId}/messages`,
        );
        staffMsg = ((await res.json()).data.items as Item[]).find((m) => m.content === STAFF_TEXT);
        return Boolean(staffMsg);
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  const detail = await (
    await api(request, "customer").get(`/chat/conversations/${conversationId}`)
  ).json();
  const sender = detail.data.participants.find(
    (p: { userId: string }) => p.userId === staffMsg?.senderId,
  );
  expect(sender.platformRole).toBe("ADMIN");
  expect(sender.role).toBe("MODERATOR");
});

test("5-6. authorized staff create and read an internal note; the customer can never retrieve it", async ({
  page,
  browser,
  request,
}) => {
  await login(page, "admin@dhruto.com", /\/en\/admin\/dashboard/);
  await page.goto(`/en/admin/communications/${conversationId}`);
  await page.getByLabel("Reason").fill(REASON);
  await page.getByRole("button", { name: "Open conversation" }).click();
  await page.getByPlaceholder("Write an internal note…").fill(`Suspected address fraud ${NOTE}`);
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(
    page.getByRole("list", { name: "Internal notes" }).getByText(NOTE, { exact: false }),
  ).toBeVisible({ timeout: 15_000 });

  expect(
    (
      await api(request, "customer").get(`/chat/admin/conversations/${conversationId}/notes`)
    ).status(),
  ).toBe(403);
  const customerHistory = await api(request, "customer").get(
    `/chat/conversations/${conversationId}/messages`,
  );
  expect(await customerHistory.text()).not.toContain(NOTE);
  const search = await api(request, "customer").get(`/chat/search?q=${NOTE}`);
  expect((await search.json()).data.items).toEqual([]);

  const context = await browser.newContext();
  const customer = await context.newPage();
  await login(customer, "customer@dhruto.com", /\/en\/customer/);
  await customer.goto(`/en/customer/messages/${conversationId}`);
  await expect(customer.getByRole("log").getByText(STAFF_TEXT)).toBeVisible({ timeout: 30_000 });
  await expect(customer.getByText(NOTE, { exact: false })).toHaveCount(0);
  await context.close();
});

test("7. the admin escalates and resolves the conversation", async ({ page }) => {
  await login(page, "admin@dhruto.com", /\/en\/admin\/dashboard/);
  await page.goto(`/en/admin/communications/${conversationId}`);
  await page.getByLabel("Reason").fill(REASON);
  await page.getByRole("button", { name: "Open conversation" }).click();
  const card = page.getByRole("region", { name: "Escalation" });
  await card.getByRole("button", { name: "Escalate" }).click();
  await page.getByRole("dialog").getByLabel("Reason").fill("Recipient threatened the rider");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(card.getByText("Escalated", { exact: true })).toBeVisible({ timeout: 15_000 });
  await card.getByRole("button", { name: "Take into review" }).click();
  await expect(card.getByText("In review", { exact: true })).toBeVisible({ timeout: 15_000 });
  await card.getByRole("button", { name: "Resolve" }).click();
  await page.getByRole("dialog").getByLabel("Reason").fill("Rider reassigned; merchant informed");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(card.getByText("Resolved", { exact: true })).toBeVisible({ timeout: 15_000 });
});

test("8. the admin reviews and resolves a report", async ({ page, request }) => {
  const reported = await api(request, "customer").post(
    `/chat/messages/${merchantMessageId}/reports`,
    { reason: "ABUSE", details: "Rude tone" },
  );
  expect(reported.status()).toBe(201);
  await login(page, "admin@dhruto.com", /\/en\/admin\/dashboard/);
  await page.goto("/en/admin/communications?tab=reports");
  const list = page.getByRole("list", { name: "Reports" });
  await expect(list.getByText("Rude tone")).toBeVisible({ timeout: 15_000 });
  await list.getByRole("button", { name: "Start review" }).first().click();
  await page.getByLabel("Status").selectOption("UNDER_REVIEW");
  await expect(list.getByText("Rude tone")).toBeVisible({ timeout: 15_000 });
  await list.getByRole("button", { name: "Resolve" }).first().click();
  await page.getByRole("dialog").getByLabel("Reason").fill("Merchant warned about tone");
  await page.getByRole("dialog").getByRole("button", { name: "Resolve" }).click();
  // While a dialog is open the page body is aria-hidden; wait for it to close first.
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });
  await expect(list.getByText("Rude tone")).toHaveCount(0, { timeout: 15_000 });
  await expect
    .poll(async () => {
      const reports = await (
        await api(request, "admin").get(`/chat/admin/reports?conversationId=${conversationId}`)
      ).json();
      return reports.data.items[0]?.status;
    })
    .toBe("RESOLVED");
});

test("9a. a file is invisible to participants until the real scanner clears it", async ({
  browser,
  request,
}) => {
  const id = await uploadAndSend(request, "invoice-clean.pdf", "%PDF-1.4\nclean invoice\n%%EOF\n");
  const context = await browser.newContext();
  const customer = await context.newPage();
  await login(customer, "customer@dhruto.com", /\/en\/customer/);
  await customer.goto(`/en/customer/messages/${conversationId}`);
  // Clean once clamd answered: the normal document card with a download button appears.
  await expect(customer.getByRole("button", { name: "Download invoice-clean.pdf" })).toBeVisible({
    timeout: 45_000,
  });
  const res = await api(request, "customer").get(`/chat/attachments/${id}/download`);
  expect(res.status()).toBe(200);
  await context.close();
});

// Phase 8: a clamd outage no longer consumes retry budgets — files stay
// "security check in progress" (still blocked) and recover on their own.
test("9b. scanner outage fails closed and recovers by itself; granted staff can inspect; ordinary admin is denied", async ({
  page,
  browser,
  request,
}) => {
  test.skip(!CLAMAV_CONTAINER, "CHAT_E2E_CLAMAV_CONTAINER not set");
  execSync(`docker pause ${CLAMAV_CONTAINER}`);
  let id = "";
  try {
    id = await uploadAndSend(request, "invoice-outage.pdf", "%PDF-1.4\noutage invoice\n%%EOF\n");
    // For 20 s (≈10 scan intervals) the file must never become available nor be marked FAILED.
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const res = await api(request, "customer").get(`/chat/attachments/${id}/download`);
      expect(res.status()).toBe(409);
      expect((await res.json()).errorCode).toBe("CHAT_ATTACHMENT_SCAN_PENDING");
      await new Promise((r) => setTimeout(r, 2000));
    }

    const context = await browser.newContext();
    const customer = await context.newPage();
    await login(customer, "customer@dhruto.com", /\/en\/customer/);
    await customer.goto(`/en/customer/messages/${conversationId}`);
    await expect(customer.getByText("Security check in progress…").first()).toBeVisible({
      timeout: 30_000,
    });
    await context.close();

    // Ordinary admin (no grant): no queue, no restricted download.
    expect((await api(request, "admin2").get("/chat/admin/attachments")).status()).toBe(403);
    expect(
      (
        await api(request, "admin2").get(
          `/chat/admin/attachments/${id}/download?reason=${encodeURIComponent(REASON)}`,
        )
      ).status(),
    ).toBe(404);

    // Granted admin inspects the pending file in the scan queue and downloads it with a reason.
    await login(page, "admin@dhruto.com", /\/en\/admin\/dashboard/);
    await page.goto("/en/admin/communications?tab=attachments");
    await page.getByLabel("Scan state").selectOption("PENDING");
    const queue = page.getByRole("list", { name: "Attachments" });
    await expect(queue.getByText("invoice-outage.pdf")).toBeVisible({ timeout: 15_000 });
    const downloadPromise = page.waitForEvent("download");
    await queue.getByRole("button", { name: "Download" }).first().click();
    await page.getByRole("dialog").getByLabel("Reason").fill(REASON);
    await page.getByRole("dialog").getByRole("button", { name: "Download" }).click();
    expect((await downloadPromise).suggestedFilename()).toBe("invoice-outage.pdf");
  } finally {
    execSync(`docker unpause ${CLAMAV_CONTAINER}`);
  }

  // Recovery without any staff action once clamd answers again.
  await expect
    .poll(
      async () => (await api(request, "customer").get(`/chat/attachments/${id}/download`)).status(),
      { timeout: 60_000, intervals: [2000] },
    )
    .toBe(200);
});

test("10. unauthorized staff are denied", async ({ page, request }) => {
  expect((await api(request, "manager").get("/chat/admin/inbox")).status()).toBe(403);
  expect((await api(request, "merchant").get("/chat/admin/inbox")).status()).toBe(403);
  await login(page, "admin2@dhruto.com", /\/en\/admin\/dashboard/);
  await page.goto("/en/admin/communications?tab=attachments");
  await expect(page.getByText("Restricted area")).toBeVisible({ timeout: 30_000 });
});

test("11. audit history shows the relevant actions", async ({ page }) => {
  await login(page, "admin@dhruto.com", /\/en\/admin\/dashboard/);
  await page.goto("/en/admin/communications?tab=audit");
  const list = page.getByRole("list", { name: "Audit records" });
  await page.getByLabel("Action").selectOption("ADMIN_INTERVENTION");
  await expect(list.getByText("Staff intervention").first()).toBeVisible({ timeout: 15_000 });
  await expect(list.getByText(`Reason: ${REASON}`).first()).toBeVisible();
  await page.getByLabel("Action").selectOption("ESCALATION_CHANGED");
  // Platform-wide history: at least this run's three escalation changes.
  await expect
    .poll(() => list.getByText("Escalation changed").count(), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(3);
  await page.getByLabel("Action").selectOption("ATTACHMENT_RESTRICTED_ACCESSED");
  await expect(list.getByText("Restricted attachment accessed").first()).toBeVisible({
    timeout: 15_000,
  });
});
