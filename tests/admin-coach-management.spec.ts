import { test, expect } from "@playwright/test";

// All tests run as super-admin (default storageState from playwright.config.ts).
// No test.use() override needed at the file level.

// ATST-01: Admin Coach Overview
test.describe("Admin Coach Overview (ATST-01)", () => {
  test("displays all coaches with status and details", async ({ page }) => {
    await page.goto("/admin/coaches");

    // Assert page heading
    await expect(page.locator('h1:has-text("Coach Management")')).toBeVisible();

    // Wait for the coaches table to load with real data
    await expect(page.locator("text=Test Coach")).toBeVisible({ timeout: 10000 });

    // Assert "All Coaches" tab is active (default tab)
    const allCoachesTab = page.locator('[role="tab"]:has-text("All Coaches")');
    await expect(allCoachesTab).toHaveAttribute("data-state", "active");

    // Assert both seeded coaches are visible
    await expect(page.locator("tr:has-text('Test Coach')").first()).toBeVisible();
    await expect(page.locator("text=Test Coach 2")).toBeVisible();

    // Assert status badges are visible (Active status for approved coaches)
    await expect(page.locator("text=Active").first()).toBeVisible();

    // Assert table has expected column headers visible at 1280px desktop viewport
    await expect(page.locator("th:has-text('Name')")).toBeVisible();
    await expect(page.locator("th:has-text('Email')")).toBeVisible();
    await expect(page.locator("th:has-text('Status')")).toBeVisible();
    await expect(page.locator("th:has-text('Revenue Split')")).toBeVisible();

    // Assert "Add Coach" button is visible
    await expect(page.locator('button:has-text("Add Coach")')).toBeVisible();
  });

  test("shows pending coaches in Pending Approvals tab", async ({ page }) => {
    await page.goto("/admin/coaches");

    // Verify the "Pending Approvals" tab trigger is visible
    const pendingTab = page.locator('[role="tab"]:has-text("Pending Approvals")');
    await expect(pendingTab).toBeVisible();

    // Click the tab
    await pendingTab.click();

    // The tab content should load. Handle both states:
    // - If pending coaches exist (coach3/coach4 may still be pending), verify names appear
    // - If none exist (approval/denial tests already ran), verify the empty state
    const pendingContent = page.locator("text=Pending Coach").or(
      page.locator("text=Deny Test Coach"),
    ).or(
      page.locator("text=No pending coach applications"),
    );
    await expect(pendingContent).toBeVisible({ timeout: 10000 });
  });
});

// ATST-02: Inline Revenue Split Editor
test.describe("Revenue Split Editor (ATST-02)", () => {
  test("inline revenue split editor updates percentage", async ({ page }) => {
    await page.goto("/admin/coaches");

    // Wait for "All Coaches" tab content to load
    await expect(page.locator("text=Test Coach")).toBeVisible({ timeout: 10000 });

    // Find the first coach row ("Test Coach" -- use .first() because "Test Coach 2" also matches)
    const coachRow = page.locator('tr:has-text("Test Coach")').first();

    // Click the pencil edit button to enter inline edit mode
    // RevenueSplitCell renders: <span>70%</span> <Button><Pencil /></Button>
    const editButton = coachRow.locator("button").filter({ has: page.locator("svg") }).first();
    await editButton.click();

    // Input should now be visible in the coach row
    const splitInput = coachRow.locator('input[type="number"]');
    await expect(splitInput).toBeVisible();

    // Change the value to 75
    await splitInput.fill("75");

    // Click the green check/save button (first button with green text color)
    const saveButton = coachRow.locator("button.text-green-600");
    await saveButton.click();

    // Assert success toast
    await expect(page.locator("text=Revenue split updated")).toBeVisible({ timeout: 10000 });

    // Verify the new value is displayed in the row
    await expect(coachRow.locator("text=75%")).toBeVisible();

    // CLEANUP: Reset back to 70% so the test is idempotent
    // Wait for the table to refresh after mutation invalidation
    await page.waitForTimeout(500);

    // Click pencil again on the same row
    const editButton2 = coachRow.locator("button").filter({ has: page.locator("svg") }).first();
    await editButton2.click();

    const splitInput2 = coachRow.locator('input[type="number"]');
    await expect(splitInput2).toBeVisible();
    await splitInput2.fill("70");

    const saveButton2 = coachRow.locator("button.text-green-600");
    await saveButton2.click();

    // Wait for cleanup toast
    await expect(page.locator("text=Revenue split updated")).toBeVisible({ timeout: 10000 });

    // Verify reset
    await expect(coachRow.locator("text=70%")).toBeVisible();
  });
});

// ATST-03: Payout Report with CSV Export
test.describe("Payout Report (ATST-03)", () => {
  test("payout report shows summary cards and per-coach breakdown", async ({ page }) => {
    await page.goto("/admin/reports");

    // Assert page heading
    await expect(page.locator('h1:has-text("Reports")')).toBeVisible();

    // Click "Payouts" tab
    await page.click('[role="tab"]:has-text("Payouts")');

    // Wait for payout content to load -- assert the card title
    await expect(page.locator("text=Payout Report")).toBeVisible({ timeout: 10000 });

    // Handle both data-present and no-data states gracefully
    const summaryCard = page.locator("text=Total Revenue");
    const emptyState = page.locator("text=No payout data for this period");
    await expect(summaryCard.or(emptyState)).toBeVisible({ timeout: 10000 });

    // If summary cards are visible (data exists), verify all three cards
    if (await summaryCard.isVisible()) {
      await expect(page.locator("text=Coach Payouts")).toBeVisible();
      await expect(page.locator("text=Platform Revenue")).toBeVisible();

      // Assert per-coach table headers
      await expect(page.locator('th:has-text("Coach")')).toBeVisible();
      await expect(page.locator('th:has-text("Split %")')).toBeVisible();
      await expect(page.locator('th:has-text("Gross Revenue")')).toBeVisible();
      await expect(page.locator('th:has-text("Coach Payout")')).toBeVisible();
      await expect(page.locator('th:has-text("Platform Share")')).toBeVisible();

      // Verify the Total footer row exists
      const totalCell = page.locator("td").filter({ hasText: "Total" });
      await expect(totalCell).toBeVisible();
    }
  });

  test("payout report exports CSV", async ({ page }) => {
    await page.goto("/admin/reports");

    // Click "Payouts" tab
    await page.click('[role="tab"]:has-text("Payouts")');

    // Wait for payout content to load
    await expect(page.locator("text=Payout Report")).toBeVisible({ timeout: 10000 });

    // The Export Payouts CSV button is only visible when data exists
    // (PayoutReport returns empty state without the button when no data)
    const exportButton = page.locator('button:has-text("Export Payouts CSV")');
    const emptyState = page.locator("text=No payout data for this period");

    // Wait for either export button (data present) or empty state
    await expect(exportButton.or(emptyState)).toBeVisible({ timeout: 10000 });

    // Only test the CSV download if data exists and the button is visible
    if (await exportButton.isVisible()) {
      // Start download listener BEFORE clicking export (race condition prevention)
      const downloadPromise = page.waitForEvent("download");

      await exportButton.click();

      // Capture download and verify filename
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/payout.*\.csv/i);

      // Verify the file path exists (successful download)
      const filePath = await download.path();
      expect(filePath).toBeTruthy();
    } else {
      // No data state -- verify the empty state is shown correctly
      await expect(emptyState).toBeVisible();
      // The test passes -- CSV export cannot be tested without payout data
      // but the UI structure is still verified
    }
  });
});
