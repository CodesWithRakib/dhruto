import { test, expect } from "@playwright/test";
import * as path from "node:path";
import { loginAsMerchant } from "./helpers/merchant";

test.describe("Journey — Bulk import (Phase 7)", () => {
  test("uploads a CSV, previews fees, imports, and lists the new parcels", async ({ page }) => {
    await loginAsMerchant(page);
    await page.goto("/en/merchant/parcels");
    await expect(page.getByRole("heading", { name: /my parcels/i })).toBeVisible();

    // Bulk action lives on the list page (not the sidebar).
    await page.getByRole("button", { name: /bulk import/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const csvPath = path.join(__dirname, "fixtures", "bulk-parcels.csv");
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await expect(page.getByText(/2 rows from bulk-parcels\.csv ready/i)).toBeVisible();

    await page.getByRole("button", { name: /preview fees/i }).click();
    await expect(page.getByText(/fee ৳/i).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /import parcels/i }).click();
    await expect(page.getByText(/2 created, 0 failed/i)).toBeVisible({ timeout: 30_000 });

    // New parcels are visible in the list via server-side search.
    await page.getByRole("button", { name: /done/i }).click();
    await page
      .getByRole("searchbox", { name: /search by tracking id/i })
      .fill("Bulk E2E One");
    await expect(page.getByRole("row").filter({ hasText: "Bulk E2E One" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("rejects a malformed CSV before any upload", async ({ page }) => {
    await loginAsMerchant(page);
    await page.goto("/en/merchant/parcels");
    await page.getByRole("button", { name: /bulk import/i }).click();

    // Unterminated quote: client-side parse error, no network call.
    const bad = path.join(__dirname, "fixtures", "bulk-bad.csv");
    await page.locator('input[type="file"]').setInputFiles(bad);
    await expect(page.getByRole("alert").first()).toBeVisible();
  });
});
