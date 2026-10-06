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

    // Status filter is also applied by the API.
    await page.getByLabel("Status").first().selectOption("CREATED");
    await expect(page.getByRole("row").filter({ hasText: created.trackingCode })).toBeVisible();

    // No stray results for a search that cannot match.
    await page
      .getByRole("searchbox", { name: /search by tracking id/i })
      .fill(`NOPE${Date.now()}`);
    await expect(page.getByText(/no parcels match your filters/i)).toBeVisible({
      timeout: 20_000,
    });

    // Clearing filters restores results.
    await page.getByRole("button", { name: /clear filters/i }).first().click();
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
});
