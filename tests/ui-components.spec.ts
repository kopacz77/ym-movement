import { expect, test } from "@playwright/test";

// UI component E2E tests.
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

test.describe("UI Components - Navigation", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("admin sidebar should show all navigation items", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible({ timeout: 15000 });

    // Check for all admin nav items -- .first() for desktop/mobile duplicate
    await expect(page.locator('a:has-text("Dashboard")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Schedule")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Students")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Coaches")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Payments")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Reports")').first()).toBeVisible();
  });

  test("active navigation item should be highlighted", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible({ timeout: 15000 });

    // Dashboard link should have active styling (blue background)
    const dashboardLink = page.locator('a:has-text("Dashboard")').first();
    await expect(dashboardLink).toHaveClass(/blue/);
  });
});

test.describe("UI Components - Greeting", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should display personalized greeting in header", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible({ timeout: 15000 });

    // Should show greeting with admin name
    const greeting = page.locator("text=Test Admin").first();
    await expect(greeting).toBeVisible({ timeout: 15000 });
  });
});

test.describe("UI Components - Student Portal", () => {
  test.use({ storageState: "playwright/.auth/student.json" });

  test("student sidebar should show student navigation items", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // Check for student-specific nav items -- .first()
    await expect(page.locator('a:has-text("Dashboard")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Book Lessons")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Payments")').first()).toBeVisible();
  });

  test("should display personalized greeting for student", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // Should show greeting with student name
    const greeting = page.locator("text=Test Student").first();
    await expect(greeting).toBeVisible({ timeout: 15000 });
  });
});

test.describe("UI Components - Coach Portal", () => {
  test.use({ storageState: "playwright/.auth/coach.json" });

  test("coach sidebar should show coach navigation items", async ({ page }) => {
    await page.goto("/coach/dashboard");
    await expect(page.locator('h1:has-text("Coach Dashboard")').first()).toBeVisible({ timeout: 15000 });

    // Check for coach-specific nav items -- .first()
    await expect(page.locator('a:has-text("Dashboard")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Students")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Earnings")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Proposals")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Profile")').first()).toBeVisible();
  });
});
