import { test, expect } from "@playwright/test";

// SECT-02: Role Guard Enforcement
// Verifies that unauthorized role access is redirected correctly by proxy.ts.
// The proxy does silent redirects (not error pages), so all assertions use toHaveURL().

test.describe("student cannot access admin or coach routes", () => {
  test.use({ storageState: "playwright/.auth/student.json" });

  test("student redirected from /admin/dashboard to /student/dashboard", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });
  });

  test("student redirected from /coach/dashboard to /student/dashboard", async ({ page }) => {
    await page.goto("/coach/dashboard");
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });
  });
});

test.describe("coach cannot access admin routes", () => {
  test.use({ storageState: "playwright/.auth/coach.json" });

  test("coach redirected from /admin/dashboard to /coach/dashboard", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/coach\/dashboard/, { timeout: 10000 });
  });
});

test.describe("unauthenticated user redirected to login", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user redirected from /admin/dashboard to login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });

  test("unauthenticated user redirected from /student/dashboard to login", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });

  test("unauthenticated user redirected from /coach/dashboard to login", async ({ page }) => {
    await page.goto("/coach/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });
});

// SECT-03: Dual-Role Navigation
// Verifies that SUPER_ADMIN can switch between admin and coach views via sidebar links.
// SUPER_ADMIN is allowed to access /coach/* routes (proxy lines 98-103).

test.describe("dual-role navigation", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("admin can switch to coach view and back", async ({ page }) => {
    // Start on admin dashboard
    await page.goto("/admin/dashboard");
    // Use .first() to avoid strict mode violation (sidebar + main both have h1)
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // Wait for "Coach View" link to appear in sidebar -- depends on useCurrentUser hook
    // loading coachId. Under parallel load this can take 15s+.  .first() for dual layout.
    const coachViewLink = page.locator('a:has-text("Coach View")').first();
    await expect(coachViewLink).toBeVisible({ timeout: 30000 });

    // Click to switch to coach view. Under parallel load, use waitForURL
    // to synchronize click and navigation.
    await Promise.all([
      page.waitForURL(/\/coach\/dashboard/, { timeout: 30000 }),
      coachViewLink.click(),
    ]);

    // Verify coach dashboard heading appears
    await expect(page.locator('h1:has-text("Coach Dashboard")').first()).toBeVisible({ timeout: 15000 });

    // Find "Admin View" link in the coach sidebar -- .first() for desktop/mobile duplicate
    const adminViewLink = page.locator('a:has-text("Admin View")').first();
    await expect(adminViewLink).toBeVisible({ timeout: 30000 });

    // Click to return to admin. Under parallel load, navigation may be delayed.
    await Promise.all([
      page.waitForURL(/\/admin\/dashboard/, { timeout: 30000 }),
      adminViewLink.click(),
    ]);

    // Verify admin dashboard heading reappears
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });
  });
});
