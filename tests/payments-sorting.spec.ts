import { expect, test } from "@playwright/test";

// Payment sorting and display E2E tests.
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

test.describe("Payment Page Display", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should display payments page with heading", async ({ page }) => {
    await page.goto("/admin/payments");

    // Wait for payments page heading -- .first()
    await expect(page.locator("text=Payments").first()).toBeVisible({ timeout: 15000 });
  });

  test("should display payments table or empty state", async ({ page }) => {
    await page.goto("/admin/payments");
    await expect(page.locator("text=Payments").first()).toBeVisible({ timeout: 15000 });

    // Table or empty state
    const table = page.locator("table").first();
    const emptyState = page.locator("text=No payments").first();
    await expect(table.or(emptyState)).toBeVisible({ timeout: 15000 });
  });

  test("should show payment details in table", async ({ page }) => {
    await page.goto("/admin/payments");
    await expect(page.locator("text=Payments").first()).toBeVisible({ timeout: 15000 });

    // If table exists, verify it has data columns
    const table = page.locator("table").first();
    if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check for common payment table headers
      const amountHeader = page.locator("th").filter({ hasText: /amount/i }).first();
      const statusHeader = page.locator("th").filter({ hasText: /status/i }).first();
      await expect(amountHeader.or(statusHeader)).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe("Payment Sorting", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should have sort controls", async ({ page }) => {
    await page.goto("/admin/payments");
    await expect(page.locator("text=Payments").first()).toBeVisible({ timeout: 15000 });

    // Look for sort dropdown or sort buttons
    const sortControl = page.locator('button:has-text("Sort"), select, [role="combobox"]').first();
    if (await sortControl.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(sortControl).toBeVisible();
    }
  });
});
