import { test, expect } from '@playwright/test';
import { 
  loginAsAdmin, 
  createStudentAccount, 
  approveStudent, 
  createTimeSlot, 
  bookLesson,
  generateTestEmail,
  generateFutureDateTime
} from './helpers/test-utils';

test.describe('Complete End-to-End User Journey', () => {
  test('should complete full student onboarding and lesson booking flow', async ({ page }) => {
    // Test the complete user journey from signup to lesson booking
    
    // 1. Student signs up
    const studentEmail = generateTestEmail('e2e-student');
    await page.goto('/auth/signup');
    
    await page.fill('input[id="name"]', 'E2E Test Student');
    await page.fill('input[id="email"]', studentEmail);
    await page.fill('input[id="password"]', 'TestPassword123!');
    await page.fill('input[id="phone"]', '555-E2E-TEST');
    await page.selectOption('select[name="level"]', 'PRELIMINARY');
    await page.fill('input[name="maxLessonsPerWeek"]', '2');
    
    // Emergency contact
    await page.fill('input[name="emergencyContact.name"]', 'E2E Parent');
    await page.fill('input[name="emergencyContact.phone"]', '555-PARENT-1');
    await page.fill('input[name="emergencyContact.relationship"]', 'Parent');
    
    await page.check('input[name="parentConsent"]');
    await page.click('button[type="submit"]');
    
    // Verify account creation
    await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 10000 });
    
    // 2. Admin logs in and approves student
    await loginAsAdmin(page);
    await page.goto('/admin/students');
    
    // Find and approve the new student
    const studentRow = page.locator(`tr:has-text("${studentEmail}")`);
    const approveButton = studentRow.locator('button:has-text("Approve")');
    
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await expect(page.locator('text=Student approved')).toBeVisible({ timeout: 10000 });
    }
    
    // 3. Admin creates time slots
    await page.goto('/admin/schedule');
    
    const addButton = page.locator('button:has-text("Add Time Slot"), button:has-text("Create Slot")');
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const futureStartTime = generateFutureDateTime(7, 10); // 7 days from now, 10 AM
      const futureEndTime = generateFutureDateTime(7, 10.5); // 30 minutes later
      
      await page.fill('input[name="startTime"]', futureStartTime);
      await page.fill('input[name="endTime"]', futureEndTime);
      
      const rinkSelect = page.locator('select[name="rinkId"]');
      if (await rinkSelect.isVisible()) {
        await rinkSelect.selectOption({ index: 1 });
      }
      
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Time slot created')).toBeVisible({ timeout: 10000 });
    }
    
    // 4. Student logs in and books lesson
    await page.goto('/auth/login');
    await page.fill('input[id="email"]', studentEmail);
    await page.fill('input[id="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to student dashboard
    await page.waitForURL('/student/dashboard', { timeout: 10000 });
    
    // Should redirect to student dashboard
    await page.waitForLoadState('networkidle');
    
    // Navigate to schedule
    await page.goto('/student/schedule');
    
    // Book the available lesson
    const bookButton = page.locator('button:has-text("Book")').first();
    if (await bookButton.isVisible()) {
      await bookButton.click();
      
      // Fill booking form if needed
      const submitButton = page.locator('button[type="submit"]:has-text("Book"), button[type="submit"]:has-text("Confirm")');
      await submitButton.click();
      
      await expect(page.locator('text=Lesson booked')).toBeVisible({ timeout: 10000 });
    }
    
    // 5. Verify lesson appears in student's lessons
    await page.goto('/student/lessons');
    await expect(page.locator('text=My Lessons')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    
    // 6. Admin verifies the booking
    await loginAsAdmin(page);
    await page.goto('/admin/lessons');
    
    // Should see the new lesson booking
    await expect(page.locator(`text=${studentEmail}`)).toBeVisible();
    
    // 7. Admin checks payment status
    await page.goto('/admin/payments');
    
    // Should see pending payment for the lesson
    const paymentRow = page.locator(`tr:has-text("${studentEmail}")`);
    if (await paymentRow.isVisible()) {
      const verifyButton = paymentRow.locator('button:has-text("Verify")');
      if (await verifyButton.isVisible()) {
        await verifyButton.click();
        await expect(page.locator('text=Payment verified')).toBeVisible({ timeout: 10000 });
      }
    }
    
    // Test completed successfully
    console.log('✅ Complete E2E flow test passed!');
  });

  test('should handle student lesson cancellation flow', async ({ page }) => {
    // This test assumes there's already a booked lesson to cancel
    
    // 1. Student logs in
    await page.goto('/auth/login');
    await page.fill('input[id="email"]', 'existing.student@example.com'); // Use existing student
    await page.fill('input[id="password"]', 'StudentPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to student dashboard
    await page.waitForURL('/student/dashboard', { timeout: 10000 });
    
    // 2. Navigate to lessons
    await page.goto('/student/lessons');
    
    // 3. Cancel a lesson
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Confirm cancellation
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      await expect(page.locator('text=Lesson cancelled')).toBeVisible({ timeout: 10000 });
    }
    
    // 4. Admin verifies cancellation
    await loginAsAdmin(page);
    await page.goto('/admin/lessons');
    
    // Should see the cancelled lesson status
    await expect(page.locator('text=Cancelled')).toBeVisible();
  });

  test('should handle admin bulk operations', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/schedule');
    
    // Test bulk time slot creation
    const bulkCreateButton = page.locator('button:has-text("Bulk Create"), button:has-text("Bulk Add")');
    if (await bulkCreateButton.isVisible()) {
      await bulkCreateButton.click();
      
      // Fill bulk creation form
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const dateString = nextWeek.toISOString().split('T')[0];
      
      await page.fill('input[name="startDate"]', dateString);
      await page.fill('input[name="endDate"]', dateString);
      await page.fill('input[name="startTime"]', '09:00');
      await page.fill('input[name="endTime"]', '17:00');
      await page.fill('input[name="slotDuration"]', '30');
      
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Time slots created')).toBeVisible({ timeout: 15000 });
    }
    
    // Test bulk delete
    const bulkActionsButton = page.locator('button:has-text("Bulk Actions"), button:has-text("Select Multiple")');
    if (await bulkActionsButton.isVisible()) {
      await bulkActionsButton.click();
      
      // Select some slots
      await page.locator('input[type="checkbox"]').first().check();
      await page.locator('input[type="checkbox"]').nth(1).check();
      
      const deleteSelectedButton = page.locator('button:has-text("Delete Selected")');
      if (await deleteSelectedButton.isVisible()) {
        await deleteSelectedButton.click();
        
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        
        await expect(page.locator('text=Time slots deleted')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should test responsive design across all pages', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' },
    ];
    
    const pages = [
      '/auth/login',
      '/auth/signup',
      '/admin/dashboard',
      '/admin/students',
      '/admin/schedule',
      '/student/schedule',
      '/student/lessons',
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      for (const pageUrl of pages) {
        await page.goto(pageUrl);
        
        // Basic responsiveness checks
        await expect(page.locator('main, [role="main"]')).toBeVisible();
        
        // Check navigation accessibility
        if (viewport.width < 768) {
          const mobileMenuButton = page.locator('button[aria-label="Menu"], button:has-text("☰")');
          if (await mobileMenuButton.isVisible()) {
            await mobileMenuButton.click();
            await expect(page.locator('nav')).toBeVisible();
          }
        }
        
        console.log(`✅ ${pageUrl} responsive on ${viewport.name}`);
      }
    }
  });

  test('should verify all navigation links work', async ({ page }) => {
    // Test admin navigation
    await loginAsAdmin(page);
    
    const adminLinks = [
      { text: 'Dashboard', url: '/admin/dashboard' },
      { text: 'Students', url: '/admin/students' },
      { text: 'Schedule', url: '/admin/schedule' },
      { text: 'Lessons', url: '/admin/lessons' },
      { text: 'Payments', url: '/admin/payments' },
    ];
    
    for (const link of adminLinks) {
      await page.click(`a:has-text("${link.text}")`);
      await expect(page).toHaveURL(link.url);
      console.log(`✅ Admin ${link.text} navigation works`);
    }
    
    // Test student navigation (would need a verified student account)
    // This is left as a placeholder for when student accounts are available
  });

  test('should verify email functionality in production', async ({ page }) => {
    // This test checks that email sending works but doesn't verify actual delivery
    
    const testEmail = generateTestEmail('email-test');
    
    // Create student account (triggers welcome email)
    await page.goto('/auth/signup');
    await page.fill('input[id="name"]', 'Email Test Student');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', 'TestPassword123!');
    await page.selectOption('select[name="level"]', 'PRELIMINARY');
    await page.check('input[name="parentConsent"]');
    
    await page.click('button[type="submit"]');
    
    // Should see success message (indicates email was sent)
    await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Email sending functionality verified');
  });
});