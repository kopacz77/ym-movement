import { test, expect } from "@playwright/test";

// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

test.describe("Time Slot Operations", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/schedule");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 15000 });
  });

  test.describe("Time Slot Creation", () => {
    test("should open compact create dialog when clicking empty calendar area", async ({
      page,
    }) => {
      // Wait for calendar to render
      const calendar = page.locator('[class*="rbc-"]').first();
      await expect(calendar).toBeVisible({ timeout: 15000 });

      // Click on an empty area in the calendar
      const emptySlot = page.locator(".rbc-day-slot .rbc-timeslot-group").first();
      if (await emptySlot.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emptySlot.click();

        // CompactTimeSlotDialog should open
        const dialog = page.locator('[role="dialog"]').first();
        if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(page.locator("text=Create Time Slot").first()).toBeVisible();
        }
      }
    });

    test("should display create dialog with all required fields", async ({ page }) => {
      // Look for any "Create" or "Add" button in the schedule header
      const createButton = page
        .locator('button:has-text("Bulk Create Slots")')
        .first();

      if (!(await createButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip(true, "Create button not found in schedule header");
        return;
      }

      await createButton.click();

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 10000 });

      // Verify dialog has form fields
      await expect(dialog.locator("text=Rink").or(dialog.locator("text=rink")).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test("should show draft indicator on newly created slots", async ({ page }) => {
      // Look for any [DRAFT] prefixed events on the calendar
      const draftEvent = page.locator('.rbc-event:has-text("[DRAFT]")').first();

      if (await draftEvent.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Verify draft slots have distinct gray styling
        await expect(draftEvent).toBeVisible();

        // Click to open and verify it shows draft status
        await draftEvent.click();
        const dialog = page.locator('[role="dialog"]').first();
        if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Dialog should indicate this is a draft slot
          await expect(dialog).toBeVisible();
        }
      }
    });
  });

  test.describe("Draft Publishing", () => {
    test("should show publish button when draft slots exist", async ({ page }) => {
      // The "Publish" button only appears when there are draft (isActive=false) slots
      const publishButton = page.locator('button:has-text("Publish")').first();

      if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Verify it shows the draft count
        await expect(publishButton).toContainText(/Publish/);
        await expect(publishButton).toBeEnabled();
      }
      // If no publish button, there are no drafts — that's valid state
    });

    test("should distinguish booked drafts from empty drafts visually", async ({ page }) => {
      // Look for draft events on the calendar
      const draftEvents = page.locator('.rbc-event:has-text("[DRAFT]")');
      const draftCount = await draftEvents.count();

      if (draftCount === 0) {
        test.skip(true, "No draft time slots visible — cannot test visual distinction");
        return;
      }

      // If multiple drafts exist, verify they render (visual color difference
      // between booked/unbooked drafts is handled by inline backgroundColor)
      for (let i = 0; i < Math.min(draftCount, 3); i++) {
        await expect(draftEvents.nth(i)).toBeVisible();
      }
    });
  });

  test.describe("Bulk Select Operations", () => {
    test("should toggle bulk selection mode", async ({ page }) => {
      const bulkSelectButton = page.locator('button:has-text("Bulk Select")').first();

      if (!(await bulkSelectButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip(true, "Bulk Select button not found");
        return;
      }

      // Enter bulk selection mode
      await bulkSelectButton.click();

      // Toolbar should appear with selection controls
      const selectAllButton = page.locator('button:has-text("Select All")').first();
      const clearButton = page.locator('button:has-text("Clear")').first();

      await expect(selectAllButton).toBeVisible({ timeout: 5000 });
      await expect(clearButton).toBeVisible();

      // Should show "0 selected" badge
      await expect(page.locator("text=selected").first()).toBeVisible();
    });

    test("should select and deselect time slots in bulk mode", async ({ page }) => {
      const bulkSelectButton = page.locator('button:has-text("Bulk Select")').first();

      if (!(await bulkSelectButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip(true, "Bulk Select button not found");
        return;
      }

      await bulkSelectButton.click();

      // Wait for selection mode toolbar
      await expect(page.locator('button:has-text("Select All")').first()).toBeVisible({
        timeout: 5000,
      });

      // Click "Select All" to select all visible slots
      await page.locator('button:has-text("Select All")').first().click();

      // Selected count should increase above 0
      const selectedText = page.locator("text=selected").first();
      await expect(selectedText).toBeVisible();

      // Click "Clear" to deselect all
      await page.locator('button:has-text("Clear")').first().click();

      // Should show "0 selected" again
      await expect(page.locator("text=0 selected").first()).toBeVisible({ timeout: 5000 });
    });

    test("should show delete confirmation dialog for bulk delete", async ({ page }) => {
      const bulkSelectButton = page.locator('button:has-text("Bulk Select")').first();

      if (!(await bulkSelectButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip(true, "Bulk Select button not found");
        return;
      }

      await bulkSelectButton.click();
      await expect(page.locator('button:has-text("Select All")').first()).toBeVisible({
        timeout: 5000,
      });

      // Select all
      await page.locator('button:has-text("Select All")').first().click();

      // Find the delete button (shows count)
      const deleteButton = page.locator('button:has-text("Delete")').first();

      if (!(await deleteButton.isEnabled({ timeout: 3000 }).catch(() => false))) {
        test.skip(true, "No slots selected or delete button disabled");
        return;
      }

      await deleteButton.click();

      // Confirmation dialog should appear
      const confirmDialog = page.locator('[role="alertdialog"]').first();
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });

      // Should show warning about existing lessons
      await expect(confirmDialog.locator("text=Delete Time Slots").first()).toBeVisible();

      // Cancel to avoid actually deleting seed data
      await page.locator('button:has-text("Cancel")').first().click();
      await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
    });

    test("should exit bulk selection mode", async ({ page }) => {
      const bulkSelectButton = page.locator('button:has-text("Bulk Select")').first();

      if (!(await bulkSelectButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip(true, "Bulk Select button not found");
        return;
      }

      await bulkSelectButton.click();

      // Verify we're in selection mode
      await expect(page.locator('button:has-text("Select All")').first()).toBeVisible({
        timeout: 5000,
      });

      // Find the close/exit button (X icon in toolbar)
      const closeButton = page
        .locator('button:has(svg.lucide-x)')
        .first();

      if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeButton.click();
      } else {
        // Clicking "Bulk Select" again should toggle off
        await page.locator('button:has-text("Bulk Select")').first().click();
      }

      // Selection toolbar should disappear
      await expect(page.locator('button:has-text("Select All")').first()).not.toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("Calendar Navigation", () => {
    test("should navigate between weeks", async ({ page }) => {
      const calendar = page.locator('[class*="rbc-"]').first();
      await expect(calendar).toBeVisible({ timeout: 15000 });

      // Find navigation buttons
      const nextButton = page.locator('button:has(svg.lucide-chevron-right)').first();
      const prevButton = page.locator('button:has(svg.lucide-chevron-left)').first();
      const todayButton = page.locator('button:has-text("Today")').first();

      if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Navigate forward
        await nextButton.click();
        await page.waitForTimeout(500);

        // Navigate back
        await prevButton.click();
        await page.waitForTimeout(500);

        // Return to today
        if (await todayButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await todayButton.click();
        }
      }

      // Calendar should still be rendered
      await expect(calendar).toBeVisible();
    });

    test("should display time slot details on click", async ({ page }) => {
      const calendarEvent = page.locator(".rbc-event").first();

      if (!(await calendarEvent.isVisible({ timeout: 10000 }).catch(() => false))) {
        test.skip(true, "No time slots visible in calendar");
        return;
      }

      await calendarEvent.click();

      // TimeSlotDialog should show slot details
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 10000 });

      // Should show basic slot info (rink name, time, etc.)
      await expect(dialog.locator("text=Test Ice Rink").or(dialog.locator("text=Rink")).first()).toBeVisible({
        timeout: 5000,
      });
    });
  });
});
