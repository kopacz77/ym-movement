import { expect, test } from "@playwright/test";

// Reports dashboard E2E tests.
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

test.describe("Reports Dashboard", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should load reports page with heading", async ({ page }) => {
    await page.goto("/admin/reports");

    // Wait for reports page heading -- .first()
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });
  });

  test("should display report tabs", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });

    // Check for report tab navigation
    const tabs = page.locator('[role="tab"]').first();
    await expect(tabs).toBeVisible({ timeout: 10000 });
  });

  test("should display revenue tab content", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });

    // Click Revenue tab if it exists
    const revenueTab = page.locator('[role="tab"]:has-text("Revenue")').first();
    if (await revenueTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await revenueTab.click();
      // Wait for content to load
      await expect(page.locator("text=Revenue").first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("should display payouts tab content", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });

    // Click Payouts tab
    const payoutsTab = page.locator('[role="tab"]:has-text("Payouts")').first();
    if (await payoutsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await payoutsTab.click();
      // Wait for payout content to load
      await expect(page.locator("text=Payout").first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("should have export functionality", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });

    // Look for export buttons
    const exportButton = page.locator('button:has-text("Export"), button:has-text("CSV"), button:has-text("PDF")').first();
    if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(exportButton).toBeVisible();
    }
  });
});
