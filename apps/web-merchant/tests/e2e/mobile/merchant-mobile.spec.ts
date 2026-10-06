import { expect, test, type Page } from "@playwright/test";
import {
  createParcelViaApi,
  fillBookingForm,
  loginAsMerchant,
  makeBookingFixture,
  readAccessToken,
} from "../helpers/merchant";

/** Fails when the page scrolls horizontally — the main mobile layout bug. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
}

test.describe("Mobile merchant experience", () => {
  test("bottom navigation and dashboard fit a phone viewport", async ({ page }) => {
    await loginAsMerchant(page);

    await expect(page.getByRole("navigation", { name: /primary/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("the booking form is single-column and touch friendly", async ({ page, request }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);
    await createParcelViaApi(request, token, makeBookingFixture("MOB"));

    await page.goto("/en/merchant/bookings/new");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const booking = makeBookingFixture("MOBB");
    await fillBookingForm(page, booking);
    await expect(page.getByText("Total delivery charge")).toBeVisible({ timeout: 20_000 });

    // Touch targets should be at least 44px tall on mobile.
    const confirmBox = await page
      .getByRole("button", { name: /confirm booking/i })
      .boundingBox();
    expect(confirmBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("the parcel list renders cards and the filter sheet works", async ({ page, request }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);
    const booking = makeBookingFixture("MOBL");
    const created = await createParcelViaApi(request, token, booking);

    await page.goto("/en/merchant/parcels");
    // Scope to the card list: the desktop table is still in the DOM (just
    // display:none), so a bare text query would hit it too.
    await expect(
      page.getByRole("listitem").filter({ hasText: created.trackingCode }),
    ).toBeVisible({ timeout: 20_000 });
    await expectNoHorizontalOverflow(page);

    // Desktop table is hidden on phones.
    await expect(page.getByRole("table")).toBeHidden();

    await page.getByRole("button", { name: /filters/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Status").last()).toBeVisible();
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("parcel details and public tracking work on mobile", async ({ page, request }) => {
    await loginAsMerchant(page);
    const token = await readAccessToken(page);
    const booking = makeBookingFixture("MOBD");
    const created = await createParcelViaApi(request, token, booking);

    await page.goto(`/en/merchant/parcels/${created.id}`);
    await expect(page.getByText(created.trackingCode)).toBeVisible({ timeout: 20_000 });
    await expectNoHorizontalOverflow(page);

    await page.evaluate(() => localStorage.clear());
    await page.goto("/en/track");
    await expectNoHorizontalOverflow(page);

    await page.getByRole("textbox", { name: /track your shipment/i }).fill(created.trackingCode);
    await page.getByRole("button", { name: /^track$/i }).click();
    await expect(page.getByText(/delivery timeline/i)).toBeVisible({ timeout: 20_000 });
    await expectNoHorizontalOverflow(page);
  });
});
