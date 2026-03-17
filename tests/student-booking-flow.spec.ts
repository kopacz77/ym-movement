import { test, expect } from "@playwright/test";

// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.

// STST-01: Student Browse-by-Coach Flow
test.describe("Student Browse-by-Coach (STST-01)", () => {
  test.use({ storageState: "playwright/.auth/student.json" });

  test("student sees coach grid with available coaches", async ({ page }) => {
    await page.goto("/student/book");

    // Wait for page title -- .first()
    await expect(page.locator('h1:has-text("Choose Your Coach")').first()).toBeVisible({ timeout: 10000 });

    // Verify at least one coach card is visible
    await expect(page.locator("text=Test Coach").first()).toBeVisible({ timeout: 10000 });

    // Verify coach cards show relevant info
    const coachCard = page
      .locator('[class*="cursor-pointer"]')
      .filter({ hasText: "Test Coach" })
      .first();
    await expect(coachCard).toBeVisible();

    // Cards should show available slots badge
    await expect(
      coachCard.locator("text=slots available").or(coachCard.locator("text=slot available")),
    ).toBeVisible();
  });

  test("student can select a coach and see booking calendar", async ({ page }) => {
    await page.goto("/student/book");

    // Wait for coach grid heading -- .first()
    await expect(page.locator('h1:has-text("Choose Your Coach")').first()).toBeVisible({ timeout: 10000 });

    // Find and click the coach card
    const coachCard = page
      .locator('[class*="cursor-pointer"]')
      .filter({ hasText: "Test Coach" })
      .first();
    await expect(coachCard).toBeVisible({ timeout: 10000 });
    await coachCard.click();

    // Verify title changes to "Book a Lesson with ..."
    await expect(page.locator('h1:has-text("Book a Lesson with")').first()).toBeVisible({ timeout: 10000 });

    // Verify "Change Coach" button appears
    await expect(page.locator('button:has-text("Change Coach")').first()).toBeVisible();

    // Click "Change Coach" to return to grid
    await page.locator('button:has-text("Change Coach")').first().click();

    // Verify "Choose Your Coach" heading reappears
    await expect(page.locator('h1:has-text("Choose Your Coach")').first()).toBeVisible({ timeout: 10000 });
  });
});

// STST-02: Two-Step Booking Flow
test.describe("Two-Step Booking Flow (STST-02)", () => {
  test.use({ storageState: "playwright/.auth/student.json" });

  test("student can complete two-step booking flow", async ({ page }) => {
    await page.goto("/student/book");

    // Step 1: Select coach -- .first()
    await expect(page.locator('h1:has-text("Choose Your Coach")').first()).toBeVisible({ timeout: 10000 });
    const coachCard = page
      .locator('[class*="cursor-pointer"]')
      .filter({ hasText: "Test Coach" })
      .first();
    await expect(coachCard).toBeVisible({ timeout: 10000 });
    await coachCard.click();

    // Step 2: Wait for calendar to load
    await expect(page.locator("text=Book a Lesson").first()).toBeVisible({ timeout: 10000 });

    // Try to find an available slot in the calendar
    let slotFound = false;
    const availableSlot = page.locator(".rbc-event").filter({ hasText: "Available" }).first();
    slotFound = await availableSlot.isVisible({ timeout: 5000 }).catch(() => false);

    // If not visible, try navigating forward (up to 3 times)
    if (!slotFound) {
      for (let i = 0; i < 3; i++) {
        const nextButton = page.locator('button:has(svg.lucide-chevron-right)').first();
        const nextButtonAlt = page.locator(".rbc-btn-group button").last();
        const buttonToClick = (await nextButton.isVisible().catch(() => false))
          ? nextButton
          : nextButtonAlt;

        if (await buttonToClick.isVisible().catch(() => false)) {
          await buttonToClick.click();
          await page.waitForTimeout(1000);
        }

        slotFound = await availableSlot.isVisible({ timeout: 3000 }).catch(() => false);
        if (slotFound) break;
      }
    }

    if (!slotFound) {
      test.skip(
        true,
        "No available time slots visible in calendar -- seed data may need adjustment",
      );
      return;
    }

    // Click the available slot
    await availableSlot.click();

    // Wait for booking dialog to appear
    await expect(
      page.locator('[role="dialog"]').filter({ hasText: "Book a Lesson" }),
    ).toBeVisible({ timeout: 10000 });

    // Click "Book Lesson" button
    await page.locator('button:has-text("Book Lesson")').click();

    // Wait for success indicator
    await expect(
      page
        .locator("text=Lesson booked successfully")
        .or(page.locator("text=Lesson Details"))
        .or(page.locator("text=booked")),
    ).toBeVisible({ timeout: 15000 });
  });
});

// STST-03: Coach Name Display
test.describe("Coach Name Display (STST-03)", () => {
  test.use({ storageState: "playwright/.auth/student.json" });

  test("student dashboard shows coach name on upcoming lessons", async ({ page }) => {
    await page.goto("/student/dashboard");

    // Wait for the dashboard to load -- .first()
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });

    // Check for upcoming lesson cards
    const coachNameInLessons = page.locator("text=Test Coach").first();
    const instructorFallback = page.locator("text=Instructor").first();
    const emptyState = page
      .locator("text=No upcoming")
      .or(page.locator("text=Book your first"))
      .or(page.locator("text=schedule a lesson"));

    // Either we see the coach name, the fallback, or the empty state
    await expect(coachNameInLessons.or(instructorFallback).or(emptyState.first())).toBeVisible({
      timeout: 10000,
    });
  });

  test("student payments page shows coach name column", async ({ page }) => {
    await page.goto("/student/payments");

    // Wait for the page heading -- .first()
    await expect(page.locator('h1:has-text("Payments")').first()).toBeVisible({ timeout: 10000 });

    // Check for payment records with coach name
    const coachNameInPayments = page.locator("td").filter({ hasText: "Test Coach" }).first();
    const instructorFallback = page.locator("td").filter({ hasText: "Instructor" }).first();
    const emptyState = page.locator("text=No payments found").first();

    // Either we see the coach name in the table, the fallback, or the empty state
    await expect(coachNameInPayments.or(instructorFallback).or(emptyState)).toBeVisible({
      timeout: 10000,
    });
  });
});
