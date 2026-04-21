import { expect, test } from "@playwright/test";

// Blocked Dates Management E2E tests.
// Tests the WorkingBlockedDatesManager component rendered inside a Popover
// on the admin schedule page. All selectors use .first() to avoid strict mode
// violations from duplicate desktop + mobile layout DOM elements.

/**
 * Returns a YYYY-MM-DD string for a date `daysFromNow` days in the future.
 */
function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD format for input[type=date]
}

test.describe("Blocked Dates Management", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  /**
   * Helper: navigate to the schedule page and open the Block Dates popover.
   * Returns a locator scoped to the popover content panel.
   */
  async function openBlockDatesPopover(page: import("@playwright/test").Page) {
    await page.goto("/admin/schedule");
    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 15000 });

    // The "Block Dates" button in the header toolbar triggers a Popover
    const blockDatesButton = page.locator('button:has-text("Block Dates")').first();
    await expect(blockDatesButton).toBeVisible({ timeout: 10000 });
    await blockDatesButton.click();

    // Wait for the popover content to appear (contains the WorkingBlockedDatesManager)
    const popoverContent = page.locator('[data-radix-popper-content-wrapper]').first();
    await expect(popoverContent).toBeVisible({ timeout: 10000 });

    return popoverContent;
  }

  test("should open and close the block dates form", async ({ page }) => {
    const popover = await openBlockDatesPopover(page);

    // The "+ Block Dates" toggle button should be visible inside the popover
    const toggleButton = popover.locator('button:has-text("+ Block Dates")');
    await expect(toggleButton).toBeVisible({ timeout: 10000 });

    // Click to open the create form
    await toggleButton.click();

    // Verify form fields appear
    await expect(popover.locator('label:has-text("Title")')).toBeVisible({ timeout: 5000 });
    await expect(popover.locator('input[placeholder="e.g., Regional Competition"]')).toBeVisible();
    await expect(popover.locator("select")).toBeVisible();
    await expect(popover.locator('label:has-text("Start Date")')).toBeVisible();
    await expect(popover.locator('label:has-text("End Date")')).toBeVisible();
    await expect(popover.locator('input[type="date"]').first()).toBeVisible();
    await expect(
      popover.locator('textarea[placeholder="Additional details about this blocked period"]'),
    ).toBeVisible();

    // The toggle button should now read "Cancel"
    const cancelButton = popover.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible();

    // Click "Cancel" to close the form
    await cancelButton.click();

    // The form should be hidden, and the toggle should revert to "+ Block Dates"
    await expect(popover.locator('input[placeholder="e.g., Regional Competition"]')).toBeHidden({
      timeout: 5000,
    });
    await expect(popover.locator('button:has-text("+ Block Dates")')).toBeVisible();
  });

  test("should create a travel blocked date", async ({ page }) => {
    const popover = await openBlockDatesPopover(page);

    // Open the create form
    await popover.locator('button:has-text("+ Block Dates")').click();
    await expect(popover.locator('input[placeholder="e.g., Regional Competition"]')).toBeVisible({
      timeout: 5000,
    });

    // Fill in the form
    const titleInput = popover.locator('input[placeholder="e.g., Regional Competition"]');
    await titleInput.fill("E2E Travel Test");

    // Type defaults to TRAVEL, but explicitly select it to be thorough
    const typeSelect = popover.locator("select");
    await typeSelect.selectOption("TRAVEL");

    // Set start and end dates 30+ days in the future to avoid conflicts
    const startDateInput = popover.locator('input[type="date"]').first();
    const endDateInput = popover.locator('input[type="date"]').last();
    await startDateInput.fill(futureDate(30));
    await endDateInput.fill(futureDate(32));

    // Submit the form
    const submitButton = popover.locator('button[type="submit"]:has-text("Block Dates")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Verify success: button should briefly show "Creating..." then a success toast should appear
    // Wait for the success toast (delightfulToast.success renders a Sonner toast)
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15000 });

    // The form should close after successful creation
    await expect(popover.locator('input[placeholder="e.g., Regional Competition"]')).toBeHidden({
      timeout: 10000,
    });
  });

  test("should create a competition blocked date", async ({ page }) => {
    const popover = await openBlockDatesPopover(page);

    // Open the create form
    await popover.locator('button:has-text("+ Block Dates")').click();
    await expect(popover.locator('input[placeholder="e.g., Regional Competition"]')).toBeVisible({
      timeout: 5000,
    });

    // Fill in the form with COMPETITION type
    const titleInput = popover.locator('input[placeholder="e.g., Regional Competition"]');
    await titleInput.fill("E2E Competition Test");

    const typeSelect = popover.locator("select");
    await typeSelect.selectOption("COMPETITION");

    // Use different future dates to avoid overlap with the travel test
    const startDateInput = popover.locator('input[type="date"]').first();
    const endDateInput = popover.locator('input[type="date"]').last();
    await startDateInput.fill(futureDate(40));
    await endDateInput.fill(futureDate(42));

    // Optionally fill in description
    const descriptionTextarea = popover.locator(
      'textarea[placeholder="Additional details about this blocked period"]',
    );
    await descriptionTextarea.fill("Automated test - competition blocked dates");

    // Submit
    const submitButton = popover.locator('button[type="submit"]:has-text("Block Dates")');
    await submitButton.click();

    // Wait for success toast
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15000 });

    // Form should close
    await expect(popover.locator('input[placeholder="e.g., Regional Competition"]')).toBeHidden({
      timeout: 10000,
    });
  });

  test("should display existing blocked periods in the list", async ({ page }) => {
    const popover = await openBlockDatesPopover(page);

    // The "Existing Blocked Periods" heading should be visible
    await expect(popover.locator("text=Existing Blocked Periods")).toBeVisible({ timeout: 10000 });

    // Either there are blocked periods listed, or we see the empty state message.
    // If prior tests created entries, we should see them. Check for either state.
    const blockedPeriodEntry = popover.locator('button:has-text("Delete")').first();
    const emptyMessage = popover.locator("text=No blocked date ranges configured");
    const hasEntries = await blockedPeriodEntry.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasEntries) {
      // Verify that blocked period entries contain expected structure:
      // Each entry has a title (bold text), date range, and type label
      const entryContainer = popover
        .locator('div:has(button:has-text("Delete"))')
        .first();
      await expect(entryContainer).toBeVisible();

      // There should be a Delete button for each entry
      await expect(blockedPeriodEntry).toBeVisible();
    } else {
      // Empty state is acceptable if no blocked dates exist yet
      await expect(emptyMessage).toBeVisible();
    }
  });

  test("should delete a blocked date from the list", async ({ page }) => {
    // First, ensure a blocked date exists by creating one
    const popover = await openBlockDatesPopover(page);

    // Open the create form
    await popover.locator('button:has-text("+ Block Dates")').click();
    await expect(popover.locator('input[placeholder="e.g., Regional Competition"]')).toBeVisible({
      timeout: 5000,
    });

    // Create a blocked date specifically for deletion
    const titleInput = popover.locator('input[placeholder="e.g., Regional Competition"]');
    await titleInput.fill("E2E Delete Test");

    const startDateInput = popover.locator('input[type="date"]').first();
    const endDateInput = popover.locator('input[type="date"]').last();
    await startDateInput.fill(futureDate(50));
    await endDateInput.fill(futureDate(51));

    const submitButton = popover.locator('button[type="submit"]:has-text("Block Dates")');
    await submitButton.click();

    // Wait for success toast and form closure
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15000 });
    await expect(popover.locator('input[placeholder="e.g., Regional Competition"]')).toBeHidden({
      timeout: 10000,
    });

    // Now find the entry we just created and delete it.
    // The popover should still be open (or we may need to reopen it after refetch).
    // Look for the "E2E Delete Test" text and its associated Delete button.
    const deleteTestEntry = popover.locator('text=E2E Delete Test');
    await expect(deleteTestEntry).toBeVisible({ timeout: 10000 });

    // Find the Delete button in the same container as our entry.
    // Each entry is a div containing the title and a Delete button.
    const entryRow = popover
      .locator("div")
      .filter({ hasText: "E2E Delete Test" })
      .filter({ has: page.locator('button:has-text("Delete")') })
      .first();
    const deleteButton = entryRow.locator('button:has-text("Delete")');
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click();

    // The Sonner toast confirmation appears with "Delete blocked period?" title
    // and "Delete" / "Cancel" action buttons rendered as a custom toast
    const confirmationToast = page.locator('[data-sonner-toast]').filter({
      hasText: "Delete blocked period?",
    });
    await expect(confirmationToast).toBeVisible({ timeout: 10000 });

    // Click "Delete" in the confirmation toast to confirm
    const confirmDeleteButton = confirmationToast.locator('button:has-text("Delete")');
    await expect(confirmDeleteButton).toBeVisible({ timeout: 5000 });
    await confirmDeleteButton.click();

    // After deletion, the confirmation toast should dismiss and a success toast should appear
    // Wait for the success toast
    const successToast = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: /deleted successfully/i })
      .first();
    await expect(successToast).toBeVisible({ timeout: 15000 });

    // The "E2E Delete Test" entry should no longer be visible in the list
    await expect(deleteTestEntry).toBeHidden({ timeout: 10000 });
  });
});
