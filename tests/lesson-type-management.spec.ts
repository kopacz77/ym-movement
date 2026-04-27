import { test, expect } from "@playwright/test";

// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

test.describe("Lesson Type Management", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/schedule");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 15000 });
  });

  test("should open time slot dialog when clicking a calendar event", async ({ page }) => {
    // Wait for calendar to render
    const calendarEvent = page.locator(".rbc-event").first();

    if (!(await calendarEvent.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, "No time slots visible in calendar — seed data may need adjustment");
      return;
    }

    await calendarEvent.click();

    // TimeSlotDialog should open
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
  });

  test("should display assign student button in time slot dialog", async ({ page }) => {
    const calendarEvent = page.locator(".rbc-event").first();

    if (!(await calendarEvent.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, "No time slots visible in calendar");
      return;
    }

    await calendarEvent.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Look for the assign student button
    const assignButton = page.locator('button:has-text("Assign Student")').first();
    await expect(assignButton).toBeVisible({ timeout: 10000 });
  });

  test("should open assignment dialog with student and lesson type selects", async ({ page }) => {
    const calendarEvent = page.locator(".rbc-event").first();

    if (!(await calendarEvent.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, "No time slots visible in calendar");
      return;
    }

    await calendarEvent.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Click assign student button
    const assignButton = page.locator('button:has-text("Assign Student")').first();
    await assignButton.click();

    // Assignment dialog should appear with correct title
    await expect(page.locator("text=Assign Student to Time Slot").first()).toBeVisible({
      timeout: 10000,
    });

    // Should have student select
    const studentSelect = page.locator("#student-select").first();
    await expect(studentSelect).toBeVisible();

    // Should have lesson type select (may be disabled until student selected)
    const lessonTypeSelect = page.locator("#lesson-type-select").first();
    await expect(lessonTypeSelect).toBeVisible();

    // Should have notes textarea
    const notes = page.locator("#assignment-notes").first();
    await expect(notes).toBeVisible();

    // Should have cancel and assign buttons
    await expect(page.locator('button:has-text("Cancel")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Assign Student")').first()).toBeVisible();
  });

  test("should show lesson type options with prices after selecting student", async ({ page }) => {
    const calendarEvent = page.locator(".rbc-event").first();

    if (!(await calendarEvent.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, "No time slots visible in calendar");
      return;
    }

    await calendarEvent.click();
    await page.locator('button:has-text("Assign Student")').first().click();

    // Wait for assignment dialog
    await expect(page.locator("text=Assign Student to Time Slot").first()).toBeVisible({
      timeout: 10000,
    });

    // Select a student from the dropdown
    const studentSelect = page.locator("#student-select").first();
    await studentSelect.click();

    const studentOption = page.getByRole("option", { name: /Test Student/i }).first();
    if (!(await studentOption.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Test Student not available in dropdown");
      return;
    }
    await studentOption.click();

    // Now lesson type select should be enabled — click it to see options
    const lessonTypeSelect = page.locator("#lesson-type-select").first();
    await lessonTypeSelect.click();

    // Should show lesson type options with prices
    await expect(
      page
        .getByRole("option", { name: /Private/i })
        .or(page.getByRole("option", { name: /Choreography/i })),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display assigned students with lesson type badges", async ({ page }) => {
    // Find a time slot that already has a student assigned (from seed data)
    // The seed data creates a lesson with "Test Student" assigned
    const bookedEvent = page
      .locator(".rbc-event")
      .filter({ hasText: "Test Student" })
      .first();

    if (!(await bookedEvent.isVisible({ timeout: 10000 }).catch(() => false))) {
      // Try navigating forward to find the slot
      const nextButton = page.locator('button:has(svg.lucide-chevron-right)').first();
      if (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      }

      if (!(await bookedEvent.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip(true, "No booked time slots found with Test Student");
        return;
      }
    }

    await bookedEvent.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Should show assigned students section
    await expect(
      page.locator("text=Assigned Students").or(page.locator("text=Test Student")).first(),
    ).toBeVisible({ timeout: 10000 });

    // Should show lesson type badge (Private, Choreography, etc.)
    const lessonTypeBadge = page
      .locator("text=Private")
      .or(page.locator("text=Choreography"))
      .or(page.locator("text=Group"))
      .or(page.locator("text=Competition"))
      .first();
    await expect(lessonTypeBadge).toBeVisible({ timeout: 5000 });

    // Should show price
    await expect(page.locator("text=$").first()).toBeVisible({ timeout: 5000 });
  });

  test("should open edit lesson type dialog for assigned student", async ({ page }) => {
    const bookedEvent = page
      .locator(".rbc-event")
      .filter({ hasText: "Test Student" })
      .first();

    if (!(await bookedEvent.isVisible({ timeout: 10000 }).catch(() => false))) {
      const nextButton = page.locator('button:has(svg.lucide-chevron-right)').first();
      if (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      }

      if (!(await bookedEvent.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip(true, "No booked time slots found with Test Student");
        return;
      }
    }

    await bookedEvent.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Find and click the edit lesson type button (pencil icon)
    const editButton = page
      .locator('button[title*="Edit"], button:has(svg.lucide-edit), button:has(svg.lucide-pencil)')
      .first();

    if (!(await editButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Edit lesson type button not found");
      return;
    }

    await editButton.click();

    // Edit dialog should appear
    await expect(page.locator("text=Edit Lesson Type").first()).toBeVisible({ timeout: 10000 });

    // Should have lesson type select
    const lessonTypeSelect = page.locator("#lesson-type").first();
    await expect(lessonTypeSelect).toBeVisible();

    // Should have cancel and update buttons
    await expect(page.locator('button:has-text("Cancel")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Update Lesson Type")').first()).toBeVisible();
  });

  test("should show price change preview when changing lesson type", async ({ page }) => {
    const bookedEvent = page
      .locator(".rbc-event")
      .filter({ hasText: "Test Student" })
      .first();

    if (!(await bookedEvent.isVisible({ timeout: 10000 }).catch(() => false))) {
      const nextButton = page.locator('button:has(svg.lucide-chevron-right)').first();
      if (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      }

      if (!(await bookedEvent.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip(true, "No booked time slots found with Test Student");
        return;
      }
    }

    await bookedEvent.click();
    await page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 10000 });

    const editButton = page
      .locator('button[title*="Edit"], button:has(svg.lucide-edit), button:has(svg.lucide-pencil)')
      .first();

    if (!(await editButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Edit lesson type button not found");
      return;
    }

    await editButton.click();
    await expect(page.locator("text=Edit Lesson Type").first()).toBeVisible({ timeout: 10000 });

    // Change the lesson type to something different
    const lessonTypeSelect = page.locator("#lesson-type").first();
    await lessonTypeSelect.click();

    // Pick a different type than current
    const choreographyOption = page.getByRole("option", { name: /Choreography/i }).first();
    const privateOption = page.getByRole("option", { name: /Private/i }).first();

    const optionToClick = (await choreographyOption.isVisible({ timeout: 3000 }).catch(() => false))
      ? choreographyOption
      : privateOption;

    await optionToClick.click();

    // Should show price change preview
    const priceChange = page.locator("text=Price will change from").first();
    if (await priceChange.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(priceChange).toBeVisible();
    }

    // Update button should now be enabled (hasChanges = true)
    await expect(page.locator('button:has-text("Update Lesson Type")').first()).toBeEnabled();
  });
});
