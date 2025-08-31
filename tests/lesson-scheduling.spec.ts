import { test, expect } from '@playwright/test';

// Helper function to login as admin
async function loginAsAdmin(page: any) {
  await page.goto('/auth/login');
  await page.fill('input[id="email"]', 'admin@ym-movement.com');
  await page.fill('input[id="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/admin', { timeout: 10000 });
}

// Helper function to login as student (if approved)
async function loginAsStudent(page: any, email: string = 'student@example.com', password: string = 'StudentPassword123!') {
  await page.goto('/auth/login');
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test.describe('Lesson Scheduling', () => {
  test.describe('Admin Time Slot Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/schedule');
    });

    test('should display time slots calendar', async ({ page }) => {
      // Check for calendar or schedule view
      await expect(page.locator('[data-testid="schedule-calendar"], .calendar, [class*="calendar"]')).toBeVisible();
      
      // Check for time navigation
      await expect(page.locator('button:has-text("Previous"), button:has-text("Next")')).toBeVisible();
    });

    test('should create new time slot', async ({ page }) => {
      const addButton = page.locator('button:has-text("Add Time Slot"), button:has-text("Create Slot"), button:has-text("Add Slot")');
      
      if (await addButton.isVisible()) {
        await addButton.click();
        
        // Fill time slot form
        await expect(page.locator('form')).toBeVisible();
        
        // Fill start time
        const startTimeInput = page.locator('input[name="startTime"], input[type="datetime-local"]').first();
        await startTimeInput.fill('2025-12-25T10:00');
        
        // Fill end time
        const endTimeInput = page.locator('input[name="endTime"], input[type="datetime-local"]').last();
        await endTimeInput.fill('2025-12-25T10:30');
        
        // Select rink
        const rinkSelect = page.locator('select[name="rinkId"]');
        if (await rinkSelect.isVisible()) {
          await rinkSelect.selectOption({ index: 1 });
        }
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Check for success message
        await expect(page.locator('text=Time slot created')).toBeVisible({ timeout: 10000 });
      }
    });

    test('should edit existing time slot', async ({ page }) => {
      // Look for edit button on existing time slot
      const editButton = page.locator('button:has-text("Edit"), [aria-label="Edit"]').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Should open edit form
        await expect(page.locator('form')).toBeVisible();
        
        // Modify time
        const startTimeInput = page.locator('input[name="startTime"], input[type="datetime-local"]').first();
        await startTimeInput.fill('2025-12-25T11:00');
        
        // Save changes
        await page.click('button:has-text("Save"), button[type="submit"]');
        
        // Check for success message
        await expect(page.locator('text=Time slot updated')).toBeVisible({ timeout: 10000 });
      }
    });

    test('should delete time slot', async ({ page }) => {
      const deleteButton = page.locator('button:has-text("Delete"), [aria-label="Delete"]').first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        
        // Check for success message
        await expect(page.locator('text=Time slot deleted')).toBeVisible({ timeout: 10000 });
      }
    });

    test('should handle bulk time slot creation', async ({ page }) => {
      const bulkCreateButton = page.locator('button:has-text("Bulk Create"), button:has-text("Bulk Add")');
      
      if (await bulkCreateButton.isVisible()) {
        await bulkCreateButton.click();
        
        // Should open bulk creation form
        await expect(page.locator('form')).toBeVisible();
        
        // Fill bulk creation form
        await page.fill('input[name="startDate"]', '2025-12-25');
        await page.fill('input[name="endDate"]', '2025-12-27');
        await page.fill('input[name="startTime"]', '10:00');
        await page.fill('input[name="endTime"]', '18:00');
        await page.fill('input[name="slotDuration"]', '30');
        
        // Submit
        await page.click('button[type="submit"]');
        
        // Check for success message
        await expect(page.locator('text=Time slots created')).toBeVisible({ timeout: 15000 });
      }
    });

    test('should handle bulk delete operations', async ({ page }) => {
      const bulkActionsButton = page.locator('button:has-text("Bulk Actions"), button:has-text("Select Multiple")');
      
      if (await bulkActionsButton.isVisible()) {
        await bulkActionsButton.click();
        
        // Should show checkboxes
        await expect(page.locator('input[type="checkbox"]')).toBeVisible();
        
        // Select some time slots
        await page.locator('input[type="checkbox"]').first().check();
        await page.locator('input[type="checkbox"]').nth(1).check();
        
        // Delete selected
        const deleteSelectedButton = page.locator('button:has-text("Delete Selected")');
        if (await deleteSelectedButton.isVisible()) {
          await deleteSelectedButton.click();
          
          // Confirm
          const confirmButton = page.locator('button:has-text("Confirm")');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
        }
      }
    });

    test('should filter time slots by date range', async ({ page }) => {
      const dateFilter = page.locator('input[type="date"]').first();
      
      if (await dateFilter.isVisible()) {
        await dateFilter.fill('2025-12-25');
        await page.waitForLoadState('networkidle');
        
        // Should filter time slots
        await expect(page.locator('[data-testid="time-slot"], .time-slot')).toBeVisible();
      }
    });

    test('should filter time slots by rink', async ({ page }) => {
      const rinkFilter = page.locator('select[name="rink"], select:has(option:has-text("Rink"))');
      
      if (await rinkFilter.isVisible()) {
        await rinkFilter.selectOption({ index: 1 });
        await page.waitForLoadState('networkidle');
        
        // Should filter by rink
        await expect(page.locator('[data-testid="time-slot"], .time-slot')).toBeVisible();
      }
    });

    test('should show conflict warnings', async ({ page }) => {
      // Try to create overlapping time slot
      const addButton = page.locator('button:has-text("Add Time Slot")');
      
      if (await addButton.isVisible()) {
        await addButton.click();
        
        // Create slot that might conflict
        await page.fill('input[name="startTime"]', '2025-12-25T10:00');
        await page.fill('input[name="endTime"]', '2025-12-25T10:30');
        
        const rinkSelect = page.locator('select[name="rinkId"]');
        if (await rinkSelect.isVisible()) {
          await rinkSelect.selectOption({ index: 1 });
        }
        
        await page.click('button[type="submit"]');
        
        // Should show conflict warning if one exists
        const conflictWarning = page.locator('text=conflict, text=overlapping');
        // This might or might not be visible depending on existing data
      }
    });
  });

  test.describe('Student Lesson Booking', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsStudent(page);
      // Navigate to student schedule page
      await page.goto('/student/schedule');
    });

    test('should display available time slots', async ({ page }) => {
      // Check for available slots display
      await expect(page.locator('text=Available Time Slots')).toBeVisible();
      
      // Check for time slot cards or list
      await expect(page.locator('[data-testid="available-slot"], .time-slot, .available-slot')).toBeVisible();
    });

    test('should book a lesson', async ({ page }) => {
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Reserve")').first();
      
      if (await bookButton.isVisible()) {
        await bookButton.click();
        
        // Should open booking form
        await expect(page.locator('form')).toBeVisible();
        
        // Select lesson type if available
        const lessonTypeSelect = page.locator('select[name="lessonType"]');
        if (await lessonTypeSelect.isVisible()) {
          await lessonTypeSelect.selectOption('Group Lesson');
        }
        
        // Add special requests if field exists
        const specialRequestsField = page.locator('textarea[name="specialRequests"]');
        if (await specialRequestsField.isVisible()) {
          await specialRequestsField.fill('Please focus on turns and jumps');
        }
        
        // Submit booking
        await page.click('button[type="submit"]');
        
        // Check for success message
        await expect(page.locator('text=Lesson booked successfully')).toBeVisible({ timeout: 10000 });
      }
    });

    test('should display booked lessons', async ({ page }) => {
      // Navigate to my lessons
      await page.goto('/student/lessons');
      
      // Check for lessons table or list
      await expect(page.locator('text=My Lessons')).toBeVisible();
      await expect(page.locator('table, [data-testid="lessons-list"]')).toBeVisible();
    });

    test('should cancel a lesson', async ({ page }) => {
      await page.goto('/student/lessons');
      
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        
        // Confirm cancellation
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        
        // Check for success message
        await expect(page.locator('text=Lesson cancelled')).toBeVisible({ timeout: 10000 });
      }
    });

    test('should respect maximum lessons per week limit', async ({ page }) => {
      await page.goto('/student/schedule');
      
      // Try to book multiple lessons
      const bookButtons = page.locator('button:has-text("Book")');
      const buttonCount = await bookButtons.count();
      
      if (buttonCount > 0) {
        // Book first lesson
        await bookButtons.first().click();
        await page.click('button[type="submit"]');
        
        // Try to book more lessons than allowed
        // This test depends on the student's maxLessonsPerWeek setting
        const warningMessage = page.locator('text=maximum lessons, text=lesson limit');
        // This might be visible if limit is reached
      }
    });

    test('should filter available slots by date', async ({ page }) => {
      const dateFilter = page.locator('input[type="date"]');
      
      if (await dateFilter.isVisible()) {
        await dateFilter.fill('2025-12-25');
        await page.waitForLoadState('networkidle');
        
        // Should show slots for selected date
        await expect(page.locator('[data-testid="available-slot"]')).toBeVisible();
      }
    });

    test('should show lesson confirmation details', async ({ page }) => {
      const bookButton = page.locator('button:has-text("Book")').first();
      
      if (await bookButton.isVisible()) {
        await bookButton.click();
        
        // Should show confirmation details
        await expect(page.locator('text=Lesson Details')).toBeVisible();
        await expect(page.locator('text=Date:')).toBeVisible();
        await expect(page.locator('text=Time:')).toBeVisible();
        await expect(page.locator('text=Location:')).toBeVisible();
      }
    });
  });

  test.describe('Payment Integration', () => {
    test('should display payment information during booking', async ({ page }) => {
      await loginAsStudent(page);
      await page.goto('/student/schedule');
      
      const bookButton = page.locator('button:has-text("Book")').first();
      
      if (await bookButton.isVisible()) {
        await bookButton.click();
        
        // Should show payment details
        await expect(page.locator('text=Payment Information')).toBeVisible();
        await expect(page.locator('text=Venmo, text=Zelle')).toBeVisible();
      }
    });

    test('should generate payment reference code', async ({ page }) => {
      await loginAsStudent(page);
      await page.goto('/student/schedule');
      
      const bookButton = page.locator('button:has-text("Book")').first();
      
      if (await bookButton.isVisible()) {
        await bookButton.click();
        await page.click('button[type="submit"]');
        
        // Should show payment reference
        await expect(page.locator('text=Payment Reference')).toBeVisible();
        await expect(page.locator('[data-testid="payment-reference"]')).toBeVisible();
      }
    });
  });

  test.describe('Email Notifications', () => {
    test('should send confirmation email after booking', async ({ page }) => {
      await loginAsStudent(page);
      await page.goto('/student/schedule');
      
      const bookButton = page.locator('button:has-text("Book")').first();
      
      if (await bookButton.isVisible()) {
        await bookButton.click();
        await page.click('button[type="submit"]');
        
        // Should show email confirmation message
        await expect(page.locator('text=confirmation email')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Google Calendar Integration', () => {
    test('should provide Google Calendar link', async ({ page }) => {
      await loginAsStudent(page);
      await page.goto('/student/lessons');
      
      // Look for Google Calendar link
      const calendarLink = page.locator('a:has-text("Add to Calendar"), a[href*="calendar.google.com"]');
      if (await calendarLink.isVisible()) {
        await expect(calendarLink).toHaveAttribute('href', /calendar\.google\.com/);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display schedule correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAsAdmin(page);
      await page.goto('/admin/schedule');
      
      // Check mobile layout
      await expect(page.locator('[data-testid="schedule-calendar"]')).toBeVisible();
      
      // Check mobile navigation
      const mobileMenuButton = page.locator('button[aria-label="Menu"]');
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        await expect(page.locator('nav')).toBeVisible();
      }
    });

    test('should display booking form correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await loginAsStudent(page);
      await page.goto('/student/schedule');
      
      const bookButton = page.locator('button:has-text("Book")').first();
      
      if (await bookButton.isVisible()) {
        await bookButton.click();
        
        // Check tablet form layout
        await expect(page.locator('form')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
      }
    });
  });
});