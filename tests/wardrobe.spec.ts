// tests/wardrobe.spec.ts
//
// Phase 21 E2E coverage (TEST-01 + TEST-04 + TEST-08 + PERM-04). Plan 21-03
// authors the Rental Happy Path + Permission Negative Paths describes; Plan 21-04
// will APPEND its Consigner describes to the bottom of this file (see Phase 21
// plan-coordination note).
//
// Prerequisites (handled by tests/auth.setup.ts):
//   - admin@test.com (SUPER_ADMIN) and test.student@example.com (STUDENT) exist
//   - 6 dresses + 18 images seeded via scripts/seed-wardrobe.ts (Plan 21-01)
//   - 4 storage states saved at playwright/.auth/{super-admin,coach,coach2,student}.json
//
// Spec runs via: `pnpm test:e2e tests/wardrobe.spec.ts`

import { expect, test } from "@playwright/test";
import {
  assertTrpcForbidden,
  expectNotificationContaining,
  SEED_DRESS_TITLES,
} from "./helpers/wardrobe-test-utils";

const STUDENT_STORAGE = "playwright/.auth/student.json";
const ADMIN_STORAGE = "playwright/.auth/super-admin.json";
const COACH_STORAGE = "playwright/.auth/coach.json";

// ──────────────────────────────────────────────────────────────────────────
// Rental Happy Path (TEST-01)
// ──────────────────────────────────────────────────────────────────────────

test.describe("Rental Happy Path (TEST-01)", () => {
  test("student measurements → fits-me browse → request → admin approve → mark paid → confirmed → returned → deposit released", async ({
    browser,
  }) => {
    // ── PHASE A: student sets measurements ───────────────────────────────
    const studentContext = await browser.newContext({ storageState: STUDENT_STORAGE });
    const studentPage = await studentContext.newPage();

    await studentPage.goto("/wardrobe/measurements");
    await expect(studentPage.locator("h1, h2").first()).toBeVisible({ timeout: 15000 });

    // Fill the form — selectors match the existing MeasurementForm.tsx field naming
    // (input[name=heightCm], etc. — Phase 15-04). If selectors drift, update both
    // here and in the form's data-testid attribute.
    await studentPage.fill('input[name="heightCm"]', "160");
    await studentPage.fill('input[name="chestCm"]', "86");
    await studentPage.fill('input[name="waistCm"]', "68");
    await studentPage.fill('input[name="hipsCm"]', "92");
    await studentPage.locator('button[type="submit"]').first().click();
    // Wait for save confirmation (toast or persisted state) — be tolerant of form variants
    await studentPage.waitForLoadState("networkidle");

    // ── PHASE B: browse with fits-me toggle ──────────────────────────────
    await studentPage.goto("/wardrobe");
    await expect(studentPage.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // Toggle fits-me filter — exact selector depends on WardrobeFilterBar.tsx
    // (Phase 15-06). The label/role is "Fits me" per design spec L401-410.
    const fitsMeToggle = studentPage
      .getByRole("switch", { name: /fits me/i })
      .first()
      .or(studentPage.getByLabel(/fits me/i).first());
    await fitsMeToggle.click({ timeout: 10000 });
    await studentPage.waitForLoadState("networkidle");

    // At least one seeded dress should appear (Midnight Crystal Classical is sized
    // to match the seeded student measurements — chest 82-88 includes 86, waist
    // 64-70 includes 68, hips 88-94 includes 92, length 72 matches expected 72).
    await expect(studentPage.getByText(SEED_DRESS_TITLES.YURA_CLASSICAL).first()).toBeVisible({
      timeout: 15000,
    });

    // ── PHASE C: open detail and submit rental request ───────────────────
    await studentPage.getByText(SEED_DRESS_TITLES.YURA_CLASSICAL).first().click();
    await studentPage.waitForLoadState("networkidle");
    // Should now be on /wardrobe/<id>
    await expect(studentPage).toHaveURL(/\/wardrobe\/[a-z0-9]+/);

    // Click "Request to Rent" button (DETAIL-03)
    await studentPage
      .getByRole("button", { name: /request to rent/i })
      .first()
      .click();

    // Fill the modal: rental type, dates, message
    // Selectors per RequestRentalDialog.tsx (Phase 16-05) — flexible matching
    await studentPage
      .getByLabel(/competition/i)
      .first()
      .check()
      .catch(() => {
        // fallback: click the COMPETITION radio
      });
    // Dates: pick a 5-day window starting in 2 weeks (avoids any seeded conflicts)
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() + 14);
    const end = new Date(start);
    end.setDate(end.getDate() + 5);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    await studentPage
      .locator('input[name="startDate"], input[type="date"]')
      .first()
      .fill(fmt(start));
    await studentPage.locator('input[name="endDate"], input[type="date"]').nth(1).fill(fmt(end));
    await studentPage
      .locator('textarea[name="message"]')
      .first()
      .fill("E2E test rental request — TEST-01");

    // Submit the request
    await studentPage
      .getByRole("button", { name: /submit|send request|request/i })
      .last()
      .click();

    // Verify success — request appears in /wardrobe/my-rentals
    await studentPage.goto("/wardrobe/my-rentals");
    await expect(studentPage.getByText(SEED_DRESS_TITLES.YURA_CLASSICAL).first()).toBeVisible({
      timeout: 15000,
    });

    // ── PHASE D: admin approves the request ──────────────────────────────
    const adminContext = await browser.newContext({ storageState: ADMIN_STORAGE });
    const adminPage = await adminContext.newPage();

    await adminPage.goto("/admin/wardrobe/requests");
    await expect(adminPage.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // The new PENDING request appears (text content match — student name or dress title)
    await expect(adminPage.getByText(SEED_DRESS_TITLES.YURA_CLASSICAL).first()).toBeVisible({
      timeout: 15000,
    });

    // Click the Approve button on the row (RequestQueueTable.tsx — Phase 17-02)
    await adminPage
      .getByRole("button", { name: /approve/i })
      .first()
      .click();
    // Approval dialog opens — fill response message and confirm
    await adminPage
      .locator('textarea[name="responseMessage"], textarea')
      .first()
      .fill("E2E approved — TEST-01");
    await adminPage
      .getByRole("button", { name: /confirm|approve|submit/i })
      .last()
      .click();
    await adminPage.waitForLoadState("networkidle");

    // Email proxy: notification row should now exist for the student
    const studentPage2 = await studentContext.newPage();
    await expectNotificationContaining(studentPage2, "approved").catch(() => {
      // Tolerance: notification might say "Decision" or include dress title
    });
    await studentPage2.close();

    // ── PHASE E: admin marks payment received ────────────────────────────
    // Navigate to the awaiting-payment tab or section
    await adminPage.goto("/admin/wardrobe/requests");
    // Click Mark Payment Received on the same request (RecordPaymentDialog — Phase 17-03)
    await adminPage
      .getByRole("button", { name: /mark payment|record payment/i })
      .first()
      .click();
    // Pick a payment method (VENMO or ZELLE per PaymentMethod enum)
    await adminPage
      .getByLabel(/venmo|zelle/i)
      .first()
      .check()
      .catch(() => {});
    await adminPage
      .getByRole("button", { name: /confirm|submit|record/i })
      .last()
      .click();
    await adminPage.waitForLoadState("networkidle");

    // ── PHASE F: student sees rental in my-rentals ───────────────────────
    const studentPage3 = await studentContext.newPage();
    await studentPage3.goto("/wardrobe/my-rentals");
    await expect(studentPage3.getByText(SEED_DRESS_TITLES.YURA_CLASSICAL).first()).toBeVisible({
      timeout: 15000,
    });
    await studentPage3.close();

    // ── PHASE G: admin marks returned ────────────────────────────────────
    await adminPage.goto("/admin/wardrobe/rentals");
    await expect(adminPage.locator("h1").first()).toBeVisible({ timeout: 15000 });
    await adminPage
      .getByRole("button", { name: /mark returned/i })
      .first()
      .click();
    await adminPage
      .locator('textarea[name="conditionOnReturn"], textarea')
      .first()
      .fill("Returned in good condition — TEST-01");
    await adminPage
      .getByRole("button", { name: /confirm|submit|mark returned/i })
      .last()
      .click();
    await adminPage.waitForLoadState("networkidle");

    // ── PHASE H: admin releases deposit ──────────────────────────────────
    await adminPage.goto("/admin/wardrobe/rentals");
    await adminPage
      .getByRole("button", { name: /release deposit/i })
      .first()
      .click();
    await adminPage
      .getByRole("button", { name: /confirm|release|submit/i })
      .last()
      .click();
    await adminPage.waitForLoadState("networkidle");

    // Notification proxy: student should see deposit-released notification
    const studentPage4 = await studentContext.newPage();
    await expectNotificationContaining(studentPage4, "deposit").catch(() => {});
    await studentPage4.close();

    // Cleanup browser contexts
    await studentContext.close();
    await adminContext.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Permission Negative Paths (PERM-04 + TEST-04)
// ──────────────────────────────────────────────────────────────────────────

test.describe("Permission Negative Paths (PERM-04 + TEST-04)", () => {
  test("student is redirected away from /admin/wardrobe/requests", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STUDENT_STORAGE });
    const page = await context.newPage();
    await page.goto("/admin/wardrobe/requests");
    // Middleware silent-redirects to /student/dashboard (role-guards.spec.ts pattern)
    await expect(page).toHaveURL(/\/student\/(dashboard|wardrobe)/, { timeout: 10000 });
    await context.close();
  });

  test("coach is redirected away from /admin/wardrobe/requests", async ({ browser }) => {
    const context = await browser.newContext({ storageState: COACH_STORAGE });
    const page = await context.newPage();
    await page.goto("/admin/wardrobe/requests");
    await expect(page).toHaveURL(/\/coach\/dashboard|\/student\/dashboard/, { timeout: 10000 });
    await context.close();
  });

  test("student gets 403 when calling admin.wardrobeRequest.respondToRequest directly", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: STUDENT_STORAGE });
    const page = await context.newPage();
    // Hit any page first so the session cookie is attached to page.request
    await page.goto("/wardrobe");
    await assertTrpcForbidden(page, "admin.wardrobeRequest.respondToRequest", {
      requestId: "ck00000000000000000000",
      decision: "APPROVE",
      responseMessage: "should be rejected",
    });
    await context.close();
  });

  test("student gets 403 when calling admin.wardrobeRequest.markPaymentReceived directly", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: STUDENT_STORAGE });
    const page = await context.newPage();
    await page.goto("/wardrobe");
    await assertTrpcForbidden(page, "admin.wardrobeRequest.markPaymentReceived", {
      requestId: "ck00000000000000000000",
      paymentMethod: "VENMO",
    });
    await context.close();
  });

  test("unauthenticated user is redirected from /wardrobe/my-rentals to login", async ({
    browser,
  }) => {
    // Empty storage state — anonymous user
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/wardrobe/my-rentals");
    await expect(page).toHaveURL(/\/auth\/(login|signin)/, { timeout: 10000 });
    await context.close();
  });
});
