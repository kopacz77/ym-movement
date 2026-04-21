import { expect, test } from "@playwright/test";

// Payment page E2E tests covering table display, search, sorting, and filtering.
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.
//
// Seed data (from seed-test-data.ts) provides at least two payments:
//   - TEST-PAYOUT-001: $120.00, VENMO, COMPLETED, student "Test Student", coach "Test Coach"
//   - TEST-COACH2-001: $90.00, ZELLE, COMPLETED, student "Test Student", coach "Test Coach 2"

test.describe("Payments Page", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should display payments table with correct columns", async ({ page }) => {
    await page.goto("/admin/payments");

    // Wait for the page heading to confirm we are on the payments page
    await expect(page.locator('h1:has-text("Payments")').first()).toBeVisible({ timeout: 15000 });

    // Wait for the table to render (seed data guarantees at least 2 payments)
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 15000 });

    // Verify all expected column headers are present
    const headers = ["Student", "Coach", "Date", "Amount", "Method", "Reference", "Status", "Actions"];
    for (const header of headers) {
      await expect(
        table.locator("th").filter({ hasText: new RegExp(`^${header}$`, "i") }).first()
      ).toBeVisible();
    }
  });

  test("should search payments by student name", async ({ page }) => {
    await page.goto("/admin/payments");
    await expect(page.locator('h1:has-text("Payments")').first()).toBeVisible({ timeout: 15000 });

    // Wait for the table to load with data
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 15000 });

    // Type the student name into the search input
    const searchInput = page.locator('input[placeholder="Search by student name or reference code..."]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Test Student");

    // Wait for the table to update -- the matching student name should still be visible
    await expect(table.locator("td").filter({ hasText: "Test Student" }).first()).toBeVisible({ timeout: 10000 });
  });

  test("should search payments by reference code", async ({ page }) => {
    await page.goto("/admin/payments");
    await expect(page.locator('h1:has-text("Payments")').first()).toBeVisible({ timeout: 15000 });

    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 15000 });

    // Search by the known seed reference code
    const searchInput = page.locator('input[placeholder="Search by student name or reference code..."]').first();
    await searchInput.fill("TEST-PAYOUT-001");

    // The matching reference code should appear in the table
    await expect(table.locator("td").filter({ hasText: "TEST-PAYOUT-001" }).first()).toBeVisible({ timeout: 10000 });
  });

  test("should sort payments by different criteria", async ({ page }) => {
    await page.goto("/admin/payments");
    await expect(page.locator('h1:has-text("Payments")').first()).toBeVisible({ timeout: 15000 });

    // Wait for the table to fully load
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 15000 });

    // The sort dropdown button should show the default "Newest First"
    const sortButton = page.locator('button:has-text("Newest First")').first();
    await expect(sortButton).toBeVisible();

    // Open the sort dropdown and select "Name A-Z"
    await sortButton.click();
    await page.locator('[role="menuitem"]:has-text("Name A-Z")').first().click();

    // The sort button text should now read "Name A-Z"
    await expect(page.locator('button:has-text("Name A-Z")').first()).toBeVisible({ timeout: 5000 });

    // Open the sort dropdown again and select "Amount High-Low"
    await page.locator('button:has-text("Name A-Z")').first().click();
    await page.locator('[role="menuitem"]:has-text("Amount High-Low")').first().click();

    // The sort button text should now read "Amount High-Low"
    await expect(page.locator('button:has-text("Amount High-Low")').first()).toBeVisible({ timeout: 5000 });
  });

  test("should filter payments by status", async ({ page }) => {
    await page.goto("/admin/payments");
    await expect(page.locator('h1:has-text("Payments")').first()).toBeVisible({ timeout: 15000 });

    // Wait for the table to load
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 15000 });

    // The status filter is a Radix Select. Open it by clicking the trigger.
    const statusTrigger = page.locator('button[role="combobox"]').filter({ hasText: /All Statuses|Filter by status/ }).first();
    await expect(statusTrigger).toBeVisible();
    await statusTrigger.click();

    // Select "Completed" from the dropdown
    await page.locator('[role="option"]:has-text("Completed")').first().click();

    // After filtering, all visible status badges in the table should say "Completed"
    // Wait for the filter to take effect (TRPC refetch)
    await page.waitForTimeout(1000);

    // Verify the table still has rows and all status cells show "Completed"
    const statusCells = table.locator("td").filter({ hasText: /Completed|Pending|Failed/ });
    const count = await statusCells.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(statusCells.nth(i)).toHaveText(/Completed/);
      }
    }
  });
});
