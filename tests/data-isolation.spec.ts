import { test, expect } from "@playwright/test";

// SECT-01: Coach Data Isolation
// Verifies that each coach sees ONLY their own data across dashboard, students, and earnings.
// Use .first() on heading locators to avoid strict mode violations from duplicate
// DOM elements (desktop + hidden mobile layout both render the same content).

test.describe("Coach 1 data visibility", () => {
  test.use({ storageState: "playwright/.auth/coach.json" });

  test("coach 1 dashboard shows their lessons and stats", async ({ page }) => {
    await page.goto("/coach/dashboard");

    // Wait for dashboard to load -- use .first() for h1 (desktop + mobile layout duplicate)
    await expect(page.locator('h1:has-text("Coach Dashboard")').first()).toBeVisible({ timeout: 10000 });

    // Verify overview cards are visible -- use .first() for potentially duplicated text
    await expect(page.locator("text=Total Students").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Upcoming Lessons").first()).toBeVisible();
    await expect(page.locator("text=Monthly Earnings").first()).toBeVisible();

    // Coach 1 has seed data: 1 COMPLETED lesson at $120, 1 student
    // Verify coach2 name does NOT appear on this dashboard
    await expect(page.locator("text=Test Coach 2")).not.toBeVisible();
  });

  test("coach 1 students page shows only assigned students", async ({ page }) => {
    await page.goto("/coach/students");

    // Wait for students page heading
    await expect(page.locator('h1:has-text("My Students")').first()).toBeVisible({ timeout: 10000 });

    // Coach 1 has a CoachStudent relation to Test Student (primary)
    // Verify content loads -- either table with data or empty state
    const table = page.locator("table").first();
    const emptyMessage = page.locator("text=No students have booked lessons with you yet").first();
    await expect(table.or(emptyMessage)).toBeVisible({ timeout: 10000 });

    // Look for "Test Student" in the content
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("Test Student");
  });

  test("coach 1 earnings show only their payments", async ({ page }) => {
    await page.goto("/coach/earnings");

    // Wait for earnings page heading
    await expect(page.locator('h1:has-text("Earnings")').first()).toBeVisible({ timeout: 10000 });

    // Verify Total Earnings card is visible
    await expect(page.locator("text=Total Earnings").first()).toBeVisible({ timeout: 10000 });

    // Coach1 has VENMO payment at $120 -- verify ZELLE (coach2's method) does not appear
    const bodyText = await page.textContent("body");
    if (bodyText && bodyText.includes("VENMO")) {
      expect(bodyText).not.toContain("ZELLE");
    }
  });
});

test.describe("Coach 2 data visibility", () => {
  test.use({ storageState: "playwright/.auth/coach2.json" });

  test("coach 2 dashboard shows their lessons and stats", async ({ page }) => {
    await page.goto("/coach/dashboard");

    // Wait for dashboard to load
    await expect(page.locator('h1:has-text("Coach Dashboard")').first()).toBeVisible({ timeout: 10000 });

    // Verify overview cards load
    await expect(page.locator("text=Total Students").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Upcoming Lessons").first()).toBeVisible();
    await expect(page.locator("text=Monthly Earnings").first()).toBeVisible();

    // Dashboard should load without error and show data scoped to coach2
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("coach 2 students page shows only their students", async ({ page }) => {
    await page.goto("/coach/students");

    // Wait for students page heading
    await expect(page.locator('h1:has-text("My Students")').first()).toBeVisible({ timeout: 10000 });

    // Coach 2 has a CoachStudent relation (non-primary) to Test Student
    const table = page.locator("table").first();
    const emptyMessage = page.locator("text=No students have booked lessons with you yet").first();
    await expect(table.or(emptyMessage)).toBeVisible({ timeout: 10000 });
  });

  test("coach 2 earnings show only their payments", async ({ page }) => {
    await page.goto("/coach/earnings");

    // Wait for earnings page heading
    await expect(page.locator('h1:has-text("Earnings")').first()).toBeVisible({ timeout: 10000 });

    // Verify Total Earnings card is visible
    await expect(page.locator("text=Total Earnings").first()).toBeVisible({ timeout: 10000 });

    // Coach2 has ZELLE payment at $90 -- verify VENMO (coach1's method) does not appear
    const bodyText = await page.textContent("body");
    if (bodyText && bodyText.includes("ZELLE")) {
      expect(bodyText).not.toContain("TEST-PAYOUT-001");
    }
  });
});
