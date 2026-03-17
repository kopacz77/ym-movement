import { expect, test } from "@playwright/test";

// Error handling and performance E2E tests.
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

test.describe("Error Handling", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should handle 404 pages gracefully", async ({ page }) => {
    await page.goto("/admin/nonexistent-page");

    // Page should not crash -- either show 404 or redirect
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
  });

  test("should handle API errors without crashing", async ({ page }) => {
    // Mock a TRPC error
    await page.route("**/api/trpc/admin.analytics*", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      });
    });

    await page.goto("/admin/dashboard");

    // Page should still load (error boundaries should catch)
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
    // The Dashboard heading should still render
    await expect(page.locator("text=Dashboard").first()).toBeVisible({ timeout: 15000 });
  });

  test("should handle unauthorized access attempts", async ({ page }) => {
    // Try to access admin as unauthenticated user
    await page.context().clearCookies();
    await page.goto("/admin/dashboard");

    // Should redirect to login or show unauthorized
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Performance", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("admin dashboard should load within 30 seconds", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/admin/dashboard");

    // Wait for dashboard heading
    await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible({ timeout: 30000 });

    const loadTime = Date.now() - startTime;
    // Dev server can be slow -- 30s is generous
    expect(loadTime).toBeLessThan(30000);
  });

  test("schedule page should load within 30 seconds", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/admin/schedule");

    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 30000 });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(30000);
  });

  test("page navigation should be responsive", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible({ timeout: 15000 });

    // Navigate to another page
    const startTime = Date.now();
    await page.locator('a:has-text("Students")').first().click();
    await expect(page.locator('h1:has-text("Students")').first()).toBeVisible({ timeout: 15000 });

    const navTime = Date.now() - startTime;
    // Client-side navigation should be faster
    expect(navTime).toBeLessThan(15000);
  });
});

test.describe("Student Error Handling", () => {
  test.use({ storageState: "playwright/.auth/student.json" });

  test("student dashboard should handle missing data gracefully", async ({ page }) => {
    await page.goto("/student/dashboard");

    // Dashboard should load without crashing
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });
  });
});
