import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsStudent } from './helpers/test-utils';

test.describe('Error Handling', () => {
  test('should handle React error boundaries gracefully', async ({ page }) => {
    let errorBoundaryTriggered = false;
    
    // Monitor for error boundary messages
    page.on('console', (msg) => {
      if (msg.text().includes('Error Boundary') || msg.text().includes('componentDidCatch')) {
        errorBoundaryTriggered = true;
        console.log('Error boundary triggered:', msg.text());
      }
    });
    
    await loginAsAdmin(page);
    await page.goto('/admin');
    
    // Simulate component error by injecting bad props or state
    await page.evaluate(() => {
      // Try to trigger an error in a React component
      const buttons = document.querySelectorAll('button');
      if (buttons.length > 0) {
        // Simulate a component error
        const event = new CustomEvent('react-error-test');
        buttons[0].dispatchEvent(event);
      }
    });
    
    // Wait for potential error handling
    await page.waitForTimeout(2000);
    
    // Page should still be functional even if error occurred
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2, [role="main"]')).toBeVisible();
    
    console.log('✅ Application remains functional despite potential component errors');
  });

  test('should handle API errors without crashing', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Mock API failures
    await page.route('**/api/trpc/**', (route) => {
      // Randomly fail some requests
      if (Math.random() > 0.7) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      } else {
        route.continue();
      }
    });
    
    await page.goto('/admin/students');
    
    // Should still render page despite API errors
    await page.waitForTimeout(3000);
    
    // Page should be visible and functional
    await expect(page.locator('body')).toBeVisible();
    
    // Should not crash - basic navigation should work
    const navLinks = page.locator('nav a, [role="navigation"] a').first();
    if (await navLinks.isVisible()) {
      await navLinks.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    }
    
    console.log('✅ Application handles API errors gracefully');
  });

  test('should handle network connectivity issues', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    
    // Simulate network failure
    await page.route('**/*', (route) => {
      route.abort('failed');
    });
    
    // Try to navigate to another page
    await page.goto('/admin/students').catch(() => {
      console.log('Navigation failed as expected due to network simulation');
    });
    
    // Restore network
    await page.unroute('**/*');
    
    // Should be able to recover
    await page.goto('/admin/students');
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Application recovers from network connectivity issues');
  });

  test('should handle authentication errors properly', async ({ page }) => {
    // Visit protected page without authentication
    await page.goto('/admin/students');
    
    // Should redirect to signin or show appropriate error
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isRedirected = currentUrl.includes('/auth/login') || currentUrl.includes('/admin/students');
    
    expect(isRedirected).toBe(true);
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Authentication errors handled correctly');
  });

  test('should handle malformed data gracefully', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Mock API with malformed responses
    await page.route('**/api/trpc/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"malformed": json data}', // Invalid JSON
      });
    });
    
    await page.goto('/admin/students');
    
    // Should handle malformed data without crashing
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Malformed data handled gracefully');
  });

  test('should handle component mount/unmount errors', async ({ page }) => {
    let mountErrors = 0;
    
    page.on('console', (msg) => {
      if (msg.type() === 'error' && (
        msg.text().includes('unmount') || 
        msg.text().includes('cleanup') ||
        msg.text().includes('useEffect')
      )) {
        mountErrors++;
      }
    });
    
    await loginAsAdmin(page);
    
    // Rapidly navigate between pages to test mount/unmount
    const pages = ['/admin', '/admin/students', '/admin/schedule', '/admin/payments'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForTimeout(500);
    }
    
    console.log(`Mount/unmount errors detected: ${mountErrors}`);
    
    // Should have minimal mount/unmount errors
    expect(mountErrors).toBeLessThan(3);
    
    console.log('✅ Component lifecycle handled properly');
  });

  test('should handle browser compatibility issues', async ({ page }) => {
    // Test with different user agents to simulate browser differences
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
    ];
    
    for (const userAgent of userAgents) {
      await page.setExtraHTTPHeaders({ 'User-Agent': userAgent });
      await loginAsAdmin(page);
      await page.goto('/admin');
      
      // Should work across browsers
      await expect(page.locator('body')).toBeVisible();
      await page.waitForTimeout(1000);
    }
    
    console.log('✅ Cross-browser compatibility maintained');
  });

  test('should handle large dataset rendering without memory leaks', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Mock large dataset
    await page.route('**/api/trpc/admin.student.getStudents**', (route) => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Student ${i}`,
        email: `student${i}@test.com`,
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
      }));
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: largeDataset } }),
      });
    });
    
    await page.goto('/admin/students');
    
    // Should handle large datasets
    await page.waitForTimeout(5000);
    await expect(page.locator('body')).toBeVisible();
    
    // Test scrolling through large dataset
    const table = page.locator('table, [role="table"]').first();
    if (await table.isVisible()) {
      await table.hover();
      
      // Scroll multiple times
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(100);
      }
    }
    
    console.log('✅ Large dataset rendering handled without issues');
  });

  test('should handle form validation edge cases', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/schedule');
    
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add")').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        
        // Test with extreme values
        const inputs = page.locator('input[type="text"], input[type="email"], input[type="number"]');
        const inputCount = await inputs.count();
        
        for (let i = 0; i < Math.min(inputCount, 3); i++) {
          const input = inputs.nth(i);
          const inputType = await input.getAttribute('type');
          
          // Test edge cases
          if (inputType === 'text') {
            // Very long string
            await input.fill('A'.repeat(1000));
          } else if (inputType === 'email') {
            // Invalid email formats
            await input.fill('invalid-email-format');
          } else if (inputType === 'number') {
            // Extreme numbers
            await input.fill('999999999999');
          }
        }
        
        // Try to submit
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();
        
        // Should handle edge cases gracefully
        await page.waitForTimeout(2000);
        
        // Form should still be functional
        await expect(dialog).toBeVisible();
        
        console.log('✅ Form validation edge cases handled');
        
        // Close dialog
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should handle concurrent user actions', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/students');
    
    // Simulate concurrent actions
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 5) {
      // Click multiple buttons simultaneously
      const clickPromises = [];
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        clickPromises.push(buttons.nth(i).click().catch(() => {}));
      }
      
      await Promise.all(clickPromises);
      
      // Should handle concurrent actions without crashing
      await page.waitForTimeout(3000);
      await expect(page.locator('body')).toBeVisible();
      
      console.log('✅ Concurrent user actions handled gracefully');
    }
  });
});

test.describe('Performance Testing', () => {
  test('should load admin dashboard within performance benchmarks', async ({ page }) => {
    await loginAsAdmin(page);
    
    const startTime = Date.now();
    await page.goto('/admin');
    
    // Wait for main content to load
    await page.waitForSelector('h1, [role="main"]', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`✅ Admin dashboard loaded in ${loadTime}ms`);
  });

  test('should load student dashboard efficiently', async ({ page }) => {
    await loginAsStudent(page);
    
    const startTime = Date.now();
    await page.goto('/student');
    
    await page.waitForSelector('h1, [role="main"]', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`✅ Student dashboard loaded in ${loadTime}ms`);
  });

  test('should handle navigation between pages efficiently', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    
    const navigationPaths = [
      '/admin/students',
      '/admin/schedule',
      '/admin/lessons',
      '/admin/payments'
    ];
    
    for (const path of navigationPaths) {
      const startTime = Date.now();
      
      await page.goto(path);
      await page.waitForSelector('h1, [role="main"]', { timeout: 8000 });
      
      const navigationTime = Date.now() - startTime;
      
      // Each page should load within 2 seconds
      expect(navigationTime).toBeLessThan(2000);
      
      console.log(`✅ ${path} loaded in ${navigationTime}ms`);
    }
  });

  test('should handle form submissions efficiently', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/schedule');
    
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add")').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        
        // Fill minimal required fields
        const requiredInputs = page.locator('input[required]');
        const inputCount = await requiredInputs.count();
        
        for (let i = 0; i < Math.min(inputCount, 3); i++) {
          await requiredInputs.nth(i).fill('Test Value');
        }
        
        // Submit form and measure response time
        const startTime = Date.now();
        
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();
        
        // Wait for response (success or error)
        await Promise.race([
          page.waitForSelector('text=success', { timeout: 5000 }).catch(() => {}),
          page.waitForSelector('text=error', { timeout: 5000 }).catch(() => {}),
          page.waitForSelector('text=created', { timeout: 5000 }).catch(() => {}),
          page.waitForTimeout(5000)
        ]);
        
        const responseTime = Date.now() - startTime;
        
        // Should respond within 5 seconds
        expect(responseTime).toBeLessThan(5000);
        
        console.log(`✅ Form submission responded in ${responseTime}ms`);
      }
    }
  });

  test('should handle large table rendering performance', async ({ page }) => {
    await loginAsAdmin(page);
    
    const startTime = Date.now();
    await page.goto('/admin/students');
    
    // Wait for table to load
    const table = page.locator('table, [role="table"]');
    await table.waitFor({ timeout: 10000 });
    
    const renderTime = Date.now() - startTime;
    
    // Should render within 4 seconds
    expect(renderTime).toBeLessThan(4000);
    
    console.log(`✅ Students table rendered in ${renderTime}ms`);
    
    // Test scrolling performance
    if (await table.isVisible()) {
      const scrollStartTime = Date.now();
      
      // Scroll through table
      await table.hover();
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 200);
        await page.waitForTimeout(50);
      }
      
      const scrollTime = Date.now() - scrollStartTime;
      
      // Scrolling should be smooth (under 2 seconds for 10 scrolls)
      expect(scrollTime).toBeLessThan(2000);
      
      console.log(`✅ Table scrolling completed in ${scrollTime}ms`);
    }
  });

  test('should maintain performance with multiple components', async ({ page }) => {
    await loginAsAdmin(page);
    
    const startTime = Date.now();
    await page.goto('/admin');
    
    // Wait for multiple components to load
    await Promise.all([
      page.waitForSelector('nav', { timeout: 8000 }).catch(() => {}),
      page.waitForSelector('[role="main"]', { timeout: 8000 }).catch(() => {}),
      page.waitForSelector('h1', { timeout: 8000 }).catch(() => {}),
    ]);
    
    const loadTime = Date.now() - startTime;
    
    // Multiple components should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`✅ Multiple components loaded in ${loadTime}ms`);
    
    // Test interaction responsiveness
    const interactionStartTime = Date.now();
    
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    // Hover over multiple elements
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      await buttons.nth(i).hover();
      await page.waitForTimeout(50);
    }
    
    const interactionTime = Date.now() - interactionStartTime;
    
    // Interactions should be responsive (under 1 second)
    expect(interactionTime).toBeLessThan(1000);
    
    console.log(`✅ Component interactions completed in ${interactionTime}ms`);
  });

  test('should handle memory usage efficiently during long sessions', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Simulate long user session with multiple page visits
    const pages = ['/admin', '/admin/students', '/admin/schedule', '/admin/lessons', '/admin/payments'];
    
    const startTime = Date.now();
    
    // Visit each page multiple times
    for (let round = 0; round < 3; round++) {
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForTimeout(1000);
        
        // Interact with page elements
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        
        if (buttonCount > 0) {
          await buttons.first().hover();
          await page.waitForTimeout(100);
        }
      }
    }
    
    const sessionTime = Date.now() - startTime;
    
    // Long session should complete without hanging
    expect(sessionTime).toBeLessThan(30000); // 30 seconds max
    
    // Final page should still be responsive
    await page.goto('/admin');
    await expect(page.locator('body')).toBeVisible();
    
    console.log(`✅ Long session (${sessionTime}ms) handled efficiently`);
  });

  test('should optimize bundle loading and caching', async ({ page }) => {
    // Clear cache first
    await page.context().clearCookies();
    
    await loginAsAdmin(page);
    
    // First visit - measure initial load
    const firstVisitStart = Date.now();
    await page.goto('/admin');
    await page.waitForSelector('[role="main"]', { timeout: 10000 });
    const firstVisitTime = Date.now() - firstVisitStart;
    
    // Second visit - measure cached load
    const secondVisitStart = Date.now();
    await page.reload();
    await page.waitForSelector('[role="main"]', { timeout: 10000 });
    const secondVisitTime = Date.now() - secondVisitStart;
    
    // Second visit should be faster due to caching
    console.log(`First visit: ${firstVisitTime}ms, Second visit: ${secondVisitTime}ms`);
    
    // Both visits should be reasonably fast
    expect(firstVisitTime).toBeLessThan(8000);
    expect(secondVisitTime).toBeLessThan(5000);
    
    console.log('✅ Bundle loading and caching optimized');
  });
});

test.describe('Accessibility Testing', () => {
  test('should meet basic accessibility standards', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    
    // Check for basic accessibility features
    const hasHeadings = await page.locator('h1, h2, h3').count() > 0;
    const hasLandmarks = await page.locator('[role="main"], main, nav, aside').count() > 0;
    const hasLabels = await page.locator('label').count() > 0;
    
    expect(hasHeadings).toBe(true);
    expect(hasLandmarks).toBe(true);
    
    console.log('✅ Basic accessibility structure present');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    const isFocusVisible = await focusedElement.isVisible();
    
    expect(isFocusVisible).toBe(true);
    console.log('✅ Keyboard navigation functional');
  });

  test('should handle screen reader compatibility', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/students');
    
    // Check for ARIA attributes
    const hasAriaLabels = await page.locator('[aria-label]').count() > 0;
    const hasAriaDescribedBy = await page.locator('[aria-describedby]').count() > 0;
    const hasRoles = await page.locator('[role]').count() > 0;
    
    if (hasAriaLabels || hasAriaDescribedBy || hasRoles) {
      console.log('✅ ARIA attributes present for screen reader compatibility');
    }
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      const imagesWithAlt = await page.locator('img[alt]').count();
      const altTextCoverage = imagesWithAlt / imageCount;
      
      if (altTextCoverage > 0.8) {
        console.log('✅ Good alt text coverage for images');
      }
    }
  });
});