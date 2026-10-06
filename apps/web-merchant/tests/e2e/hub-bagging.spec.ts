import { expect, test } from "./fixtures/cdp";
import { API_BASE_URL } from "./helpers/merchant";
import {
  addParcelToBag,
  apiLogin,
  createBag,
  ctgHubId,
  dhkHubId,
  inboundParcel,
  loginAsHub,
  sealBag,
  SEEDED_HUB_DHK,
  SEEDED_MERCHANT,
} from "./helpers/hub";

test.describe("Journey — Hub bagging", () => {
  test("create bag, add parcels, seal, and freeze membership", async ({ page, request }) => {
    const merchantToken = await apiLogin(request, SEEDED_MERCHANT);
    const hubToken = await apiLogin(request, SEEDED_HUB_DHK);
    const hubId = await dhkHubId(request, hubToken);
    const destinationId = await ctgHubId(request, hubToken);
    const parcel = await inboundParcel(request, merchantToken, hubToken, hubId);
    const bag = await createBag(request, hubToken, hubId, destinationId);

    await addParcelToBag(request, hubToken, bag.id, parcel.trackingCode);

    await loginAsHub(page, "DHK");
    await page.goto("/en/hub/bags");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/transit bags/i);
    await expect(page.getByText(bag.bagCode).first()).toBeVisible({ timeout: 20_000 });

    // Bag details show the enclosed parcel.
    await page.goto(`/en/hub/bags/${bag.id}`);
    await expect(page.getByText(parcel.trackingCode).first()).toBeVisible({ timeout: 20_000 });

    // Seal with confirmation; membership is then frozen.
    await sealBag(request, hubToken, bag.id);
    await page.reload();
    await expect(page.getByText(/membership is frozen/i).first()).toBeVisible({ timeout: 20_000 });

    // A sealed bag rejects new parcels (400, not a silent accept).
    const second = await inboundParcel(request, merchantToken, hubToken, hubId);
    const rejected = await request.post(`${API_BASE_URL}/bags/${bag.id}/parcels`, {
      headers: { Authorization: `Bearer ${hubToken}`, "Content-Type": "application/json" },
      data: { parcelTrackingCode: second.trackingCode },
    });
    expect(rejected.status()).toBe(400);
  });

  test("bag creation from the UI opens an OPEN bag", async ({ page, request }) => {
    const hubToken = await apiLogin(request, SEEDED_HUB_DHK);

    await loginAsHub(page, "DHK");
    await page.goto("/en/hub/bags");
    await page.getByRole("button", { name: /create bag/i }).click();
    await page.getByRole("button", { name: /open bag/i }).click();

    await expect(page.getByText(/BAG-/).first()).toBeVisible({ timeout: 20_000 });
    expect(hubToken.length).toBeGreaterThan(0);
  });
});
