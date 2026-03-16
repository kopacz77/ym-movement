import { test, expect } from "@playwright/test";

// CTST-01: Coach Signup Page Rendering
test.describe("Coach Signup Page (CTST-01)", () => {
  // No auth needed -- public page
  test.use({ storageState: { cookies: [], origins: [] } });

  test("coach signup page renders with all form fields", async ({ page }) => {
    await page.goto("/auth/coach-signup");

    // Verify page title and subtitle
    await expect(page.locator("text=Apply to Coach at YM Movement")).toBeVisible();
    await expect(page.locator("text=Submit your application for admin review")).toBeVisible();

    // Verify all form fields are present
    await expect(page.locator("input#name")).toBeVisible();
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#phone")).toBeVisible();
    await expect(page.locator("textarea#bio")).toBeVisible();
    await expect(page.locator("input#skills")).toBeVisible();
    await expect(page.locator("textarea#certifications")).toBeVisible();
    await expect(page.locator("input#yearsExperience")).toBeVisible();

    // Verify submit button exists (will be disabled due to Turnstile -- just check visibility)
    await expect(
      page.locator('button[type="submit"]:has-text("Submit Application")'),
    ).toBeVisible();

    // Verify login link
    await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
  });
});

// CTST-02: Admin Coach Approval and Denial
test.describe("Admin Coach Approval (CTST-02)", () => {
  // Runs as super-admin
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("admin can approve a pending coach", async ({ page }) => {
    await page.goto("/admin/coaches");

    // Click "Pending Approvals" tab
    await page.click('[role="tab"]:has-text("Pending Approvals")');

    // Wait for "Pending Coach" to appear (coach3)
    await expect(page.locator("text=Pending Coach")).toBeVisible({ timeout: 10000 });

    // Find row with "Pending Coach", click Approve button
    const coachRow = page.locator('tr:has-text("Pending Coach")');
    await coachRow.locator('button:has-text("Approve")').click();

    // Assert success toast
    await expect(page.locator("text=Coach approved")).toBeVisible({ timeout: 10000 });
  });

  test("admin can deny a pending coach", async ({ page }) => {
    await page.goto("/admin/coaches");

    // Click "Pending Approvals" tab
    await page.click('[role="tab"]:has-text("Pending Approvals")');

    // Wait for "Deny Test Coach" to appear (coach4)
    await expect(page.locator("text=Deny Test Coach")).toBeVisible({ timeout: 10000 });

    // Find row with "Deny Test Coach", click Deny button
    const coachRow = page.locator('tr:has-text("Deny Test Coach")');
    await coachRow.locator('button:has-text("Deny")').click();

    // Deny uses showDeleteConfirmation() which renders a custom toast with a "Delete" button
    // Wait for the confirmation toast to appear and click the "Delete" button
    await page.locator('button:has-text("Delete")').click();

    // Assert denial toast
    await expect(page.locator("text=Application denied")).toBeVisible({ timeout: 10000 });
  });
});

// CTST-03: Coach Dashboard Displays Key Sections
test.describe("Coach Dashboard (CTST-03)", () => {
  test.use({ storageState: "playwright/.auth/coach.json" });

  test("displays overview cards and lesson sections", async ({ page }) => {
    await page.goto("/coach/dashboard");

    // Assert page heading
    await expect(page.locator('h1:has-text("Coach Dashboard")')).toBeVisible();

    // Assert overview cards (wait for first card to confirm data loaded)
    await expect(page.locator("text=Total Students")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Upcoming Lessons")).toBeVisible();
    await expect(page.locator("text=Completed This Month")).toBeVisible();
    await expect(page.locator("text=Monthly Earnings")).toBeVisible();

    // Assert lesson sections
    await expect(page.locator("text=Upcoming Lessons")).toBeVisible();
    await expect(page.locator("text=Past Lessons")).toBeVisible();
  });

  test("displays student list on students page", async ({ page }) => {
    await page.goto("/coach/students");

    // Assert page heading
    await expect(page.locator('h1:has-text("My Students")')).toBeVisible();

    // Assert either a table element OR the empty state message
    const table = page.locator("table");
    const emptyMessage = page.locator("text=No students have booked lessons with you yet");
    await expect(table.or(emptyMessage)).toBeVisible({ timeout: 10000 });
  });

  test("displays earnings summary", async ({ page }) => {
    await page.goto("/coach/earnings");

    // Assert page heading
    await expect(page.locator('h1:has-text("Earnings")')).toBeVisible();

    // Assert earnings cards (wait for first card to confirm data loaded)
    await expect(page.locator("text=Total Earnings")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=This Month")).toBeVisible();
    await expect(page.locator("text=Pending Payments")).toBeVisible();
    await expect(page.locator("text=Revenue Split")).toBeVisible();
  });
});

// CTST-04: Coach Profile Editing Persists Changes
test.describe("Coach Profile Editing (CTST-04)", () => {
  test.use({ storageState: "playwright/.auth/coach.json" });

  test("profile editing persists changes", async ({ page }) => {
    await page.goto("/coach/profile");

    // Assert page heading
    await expect(page.locator('h1:has-text("My Profile")')).toBeVisible();

    // Wait for profile form to load
    await expect(page.locator("text=Profile Details")).toBeVisible({ timeout: 10000 });

    // Fill profile fields
    await page.locator("textarea#bio").fill("Updated bio for E2E testing");
    await page.locator("input#skills").fill("Figure Skating, Ice Dance, Freestyle");
    await page.locator("textarea#certifications").fill("PSA Master Rated");
    await page.locator("input#yearsExperience").fill("10");

    // Click save button
    await page.click('button:has-text("Save Profile")');

    // Assert success toast
    await expect(page.locator("text=Profile updated successfully")).toBeVisible({
      timeout: 10000,
    });

    // Reload and verify persistence
    await page.reload();
    await expect(page.locator("text=Profile Details")).toBeVisible({ timeout: 10000 });

    // Assert values persisted
    await expect(page.locator("textarea#bio")).toHaveValue("Updated bio for E2E testing");
    await expect(page.locator("input#skills")).toHaveValue(
      "Figure Skating, Ice Dance, Freestyle",
    );
    await expect(page.locator("textarea#certifications")).toHaveValue("PSA Master Rated");
    await expect(page.locator("input#yearsExperience")).toHaveValue("10");
  });
});

// CTST-05: Coach Proposal and Admin Approval Flow
test.describe("Coach Proposal Flow (CTST-05)", () => {
  test.describe("Coach submits proposal", () => {
    test.use({ storageState: "playwright/.auth/coach.json" });

    test("coach can submit a time slot proposal", async ({ page }) => {
      await page.goto("/coach/proposals");

      // Assert page heading
      await expect(page.locator('h1:has-text("Time Slot Proposals")')).toBeVisible();

      // Wait for form to load
      await expect(page.locator("text=Propose Time Slot")).toBeVisible({ timeout: 10000 });

      // Select rink using shadcn Select (NOT native select)
      await page.click('button:has-text("Select a rink")');
      await page.click('[role="option"]:has-text("Test Ice Rink")');

      // Select date via Popover Calendar
      await page.click('button:has-text("Pick a date")');
      // Click a future, non-disabled date -- use .last() to pick a later date
      const futureDate = page.locator('[role="gridcell"] button:not([disabled])').last();
      await futureDate.click();

      // Fill start and end time (native HTML time inputs)
      await page.fill("input#startTime", "10:00");
      await page.fill("input#endTime", "11:00");

      // Submit the proposal
      await page.click('button:has-text("Propose Time Slot")');

      // Assert success toast
      await expect(page.locator("text=Proposal submitted")).toBeVisible({ timeout: 10000 });

      // Assert "Pending" status badge visible in proposals list
      await expect(page.locator("text=Pending")).toBeVisible();
    });
  });

  test.describe("Admin approves proposal", () => {
    test.use({ storageState: "playwright/.auth/super-admin.json" });

    test("admin can approve a pending proposal", async ({ page }) => {
      await page.goto("/admin/coaches");

      // Click "Proposals" tab
      await page.click('[role="tab"]:has-text("Proposals")');

      // Wait for "Test Coach" to appear in proposal queue
      await expect(page.locator("text=Test Coach")).toBeVisible({ timeout: 10000 });

      // Find proposal row with "Test Coach", click Approve
      const proposalRow = page.locator('tr:has-text("Test Coach")').first();
      await proposalRow.locator('button:has-text("Approve")').click();

      // Assert success toast
      await expect(page.locator("text=Proposal approved")).toBeVisible({ timeout: 10000 });
    });
  });
});
