import { test, expect } from "@playwright/test";
import {
  API_BASE_URL,
  createParcelViaApi,
  loginAsMerchant,
  makeBookingFixture,
  readAccessToken,
} from "./helpers/merchant";

test.describe("Journey 3 — Parcel list", () => {
  test("searches by recipient name, filters by status and opens the parcel", async ({
    page,
    request,
  }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);

    const booking = makeBookingFixture("LIST");
    const created = await createParcelViaApi(request, token, booking);

    await page.goto("/en/merchant/parcels");
    await expect(page.getByRole("heading", { name: /my parcels/i })).toBeVisible();

    // Server-side search by recipient name.
    await page
      .getByRole("searchbox", { name: /search by tracking id/i })
      .fill(booking.recipientName);

    const row = page.getByRole("row").filter({ hasText: created.trackingCode });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText(booking.recipientName);

    // Status filter is also applied by the API (quick-filter toggle group).
    await page
      .getByRole("group", { name: /quick status filters/i })
      .getByRole("button", { name: /^created$/i })
      .click();
    await expect(page.getByRole("row").filter({ hasText: created.trackingCode })).toBeVisible();

    // No stray results for a search that cannot match.
    await page.getByRole("searchbox", { name: /search by tracking id/i }).fill(`NOPE${Date.now()}`);
    await expect(page.getByText(/no parcels match your filters/i)).toBeVisible({
      timeout: 20_000,
    });

    // Clearing filters restores results.
    await page
      .getByRole("button", { name: /clear filters/i })
      .first()
      .click();
    await expect(page.getByRole("row").filter({ hasText: created.trackingCode })).toBeVisible({
      timeout: 20_000,
    });

    await row.getByRole("link", { name: /view/i }).click();
    await expect(page).toHaveURL(new RegExp(`/en/merchant/parcels/${created.id}`));
  });

  test("shows pagination information from the API", async ({ page, request }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);
    await createParcelViaApi(request, token, makeBookingFixture("PAGE"));

    const listResponse = await request.get(`${API_BASE_URL}/parcels?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await listResponse.json();
    // The API flattens the page envelope onto `meta` (see ResponseTransformInterceptor).
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(5);
    expect(body.data.length).toBeLessThanOrEqual(5);

    await page.goto("/en/merchant/parcels");
    await expect(page.getByText(/showing/i).first()).toBeVisible({ timeout: 20_000 });
  });

  // Phase 9 — history + deep-link coverage for the Phase 8 filter-state fix.
  // Filter commits use router.replace (one history entry per filter set, never
  // per keystroke), so the supported back-flow is list → details → Back with
  // the list URL intact — not stepping through individual keystrokes.
  test("going back from details preserves the filtered list", async ({ page, request }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);

    const booking = makeBookingFixture("BACK");
    const created = await createParcelViaApi(request, token, booking);

    await page.goto("/en/merchant/parcels");
    await expect(page.getByRole("heading", { name: /my parcels/i })).toBeVisible();

    await page
      .getByRole("searchbox", { name: /search by tracking id/i })
      .fill(booking.recipientName);
    const row = page.getByRole("row").filter({ hasText: created.trackingCode });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/search=/, { timeout: 20_000 });

    await row.getByRole("link", { name: /view/i }).click();
    await expect(page).toHaveURL(new RegExp(`/en/merchant/parcels/${created.id}`));

    await page.goBack();
    await expect(page).toHaveURL(/\/en\/merchant\/parcels\?.*search=/);
    await expect(
      page.getByRole("searchbox", { name: /search by tracking id/i }),
    ).toHaveValue(booking.recipientName);
    await expect(page.getByRole("row").filter({ hasText: created.trackingCode })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("a shared list URL adopts search + status filters on first load", async ({
    page,
    context,
    request,
  }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);

    const booking = makeBookingFixture("SHARE");
    const created = await createParcelViaApi(request, token, booking);

    await page.goto("/en/merchant/parcels");
    await expect(page.getByRole("heading", { name: /my parcels/i })).toBeVisible();

    await page
      .getByRole("searchbox", { name: /search by tracking id/i })
      .fill(booking.recipientName);
    await page
      .getByRole("group", { name: /quick status filters/i })
      .getByRole("button", { name: /^created$/i })
      .click();
    const row = page.getByRole("row").filter({ hasText: created.trackingCode });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/search=/, { timeout: 20_000 });
    await expect(page).toHaveURL(/status=CREATED/);
    const sharedUrl = page.url();

    // Fresh page, cold load: filters must come from the URL alone (adopt
    // effect), with no prior field state to debounce from.
    const fresh = await context.newPage();
    await fresh.goto(sharedUrl);
    await expect(
      fresh.getByRole("searchbox", { name: /search by tracking id/i }),
    ).toHaveValue(booking.recipientName);
    await expect(
      fresh
        .getByRole("group", { name: /quick status filters/i })
        .getByRole("button", { name: /^created$/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      fresh.getByRole("row").filter({ hasText: created.trackingCode }),
    ).toBeVisible({ timeout: 20_000 });
    await fresh.close();
  });

  test("reloading the list preserves search + status filters", async ({ page, request }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);

    const booking = makeBookingFixture("RELOAD");
    const created = await createParcelViaApi(request, token, booking);

    await page.goto("/en/merchant/parcels");
    await expect(page.getByRole("heading", { name: /my parcels/i })).toBeVisible();

    await page
      .getByRole("searchbox", { name: /search by tracking id/i })
      .fill(booking.recipientName);
    await page
      .getByRole("group", { name: /quick status filters/i })
      .getByRole("button", { name: /^created$/i })
      .click();
    await expect(page.getByRole("row").filter({ hasText: created.trackingCode })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).toHaveURL(/search=/, { timeout: 20_000 });

    await page.reload();
    await expect(
      page.getByRole("searchbox", { name: /search by tracking id/i }),
    ).toHaveValue(booking.recipientName);
    await expect(
      page
        .getByRole("group", { name: /quick status filters/i })
        .getByRole("button", { name: /^created$/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("row").filter({ hasText: created.trackingCode })).toBeVisible({
      timeout: 20_000,
    });
  });
});
