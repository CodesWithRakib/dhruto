import { expect, test } from "./fixtures/cdp";
import { API_BASE_URL } from "./helpers/merchant";
import {
  addParcelToBag,
  apiLogin,
  createBag,
  createManifest,
  ctgHubId,
  dhkHubId,
  dispatchManifest,
  inboundParcel,
  loginAsHub,
  sealBag,
  SEEDED_HUB_CTG,
  SEEDED_HUB_DHK,
  SEEDED_MERCHANT,
} from "./helpers/hub";

test.describe("Journey — Manifest dispatch and receive", () => {
  test("full line-haul: manifest, dispatch, destination receive, parcel relocated", async ({
    page,
    request,
  }) => {
    const merchantToken = await apiLogin(request, SEEDED_MERCHANT);
    const dhkToken = await apiLogin(request, SEEDED_HUB_DHK);
    const ctgToken = await apiLogin(request, SEEDED_HUB_CTG);
    const dhkId = await dhkHubId(request, dhkToken);
    const ctgId = await ctgHubId(request, dhkToken);

    const parcel = await inboundParcel(request, merchantToken, dhkToken, dhkId);
    const bag = await createBag(request, dhkToken, dhkId, ctgId);
    await addParcelToBag(request, dhkToken, bag.id, parcel.trackingCode);
    await sealBag(request, dhkToken, bag.id);
    const manifest = await createManifest(request, dhkToken, dhkId, ctgId, [bag.id]);
    await dispatchManifest(request, dhkToken, manifest.id);

    // Origin operator sees the dispatched manifest in the UI.
    await loginAsHub(page, "DHK");
    await page.goto("/en/hub/manifests");
    await expect(page.getByText(manifest.manifestCode).first()).toBeVisible({ timeout: 20_000 });
    await page.goto(`/en/hub/manifests/${manifest.id}`);
    await expect(page.getByText(/membership is frozen/i).first()).toBeVisible({ timeout: 20_000 });

    // Origin hub cannot receive its own outbound manifest.
    const wrongHub = await request.post(`${API_BASE_URL}/manifests/${manifest.id}/receive`, {
      headers: { Authorization: `Bearer ${dhkToken}`, "Content-Type": "application/json" },
      data: { scannedBagCodes: [bag.bagCode] },
    });
    expect(wrongHub.status()).toBe(403);

    // An unexpected bag is rejected, never absorbed.
    const mismatch = await request.post(`${API_BASE_URL}/manifests/${manifest.id}/receive`, {
      headers: { Authorization: `Bearer ${ctgToken}`, "Content-Type": "application/json" },
      data: { scannedBagCodes: ["BAG-NOT-REAL-000000"] },
    });
    expect(mismatch.status()).toBe(400);

    // Destination hub receives through the UI-backed API.
    await page.goto("/en/login");
    await page.locator("#login-email").fill(SEEDED_HUB_CTG.email);
    await page.locator("#login-password").fill(SEEDED_HUB_CTG.password);
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/en\/hub\/dashboard/, { timeout: 30_000 });

    await page.goto(`/en/hub/manifests/${manifest.id}`);
    await expect(page.getByText(manifest.manifestCode).first()).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder(/scan bag code/i).fill(bag.bagCode);
    await page.getByRole("button", { name: /^add$/i }).click();
    await page.getByRole("button", { name: /complete receipt/i }).click();
    await expect(page.getByText(/was received/i).first()).toBeVisible({ timeout: 20_000 });

    // Parcel relocated to CTG with a full history chain.
    const detail = await request.get(`${API_BASE_URL}/parcels/${parcel.id}`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    expect(detail.ok()).toBe(true);
    expect((await detail.json()).data.status).toBe("DESTINATION_HUB_RECEIVED");
    void ctgId;
  });
});
