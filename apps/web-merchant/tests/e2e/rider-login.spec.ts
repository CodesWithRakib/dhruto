import { expect, test } from "./fixtures/cdp";
import { loginAsRider } from "./helpers/rider";

test.describe("Journey — Rider login", () => {
  test("rider login lands on the rider dashboard with live metrics", async ({ page }) => {
    await loginAsRider(page);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/rider dashboard/i);
    await expect(page.getByText(/assigned/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/in progress/i).first()).toBeVisible();
    await expect(page.getByText(/cod to collect/i).first()).toBeVisible();
  });

  test("rider navigation reaches tasks, history and profile", async ({ page }) => {
    await loginAsRider(page);

    await page.goto("/en/rider/tasks");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/delivery tasks/i);

    await page.goto("/en/rider/history");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/delivery history/i);

    await page.goto("/en/rider/profile");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/rider profile/i);
    await expect(page.getByText(/RDR-/).first()).toBeVisible({ timeout: 20_000 });
  });
});
