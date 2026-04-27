import { test, expect } from "@playwright/test";

// All tests run as super-admin (default storageState from playwright.config.ts).
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

// ATST-01: Admin Coach Overview
test.describe("Admin Coach Overview (ATST-01)", () => {
  test("displays all coaches with status and details", async ({ page }) => {
    await page.goto("/admin/coaches");

    // Assert page heading -- .first()
    await expect(page.locator('h1:has-text("Coach Management")').first()).toBeVisible();

    // Wait for the coaches table to load with real data
    await expect(page.locator("text=Test Coach").first()).toBeVisible({ timeout: 10000 });

    // Assert "All Coaches" tab is active (default tab) -- .first()
    const allCoachesTab = page.locator('[role="tab"]:has-text("All Coaches")').first();
    await expect(allCoachesTab).toHaveAttribute("data-state", "active");

    // Assert both seeded coaches are visible
    await expect(page.locator("tr:has-text('Test Coach')").first()).toBeVisible();
    await expect(page.locator("text=Test Coach 2").first()).toBeVisible();

    // Assert status badges are visible (Active status for approved coaches)
    await expect(page.locator("text=Active").first()).toBeVisible();

    // Assert table has expected column headers
    await expect(page.locator("th:has-text('Name')").first()).toBeVisible();
    await expect(page.locator("th:has-text('Email')").first()).toBeVisible();
    await expect(page.locator("th:has-text('Status')").first()).toBeVisible();
    await expect(page.locator("th:has-text('Revenue Split')").first()).toBeVisible();

    // Assert "Add Coach" button is visible
    await expect(page.locator('button:has-text("Add Coach")').first()).toBeVisible();
  });

  test("shows pending coaches in Pending Approvals tab", async ({ page }) => {
    await page.goto("/admin/coaches");

    // Verify the "Pending Approvals" tab trigger is visible -- .first()
    const pendingTab = page.locator('[role="tab"]:has-text("Pending Approvals")').first();
    await expect(pendingTab).toBeVisible();

    // Click the tab
    await pendingTab.click();

    // Handle both states: pending coaches exist, loading, or empty state
    const pendingContent = page.locator("text=Pending Coach").or(
      page.locator("text=Deny Test Coach"),
    ).or(
      page.locator("text=No pending coach applications"),
    );
    await expect(pendingContent.first()).toBeVisible({ timeout: 30000 });
  });
});

// ATST-02: Inline Revenue Split Editor
test.describe("Revenue Split Editor (ATST-02)", () => {
  test("inline revenue split editor updates percentage", async ({ page }) => {
    await page.goto("/admin/coaches");

    // Wait for "All Coaches" tab content to load -- .first()
    await expect(page.locator("text=Test Coach").first()).toBeVisible({ timeout: 15000 });

    // Find the exact "Test Coach" row -- filter out "Test Coach 2" and "Deny Test Coach"
    // by matching the row with email "coach@test.com" (unique to Test Coach)
    const coachRow = page.locator("tr").filter({ hasText: "coach@test.com" }).first();

    // Click the pencil edit button (first icon button in the row)
    const editButton = coachRow.locator('button:has(svg.lucide-pencil), button:has(svg.lucide-edit)').first();
    await editButton.click();

    // Input should now be visible in the coach row
    const splitInput = coachRow.locator('input[type="number"]');
    await expect(splitInput).toBeVisible();

    // Select all text, then type new value to trigger React onChange
    await splitInput.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("75");

    // Wait for save button to be enabled (React state update after onChange)
    const saveButton = coachRow.locator("button.text-green-600");
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();

    // Assert success toast (30s for tRPC mutation under parallel load)
    await expect(page.locator("text=Revenue split updated")).toBeVisible({ timeout: 30000 });

    // Verify the new value is displayed in the row
    await expect(coachRow.locator("text=75%")).toBeVisible();

    // CLEANUP: Reset back to 70%
    await page.waitForTimeout(500);

    const editButton2 = coachRow.locator('button:has(svg.lucide-pencil), button:has(svg.lucide-edit)').first();
    await editButton2.click();

    const splitInput2 = coachRow.locator('input[type="number"]');
    await expect(splitInput2).toBeVisible();
    await splitInput2.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("70");

    const saveButton2 = coachRow.locator("button.text-green-600");
    await expect(saveButton2).toBeEnabled({ timeout: 5000 });
    await saveButton2.click();

    await expect(page.locator("text=Revenue split updated")).toBeVisible({ timeout: 10000 });
    await expect(coachRow.locator("text=70%")).toBeVisible();
  });
});

// ATST-03: Payout Report with CSV Export
test.describe("Payout Report (ATST-03)", () => {
  test("payout report shows summary cards and per-coach breakdown", async ({ page }) => {
    await page.goto("/admin/reports");

    // Assert page heading -- .first()
    await expect(page.locator('h1:has-text("Reports")').first()).toBeVisible();

    // Click "Payouts" tab -- .first()
    await page.locator('[role="tab"]:has-text("Payouts")').first().click();

    // Wait for payout content to load
    await expect(page.locator("text=Payout Report").first()).toBeVisible({ timeout: 10000 });

    // Handle both data-present and no-data states gracefully
    const summaryCard = page.locator("text=Total Revenue").first();
    const emptyState = page.locator("text=No payout data for this period").first();
    await expect(summaryCard.or(emptyState)).toBeVisible({ timeout: 10000 });

    // If summary cards are visible (data exists), verify all three cards
    if (await summaryCard.isVisible()) {
      await expect(page.locator("text=Coach Payouts").first()).toBeVisible();
      await expect(page.locator("text=Platform Revenue").first()).toBeVisible();

      // Assert per-coach table headers
      await expect(page.locator('th:has-text("Coach")').first()).toBeVisible();
      await expect(page.locator('th:has-text("Split %")').first()).toBeVisible();
      await expect(page.locator('th:has-text("Gross Revenue")').first()).toBeVisible();
      await expect(page.locator('th:has-text("Coach Payout")').first()).toBeVisible();
      await expect(page.locator('th:has-text("Platform Share")').first()).toBeVisible();

      // Verify the Total footer row exists
      const totalCell = page.locator("td").filter({ hasText: "Total" }).first();
      await expect(totalCell).toBeVisible();
    }
  });

  test("payout report exports CSV", async ({ page }) => {
    await page.goto("/admin/reports");

    // Click "Payouts" tab -- .first()
    await page.locator('[role="tab"]:has-text("Payouts")').first().click();

    // Wait for payout content to load
    await expect(page.locator("text=Payout Report").first()).toBeVisible({ timeout: 10000 });

    // The Export Payouts CSV button is only visible when data exists
    const exportButton = page.locator('button:has-text("Export Payouts CSV")').first();
    const emptyState = page.locator("text=No payout data for this period").first();

    await expect(exportButton.or(emptyState)).toBeVisible({ timeout: 10000 });

    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent("download");
      await exportButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/payout.*\.csv/i);
      const filePath = await download.path();
      expect(filePath).toBeTruthy();
    } else {
      await expect(emptyState).toBeVisible();
    }
  });
});
