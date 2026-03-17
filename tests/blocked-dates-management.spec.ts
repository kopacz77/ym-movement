import { expect, test } from "@playwright/test";

// Blocked dates management E2E tests.
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

test.describe("Blocked Dates Management", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should display schedule page with calendar", async ({ page }) => {
    await page.goto("/admin/schedule");

    // Wait for schedule page heading -- .first()
    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 15000 });

    // Calendar should render
    const calendar = page.locator('[class*="rbc-"]').first();
    await expect(calendar).toBeVisible({ timeout: 15000 });
  });

  test("should show Block Dates button in quick actions", async ({ page }) => {
    await page.goto("/admin/schedule");
    await expect(page.locator("text=Schedule Management").first()).toBeVisible({ timeout: 15000 });

    // Look for "Block Dates" button in the Quick Actions toolbar
    const blockDatesButton = page.locator('button:has-text("Block Dates")').first();
    await expect(blockDatesButton).toBeVisible({ timeout: 15000 });
  });

  test("should handle page reload gracefully", async ({ page }) => {
    await page.goto("/admin/schedule");
    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 15000 });

    // Reload and verify page still works
    await page.reload();
    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 15000 });
  });
});
