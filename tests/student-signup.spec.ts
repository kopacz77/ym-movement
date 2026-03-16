import { expect, test } from "@playwright/test";

// Signup tests run without authentication (empty storageState)
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * Mock the Cloudflare Turnstile widget so it auto-provides a token.
 * The submit button is disabled when turnstileToken is null, so we need
 * the mock callback to fire and set the token in React state.
 */
async function mockTurnstile(page: import("@playwright/test").Page) {
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
}

/**
 * Helper to interact with the Radix Select for skating level.
 * Clicks the trigger, waits for the dropdown, and selects an option.
 * Uses getByRole with exact matching to avoid strict mode violations
 * (e.g. "PRELIMINARY" would also match "PRE PRELIMINARY" without exact).
 */
async function selectSkatingLevel(page: import("@playwright/test").Page, levelText: string) {
  // Click the Radix Select trigger to open the dropdown
  const trigger = page.locator('[data-slot="select-trigger"]');
  await trigger.click();

  // Use exact role matching to avoid ambiguity
  const option = page.getByRole("option", { name: levelText, exact: true });
  await option.click();
}

test.describe("Student Signup Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockTurnstile(page);
    await page.goto("/auth/signup");
    await page.waitForLoadState("networkidle");
  });

  test("should display signup form with all fields", async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Yura/i);

    // Check form elements are present
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="phone"]')).toBeVisible();

    // Radix Select trigger for skating level (not native <select>)
    await expect(page.locator('[data-slot="select-trigger"]')).toBeVisible();

    // Radix Checkbox for parent consent (not native <input type="checkbox">)
    await expect(page.locator('#parentConsent[role="checkbox"]')).toBeVisible();

    // Submit button with correct text
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Submit Registration");

    // Verify NO password field exists
    await expect(page.locator('input[id="password"]')).toHaveCount(0);

    // Verify NO maxLessonsPerWeek field exists
    await expect(page.locator('input[name="maxLessonsPerWeek"]')).toHaveCount(0);
  });

  test("should interact with Radix Select for skating level", async ({ page }) => {
    // Click the Radix Select trigger
    const trigger = page.locator('[data-slot="select-trigger"]');
    await trigger.click();

    // Verify options are visible in the dropdown (use exact matching to avoid ambiguity)
    await expect(
      page.getByRole("option", { name: "PRELIMINARY", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "PRE PRELIMINARY", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "JUVENILE", exact: true }),
    ).toBeVisible();

    // Select an option
    await page.getByRole("option", { name: "PRELIMINARY", exact: true }).click();

    // Verify the trigger now shows the selected value
    await expect(trigger).toContainText("PRELIMINARY");
  });

  test("should interact with Radix Checkbox for parent consent", async ({ page }) => {
    const checkbox = page.locator('#parentConsent[role="checkbox"]');

    // Verify initial unchecked state
    await expect(checkbox).toHaveAttribute("data-state", "unchecked");

    // Click to check
    await checkbox.click();
    await expect(checkbox).toHaveAttribute("data-state", "checked");

    // Click again to uncheck
    await checkbox.click();
    await expect(checkbox).toHaveAttribute("data-state", "unchecked");
  });

  test("should successfully submit registration", async ({ page }) => {
    // Intercept the signup API to return success (bypasses server-side Turnstile validation
    // which rejects the fake token in environments where TURNSTILE_SECRET_KEY is set)
    await page.route("**/api/auth/signup", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Account created successfully",
          user: { id: "test-id", name: "E2E Signup Test", email: "test@example.com" },
        }),
      });
    });

    // Fill all fields
    await page.fill('input[id="name"]', "E2E Signup Test");
    await page.fill('input[id="email"]', `signup.test.${Date.now()}@playwright-test.com`);
    await page.fill('input[id="phone"]', "555-999-8888");

    // Select skating level via Radix Select
    await selectSkatingLevel(page, "PRELIMINARY");

    // Check parent consent via Radix Checkbox
    await page.locator('#parentConsent[role="checkbox"]').click();

    // Submit form
    await page.click('button[type="submit"]');

    // Expect success toast with "Registration submitted"
    await expect(page.locator("text=Registration submitted")).toBeVisible({ timeout: 15000 });

    // Should redirect to /auth/login after success
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });

  test("should validate required fields", async ({ page }) => {
    // The name and email inputs have the HTML5 'required' attribute.
    // Clicking submit on an empty form should NOT submit (browser validation).
    await expect(page.locator('input[id="name"]')).toHaveAttribute("required", "");
    await expect(page.locator('input[id="email"]')).toHaveAttribute("required", "");

    // Try to submit empty form -- form should stay on the page
    await page.click('button[type="submit"]');

    // Form should still be visible (not navigated away)
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[id="email"]')).toBeVisible();
  });

  test("should have responsive design", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should navigate to login page", async ({ page }) => {
    // Check for login link
    const loginLink = page.locator('a[href="/auth/login"]').first();
    await expect(loginLink).toBeVisible();

    // Click login link
    await loginLink.click();

    // Verify navigation
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should validate email format", async ({ page }) => {
    // The email input has type="email" which provides HTML5 validation
    await expect(page.locator('input[id="email"]')).toHaveAttribute("type", "email");

    // Fill name (required) so only email validation blocks submission
    await page.fill('input[id="name"]', "Test User");
    await page.fill('input[id="email"]', "not-an-email");

    // Try to submit -- browser email validation should prevent it
    await page.click('button[type="submit"]');

    // Form should still be visible (submission blocked by HTML5 validation)
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });
});
