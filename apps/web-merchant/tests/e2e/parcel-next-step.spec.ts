import { test, expect } from "@playwright/test";
import {
  createParcelViaApi,
  loginAsMerchant,
  makeBookingFixture,
  readAccessToken,
} from "./helpers/merchant";

test.describe("Journey - Parcel next step and workspace return", () => {
  test("details shows what happens next for a created parcel", async ({ page, request }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);
    const created = await createParcelViaApi(request, token, makeBookingFixture("NEXT"));

    await page.goto(`/en/merchant/parcels/${created.id}`);

    await expect(page.getByText(created.trackingCode)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/what happens next/i)).toBeVisible();
    // CREATED is the first lifecycle stage, so a next stage is named.
    await expect(page.getByText(/next stage:/i)).toBeVisible();
  });

  test("back from details restores the list filters", async ({ page, request }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);
    const booking = makeBookingFixture("BACK");
    const created = await createParcelViaApi(request, token, booking);

    await page.goto("/en/merchant/parcels?status=CREATED");
    const row = page.getByRole("row").filter({ hasText: created.trackingCode });
    await expect(row).toBeVisible({ timeout: 20_000 });

    await row.getByRole("link", { name: /view/i }).click();
    await expect(page).toHaveURL(new RegExp(`/en/merchant/parcels/${created.id}`));

    await page.getByRole("link", { name: /back to parcels/i }).click();
    await expect(page).toHaveURL(/\/en\/merchant\/parcels\?.*status=CREATED/);
  });
});
