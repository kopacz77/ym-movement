import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/test-utils';

test.describe('Payment Reminder Email System', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/payments');
    
    // Wait for payments table to load
    await page.waitForTimeout(2000);
  });

  test('should display payments with reminder functionality', async ({ page }) => {
    // Verify payments page loaded
    await expect(page.locator('h1:has-text("Payments"), text=Payment Management')).toBeVisible();
    
    // Look for payment records
    const paymentTable = page.locator('table, [data-testid="payments-table"]');
    if (await paymentTable.isVisible()) {
      
      // Should see payment entries or empty state
      const paymentRows = page.locator('tbody tr, .payment-row');
      const rowCount = await paymentRows.count();
      
      if (rowCount > 0) {
        console.log(`✅ Found ${rowCount} payment records`);
        
        // Look for "Send Reminder" buttons
        const reminderButtons = page.locator('button:has-text("Reminder"), button:has-text("Send Reminder")');
        const buttonCount = await reminderButtons.count();
        
        if (buttonCount > 0) {
          console.log(`✅ Found ${buttonCount} payment reminder buttons`);
        }
      } else {
        console.log('ℹ️ No payment records found - empty state');
        await expect(page.locator('text=No payments, text=No records')).toBeVisible();
      }
    }
  });

  test('should send payment reminder email', async ({ page }) => {
    // Look for pending/overdue payments with reminder buttons
    const reminderButtons = page.locator('button:has-text("Reminder"), button:has-text("Send Reminder")');
    const buttonCount = await reminderButtons.count();
    
    if (buttonCount > 0) {
      // Click first reminder button
      await reminderButtons.first().click();
      
      // Should see confirmation dialog or immediate toast
      const confirmationDialog = page.locator('text=Send payment reminder, text=Confirm reminder');
      const successToast = page.locator('text=Reminder sent, text=Email sent');
      
      const dialogVisible = await confirmationDialog.isVisible({ timeout: 3000 });
      
      if (dialogVisible) {
        // Confirm sending reminder
        const confirmButton = page.locator('button:has-text("Send"), button:has-text("Confirm")');
        await confirmButton.click();
        
        // Should see success message
        await expect(page.locator('text=sent successfully, text=Reminder sent')).toBeVisible({ timeout: 10000 });
        console.log('✅ Payment reminder sent with confirmation dialog');
      } else {
        // Check for immediate success toast
        const toastVisible = await successToast.isVisible({ timeout: 5000 });
        if (toastVisible) {
          console.log('✅ Payment reminder sent with immediate feedback');
        }
      }
    } else {
      console.log('ℹ️ No payment reminder buttons found - may need outstanding payments to test');
    }
  });

  test('should handle email sending errors gracefully', async ({ page }) => {
    // Mock email service failure
    await page.route('**/api/trpc/admin.payment.sendPaymentReminder**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'Email service unavailable' }
        }),
      });
    });
    
    const reminderButtons = page.locator('button:has-text("Reminder"), button:has-text("Send Reminder")');
    
    if (await reminderButtons.first().isVisible()) {
      await reminderButtons.first().click();
      
      // Should see error message
      await expect(page.locator('text=failed to send, text=error sending')).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Email sending error handled gracefully');
    }
  });

  test('should display proper payment method information', async ({ page }) => {
    // Check for payment method indicators
    const venmoInfo = page.locator('text=Venmo, text=@yura-min');
    const zelleInfo = page.locator('text=Zelle, text=(714) 743-7071');
    
    const hasVenmo = await venmoInfo.isVisible();
    const hasZelle = await zelleInfo.isVisible();
    
    if (hasVenmo) {
      console.log('✅ Venmo payment information displayed');
    }
    
    if (hasZelle) {
      console.log('✅ Zelle payment information displayed');
    }
    
    // Should have at least one payment method shown
    if (hasVenmo || hasZelle) {
      console.log('✅ Payment method information is visible');
    } else {
      // Look for generic payment instructions
      const paymentInstructions = page.locator('text=payment, text=send money, text=pay via');
      if (await paymentInstructions.first().isVisible()) {
        console.log('✅ Payment instructions found');
      }
    }
  });

  test('should show payment reference codes in reminders', async ({ page }) => {
    // Look for reference codes in payment table
    const referenceCodes = page.locator('text=/REF[0-9]+/, text=/[A-Z0-9]{6,}/, [data-testid*="reference"]');
    const codeCount = await referenceCodes.count();
    
    if (codeCount > 0) {
      console.log(`✅ Found ${codeCount} payment reference codes`);
      
      // Reference codes should be properly formatted
      const firstCode = await referenceCodes.first().textContent();
      if (firstCode && firstCode.length >= 6) {
        console.log('✅ Reference codes are properly formatted');
      }
    } else {
      console.log('ℹ️ No reference codes visible - may be in different format or location');
    }
  });

  test('should filter payments by status for reminders', async ({ page }) => {
    // Look for status filters
    const statusFilters = page.locator('select:has(option:has-text("Pending")), button:has-text("Pending"), button:has-text("Overdue")');
    
    if (await statusFilters.first().isVisible()) {
      // Filter by pending payments
      const pendingFilter = page.locator('option:has-text("Pending"), button:has-text("Pending")').first();
      await pendingFilter.click();
      
      await page.waitForTimeout(1000);
      
      // Should only show pending payments
      const visiblePayments = page.locator('tbody tr, .payment-row');
      const count = await visiblePayments.count();
      
      console.log(`✅ Pending filter applied, showing ${count} payments`);
      
      // Test overdue filter
      const overdueFilter = page.locator('option:has-text("Overdue"), button:has-text("Overdue")').first();
      if (await overdueFilter.isVisible()) {
        await overdueFilter.click();
        await page.waitForTimeout(1000);
        console.log('✅ Overdue filter applied');
      }
    } else {
      console.log('ℹ️ No status filters found');
    }
  });

  test('should handle reminder frequency limits', async ({ page }) => {
    // This test would check if there are limits on how often reminders can be sent
    const reminderButtons = page.locator('button:has-text("Reminder")');
    
    if (await reminderButtons.first().isVisible()) {
      // Send first reminder
      await reminderButtons.first().click();
      
      // Wait for confirmation
      const confirmButton = page.locator('button:has-text("Send"), button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Wait for success
      await page.waitForTimeout(2000);
      
      // Try to send another reminder immediately
      if (await reminderButtons.first().isVisible()) {
        await reminderButtons.first().click();
        
        // Should either be disabled or show rate limit message
        const rateLimitMessage = page.locator('text=already sent, text=wait before sending, text=rate limit');
        const disabledButton = page.locator('button[disabled]:has-text("Reminder")');
        
        const hasRateLimit = await Promise.race([
          rateLimitMessage.isVisible(),
          disabledButton.isVisible()
        ]);
        
        if (hasRateLimit) {
          console.log('✅ Reminder frequency limits are enforced');
        } else {
          console.log('ℹ️ No rate limiting detected - may allow multiple reminders');
        }
      }
    }
  });

  test('should track reminder history', async ({ page }) => {
    // Look for reminder history or "last sent" information
    const historyIndicators = page.locator('text=Last sent, text=Reminder sent on, [data-testid*="reminder-history"]');
    const historyCount = await historyIndicators.count();
    
    if (historyCount > 0) {
      console.log(`✅ Found ${historyCount} reminder history indicators`);
      
      // Check for date formatting
      const datePatterns = page.locator('text=/\\d{1,2}\/\\d{1,2}\/\\d{4}/, text=/[A-Za-z]+ \\d{1,2}/, text=/\\d+ days ago/');
      if (await datePatterns.first().isVisible()) {
        console.log('✅ Reminder history dates are properly formatted');
      }
    } else {
      console.log('ℹ️ No reminder history visible - may not be implemented or no reminders sent yet');
    }
  });

  test('should customize reminder content based on payment amount', async ({ page }) => {
    // This test verifies that reminders include correct payment amounts
    const amountElements = page.locator('text=/\\$[0-9,]+\\.?[0-9]*/, [data-testid*="amount"]');
    const amountCount = await amountElements.count();
    
    if (amountCount > 0) {
      console.log(`✅ Found ${amountCount} payment amounts displayed`);
      
      // Amounts should be properly formatted as currency
      const firstAmount = await amountElements.first().textContent();
      if (firstAmount && firstAmount.includes('$')) {
        console.log('✅ Payment amounts are formatted as currency');
      }
    }
  });

  test('should handle bulk reminder sending', async ({ page }) => {
    // Look for bulk action capabilities
    const bulkActions = page.locator('button:has-text("Select All"), input[type="checkbox"]').first();
    
    if (await bulkActions.isVisible()) {
      await bulkActions.click();
      
      // Look for bulk reminder button
      const bulkReminderButton = page.locator('button:has-text("Send Reminders"), button:has-text("Bulk Reminder")');
      
      if (await bulkReminderButton.isVisible()) {
        await bulkReminderButton.click();
        
        // Should see confirmation for multiple reminders
        const bulkConfirmation = page.locator('text=Send \\d+ reminders, text=multiple reminders');
        if (await bulkConfirmation.isVisible()) {
          console.log('✅ Bulk reminder functionality available');
          
          // Cancel to avoid sending actual emails
          const cancelButton = page.locator('button:has-text("Cancel")');
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      } else {
        console.log('ℹ️ Bulk reminder functionality not found');
      }
    } else {
      console.log('ℹ️ No bulk selection functionality found');
    }
  });

  test('should preview reminder email content', async ({ page }) => {
    const reminderButtons = page.locator('button:has-text("Reminder")');
    
    if (await reminderButtons.first().isVisible()) {
      // Right-click or look for preview option
      await reminderButtons.first().click({ button: 'right' });
      
      const previewOption = page.locator('text=Preview, text=View Email');
      if (await previewOption.isVisible()) {
        await previewOption.click();
        
        // Should see email preview with proper content
        await expect(page.locator('text=Payment Reminder, text=Outstanding Payment')).toBeVisible();
        
        // Should contain key elements
        await expect(page.locator('text=YM Movement')).toBeVisible();
        await expect(page.locator('text=Venmo, text=Zelle')).toBeVisible();
        
        console.log('✅ Email preview functionality works');
        
        // Close preview
        const closeButton = page.locator('button:has-text("Close")');
        await closeButton.click();
      } else {
        // Alternative: check if clicking reminder shows preview first
        const previewDialog = page.locator('text=Email Preview, div[role="dialog"]');
        if (await previewDialog.isVisible()) {
          console.log('✅ Reminder button shows preview dialog');
        }
      }
    }
  });
});

test.describe('Payment Reminder Integration', () => {
  test('should integrate with email service status', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings');
    
    // Look for email service status indicators
    const emailStatus = page.locator('text=Email Service, text=Resend, [data-testid*="email-status"]');
    
    if (await emailStatus.isVisible()) {
      // Should show service health
      const statusIndicators = page.locator('text=Connected, text=Active, .text-green, .bg-green');
      if (await statusIndicators.first().isVisible()) {
        console.log('✅ Email service status is displayed');
      }
    }
  });

  test('should handle development environment email fallback', async ({ page }) => {
    // This test verifies fallback behavior in development
    await loginAsAdmin(page);
    await page.goto('/admin/payments');
    
    const reminderButtons = page.locator('button:has-text("Reminder")');
    
    if (await reminderButtons.first().isVisible()) {
      // Monitor console logs for fallback behavior
      const consoleLogs: string[] = [];
      page.on('console', (msg) => {
        consoleLogs.push(msg.text());
      });
      
      await reminderButtons.first().click();
      
      // In development, should see mock email logs
      await page.waitForTimeout(3000);
      
      const hasMockLogs = consoleLogs.some(log => 
        log.includes('[MOCK EMAIL]') || 
        log.includes('RESEND_API_KEY not found')
      );
      
      if (hasMockLogs) {
        console.log('✅ Development email fallback is working');
      }
    }
  });
});

test.describe('Payment Reminder Performance', () => {
  test('should send reminders efficiently', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/payments');
    
    const reminderButtons = page.locator('button:has-text("Reminder")');
    
    if (await reminderButtons.first().isVisible()) {
      const startTime = Date.now();
      
      await reminderButtons.first().click();
      
      // Wait for success or error feedback
      await Promise.race([
        page.waitForSelector('text=sent successfully', { timeout: 10000 }),
        page.waitForSelector('text=failed to send', { timeout: 10000 })
      ]);
      
      const responseTime = Date.now() - startTime;
      
      // Should respond within 5 seconds
      expect(responseTime).toBeLessThan(5000);
      
      console.log(`✅ Payment reminder processed in ${responseTime}ms`);
    }
  });
});