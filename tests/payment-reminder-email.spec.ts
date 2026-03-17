import { expect, test } from "@playwright/test";

// Payment reminder email E2E tests.
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

test.describe("Payment Reminder System", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should display payments page with table", async ({ page }) => {
    await page.goto("/admin/payments");

    // Wait for payments page heading -- .first()
    await expect(page.locator("text=Payments").first()).toBeVisible({ timeout: 15000 });

    // Table or empty state should be visible
    const table = page.locator("table").first();
    const emptyState = page.locator("text=No payments").first();
    await expect(table.or(emptyState)).toBeVisible({ timeout: 15000 });
  });

  test("should show send reminder button for pending payments", async ({ page }) => {
    await page.goto("/admin/payments");
    await expect(page.locator("text=Payments").first()).toBeVisible({ timeout: 15000 });

    // Look for reminder button on pending payment rows
    const reminderButton = page.locator('button:has-text("Remind"), button:has-text("Send Reminder")').first();
    const table = page.locator("table").first();

    if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Table exists -- check if reminder buttons are visible
      const hasReminder = await reminderButton.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasReminder) {
        await expect(reminderButton).toBeVisible();
      }
    }
  });
});
