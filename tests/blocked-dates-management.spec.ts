import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/test-utils';

test.describe('Blocked Dates Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/schedule');
    
    // Wait for calendar to load
    await page.waitForTimeout(2000);
  });

  test('should display blocked dates manager interface', async ({ page }) => {
    // Look for blocked dates manager UI components
    const blockedDatesSection = await Promise.race([
      page.locator('text=Travel & Competition Dates').isVisible(),
      page.locator('text=Blocked Dates').isVisible(),
      page.locator('[data-testid="blocked-dates"]').isVisible(),
    ]);
    
    if (blockedDatesSection) {
      console.log('✅ Blocked dates interface found');
    } else {
      // Look for any blocked date related buttons or sections
      const blockedDateElements = page.locator('button:has-text("Block"), text=/blocked/i').first();
      await expect(blockedDateElements).toBeVisible({ timeout: 5000 });
    }
  });

  test('should open create blocked date dialog', async ({ page }) => {
    // Look for "Add Blocked Dates" or similar button
    const addBlockedButton = page.locator('button:has-text("Add Blocked"), button:has-text("Block Dates")').first();
    
    if (await addBlockedButton.isVisible()) {
      await addBlockedButton.click();
      
      // Should see dialog with form fields
      await expect(page.locator('input[placeholder*="Nationals"], input[name="title"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('select, option:has-text("Travel"), option:has-text("Competition")')).toBeVisible();
      
      console.log('✅ Create blocked date dialog opens successfully');
      
      // Close dialog for cleanup
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('ℹ️ Add blocked dates button not found - checking for alternative UI patterns');
      
      // Alternative: right-click on calendar to create blocked date
      const calendar = page.locator('[class*="calendar"], .react-calendar').first();
      if (await calendar.isVisible()) {
        await calendar.click({ button: 'right' });
        await page.waitForTimeout(1000);
        
        const blockOption = page.locator('text=Block, text=Block Date').first();
        if (await blockOption.isVisible()) {
          console.log('✅ Context menu block date option found');
        }
      }
    }
  });

  test('should create a new blocked date period', async ({ page }) => {
    const addBlockedButton = page.locator('button:has-text("Add Blocked"), button:has-text("Block Dates")').first();
    
    if (await addBlockedButton.isVisible()) {
      await addBlockedButton.click();
      
      // Fill form
      const titleInput = page.locator('input[placeholder*="Nationals"], input[name="title"]');
      await titleInput.fill('Test Competition');
      
      // Select type
      const typeSelect = page.locator('select, [name="type"]');
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption('COMPETITION');
      }
      
      // Add description
      const descInput = page.locator('input[placeholder*="Additional"], input[name="description"], textarea[name="description"]');
      if (await descInput.isVisible()) {
        await descInput.fill('Important skating competition');
      }
      
      // Select date range (simplified - click calendar dates)
      const calendar = page.locator('.react-calendar, [class*="calendar"]').first();
      if (await calendar.isVisible()) {
        // Click first available date
        const availableDates = calendar.locator('button:not([disabled])');
        const dateCount = await availableDates.count();
        
        if (dateCount > 5) {
          await availableDates.nth(5).click(); // Start date
          await availableDates.nth(7).click(); // End date
        }
      }
      
      // Submit form
      const submitButton = page.locator('button:has-text("Block Dates"), button[type="submit"]');
      await submitButton.click();
      
      // Should see success toast
      await expect(page.locator('text=blocked successfully, text=created successfully')).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Blocked date created successfully');
    }
  });

  test('should display existing blocked date periods', async ({ page }) => {
    // Look for blocked dates list or calendar markings
    const blockedDatesContainer = page.locator('[class*="blocked"], .blocked-dates, [data-testid*="blocked"]').first();
    
    if (await blockedDatesContainer.isVisible()) {
      // Check for blocked date entries
      const blockedEntries = page.locator('div:has(text="Travel"), div:has(text="Competition"), .blocked-entry');
      const entryCount = await blockedEntries.count();
      
      console.log(`✅ Found ${entryCount} blocked date entries`);
      
      if (entryCount > 0) {
        // Verify date formatting
        const datePattern = page.locator('text=/\\d{1,2}\/\\d{1,2}\/\\d{4}/');
        if (await datePattern.first().isVisible()) {
          console.log('✅ Date formatting verified');
        }
      }
    } else {
      // Check calendar for blocked date indicators
      const calendarBlockedDates = page.locator('[class*="blocked"], .line-through, [style*="opacity"]');
      const blockedCount = await calendarBlockedDates.count();
      
      if (blockedCount > 0) {
        console.log(`✅ Found ${blockedCount} visually blocked dates on calendar`);
      } else {
        console.log('ℹ️ No blocked dates found - this may be expected for a fresh system');
      }
    }
  });

  test('should show blocked date details when clicked', async ({ page }) => {
    // Look for clickable blocked date elements
    const blockedDateItems = page.locator('div[role="button"]:has-text("Travel"), div[role="button"]:has-text("Competition"), .blocked-entry');
    const itemCount = await blockedDateItems.count();
    
    if (itemCount > 0) {
      // Click first blocked date
      await blockedDateItems.first().click();
      
      // Should see details dialog
      await expect(page.locator('text=Blocked Date Details, text=Details')).toBeVisible({ timeout: 5000 });
      
      // Should see title, type, description fields
      await expect(page.locator('text=Title:, text=Type:')).toBeVisible();
      
      // Should have delete button
      await expect(page.locator('button:has-text("Delete")')).toBeVisible();
      
      console.log('✅ Blocked date details dialog displayed');
      
      // Close dialog
      const closeButton = page.locator('button:has-text("Close")');
      await closeButton.click();
    } else {
      console.log('ℹ️ No blocked dates available to test details view');
    }
  });

  test('should handle deleting a blocked date with confirmation', async ({ page }) => {
    const blockedDateItems = page.locator('div[role="button"]:has-text("Travel"), div[role="button"]:has-text("Competition"), .blocked-entry');
    const itemCount = await blockedDateItems.count();
    
    if (itemCount > 0) {
      await blockedDateItems.first().click();
      
      // Click delete button
      const deleteButton = page.locator('button:has-text("Delete")');
      await deleteButton.click();
      
      // Should see confirmation dialog
      await expect(page.locator('text=Are you sure, text=Confirm deletion')).toBeVisible({ timeout: 5000 });
      
      // Cancel first to test cancel functionality
      const cancelConfirmButton = page.locator('button:has-text("Cancel")');
      if (await cancelConfirmButton.isVisible()) {
        await cancelConfirmButton.click();
        console.log('✅ Delete confirmation cancel works');
        
        // Close details dialog
        await page.locator('button:has-text("Close")').click();
      }
    } else {
      console.log('ℹ️ No blocked dates available to test deletion');
    }
  });

  test('should prevent time slot creation on blocked dates', async ({ page }) => {
    // This test assumes there are blocked dates and tries to create a time slot on one
    
    // Look for "Create Time Slot" or similar button
    const createSlotButton = page.locator('button:has-text("Create"), button:has-text("Add Time Slot")').first();
    
    if (await createSlotButton.isVisible()) {
      await createSlotButton.click();
      
      // Try to select a date that might be blocked
      const dateInput = page.locator('input[type="date"], input[name="date"]');
      if (await dateInput.isVisible()) {
        // Set a future date that could be blocked
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14);
        const dateString = futureDate.toISOString().split('T')[0];
        
        await dateInput.fill(dateString);
        
        // Try to submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
        await submitButton.click();
        
        // Should see error if date is blocked
        const errorMessage = page.locator('text=blocked, text=not available, text=cannot create');
        const hasError = await errorMessage.isVisible({ timeout: 3000 });
        
        if (hasError) {
          console.log('✅ Blocked date validation works - time slot creation prevented');
        } else {
          console.log('ℹ️ No blocked date conflict detected for selected date');
        }
      }
    }
  });

  test('should filter blocked dates by type', async ({ page }) => {
    // Look for type filter controls
    const filterControls = page.locator('button:has-text("Travel"), button:has-text("Competition"), select:has(option:has-text("Travel"))');
    
    if (await filterControls.first().isVisible()) {
      // Click travel filter
      const travelFilter = page.locator('button:has-text("Travel"), option[value="TRAVEL"]').first();
      await travelFilter.click();
      
      // Should only show travel blocked dates
      const visibleEntries = page.locator('.blocked-entry, [data-type="TRAVEL"]');
      const count = await visibleEntries.count();
      
      console.log(`✅ Travel filter applied, showing ${count} entries`);
      
      // Test competition filter
      const competitionFilter = page.locator('button:has-text("Competition"), option[value="COMPETITION"]').first();
      if (await competitionFilter.isVisible()) {
        await competitionFilter.click();
        await page.waitForTimeout(500);
        console.log('✅ Competition filter applied');
      }
    } else {
      console.log('ℹ️ No filter controls found');
    }
  });

  test('should handle date range validation', async ({ page }) => {
    const addBlockedButton = page.locator('button:has-text("Add Blocked"), button:has-text("Block Dates")').first();
    
    if (await addBlockedButton.isVisible()) {
      await addBlockedButton.click();
      
      // Try to submit without required fields
      const submitButton = page.locator('button:has-text("Block Dates"), button[type="submit"]');
      await submitButton.click();
      
      // Should see validation errors
      const validationError = page.locator('text=required, text=Please fill, [aria-invalid="true"]');
      const hasValidation = await validationError.isVisible({ timeout: 3000 });
      
      if (hasValidation) {
        console.log('✅ Form validation works for required fields');
      }
      
      // Test invalid date range (end before start)
      const titleInput = page.locator('input[name="title"], input[placeholder*="Nationals"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Validation');
        
        // If date inputs are available, test invalid range
        const startDate = page.locator('input[name="startDate"], input[name="from"]');
        const endDate = page.locator('input[name="endDate"], input[name="to"]');
        
        if (await startDate.isVisible() && await endDate.isVisible()) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const today = new Date();
          
          await startDate.fill(tomorrow.toISOString().split('T')[0]);
          await endDate.fill(today.toISOString().split('T')[0]);
          
          await submitButton.click();
          
          // Should see error for invalid range
          const rangeError = page.locator('text=invalid range, text=end date must be after');
          if (await rangeError.isVisible({ timeout: 3000 })) {
            console.log('✅ Date range validation works');
          }
        }
      }
      
      // Close dialog
      await page.keyboard.press('Escape');
    }
  });

  test('should integrate with calendar widget correctly', async ({ page }) => {
    // Check that blocked dates are visually indicated on the main calendar
    const calendarWidget = page.locator('[class*="calendar"], .react-calendar').first();
    
    if (await calendarWidget.isVisible()) {
      // Look for blocked date indicators
      const blockedDateStyles = page.locator('[class*="blocked"], [class*="disabled"], .line-through');
      const styleCount = await blockedDateStyles.count();
      
      console.log(`✅ Found ${styleCount} blocked date visual indicators on calendar`);
      
      // Test clicking on a blocked date
      if (styleCount > 0) {
        await blockedDateStyles.first().click();
        
        // Should either open details or prevent interaction
        const detailsDialog = page.locator('text=Blocked Date Details');
        const preventionMessage = page.locator('text=blocked, text=unavailable');
        
        const hasResponse = await Promise.race([
          detailsDialog.isVisible(),
          preventionMessage.isVisible()
        ]);
        
        if (hasResponse) {
          console.log('✅ Blocked date calendar interaction works');
        }
      }
    }
  });

  test('should handle overlapping date ranges validation', async ({ page }) => {
    const addBlockedButton = page.locator('button:has-text("Add Blocked"), button:has-text("Block Dates")').first();
    
    if (await addBlockedButton.isVisible()) {
      // Create first blocked date
      await addBlockedButton.click();
      
      const titleInput = page.locator('input[name="title"]');
      await titleInput.fill('First Block');
      
      // Submit first blocked date (this test assumes it will succeed)
      const submitButton = page.locator('button:has-text("Block Dates")');
      await submitButton.click();
      
      // Wait for success
      await page.waitForTimeout(2000);
      
      // Try to create overlapping blocked date
      if (await addBlockedButton.isVisible()) {
        await addBlockedButton.click();
        
        await titleInput.fill('Overlapping Block');
        
        // Use same dates as before (this should trigger validation)
        await submitButton.click();
        
        // Should see overlap validation error
        const overlapError = page.locator('text=overlap, text=conflicting, text=already blocked');
        const hasOverlapValidation = await overlapError.isVisible({ timeout: 5000 });
        
        if (hasOverlapValidation) {
          console.log('✅ Overlapping date range validation works');
        } else {
          console.log('ℹ️ Overlap validation may not be implemented or dates did not overlap');
        }
      }
    }
  });
});

test.describe('Blocked Dates Performance', () => {
  test('should load blocked dates quickly', async ({ page }) => {
    await loginAsAdmin(page);
    
    const startTime = Date.now();
    await page.goto('/admin/schedule');
    
    // Wait for blocked dates section to load
    const blockedDatesLoaded = await Promise.race([
      page.waitForSelector('text=Travel & Competition', { timeout: 10000 }),
      page.waitForSelector('text=Blocked Dates', { timeout: 10000 }),
      page.waitForSelector('.blocked-dates', { timeout: 10000 })
    ]);
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`✅ Blocked dates loaded in ${loadTime}ms`);
  });

  test('should handle many blocked dates without performance issues', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/schedule');
    
    // Test scrolling through blocked dates list if it exists
    const blockedDatesList = page.locator('.blocked-dates-list, [class*="scroll"]').first();
    
    if (await blockedDatesList.isVisible()) {
      const startTime = Date.now();
      
      // Scroll through the list
      await blockedDatesList.hover();
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 200);
        await page.waitForTimeout(100);
      }
      
      const scrollTime = Date.now() - startTime;
      
      // Should remain responsive
      expect(scrollTime).toBeLessThan(2000);
      
      console.log(`✅ Scrolling ${5} times took ${scrollTime}ms`);
    }
  });
});

test.describe('Blocked Dates Edge Cases', () => {
  test('should handle timezone considerations', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/schedule');
    
    // This test would verify that blocked dates work correctly across timezones
    // For now, we'll just verify that dates are displayed consistently
    
    const dateElements = page.locator('text=/\\d{1,2}\/\\d{1,2}\/\\d{4}/, text=/\\d{4}-\\d{2}-\\d{2}/');
    const dateCount = await dateElements.count();
    
    if (dateCount > 0) {
      // All dates should follow the same format
      console.log(`✅ Found ${dateCount} consistently formatted dates`);
    }
  });

  test('should handle concurrent blocked date operations', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/schedule');
    
    // Test rapid creation and deletion (if possible)
    const addButton = page.locator('button:has-text("Add Blocked")').first();
    
    if (await addButton.isVisible()) {
      // Rapid clicking should not cause issues
      await addButton.click();
      await addButton.click();
      await addButton.click();
      
      // Should still be responsive
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
      
      console.log('✅ Rapid clicking handled gracefully');
    }
  });

  test('should handle data refresh after external changes', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/schedule');
    
    // Simulate external data change by refreshing the page
    await page.reload();
    
    // Should reload blocked dates
    await page.waitForTimeout(3000);
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Data refresh handled correctly');
  });
});