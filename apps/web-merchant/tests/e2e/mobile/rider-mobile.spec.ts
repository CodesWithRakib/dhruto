import { expect, test } from "../fixtures/cdp";
import type { Page } from "@playwright/test";
import { loginAsRider } from "../helpers/rider";

/** Fails when the page scrolls horizontally — the main mobile layout bug. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
}

test.describe("Mobile rider experience", () => {
  test("dashboard fits a phone viewport with a usable bottom bar", async ({ page }) => {
    await loginAsRider(page);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/rider dashboard/i);
    await expectNoHorizontalOverflow(page);

    const nav = page.getByRole("navigation").last();
    await expect(nav.getByRole("link", { name: /tasks/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /history/i })).toBeVisible();

    const tasksBox = await nav.getByRole("link", { name: /tasks/i }).boundingBox();
    expect(tasksBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("tasks, history and profile render cards without overflow", async ({ page }) => {
    await loginAsRider(page);

    await page.goto("/en/rider/tasks");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/delivery tasks/i);
    await expectNoHorizontalOverflow(page);

    await page.goto("/en/rider/history");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/delivery history/i);
    await expectNoHorizontalOverflow(page);

    await page.goto("/en/rider/profile");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/rider profile/i);
    await expectNoHorizontalOverflow(page);
  });
});
