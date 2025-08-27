import { test, expect } from '@playwright/test';

// Helper function to login as admin
async function loginAsAdmin(page: any) {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', 'admin@ym-movement.com');
  await page.fill('input[name="password"]', 'admin123'); // Replace with actual admin password
  await page.click('button[type="submit"]');
  await page.waitForURL('/admin', { timeout: 10000 });
}

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display admin dashboard with navigation', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Admin Dashboard/);
    
    // Check main dashboard elements
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    
    // Check navigation sidebar
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for main navigation items
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Students")')).toBeVisible();
    await expect(page.locator('a:has-text("Schedule")')).toBeVisible();
    await expect(page.locator('a:has-text("Lessons")')).toBeVisible();
    await expect(page.locator('a:has-text("Payments")')).toBeVisible();
  });

  test('should display dashboard statistics', async ({ page }) => {
    // Check for key metrics/statistics
    await expect(page.locator('text=Total Students')).toBeVisible();
    await expect(page.locator('text=Pending Approvals')).toBeVisible();
    await expect(page.locator('text=Today\'s Lessons')).toBeVisible();
    await expect(page.locator('text=This Week\'s Revenue')).toBeVisible();
  });

  test.describe('Students Management', () => {
    test('should navigate to students page', async ({ page }) => {
      await page.click('a:has-text("Students")');
      await expect(page).toHaveURL('/admin/students');
      
      // Check students page elements
      await expect(page.locator('text=Student Management')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });

    test('should display pending student approvals', async ({ page }) => {
      await page.goto('/admin/students');
      
      // Check for pending approvals section
      await expect(page.locator('text=Pending Approvals')).toBeVisible();
      
      // Check for approve/reject buttons if there are pending students
      const pendingSection = page.locator('[data-testid="pending-approvals"]');
      if (await pendingSection.isVisible()) {
        await expect(pendingSection.locator('button:has-text("Approve")')).toBeVisible();
        await expect(pendingSection.locator('button:has-text("Reject")')).toBeVisible();
      }
    });

    test('should filter students by approval status', async ({ page }) => {
      await page.goto('/admin/students');
      
      // Check for filter options
      const filterSelect = page.locator('select[name="status"], select:has(option:has-text("All"))');
      if (await filterSelect.isVisible()) {
        await filterSelect.selectOption('pending');
        await page.waitForLoadState('networkidle');
        
        // Should show only pending students
        await expect(page.locator('text=Pending')).toBeVisible();
      }
    });

    test('should search students by name or email', async ({ page }) => {
      await page.goto('/admin/students');
      
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForLoadState('networkidle');
        
        // Results should be filtered
        const table = page.locator('table');
        await expect(table).toBeVisible();
      }
    });
  });

  test.describe('Schedule Management', () => {
    test('should navigate to schedule page', async ({ page }) => {
      await page.click('a:has-text("Schedule")');
      await expect(page).toHaveURL('/admin/schedule');
      
      // Check schedule page elements
      await expect(page.locator('text=Schedule Management')).toBeVisible();
    });

    test('should display time slots calendar', async ({ page }) => {
      await page.goto('/admin/schedule');
      
      // Check for calendar or time slots display
      await expect(page.locator('[data-testid="time-slots"], .calendar, [class*="calendar"]')).toBeVisible();
    });

    test('should create new time slot', async ({ page }) => {
      await page.goto('/admin/schedule');
      
      // Look for add time slot button
      const addButton = page.locator('button:has-text("Add Time Slot"), button:has-text("Create Slot"), button:has-text("Add Slot")');
      if (await addButton.isVisible()) {
        await addButton.click();
        
        // Check for time slot form
        await expect(page.locator('form')).toBeVisible();
        await expect(page.locator('input[type="datetime-local"], input[type="date"], input[type="time"]')).toBeVisible();
      }
    });

    test('should handle bulk operations', async ({ page }) => {
      await page.goto('/admin/schedule');
      
      // Check for bulk actions
      const bulkButton = page.locator('button:has-text("Bulk"), button:has-text("Select Multiple")');
      if (await bulkButton.isVisible()) {
        await bulkButton.click();
        
        // Should enable selection mode
        await expect(page.locator('input[type="checkbox"]')).toBeVisible();
      }
    });
  });

  test.describe('Lessons Management', () => {
    test('should navigate to lessons page', async ({ page }) => {
      await page.click('a:has-text("Lessons")');
      await expect(page).toHaveURL('/admin/lessons');
      
      // Check lessons page elements
      await expect(page.locator('text=Lesson Management')).toBeVisible();
    });

    test('should display lessons table', async ({ page }) => {
      await page.goto('/admin/lessons');
      
      // Check for lessons table
      await expect(page.locator('table')).toBeVisible();
      
      // Check for common table headers
      await expect(page.locator('th:has-text("Student"), th:has-text("Date"), th:has-text("Time")')).toBeVisible();
    });

    test('should filter lessons by date range', async ({ page }) => {
      await page.goto('/admin/lessons');
      
      const dateFilter = page.locator('input[type="date"]');
      if (await dateFilter.isVisible()) {
        await dateFilter.first().fill('2025-01-01');
        await page.waitForLoadState('networkidle');
        
        // Should filter results
        await expect(page.locator('table')).toBeVisible();
      }
    });
  });

  test.describe('Payments Management', () => {
    test('should navigate to payments page', async ({ page }) => {
      await page.click('a:has-text("Payments")');
      await expect(page).toHaveURL('/admin/payments');
      
      // Check payments page elements
      await expect(page.locator('text=Payment Management')).toBeVisible();
    });

    test('should display payments table', async ({ page }) => {
      await page.goto('/admin/payments');
      
      // Check for payments table
      await expect(page.locator('table')).toBeVisible();
      
      // Check for payment-related headers
      await expect(page.locator('th:has-text("Student"), th:has-text("Amount"), th:has-text("Status")')).toBeVisible();
    });

    test('should filter payments by status', async ({ page }) => {
      await page.goto('/admin/payments');
      
      const statusFilter = page.locator('select:has(option:has-text("Verified")), select:has(option:has-text("Pending"))');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('pending');
        await page.waitForLoadState('networkidle');
        
        // Should show only pending payments
        await expect(page.locator('text=Pending')).toBeVisible();
      }
    });

    test('should verify payment', async ({ page }) => {
      await page.goto('/admin/payments');
      
      const verifyButton = page.locator('button:has-text("Verify")').first();
      if (await verifyButton.isVisible()) {
        await verifyButton.click();
        
        // Should show confirmation or update status
        await expect(page.locator('text=Payment verified')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Settings and Configuration', () => {
    test('should access settings page', async ({ page }) => {
      // Look for settings link in navigation or user menu
      const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")');
      if (await settingsLink.isVisible()) {
        await settingsLink.click();
        
        // Check settings page
        await expect(page.locator('text=Settings')).toBeVisible();
      }
    });

    test('should manage rink locations', async ({ page }) => {
      await page.goto('/admin/rinks');
      
      // Check rink management
      await expect(page.locator('text=Rink Management')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check mobile navigation
      const mobileMenuButton = page.locator('button[aria-label="Menu"], button:has-text("☰")');
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        await expect(page.locator('nav')).toBeVisible();
      }
      
      // Check main content is accessible
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Check tablet layout
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    });
  });

  test.describe('Data Export', () => {
    test('should export student data', async ({ page }) => {
      await page.goto('/admin/students');
      
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")');
      if (await exportButton.isVisible()) {
        // Set up download handler
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('students');
      }
    });
  });
});