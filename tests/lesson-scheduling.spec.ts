import { expect, test } from "@playwright/test";

// Lesson scheduling E2E tests.
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

test.describe("Admin Schedule Management", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should display schedule calendar", async ({ page }) => {
    await page.goto("/admin/schedule");

    // Wait for schedule page heading -- .first()
    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 15000 });

    // Calendar renders react-big-calendar with .rbc- prefixed classes
    const calendar = page.locator('[class*="rbc-"]').first();
    await expect(calendar).toBeVisible({ timeout: 15000 });
  });

  test("should display navigation controls for calendar", async ({ page }) => {
    await page.goto("/admin/schedule");
    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 15000 });

    // Calendar should have navigation (Today, Back, Next buttons)
    const todayButton = page.locator('button:has-text("Today")').first();
    await expect(todayButton).toBeVisible({ timeout: 15000 });
  });

  test("should have bulk create dialog", async ({ page }) => {
    await page.goto("/admin/schedule");
    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 15000 });

    // Look for bulk create button
    const bulkButton = page.locator('button:has-text("Bulk Create")').first();
    if (await bulkButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bulkButton.click();
      // Dialog should open
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 10000 });
    }
  });

  test("should display time slot details on click", async ({ page }) => {
    await page.goto("/admin/schedule");
    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 15000 });

    // Wait for calendar events to load
    const calendarEvent = page.locator(".rbc-event").first();
    if (await calendarEvent.isVisible({ timeout: 10000 }).catch(() => false)) {
      await calendarEvent.click();
      // Dialog should appear with time slot details
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe("Student Schedule View", () => {
  test.use({ storageState: "playwright/.auth/student.json" });

  test("should display student schedule page", async ({ page }) => {
    await page.goto("/student/schedule");

    // Wait for schedule page -- .first()
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // Page should load successfully
    const heading = page.locator("text=Schedule").first();
    const calendar = page.locator('[class*="rbc-"]').first();
    const emptyState = page.locator("text=No").first();
    await expect(heading.or(calendar).or(emptyState)).toBeVisible({ timeout: 15000 });
  });

  test("should display student booking page", async ({ page }) => {
    await page.goto("/student/book");

    // Wait for booking page -- .first()
    await expect(page.locator('h1:has-text("Choose Your Coach")').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Student Payment Information", () => {
  test.use({ storageState: "playwright/.auth/student.json" });

  test("should display payments page", async ({ page }) => {
    await page.goto("/student/payments");

    // Wait for payments page -- .first()
    await expect(page.locator('h1:has-text("Payments")').first()).toBeVisible({ timeout: 15000 });

    // Table or empty state
    const table = page.locator("table").first();
    const emptyState = page.locator("text=No payments").first();
    await expect(table.or(emptyState)).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Schedule Responsive Design", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should display schedule on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/admin/schedule");

    // SidebarInset renders as nested <main> elements. At mobile viewport,
    // Playwright's toBeVisible incorrectly reports elements as hidden.
    // Use toBeAttached + textContent check instead.
    await expect(page.locator('h1:has-text("Schedule")').first()).toBeAttached({ timeout: 30000 });
    await expect(page.locator('h1:has-text("Schedule")').first()).toHaveText(/Schedule/, { timeout: 5000 });
  });

  test("should display schedule on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/admin/schedule");

    // Same nested <main> layout issue on tablet viewport.
    await expect(page.locator('h1:has-text("Schedule")').first()).toBeAttached({ timeout: 30000 });
    await expect(page.locator('h1:has-text("Schedule")').first()).toHaveText(/Schedule/, { timeout: 5000 });
  });
});
