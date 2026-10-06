import { expect, test } from "./fixtures/cdp";
import { API_BASE_URL } from "./helpers/merchant";
import {
  assignedParcel,
  loginAsRider,
  SEEDED_RIDER,
  SEEDED_RIDER2,
  startDeliveryViaApi,
} from "./helpers/rider";

test.describe("Journey — Rider delivery", () => {
  test("start delivery moves the parcel out for delivery", async ({ page, request }) => {
    const parcel = await assignedParcel(request, SEEDED_RIDER.email, 1200);

    await loginAsRider(page);
    await page.goto(`/en/rider/tasks/${parcel.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/delivery task/i);

    await page.getByRole("button", { name: /^start delivery$/i }).click();
    await expect(page.getByText(/out_for_delivery/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("wrong OTP is rejected, correct OTP verifies in the UI", async ({ page, request }) => {
    const parcel = await assignedParcel(request, SEEDED_RIDER.email, 1200);
    const otp = await startDeliveryViaApi(request, parcel.riderToken, parcel.id);

    await loginAsRider(page);
    await page.goto(`/en/rider/tasks/${parcel.id}`);

    await page.getByLabel(/6-digit otp/i).fill("000000");
    await page.getByRole("button", { name: /^verify otp$/i }).click();
    await expect(page.getByText(/invalid otp/i).first()).toBeVisible({ timeout: 20_000 });

    await page.getByLabel(/6-digit otp/i).fill(otp);
    await page.getByRole("button", { name: /^verify otp$/i }).click();
    await expect(page.getByText(/otp verified/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("COD mismatch is rejected, exact COD completes the delivery", async ({ page, request }) => {
    const parcel = await assignedParcel(request, SEEDED_RIDER.email, 1000);
    const otp = await startDeliveryViaApi(request, parcel.riderToken, parcel.id);

    await loginAsRider(page);
    await page.goto(`/en/rider/tasks/${parcel.id}`);

    await page.getByLabel(/6-digit otp/i).fill(otp);
    await page.getByRole("button", { name: /^verify otp$/i }).click();
    await expect(page.getByText(/otp verified/i).first()).toBeVisible({ timeout: 20_000 });

    await page.getByLabel(/amount collected/i).fill("900");
    await page.getByRole("button", { name: /^complete delivery$/i }).click();
    await expect(page.getByText(/does not match/i).first()).toBeVisible({ timeout: 20_000 });

    await page.getByLabel(/amount collected/i).fill("1000");
    await page.getByRole("button", { name: /^complete delivery$/i }).click();
    await expect(page.getByText(/delivered/i).first()).toBeVisible({ timeout: 20_000 });

    // The parcel left the active task list and reached the delivery ledger.
    const tasks = await request.get(`${API_BASE_URL}/riders/me/tasks`, {
      headers: { Authorization: `Bearer ${parcel.riderToken}` },
    });
    const rows = ((await tasks.json()).data ?? []) as Array<{ id: string }>;
    expect(rows.some((row) => row.id === parcel.id)).toBe(false);
  });

  test("failed attempt records reason and reschedules", async ({ page, request }) => {
    const parcel = await assignedParcel(request, SEEDED_RIDER.email, 800);
    await startDeliveryViaApi(request, parcel.riderToken, parcel.id);

    await loginAsRider(page);
    await page.goto(`/en/rider/tasks/${parcel.id}`);

    await page.getByRole("button", { name: /attempt delivery/i }).click();
    await expect(page.getByText(/record failed attempt/i)).toBeVisible();
    await page.getByLabel(/failure reason/i).selectOption("CUSTOMER_UNAVAILABLE");
    await page.getByRole("button", { name: /submit attempt/i }).click();
    await expect(page.getByText(/delivery_attempted/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("rider isolation: another rider cannot open the task", async ({ page, request }) => {
    const parcel = await assignedParcel(request, SEEDED_RIDER.email, 800);

    await loginAsRider(page, SEEDED_RIDER2);
    await page.goto(`/en/rider/tasks/${parcel.id}`);
    await expect(page.getByText(/could not load this task/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
