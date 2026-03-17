import { type Page } from "@playwright/test";

/**
 * Test utilities and helper functions for YM Movement Playwright tests
 */

// Common test data
export const testData = {
  admin: {
    email: "admin@test.com",
    password: "ADMINPASS2025!",
  },
  coach: {
    email: "coach@test.com",
    password: "COACHPASS2025!",
    name: "Test Coach",
  },
  coach2: {
    email: "coach2@test.com",
    password: "COACH2PASS2025!",
    name: "Test Coach 2",
  },
  coach3: {
    email: "coach3@test.com",
    password: "COACH3PASS2025!",
    name: "Pending Coach",
  },
  coach4: {
    email: "coach4@test.com",
    password: "COACH4PASS2025!",
    name: "Deny Test Coach",
  },
  student: {
    email: "test.student@example.com",
    password: "TestPassword123!",
    name: "Test Student",
    phone: "555-123-4567",
    level: "PRELIMINARY",
    maxLessonsPerWeek: 2,
    emergencyContact: {
      name: "Test Parent",
      phone: "555-987-6543",
      relationship: "Parent",
    },
  },
  rink: {
    name: "Test Ice Rink",
    address: "123 Ice Street, Test City, TC 12345",
    timezone: "America/Los_Angeles",
  },
};

/**
 * Login as super admin (SUPER_ADMIN role) - primary admin login
 */
export async function loginAsSuperAdmin(page: Page) {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', testData.admin.email);
  await page.fill('input[id="password"]', testData.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/admin/dashboard", { timeout: 10000 });
}

// Backward compat alias -- existing tests import this name
export const loginAsAdmin = loginAsSuperAdmin;

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix = "test"): string {
  return `${prefix}.${Date.now()}@playwright-test.com`;
}
