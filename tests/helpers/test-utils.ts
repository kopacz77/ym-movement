import { expect, type Page } from "@playwright/test";

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
 * Login as student user
 */
export async function loginAsStudent(page: Page, email?: string, password?: string) {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', email || testData.student.email);
  await page.fill('input[id="password"]', password || testData.student.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/student/dashboard", { timeout: 10000 });
}

/**
 * Login as coach user
 */
export async function loginAsCoach(page: Page, email?: string, password?: string) {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', email || testData.coach.email);
  await page.fill('input[id="password"]', password || testData.coach.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/coach/dashboard", { timeout: 10000 });
}

/**
 * Navigate to a specific coach page
 */
export async function navigateToCoachPage(page: Page, section: string) {
  await page.click(`a[href="/coach/${section}"], a:has-text("${section}")`);
  await page.waitForURL(`/coach/${section}`);
}

/**
 * Approve a coach (super admin only)
 */
export async function approveCoach(page: Page, coachEmail: string) {
  await navigateToAdminPage(page, "coaches");
  const coachRow = page.locator(`tr:has-text("${coachEmail}")`);
  const approveButton = coachRow.locator('button:has-text("Approve")');
  if (await approveButton.isVisible()) {
    await approveButton.click();
    await expect(page.locator("text=Coach approved")).toBeVisible({ timeout: 10000 });
  }
}

/**
 * Create a new student account.
 *
 * The current signup form uses:
 * - Radix Select for skating level (not native <select>)
 * - Radix Checkbox for parent consent (not native <input type="checkbox">)
 * - Cloudflare Turnstile CAPTCHA (mocked via addInitScript)
 * - NO password field (set post-approval)
 * - NO emergencyContact fields
 * - NO maxLessonsPerWeek field (hardcoded to 3)
 * - Success toast: "Registration submitted"
 */
export async function createStudentAccount(page: Page, studentData = testData.student) {
  // Mock Turnstile so the submit button is enabled
  await page.addInitScript(() => {
    (window as any).turnstile = {
      render: (_container: any, options: any) => {
        if (options.callback) options.callback("test-token-playwright");
        return "widget-id";
      },
      execute: () => {},
      remove: () => {},
      reset: () => {},
    };
  });

  // Mock the signup API to bypass server-side Turnstile validation
  const testEmail = `${Date.now()}.${studentData.email}`;
  await page.route("**/api/auth/signup", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Account created successfully",
        user: { id: "test-id", name: studentData.name, email: testEmail },
      }),
    });
  });

  await page.goto("/auth/signup");
  await page.waitForLoadState("networkidle");

  // Fill basic information
  await page.fill('input[id="name"]', studentData.name);
  await page.fill('input[id="email"]', testEmail);
  await page.fill('input[id="phone"]', studentData.phone);

  // Select skating level via Radix Select (use exact matching to avoid ambiguity)
  const trigger = page.locator('[data-slot="select-trigger"]');
  await trigger.click();
  const levelText = studentData.level.replace("_", " ");
  await page.getByRole("option", { name: levelText, exact: true }).click();

  // Accept parent consent via Radix Checkbox
  await page.locator('#parentConsent[role="checkbox"]').click();

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for success message
  await expect(page.locator("text=Registration submitted")).toBeVisible({ timeout: 15000 });
}

/**
 * Navigate to a specific admin page
 */
export async function navigateToAdminPage(page: Page, section: string) {
  await page.click(`a[href="/admin/${section}"], a:has-text("${section}")`);
  await page.waitForURL(`/admin/${section}`);
}

/**
 * Navigate to a specific student page
 */
export async function navigateToStudentPage(page: Page, section: string) {
  await page.click(`a[href="/student/${section}"], a:has-text("${section}")`);
  await page.waitForURL(`/student/${section}`);
}

/**
 * Create a time slot (admin only)
 */
export async function createTimeSlot(
  page: Page,
  slotData: {
    startTime: string;
    endTime: string;
    rinkId?: string;
  },
) {
  await navigateToAdminPage(page, "schedule");

  const addButton = page.locator(
    'button:has-text("Add Time Slot"), button:has-text("Create Slot")',
  );
  await addButton.click();

  // Fill time slot form
  await page.fill('input[name="startTime"]', slotData.startTime);
  await page.fill('input[name="endTime"]', slotData.endTime);

  if (slotData.rinkId) {
    await page.selectOption('select[name="rinkId"]', slotData.rinkId);
  }

  await page.click('button[type="submit"]');
  await expect(page.locator("text=Time slot created")).toBeVisible({ timeout: 10000 });
}

/**
 * Book a lesson (student only)
 */
export async function bookLesson(page: Page, slotSelector?: string) {
  await navigateToStudentPage(page, "schedule");

  const bookButton = slotSelector
    ? page.locator(slotSelector).locator('button:has-text("Book")')
    : page.locator('button:has-text("Book")').first();

  await bookButton.click();

  // Fill booking form if needed
  const submitButton = page.locator(
    'button[type="submit"]:has-text("Book"), button[type="submit"]:has-text("Confirm")',
  );
  await submitButton.click();

  await expect(page.locator("text=Lesson booked")).toBeVisible({ timeout: 10000 });
}

/**
 * Approve a student (admin only)
 */
export async function approveStudent(page: Page, studentEmail: string) {
  await navigateToAdminPage(page, "students");

  // Find the student row and approve
  const studentRow = page.locator(`tr:has-text("${studentEmail}")`);
  const approveButton = studentRow.locator('button:has-text("Approve")');

  if (await approveButton.isVisible()) {
    await approveButton.click();
    await expect(page.locator("text=Student approved")).toBeVisible({ timeout: 10000 });
  }
}

/**
 * Verify payment (admin only)
 */
export async function verifyPayment(page: Page, paymentReference: string) {
  await navigateToAdminPage(page, "payments");

  // Find payment by reference and verify
  const paymentRow = page.locator(`tr:has-text("${paymentReference}")`);
  const verifyButton = paymentRow.locator('button:has-text("Verify")');

  if (await verifyButton.isVisible()) {
    await verifyButton.click();
    await expect(page.locator("text=Payment verified")).toBeVisible({ timeout: 10000 });
  }
}

/**
 * Check responsive design for different viewports
 */
export async function testResponsiveDesign(page: Page, url: string) {
  const viewports = [
    { width: 375, height: 667, name: "Mobile" },
    { width: 768, height: 1024, name: "Tablet" },
    { width: 1920, height: 1080, name: "Desktop" },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(url);

    // Basic visibility checks
    await expect(page.locator('main, [role="main"]')).toBeVisible();

    // Check navigation is accessible
    const nav = page.locator("nav");
    if (viewport.width < 768) {
      // Mobile: check for hamburger menu
      const mobileMenuButton = page.locator('button[aria-label="Menu"], button:has-text("☰")');
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        await expect(nav).toBeVisible();
      }
    } else {
      // Desktop/Tablet: nav should be visible
      await expect(nav).toBeVisible();
    }
  }
}

/**
 * Wait for API calls to complete
 */
export async function waitForApiCalls(page: Page, apiPattern: string | RegExp = /\/api\//) {
  await page.waitForLoadState("networkidle");

  // Wait for any pending API calls
  await page
    .waitForFunction(
      () => {
        return (window as any).fetch && !(window as any).fetch.isFetching;
      },
      undefined,
      { timeout: 5000 },
    )
    .catch(() => {
      // Ignore timeout - this is a best effort wait
    });
}

/**
 * Clear test data (use with caution!)
 */
export async function clearTestData(page: Page) {
  // This should only be used in test environment
  if (process.env.NODE_ENV !== "test") {
    throw new Error("clearTestData should only be used in test environment");
  }

  // Implementation would depend on having a test data cleanup endpoint
  console.warn("clearTestData not implemented - manual cleanup required");
}

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix = "test"): string {
  return `${prefix}.${Date.now()}@playwright-test.com`;
}

/**
 * Generate future date for time slots
 */
export function generateFutureDateTime(daysFromNow = 7, hour = 10): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);

  // Format as datetime-local input format
  return date.toISOString().slice(0, 16);
}

/**
 * Take screenshot with test context
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Assert no console errors
 */
export async function assertNoConsoleErrors(page: Page) {
  const consoleErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  // Run your test actions here

  expect(consoleErrors, `Console errors found: ${consoleErrors.join(", ")}`).toHaveLength(0);
}

/**
 * Mock API responses for testing
 */
export async function mockApiResponse(page: Page, url: string | RegExp, response: any) {
  await page.route(url, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

/**
 * Test form validation
 */
export async function testFormValidation(
  page: Page,
  formSelector: string,
  requiredFields: string[],
) {
  // Submit empty form
  await page.click(`${formSelector} button[type="submit"]`);

  // Check that validation errors appear for required fields
  for (const field of requiredFields) {
    const errorMessage = page.locator(
      `text=${field} is required, text=Please enter ${field.toLowerCase()}`,
    );
    await expect(errorMessage).toBeVisible();
  }
}
