import { expect, test } from "@playwright/test";

// Notification system E2E tests.
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

test.describe("Notifications System (Admin)", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should display notification bell icon in admin header", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible({ timeout: 15000 });

    // Bell icon uses lucide-react Bell component -- rendered as svg with class lucide-bell
    const bellButton = page.locator('button:has(svg.lucide-bell)').first();
    await expect(bellButton).toBeVisible({ timeout: 10000 });
  });

  test("should open notification popover on bell click", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible({ timeout: 15000 });

    // Click bell icon
    const bellButton = page.locator('button:has(svg.lucide-bell)').first();
    await expect(bellButton).toBeVisible({ timeout: 10000 });
    await bellButton.click();

    // Notification popover should appear with heading
    await expect(page.locator("text=Notifications").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show mark all as read button in notification popover", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible({ timeout: 15000 });

    // Click bell icon
    const bellButton = page.locator('button:has(svg.lucide-bell)').first();
    await expect(bellButton).toBeVisible({ timeout: 10000 });
    await bellButton.click();

    // Notification popover should appear
    await expect(page.locator("text=Notifications").first()).toBeVisible({ timeout: 5000 });

    // "Mark all as read" button should exist (may or may not be visible depending on unread count)
    const markAllBtn = page.locator('button:has-text("Mark all as read")');
    const noNotificationsMsg = page.locator("text=No notifications");
    // Either mark-all button or empty state is visible
    await expect(markAllBtn.or(noNotificationsMsg.first())).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Notifications System (Student)", () => {
  test.use({ storageState: "playwright/.auth/student.json" });

  test("should display notification bell icon for student users", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // Bell icon should be in student header too
    const bellButton = page.locator('button:has(svg.lucide-bell)').first();
    await expect(bellButton).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Notifications System (Unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should not show notification bell on login page", async ({ page }) => {
    await page.goto("/auth/login");

    // Wait for login page to load
    await expect(page.locator("text=Login to your account")).toBeVisible({ timeout: 15000 });

    // Notification bell should not be visible
    const bellButton = page.locator('button:has(svg.lucide-bell)');
    await expect(bellButton).not.toBeVisible();
  });
});

test.describe("Notifications Error Handling", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should handle API failure gracefully", async ({ page }) => {
    // Mock API failure for notifications
    await page.route("**/api/trpc/notifications**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      });
    });

    await page.goto("/admin/dashboard");

    // Page should still load and be functional (notifications fail silently)
    await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible({ timeout: 15000 });

    // Bell icon should still be visible even if API failed
    const bellButton = page.locator('button:has(svg.lucide-bell)').first();
    await expect(bellButton).toBeVisible({ timeout: 10000 });
  });
});
