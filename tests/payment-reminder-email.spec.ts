import { expect, test } from "@playwright/test";

// Payment reminder email E2E tests.
// All selectors use .first() to avoid strict mode violations from duplicate
// desktop + mobile layout DOM elements.
//
// Seed data only includes COMPLETED payments, so tests that require PENDING
// payments intercept the TRPC getPayments response and inject a synthetic
// PENDING row. The sendPaymentReminder mutation is also intercepted to avoid
// hitting the real email service.

test.describe("Payment Reminder System", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  // A synthetic PENDING payment used by tests that need one in the table.
  const pendingPayment = {
    id: "e2e-pending-001",
    amount: 85,
    method: "VENMO",
    referenceCode: "E2E-PENDING-001",
    status: "PENDING",
    createdAt: new Date().toISOString(),
    lesson_date: new Date().toISOString(),
    Student: {
      id: "e2e-student-001",
      userId: "e2e-student-user-001",
      phone: "555-000-0000",
      level: "PRELIMINARY",
      maxLessonsPerWeek: 2,
      isApproved: true,
      User: { id: "e2e-student-user-001", name: "E2E Pending Student", email: "pending@test.com" },
    },
    Lesson: {
      id: "e2e-lesson-001",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      type: "PRIVATE",
      area: null,
      Rink: { id: "e2e-rink-001", name: "Test Rink" },
      Coach: { id: "e2e-coach-001", User: { name: "Test Coach" } },
    },
  };

  /**
   * Intercept the TRPC getPayments query and prepend the synthetic PENDING
   * payment to the real response. If the real call fails (e.g. in isolated
   * environments), fall back to a response containing only the synthetic row.
   */
  async function injectPendingPayment(page: import("@playwright/test").Page) {
    await page.route("**/api/trpc/admin.payment.getPayments*", async (route) => {
      try {
        const response = await route.fetch();
        const body = await response.json();

        // TRPC batched responses are arrays; single responses are objects.
        // Handle both shapes.
        if (Array.isArray(body)) {
          // Batched: each element has { result: { data: { json: ... } } }
          for (const entry of body) {
            const payments = entry?.result?.data?.json?.payments;
            if (Array.isArray(payments)) {
              payments.unshift(pendingPayment);
            }
          }
        } else if (body?.result?.data?.json?.payments) {
          body.result.data.json.payments.unshift(pendingPayment);
        }

        await route.fulfill({ json: body });
      } catch {
        // Fallback: return a minimal valid TRPC response with just the pending payment
        await route.fulfill({
          json: [
            {
              result: {
                data: {
                  json: {
                    payments: [pendingPayment],
                    pagination: { total: 1, pages: 1, current: 1 },
                  },
                },
              },
            },
          ],
        });
      }
    });
  }

  // -----------------------------------------------------------------------
  // Test 1: Payments page loads and table renders with data
  // -----------------------------------------------------------------------
  test("should display payments with action buttons", async ({ page }) => {
    await page.goto("/admin/payments");

    // Wait for the heading to confirm the page loaded
    await expect(page.locator("h1").filter({ hasText: "Payments" }).first()).toBeVisible({
      timeout: 15000,
    });

    // The table should render (seed data includes COMPLETED payments)
    const table = page.locator("table").first();
    const emptyState = page.locator("text=No payments").first();
    await expect(table.or(emptyState)).toBeVisible({ timeout: 15000 });

    // If the table loaded, verify structural elements
    if (await table.isVisible()) {
      // Table headers
      await expect(
        page
          .locator("th")
          .filter({ hasText: /Student/i })
          .first(),
      ).toBeVisible();
      await expect(
        page
          .locator("th")
          .filter({ hasText: /Amount/i })
          .first(),
      ).toBeVisible();
      await expect(
        page
          .locator("th")
          .filter({ hasText: /Status/i })
          .first(),
      ).toBeVisible();
      await expect(
        page
          .locator("th")
          .filter({ hasText: /Actions/i })
          .first(),
      ).toBeVisible();

      // At least one "View" action button in any row
      await expect(page.locator('button:has-text("View")').first()).toBeVisible();
    }
  });

  // -----------------------------------------------------------------------
  // Test 2: Remind button visibility follows payment status
  // -----------------------------------------------------------------------
  test("should show remind button only for pending payments", async ({ page }) => {
    // Inject a PENDING payment so both tabs have meaningful data
    await injectPendingPayment(page);

    await page.goto("/admin/payments");
    await expect(page.locator("h1").filter({ hasText: "Payments" }).first()).toBeVisible({
      timeout: 15000,
    });

    // Click the "Pending" tab
    const pendingTab = page.locator('[role="tab"]').filter({ hasText: "Pending" }).first();
    await pendingTab.click();

    // Wait for the pending table to show at least one row
    const pendingTable = page.locator('[role="tabpanel"] table').first();
    const pendingEmpty = page.locator("text=No pending payments").first();
    await expect(pendingTable.or(pendingEmpty)).toBeVisible({ timeout: 10000 });

    if (await pendingTable.isVisible()) {
      // "Remind" buttons should be present for PENDING rows.
      // The text is hidden on mobile, so match the button that contains the Send icon
      // and the "Remind" text span.
      const remindButton = pendingTable.locator('button:has-text("Remind")').first();
      await expect(remindButton).toBeVisible({ timeout: 5000 });
    }

    // Now switch to "Completed" tab
    const completedTab = page.locator('[role="tab"]').filter({ hasText: "Completed" }).first();
    await completedTab.click();

    // Wait for completed content to appear
    const completedTable = page.locator('[role="tabpanel"] table').first();
    const completedEmpty = page.locator("text=No completed payments").first();
    await expect(completedTable.or(completedEmpty)).toBeVisible({ timeout: 10000 });

    // "Remind" buttons should NOT be visible for COMPLETED rows.
    // Use a short timeout -- we expect zero matches.
    const completedRemindButtons = completedTable.locator('button:has-text("Remind")');
    await expect(completedRemindButtons).toHaveCount(0, { timeout: 3000 });
  });

  // -----------------------------------------------------------------------
  // Test 3: Clicking Remind sends a reminder and shows a success toast
  // -----------------------------------------------------------------------
  test("should send payment reminder", async ({ page }) => {
    // Inject PENDING payment into the table
    await injectPendingPayment(page);

    // Mock the sendPaymentReminder mutation to return success without hitting real email
    await page.route("**/api/trpc/admin.payment.sendPaymentReminder*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: [
          {
            result: {
              data: {
                json: {
                  id: pendingPayment.id,
                  reminderSentAt: new Date().toISOString(),
                },
              },
            },
          },
        ],
      });
    });

    await page.goto("/admin/payments");
    await expect(page.locator("h1").filter({ hasText: "Payments" }).first()).toBeVisible({
      timeout: 15000,
    });

    // Navigate to the Pending tab to find the Remind button
    const pendingTab = page.locator('[role="tab"]').filter({ hasText: "Pending" }).first();
    await pendingTab.click();

    // Wait for the pending table to render
    const pendingTable = page.locator('[role="tabpanel"] table').first();
    await expect(pendingTable).toBeVisible({ timeout: 10000 });

    // Click the first "Remind" button
    const remindButton = pendingTable.locator('button:has-text("Remind")').first();
    await expect(remindButton).toBeVisible({ timeout: 5000 });
    await remindButton.click();

    // Verify the success toast appears.
    // Sonner renders toasts in an <ol> with [data-sonner-toaster] or similar.
    // The toast title is "Reminder sent" and description is
    // "Payment reminder has been sent to the student."
    const successToast = page.locator("text=Reminder sent").first();
    await expect(successToast).toBeVisible({ timeout: 10000 });
  });

  // -----------------------------------------------------------------------
  // Test 4: Failed reminder shows an error toast
  // -----------------------------------------------------------------------
  test("should handle reminder send failure gracefully", async ({ page }) => {
    // Inject PENDING payment into the table
    await injectPendingPayment(page);

    // Mock the sendPaymentReminder mutation to return an error
    await page.route("**/api/trpc/admin.payment.sendPaymentReminder*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: [
          {
            error: {
              message: "Email service unavailable",
              code: -32603,
              data: {
                code: "INTERNAL_SERVER_ERROR",
                httpStatus: 500,
                path: "admin.payment.sendPaymentReminder",
              },
            },
          },
        ],
      });
    });

    await page.goto("/admin/payments");
    await expect(page.locator("h1").filter({ hasText: "Payments" }).first()).toBeVisible({
      timeout: 15000,
    });

    // Navigate to the Pending tab
    const pendingTab = page.locator('[role="tab"]').filter({ hasText: "Pending" }).first();
    await pendingTab.click();

    // Wait for the pending table
    const pendingTable = page.locator('[role="tabpanel"] table').first();
    await expect(pendingTable).toBeVisible({ timeout: 10000 });

    // Click the first "Remind" button
    const remindButton = pendingTable.locator('button:has-text("Remind")').first();
    await expect(remindButton).toBeVisible({ timeout: 5000 });
    await remindButton.click();

    // Verify the error toast appears
    const errorToast = page.locator("text=Failed to send reminder").first();
    await expect(errorToast).toBeVisible({ timeout: 10000 });
  });
});
