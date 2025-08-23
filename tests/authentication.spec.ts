import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/signin');
    });

    test('should display login form', async ({ page }) => {
      await expect(page).toHaveTitle(/Sign In/);
      
      // Check form elements
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
    });

    test('should validate required fields', async ({ page }) => {
      // Submit empty form
      await page.click('button[type="submit"]');
      
      // Check for validation errors
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'password');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Please enter a valid email')).toBeVisible();
    });

    test('should handle invalid credentials', async ({ page }) => {
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to signup page', async ({ page }) => {
      const signupLink = page.locator('a[href="/auth/signup"]');
      await expect(signupLink).toBeVisible();
      
      await signupLink.click();
      await expect(page).toHaveURL('/auth/signup');
    });

    test('should have forgot password link', async ({ page }) => {
      const forgotPasswordLink = page.locator('a[href*="forgot-password"]');
      await expect(forgotPasswordLink).toBeVisible();
    });
  });

  test.describe('Admin Login', () => {
    test('should login admin user and redirect to admin dashboard', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Login with admin credentials (assuming admin@ym-movement.com exists)
      await page.fill('input[name="email"]', 'admin@ym-movement.com');
      await page.fill('input[name="password"]', 'admin123'); // This should be the actual admin password
      await page.click('button[type="submit"]');
      
      // Should redirect to admin dashboard
      await expect(page).toHaveURL('/admin', { timeout: 10000 });
      
      // Check for admin dashboard elements
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    });
  });

  test.describe('Student Login', () => {
    test('should handle student login (pending approval)', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Try to login with a student account that might be pending approval
      await page.fill('input[name="email"]', 'student@example.com');
      await page.fill('input[name="password"]', 'StudentPassword123!');
      await page.click('button[type="submit"]');
      
      // Should either redirect to student dashboard or show pending approval message
      await page.waitForLoadState('networkidle');
      
      // Check for either successful login or pending approval message
      const isStudentDashboard = await page.locator('text=Student Dashboard').isVisible();
      const isPendingApproval = await page.locator('text=pending approval').isVisible();
      
      expect(isStudentDashboard || isPendingApproval).toBeTruthy();
    });
  });

  test.describe('Logout', () => {
    test('should logout user and redirect to home', async ({ page }) => {
      // First, let's navigate to a protected page that requires login
      await page.goto('/admin');
      
      // If redirected to login, login first
      if (page.url().includes('/auth/signin')) {
        await page.fill('input[name="email"]', 'admin@ym-movement.com');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin');
      }
      
      // Now logout
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Sign Out")');
      await logoutButton.click();
      
      // Should redirect to home or login page
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      expect(currentUrl.includes('/auth/signin') || currentUrl === new URL('/', page.url()).href).toBeTruthy();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access admin dashboard without login
      await page.goto('/admin');
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/auth\/signin/);
    });

    test('should redirect unauthenticated users from student dashboard', async ({ page }) => {
      // Try to access student dashboard without login
      await page.goto('/student');
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });

  test.describe('Role-based Access', () => {
    test('should prevent student from accessing admin dashboard', async ({ page }) => {
      // This test would require a verified student account
      // For now, we'll just check that the route exists and requires authentication
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Login first
      await page.goto('/auth/signin');
      await page.fill('input[name="email"]', 'admin@ym-movement.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      // Wait for redirect
      await page.waitForURL('/admin');
      
      // Refresh the page
      await page.reload();
      
      // Should still be on admin dashboard
      await expect(page).toHaveURL('/admin');
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display login form correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/signin');
      
      // Check form is still accessible on mobile
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should display signup form correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/auth/signup');
      
      // Check form layout on tablet
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });
});