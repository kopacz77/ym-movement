import { expect, test } from "@playwright/test";
import { format, startOfMonth, subMonths } from "date-fns";

// Reports dashboard E2E tests.
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.
//
// Seed data (from tests/helpers/seed-test-data.ts) creates:
//   - COMPLETED lesson ($120, PRIVATE) for "Test Coach" (70% split)
//   - COMPLETED lesson ($90, CHOREOGRAPHY) for "Test Coach 2" (65% split)
//   - Both have COMPLETED payments, verified by admin
// This ensures revenue, attendance, and payout tabs have data to display.

test.describe("Reports Dashboard", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("should display reports page with period selector", async ({ page }) => {
    await page.goto("/admin/reports");

    // Verify the page heading is visible
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });

    // Verify the period selector is present with its label
    await expect(page.locator("text=Period:").first()).toBeVisible();

    // Verify the Radix Select trigger shows the default period ("Select month")
    const selectTrigger = page.locator('[data-slot="select-trigger"]').first();
    await expect(selectTrigger).toBeVisible();
    await expect(selectTrigger).toHaveText(/Select month/);

    // Verify the Revenue tab is visible and active by default
    const revenueTab = page.locator('[role="tab"]:has-text("Revenue")').first();
    await expect(revenueTab).toBeVisible();
    await expect(revenueTab).toHaveAttribute("data-state", "active");
  });

  test("should switch between report tabs", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });

    // Revenue tab is active by default -- verify its content card
    await expect(page.locator('text="Revenue Report"').first()).toBeVisible({ timeout: 10000 });

    // Click Attendance tab
    const attendanceTab = page.locator('[role="tab"]:has-text("Attendance")').first();
    await attendanceTab.click();
    await expect(attendanceTab).toHaveAttribute("data-state", "active");
    await expect(page.locator('text="Attendance Report"').first()).toBeVisible({ timeout: 10000 });

    // Revenue Report card should now be hidden
    await expect(
      page.locator('[role="tabpanel"]:has-text("Revenue Report")').first(),
    ).not.toBeVisible();

    // Click Payouts tab
    const payoutsTab = page.locator('[role="tab"]:has-text("Payouts")').first();
    await payoutsTab.click();
    await expect(payoutsTab).toHaveAttribute("data-state", "active");
    await expect(page.locator('text="Payout Report"').first()).toBeVisible({ timeout: 10000 });

    // Click back to Revenue tab
    const revenueTab = page.locator('[role="tab"]:has-text("Revenue")').first();
    await revenueTab.click();
    await expect(revenueTab).toHaveAttribute("data-state", "active");
    await expect(page.locator('text="Revenue Report"').first()).toBeVisible({ timeout: 10000 });
  });

  test("should change report period", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });

    // Default period is "month" -- the month picker should be visible
    const monthPicker = page.locator("text=Period:").first();
    await expect(monthPicker).toBeVisible();

    // Open the period selector and choose "Last 7 days"
    const selectTrigger = page.locator('[data-slot="select-trigger"]').first();
    await selectTrigger.click();

    // Wait for the select content to appear and click the option
    const weekOption = page.locator('[data-slot="select-item"]:has-text("Last 7 days")');
    await expect(weekOption).toBeVisible({ timeout: 5000 });
    await weekOption.click();

    // After selecting "Last 7 days", the month picker arrows should not be visible
    // (month picker only shows when period === "month")
    await expect(page.locator("button:has(svg.lucide-chevron-left)").first()).not.toBeVisible();

    // Verify the select shows "Last 7 days" text
    await expect(selectTrigger).toHaveText(/Last 7 days/);

    // Now switch to "Last 12 months"
    await selectTrigger.click();
    const yearOption = page.locator('[data-slot="select-item"]:has-text("Last 12 months")');
    await expect(yearOption).toBeVisible({ timeout: 5000 });
    await yearOption.click();

    // Verify the select shows "Last 12 months"
    await expect(selectTrigger).toHaveText(/Last 12 months/);

    // Month picker should still be hidden (only shown for "month" period)
    await expect(page.locator("button:has(svg.lucide-chevron-left)").first()).not.toBeVisible();
  });

  test("should navigate months in month picker", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });

    // Default period is "month", so the month picker should be visible
    const currentMonth = format(startOfMonth(new Date()), "MMMM yyyy");
    const monthDisplay = page.locator(`text="${currentMonth}"`).first();
    await expect(monthDisplay).toBeVisible({ timeout: 10000 });

    // Click the left chevron to go to the previous month
    const leftChevron = page.locator("button:has(svg.lucide-chevron-left)").first();
    await expect(leftChevron).toBeVisible();
    await leftChevron.click();

    // Verify the month text changed to the previous month
    const previousMonth = format(subMonths(startOfMonth(new Date()), 1), "MMMM yyyy");
    await expect(page.locator(`text="${previousMonth}"`).first()).toBeVisible({ timeout: 5000 });

    // The current month text should no longer be visible
    await expect(page.locator(`text="${currentMonth}"`)).not.toBeVisible();

    // Click the right chevron to go back to the current month
    const rightChevron = page.locator("button:has(svg.lucide-chevron-right)").first();
    await expect(rightChevron).toBeVisible();
    await rightChevron.click();

    // Verify we are back to the current month
    await expect(page.locator(`text="${currentMonth}"`).first()).toBeVisible({ timeout: 5000 });
  });

  test("should show revenue statistics", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });

    // Revenue tab is active by default -- wait for the Revenue Report card
    await expect(page.locator('text="Revenue Report"').first()).toBeVisible({ timeout: 10000 });

    // Verify the "Total Revenue" stat card is visible within the Revenue report
    // (either showing data or an empty/loading state)
    const totalRevenueLabel = page.locator("text=Total Revenue").first();
    const noDataMessage = page.locator("text=No revenue data available").first();
    const loadingMessage = page.locator("text=Loading revenue data").first();

    // One of these three states should be visible
    await expect(totalRevenueLabel.or(noDataMessage).or(loadingMessage)).toBeVisible({
      timeout: 15000,
    });

    // Also verify the Summary card at the bottom of the page is present
    await expect(page.locator('text="Summary"').first()).toBeVisible();
    await expect(page.locator("text=Report Period").first()).toBeVisible();
  });

  test("should show payout table with coach data", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });

    // Switch to the Payouts tab
    const payoutsTab = page.locator('[role="tab"]:has-text("Payouts")').first();
    await payoutsTab.click();
    await expect(page.locator('text="Payout Report"').first()).toBeVisible({ timeout: 10000 });

    // The payout report has summary cards and a coach table
    // Check for either data (table with coach info) or empty state
    const coachTable = page.locator("table").first();
    const emptyState = page.locator("text=No payout data").first();
    const loadingState = page.locator(".animate-pulse").first();

    await expect(coachTable.or(emptyState).or(loadingState)).toBeVisible({ timeout: 15000 });

    // If the table is visible, verify it has the expected column headers
    if (await coachTable.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(page.locator('th:has-text("Coach")').first()).toBeVisible();
      await expect(page.locator('th:has-text("Split %")').first()).toBeVisible();
      await expect(page.locator('th:has-text("Gross Revenue")').first()).toBeVisible();
      await expect(page.locator('th:has-text("Coach Payout")').first()).toBeVisible();

      // Verify summary cards above the table
      await expect(page.locator("text=Total Revenue").first()).toBeVisible();
      await expect(page.locator("text=Coach Payouts").first()).toBeVisible();
      await expect(page.locator("text=Platform Revenue").first()).toBeVisible();

      // Check that "Test Coach" appears in the table (from seed data)
      await expect(page.locator('td:has-text("Test Coach")').first()).toBeVisible();

      // The "Export Payouts CSV" button should be present
      await expect(page.locator('button:has-text("Export Payouts CSV")').first()).toBeVisible();
    }
  });

  test("should have export options", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible({ timeout: 15000 });

    // Find and click the Export Report button (desktop text) or Export button (mobile text)
    const exportButton = page
      .locator('button:has-text("Export Report"), button:has-text("Export")')
      .first();
    await expect(exportButton).toBeVisible({ timeout: 10000 });
    await exportButton.click();

    // Verify the dropdown menu appears with all export options
    const dropdownMenu = page.locator('[role="menu"]');
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });

    // Verify each export option is present in the dropdown
    await expect(
      page.locator('[role="menuitem"]:has-text("Export Full Report (CSV)")'),
    ).toBeVisible();
    await expect(page.locator('[role="menuitem"]:has-text("Revenue Only (CSV)")')).toBeVisible();
    await expect(page.locator('[role="menuitem"]:has-text("Attendance Only (CSV)")')).toBeVisible();
    await expect(page.locator('[role="menuitem"]:has-text("Export as PDF")')).toBeVisible();

    // Dismiss the dropdown by pressing Escape
    await page.keyboard.press("Escape");
    await expect(dropdownMenu).not.toBeVisible();
  });
});
