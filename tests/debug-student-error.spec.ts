import { test, expect } from '@playwright/test';

test.describe('Student Dashboard Error Debug', () => {
  test('reproduce student dashboard error', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        consoleErrors.push(errorText);
        console.log('🔴 Console Error:', errorText);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.log('🔴 Page Error:', error.message);
      console.log('Stack:', error.stack);
    });

    console.log('🔍 Navigating to the app...');
    await page.goto('http://localhost:3000');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'debug-01-home.png' });

    // Check current page state
    console.log('Current URL:', page.url());
    
    // Try to navigate directly to student dashboard to trigger the error
    console.log('🎓 Navigating to student dashboard...');
    await page.goto('http://localhost:3000/student/dashboard');
    
    // Wait for React to mount and potential errors
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-02-student-dashboard.png' });
    
    // Check if we're redirected to auth (which would be expected)
    const currentUrl = page.url();
    console.log('After navigation URL:', currentUrl);
    
    if (currentUrl.includes('/auth') || currentUrl.includes('/signin')) {
      console.log('📝 Redirected to auth page (expected for unauthenticated user)');
      
      // Try to see the signin form
      const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
      if (await emailInput.isVisible()) {
        console.log('📧 Found email input, attempting login...');
        
        // Use a test email that should exist
        await emailInput.fill('admin@test.com'); // Start with admin login to see if auth works
        
        const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
        await passwordInput.fill('ADMINPASS2025!');
        
        await page.screenshot({ path: 'debug-03-login-form.png' });
        
        // Submit login
        const loginButton = await page.locator('button[type="submit"], button:has-text("Sign In")').first();
        if (await loginButton.isVisible()) {
          await loginButton.click();
          console.log('⏳ Waiting for login...');
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'debug-04-after-login.png' });
        }
      }
    }
    
    // Check for any console errors that accumulated
    console.log('📊 Total console errors:', consoleErrors.length);
    console.log('📊 Total page errors:', pageErrors.length);
    
    if (consoleErrors.length > 0) {
      console.log('🚨 Console Errors:');
      consoleErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    if (pageErrors.length > 0) {
      console.log('🚨 Page Errors:');
      pageErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }

    // Now try to create a student account and access student dashboard
    console.log('🎓 Trying to access student-specific routes...');
    
    // First check if there's a way to register as student or if we need to access the student area
    await page.goto('http://localhost:3000/student/dashboard');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'debug-05-student-access-attempt.png' });
    
    // Final error check
    await page.waitForTimeout(3000);
    console.log('🏁 Final error count - Console:', consoleErrors.length, 'Page:', pageErrors.length);
    
    // If we have React error #130, log the specific details
    const reactError130 = consoleErrors.find(error => error.includes('Minified React error #130'));
    if (reactError130) {
      console.log('🎯 Found React Error #130:', reactError130);
    }
  });
});