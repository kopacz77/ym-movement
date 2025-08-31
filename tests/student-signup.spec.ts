import { test, expect } from '@playwright/test';

test.describe('Student Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup');
  });

  test('should display signup form with all required fields', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Sign Up/);
    
    // Check form elements are present
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('select[name="level"]')).toBeVisible();
    await expect(page.locator('input[name="maxLessonsPerWeek"]')).toBeVisible();
    
    // Check submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Create Account');
  });

  test('should show real-time password validation', async ({ page }) => {
    const passwordInput = page.locator('input[id="password"]');
    
    // Test weak password
    await passwordInput.fill('weak');
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    
    // Test password without uppercase
    await passwordInput.fill('password123!');
    await expect(page.locator('text=Password must contain at least one uppercase letter')).toBeVisible();
    
    // Test strong password
    await passwordInput.fill('StrongPassword123!');
    await expect(page.locator('text=Password meets all requirements')).toBeVisible();
  });

  test('should successfully create student account', async ({ page }) => {
    // Fill out the form with valid data
    await page.fill('input[name="name"]', 'Test Student');
    await page.fill('input[id="email"]', `test.student.${Date.now()}@example.com`);
    await page.fill('input[id="password"]', 'SecurePassword123!');
    await page.fill('input[name="phone"]', '555-123-4567');
    await page.selectOption('select[name="level"]', 'PRELIMINARY');
    await page.fill('input[name="maxLessonsPerWeek"]', '2');
    
    // Fill emergency contact
    await page.fill('input[name="emergencyContact.name"]', 'Parent Name');
    await page.fill('input[name="emergencyContact.phone"]', '555-987-6543');
    await page.fill('input[name="emergencyContact.relationship"]', 'Parent');
    
    // Accept parent consent
    await page.check('input[name="parentConsent"]');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for success message or redirect
    await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 10000 });
  });

  test('should handle validation errors', async ({ page }) => {
    // Submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should prevent duplicate email registration', async ({ page }) => {
    // Try to register with an existing email (assuming admin exists)
    await page.fill('input[name="name"]', 'Duplicate User');
    await page.fill('input[id="email"]', 'admin@ym-movement.com');
    await page.fill('input[id="password"]', 'SecurePassword123!');
    await page.selectOption('select[name="level"]', 'PRELIMINARY');
    await page.check('input[name="parentConsent"]');
    
    await page.click('button[type="submit"]');
    
    // Check for duplicate email error
    await expect(page.locator('text=Email already in use')).toBeVisible({ timeout: 10000 });
  });

  test('should display level options correctly', async ({ page }) => {
    const levelSelect = page.locator('select[name="level"]');
    
    // Check all level options are present
    await expect(levelSelect.locator('option[value="PRE_PRELIMINARY"]')).toBeVisible();
    await expect(levelSelect.locator('option[value="PRELIMINARY"]')).toBeVisible();
    await expect(levelSelect.locator('option[value="PRE_JUVENILE"]')).toBeVisible();
    await expect(levelSelect.locator('option[value="JUVENILE"]')).toBeVisible();
    await expect(levelSelect.locator('option[value="INTERMEDIATE"]')).toBeVisible();
    await expect(levelSelect.locator('option[value="NOVICE"]')).toBeVisible();
    await expect(levelSelect.locator('option[value="JUNIOR"]')).toBeVisible();
    await expect(levelSelect.locator('option[value="SENIOR"]')).toBeVisible();
  });

  test('should have responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that form is still accessible
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check form layout
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    // Check for login link
    const loginLink = page.locator('a[href="/auth/login"]');
    await expect(loginLink).toBeVisible();
    
    // Click login link
    await loginLink.click();
    
    // Verify navigation
    await expect(page).toHaveURL('/auth/login');
  });
});