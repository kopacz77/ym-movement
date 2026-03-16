# Phase 9: Coach & Admin Flow Tests - Research

**Researched:** 2026-03-16
**Domain:** Playwright E2E testing of coach lifecycle and admin management flows
**Confidence:** HIGH

## Summary

Phase 9 creates new Playwright E2E test spec files that verify eight specific requirements across coach lifecycle flows (signup, approval, dashboard, profile, proposals) and admin management flows (coach overview, revenue splits, payout reports). Phase 8 delivered a complete test infrastructure (seed script, auth setup, helper functions, storageState files) that Phase 9 consumes directly.

The codebase has been thoroughly analyzed: every page, component, TRPC route, form field, button label, toast message, and table structure that tests will interact with has been identified and documented below. The tests fall into two natural spec files: one for coach-perspective flows (CTST-01 through CTST-05) and one for admin-perspective flows (ATST-01 through ATST-03).

**Key constraint:** Coach signup (CTST-01) cannot be tested via browser automation due to Cloudflare Turnstile CAPTCHA. Per prior decisions, coach accounts must be seeded via Prisma. CTST-01 tests must verify the signup page renders correctly and that a seeded pending coach exists, rather than completing the full signup form submission.

**Primary recommendation:** Create two test spec files (`tests/coach-flows.spec.ts` and `tests/admin-coach-management.spec.ts`) using the Phase 8 infrastructure. Seed additional test data (a pending/unapproved coach, a ProposedTimeSlot) in the seed script to support the approval and proposal test flows. Use `test.use({ storageState })` to switch between super-admin and coach roles within each spec file.

## Standard Stack

No new libraries are needed. This phase works entirely within the existing stack established by Phase 8.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | 1.57.0 | E2E test runner | Already installed and configured |
| @prisma/client | ^6.19.0 | Database seeding | Used by seed-test-data.ts |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tests/helpers/test-utils.ts | n/a | loginAsCoach, loginAsSuperAdmin, navigateToCoachPage, approveCoach, testData | Every test file |
| tests/helpers/seed-test-data.ts | n/a | Test data creation via Prisma | Extended for Phase 9 needs |
| tests/auth.setup.ts | n/a | StorageState files for 3 roles | Used via playwright.config.ts dependencies |

### No New Dependencies Required
All tooling is already installed and configured from Phase 8.

## Architecture Patterns

### Test File Structure
```
tests/
  helpers/
    test-utils.ts          # May need minor additions (helper for proposal creation)
    seed-test-data.ts      # EXTEND: add pending coach + ProposedTimeSlot seed data
  auth.setup.ts            # NO CHANGES needed
  coach-flows.spec.ts      # NEW: CTST-01 through CTST-05
  admin-coach-management.spec.ts  # NEW: ATST-01 through ATST-03
playwright/
  .auth/
    super-admin.json       # Already created by Phase 8
    coach.json             # Already created by Phase 8
    student.json           # Already created by Phase 8
```

### Pattern 1: Role-Switching Within a Single Spec File

**What:** Use `test.describe` blocks with `test.use({ storageState })` to run some tests as super-admin and others as coach within the same spec file.

**When to use:** When a test flow spans two roles (e.g., coach creates proposal, admin approves it).

**Example:**
```typescript
// tests/coach-flows.spec.ts
import { test, expect } from "@playwright/test";

// Default: tests run as coach (override the project-level super-admin default)
test.use({ storageState: "playwright/.auth/coach.json" });

test.describe("Coach Dashboard (CTST-03)", () => {
  test("displays upcoming lessons section", async ({ page }) => {
    await page.goto("/coach/dashboard");
    await expect(page.locator('text=Coach Dashboard')).toBeVisible();
    await expect(page.locator('text=Upcoming Lessons')).toBeVisible();
  });
});

// For tests needing admin role within the same file, use a separate describe
test.describe("Admin Approves Coach (CTST-02)", () => {
  // Override to super-admin for this describe block
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("admin can approve a pending coach", async ({ page }) => {
    await page.goto("/admin/coaches");
    // ... admin actions
  });
});
```

**Important caveat:** `test.use()` calls are scoped to the enclosing `test.describe` block. You cannot switch roles mid-test; instead, use separate describe blocks per role.

### Pattern 2: Seed Data for Test-Specific Scenarios

**What:** The seed script creates specific data states that tests expect (e.g., a pending coach for approval tests, a ProposedTimeSlot for proposal tests).

**When to use:** When tests need specific database state beyond what Phase 8 already seeds.

**Required new seed data for Phase 9:**
1. **Pending coach** (coach3@test.com) -- unapproved, for CTST-01 and CTST-02 approval/denial tests
2. **ProposedTimeSlot** -- PENDING status, linked to coach@test.com, for CTST-05 proposal tests

**Example seed additions:**
```typescript
// In seed-test-data.ts, add after existing coach2 block:

// 8. Create unapproved coach for approval flow tests
const coach3Hash = await bcrypt.hash("COACH3PASS2025!", 10);
const coach3User = await prisma.user.upsert({
  where: { email: "coach3@test.com" },
  update: { password: coach3Hash, role: "COACH", name: "Pending Coach" },
  create: {
    email: "coach3@test.com",
    password: coach3Hash,
    name: "Pending Coach",
    role: "COACH",
    emailVerified: new Date(),
  },
});

await prisma.coach.upsert({
  where: { userId: coach3User.id },
  update: { isApproved: false, isActive: false },
  create: {
    userId: coach3User.id,
    isApproved: false,
    isActive: false,
    bio: "Pending coach for approval tests",
    skills: ["Ice Dance"],
    revenueSplitPercent: 70,
  },
});

// 9. Create a ProposedTimeSlot for proposal approval tests
const rink = await prisma.rink.findFirst({ where: { name: "Test Ice Rink" } });
if (rink) {
  const proposalDate = new Date();
  proposalDate.setDate(proposalDate.getDate() + 14);
  proposalDate.setHours(10, 0, 0, 0);
  const proposalEnd = new Date(proposalDate);
  proposalEnd.setHours(11, 0, 0, 0);

  // Upsert is tricky for ProposedTimeSlot (no unique constraint on fields).
  // Use deleteMany + create to ensure clean state.
  await prisma.proposedTimeSlot.deleteMany({
    where: { coachId: coach.id, status: "PENDING" },
  });
  await prisma.proposedTimeSlot.create({
    data: {
      coachId: coach.id,
      rinkId: rink.id,
      startTime: proposalDate,
      endTime: proposalEnd,
      maxStudents: 1,
      status: "PENDING",
    },
  });
}
```

### Pattern 3: Download Verification for CSV Export

**What:** Use Playwright's `page.waitForEvent('download')` to capture CSV downloads triggered by the payout report export button.

**When to use:** ATST-03 (payout report CSV export).

**Example:**
```typescript
test("payout report exports CSV with per-coach breakdown", async ({ page }) => {
  await page.goto("/admin/reports");

  // Navigate to Payouts tab
  await page.click('button:has-text("Payouts"), [role="tab"]:has-text("Payouts")');
  await expect(page.locator('text=Payout Report')).toBeVisible();

  // Start download listener BEFORE clicking
  const downloadPromise = page.waitForEvent("download");

  // Click the export button within the payout report
  await page.click('button:has-text("Export Payouts CSV")');

  // Verify download
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/payout.*\.csv/);

  // Optionally save and verify content
  const path = `./test-downloads/${download.suggestedFilename()}`;
  await download.saveAs(path);
});
```

### Anti-Patterns to Avoid

- **Testing Turnstile CAPTCHA via E2E:** Coach signup page has Cloudflare Turnstile that cannot be automated. Do not attempt to bypass or mock it in browser tests. Instead, verify page renders correctly and use Prisma-seeded data for all coach accounts.
- **Testing Google Calendar OAuth:** Per prior decisions, OAuth flows are excluded from E2E tests.
- **Hardcoding wait times:** Use `waitForURL`, `waitForSelector`, `expect().toBeVisible()` instead of `waitForTimeout`. The existing tests sometimes use `waitForTimeout` but new tests should avoid it.
- **Re-logging in when storageState is available:** Tests should use `test.use({ storageState })` rather than calling `loginAsCoach()` in `beforeEach`, since auth.setup.ts already created authenticated sessions.
- **Assuming table column visibility on all viewports:** The CoachList component hides Revenue Split column below `lg` breakpoint (`hidden lg:table-cell`). Tests should use a desktop viewport or verify visibility conditionally.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coach authentication for tests | Manual login flow per test | `test.use({ storageState: "playwright/.auth/coach.json" })` | Pre-authenticated session from Phase 8 auth.setup.ts |
| Test data for pending coaches | API calls from test code | Extend `seed-test-data.ts` with Prisma upsert | Idempotent, fast, reliable, doesn't depend on app running |
| CSV content verification | Custom CSV parser | Download event + filename match + optional `fs.readFileSync` | Playwright's download API handles the heavy lifting |
| Role-specific test isolation | Separate playwright configs | `test.describe` blocks with `test.use({ storageState })` | Standard Playwright pattern, no extra config |
| Toast message verification | Custom notification interceptor | `page.locator('text=...')` with Sonner toast content | Toast messages are regular DOM elements |

**Key insight:** Phase 8 already built all the infrastructure. Phase 9 is purely about writing test assertions against existing UI components using established patterns.

## Common Pitfalls

### Pitfall 1: Dynamic Component Loading Hides Elements

**What goes wrong:** Admin coaches page uses `dynamic(() => import(...))` for CoachList, CoachPendingApprovals, CoachProposalQueue, and NewCoachDialog. Tests may try to assert on elements before the dynamic component loads.
**Why it happens:** Next.js dynamic imports render a `<LoadingSkeleton />` first, then the actual component after the chunk loads.
**How to avoid:** Always wait for a content-specific selector (like table header text or a data-specific element) rather than checking for the page title alone. Use `await expect(page.locator('text=Test Coach')).toBeVisible({ timeout: 10000 })` to wait for data to load.
**Warning signs:** Tests pass locally but fail in CI due to slower dynamic import resolution.

### Pitfall 2: Tabs Require Explicit Click to Show Content

**What goes wrong:** The admin coaches page has tabs ("All Coaches", "Pending Approvals", "Proposals"). The reports page has tabs ("Revenue", "Attendance", "Payouts"). Tests that expect to see pending approvals or proposals content without clicking the tab will fail.
**Why it happens:** Radix Tabs only renders the active TabsContent. Default tab is "all" for coaches and "revenue" for reports.
**How to avoid:** Explicitly click the tab trigger before asserting on tab content:
```typescript
await page.click('[role="tab"]:has-text("Pending Approvals")');
await expect(page.locator('text=Pending Coach')).toBeVisible();
```
**Warning signs:** Test sees empty content or "No coaches found" when data exists.

### Pitfall 3: Deny Coach Uses Toast Confirmation, Not Direct Action

**What goes wrong:** Clicking "Deny" on a pending coach triggers `showDeleteConfirmation()` which shows a Sonner toast with "Confirm" and "Cancel" action buttons. Tests that expect immediate denial after clicking "Deny" will fail.
**Why it happens:** The `CoachPendingApprovals` component wraps deny in `showDeleteConfirmation()` for safety.
**How to avoid:** After clicking the Deny button, look for and click the confirmation action in the toast:
```typescript
await page.click('button:has-text("Deny")');
// Wait for confirmation toast and click confirm
await page.click('[data-sonner-toast] button:has-text("Confirm"), button:has-text("Delete")');
```
**Warning signs:** Deny action appears to do nothing; test times out waiting for "Application denied" toast.

### Pitfall 4: Inline Revenue Split Editor Has Multiple States

**What goes wrong:** The RevenueSplitCell in CoachList starts in display mode (showing "70%"), enters edit mode when the pencil icon is clicked (showing an input + check/X buttons), and reverts when check or X is clicked. Tests that try to type directly into the cell will fail because the input isn't visible until edit mode is activated.
**Why it happens:** The component uses `useState` to toggle between display and edit modes.
**How to avoid:** Follow the full interaction flow:
```typescript
// 1. Find the revenue split cell
const splitCell = page.locator('tr:has-text("Test Coach")').locator('text=70%');
// 2. Click the pencil icon to enter edit mode
await splitCell.locator('..').locator('button:has(svg)').click();
// 3. Now the input is visible - clear and type new value
const splitInput = page.locator('input[type="number"][class*="w-16"]');
await splitInput.fill('75');
// 4. Click the green check button to save
await page.locator('button.text-green-600').click();
// 5. Wait for success toast
await expect(page.locator('text=Revenue split updated')).toBeVisible();
```
**Warning signs:** "Element not found" error when trying to interact with the number input.

### Pitfall 5: Coach Proposal Form Uses Shadcn Select (Not Native)

**What goes wrong:** The ProposeAvailabilityForm uses shadcn `<Select>` component for rink selection and a date picker `<Popover>` with `<Calendar>`. These are not native HTML `<select>` or `<input type="date">` elements, so Playwright's `page.selectOption()` and `page.fill()` will not work for them.
**Why it happens:** Shadcn Select renders a custom dropdown using Radix primitives, not a native select element.
**How to avoid:** Interact with shadcn Select by clicking the trigger then clicking an option:
```typescript
// Click the select trigger to open dropdown
await page.click('[role="combobox"]:near(:text("Rink"))');
// Or click by placeholder text
await page.click('button:has-text("Select a rink")');
// Select the option
await page.click('[role="option"]:has-text("Test Ice Rink")');
```
For the date picker, click the trigger button, then use the Calendar component:
```typescript
await page.click('button:has-text("Pick a date")');
// Click a future date in the calendar
const futureDate = page.locator('[role="gridcell"] button:not([disabled])').last();
await futureDate.click();
```
**Warning signs:** `page.selectOption()` throws "Element is not a <select>" error.

### Pitfall 6: Coach Signup Page Renders But Submit is Blocked

**What goes wrong:** Navigating to `/auth/coach-signup` renders the form, but the submit button has `disabled={isLoading || !turnstileToken}`. Since Turnstile cannot complete in tests, the button will always be disabled.
**Why it happens:** Cloudflare Turnstile script loads from an external CDN and requires real browser interaction with Cloudflare's challenge. In test environments without the secret key configured, the client-side widget still blocks form submission.
**How to avoid:** CTST-01 should test that the page renders with all form fields visible, the title is correct, and navigation links work. Do NOT attempt to submit the form. Coach creation is verified through the seed script.
**Warning signs:** Test hangs waiting for submit button to become enabled.

### Pitfall 7: Payout Report Tab Requires Revenue Data to Show Content

**What goes wrong:** The PayoutReport component shows "No payout data for this period" when there are no completed payments with coach associations in the selected date range.
**Why it happens:** The `getRevenueBreakdown` query filters by `PaymentStatus.COMPLETED` and requires coach-associated lessons.
**How to avoid:** The seed script should create at least one completed payment linked to a lesson with a coachId for the current month. Alternatively, tests should handle the "no data" empty state gracefully.
**Warning signs:** Test expects to see coach names in the payout table but sees "No payout data for this period" instead.

## Code Examples

### CTST-01: Coach Signup Page Rendering (No Submission)

```typescript
// Source: Codebase analysis of src/app/auth/coach-signup/page.tsx
test.describe("Coach Signup Page (CTST-01)", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // No auth

  test("coach signup page renders with all form fields", async ({ page }) => {
    await page.goto("/auth/coach-signup");

    // Verify page title
    await expect(page.locator('text=Apply to Coach at YM Movement')).toBeVisible();
    await expect(page.locator('text=Submit your application for admin review')).toBeVisible();

    // Verify all form fields are present
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#phone')).toBeVisible();
    await expect(page.locator('textarea#bio')).toBeVisible();
    await expect(page.locator('input#skills')).toBeVisible();
    await expect(page.locator('textarea#certifications')).toBeVisible();
    await expect(page.locator('input#yearsExperience')).toBeVisible();

    // Verify submit button exists (will be disabled due to Turnstile)
    await expect(page.locator('button[type="submit"]:has-text("Submit Application")')).toBeVisible();

    // Verify navigation links
    await expect(page.locator('a[href="/auth/login"]:has-text("Login")')).toBeVisible();
  });
});
```

### CTST-02: Admin Coach Approval and Denial

```typescript
// Source: Codebase analysis of CoachPendingApprovals.tsx
test.describe("Admin Coach Approval (CTST-02)", () => {
  // Runs as super-admin (default storageState from config)

  test("admin can approve a pending coach", async ({ page }) => {
    await page.goto("/admin/coaches");

    // Click "Pending Approvals" tab
    await page.click('[role="tab"]:has-text("Pending Approvals")');

    // Wait for pending coach to appear
    await expect(page.locator('text=Pending Coach')).toBeVisible({ timeout: 10000 });

    // Find the row with the pending coach and click Approve
    const coachRow = page.locator('tr:has-text("Pending Coach")');
    await coachRow.locator('button:has-text("Approve")').click();

    // Verify success toast
    await expect(page.locator('text=Coach approved')).toBeVisible({ timeout: 10000 });
  });
});
```

### CTST-03: Coach Dashboard Displays Key Sections

```typescript
// Source: Codebase analysis of coach/dashboard/page.tsx and sub-components
test.describe("Coach Dashboard (CTST-03)", () => {
  test.use({ storageState: "playwright/.auth/coach.json" });

  test("displays overview cards and lesson sections", async ({ page }) => {
    await page.goto("/coach/dashboard");

    // Verify page heading
    await expect(page.locator('h1:has-text("Coach Dashboard")')).toBeVisible();

    // Verify overview cards (CoachOverviewCards component)
    await expect(page.locator('text=Total Students')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Upcoming Lessons')).toBeVisible();
    await expect(page.locator('text=Completed This Month')).toBeVisible();
    await expect(page.locator('text=Monthly Earnings')).toBeVisible();

    // Verify lesson sections
    await expect(page.locator('text=Upcoming Lessons')).toBeVisible();
    await expect(page.locator('text=Past Lessons')).toBeVisible();
  });

  test("displays student list on students page", async ({ page }) => {
    await page.goto("/coach/students");

    await expect(page.locator('h1:has-text("My Students")')).toBeVisible();
    await expect(page.locator('text=Students')).toBeVisible({ timeout: 10000 });

    // Student table or empty state should be visible
    const table = page.locator('table');
    const emptyMessage = page.locator('text=No students have booked lessons');
    await expect(table.or(emptyMessage)).toBeVisible();
  });

  test("displays earnings summary", async ({ page }) => {
    await page.goto("/coach/earnings");

    await expect(page.locator('h1:has-text("Earnings")')).toBeVisible();

    // Verify earnings cards (EarningsOverview component)
    await expect(page.locator('text=Total Earnings')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=This Month')).toBeVisible();
    await expect(page.locator('text=Pending Payments')).toBeVisible();
    await expect(page.locator('text=Revenue Split')).toBeVisible();
  });
});
```

### CTST-04: Coach Profile Editing Persists Changes

```typescript
// Source: Codebase analysis of CoachProfileForm.tsx
test.describe("Coach Profile Editing (CTST-04)", () => {
  test.use({ storageState: "playwright/.auth/coach.json" });

  test("profile editing persists changes", async ({ page }) => {
    await page.goto("/coach/profile");

    await expect(page.locator('h1:has-text("My Profile")')).toBeVisible();

    // Wait for profile form to load (it fetches data via TRPC)
    await expect(page.locator('text=Profile Details')).toBeVisible({ timeout: 10000 });

    // Edit bio
    const bioTextarea = page.locator('textarea#bio');
    await bioTextarea.fill("Updated bio for E2E testing");

    // Edit skills
    const skillsInput = page.locator('input#skills');
    await skillsInput.fill("Figure Skating, Ice Dance, Freestyle");

    // Edit certifications
    const certsTextarea = page.locator('textarea#certifications');
    await certsTextarea.fill("PSA Master Rated");

    // Edit years of experience
    const yearsInput = page.locator('input#yearsExperience');
    await yearsInput.fill("10");

    // Submit the form
    await page.click('button:has-text("Save Profile")');

    // Verify success toast
    await expect(page.locator('text=Profile updated successfully')).toBeVisible({ timeout: 10000 });

    // Reload and verify persistence
    await page.reload();
    await expect(page.locator('text=Profile Details')).toBeVisible({ timeout: 10000 });

    // Verify values persisted
    await expect(bioTextarea).toHaveValue("Updated bio for E2E testing");
    await expect(skillsInput).toHaveValue("Figure Skating, Ice Dance, Freestyle");
    await expect(certsTextarea).toHaveValue("PSA Master Rated");
    await expect(yearsInput).toHaveValue("10");
  });
});
```

### CTST-05: Coach Proposal and Admin Approval Flow

```typescript
// Source: Codebase analysis of ProposeAvailabilityForm.tsx, ProposalsList.tsx, CoachProposalQueue.tsx
test.describe("Coach Proposal Flow (CTST-05)", () => {
  test.describe("Coach submits proposal", () => {
    test.use({ storageState: "playwright/.auth/coach.json" });

    test("coach can submit a time slot proposal", async ({ page }) => {
      await page.goto("/coach/proposals");

      await expect(page.locator('h1:has-text("Time Slot Proposals")')).toBeVisible();
      await expect(page.locator('text=Propose Time Slot')).toBeVisible({ timeout: 10000 });

      // Select rink (shadcn Select, not native)
      await page.click('button:has-text("Select a rink")');
      await page.click('[role="option"]:has-text("Test Ice Rink")');

      // Select date via Popover Calendar
      await page.click('button:has-text("Pick a date")');
      // Click a future date that is not disabled
      const futureDate = page.locator('[role="gridcell"] button:not([disabled])').last();
      await futureDate.click();

      // Fill time inputs (native HTML time inputs)
      await page.fill('input#startTime', '10:00');
      await page.fill('input#endTime', '11:00');

      // Submit
      await page.click('button:has-text("Propose Time Slot")');

      // Verify success
      await expect(page.locator('text=Proposal submitted')).toBeVisible({ timeout: 10000 });

      // Verify it appears in the proposals list with PENDING status
      await expect(page.locator('text=Pending')).toBeVisible();
    });
  });

  test.describe("Admin approves proposal", () => {
    test.use({ storageState: "playwright/.auth/super-admin.json" });

    test("admin can approve a pending proposal", async ({ page }) => {
      await page.goto("/admin/coaches");

      // Click "Proposals" tab
      await page.click('[role="tab"]:has-text("Proposals")');

      // Wait for proposal to appear
      await expect(page.locator('text=Test Coach')).toBeVisible({ timeout: 10000 });

      // Find the proposal row and approve
      const proposalRow = page.locator('tr:has-text("Test Coach")').first();
      await proposalRow.locator('button:has-text("Approve")').click();

      // Verify success toast
      await expect(page.locator('text=Proposal approved')).toBeVisible({ timeout: 10000 });
    });
  });
});
```

### ATST-02: Inline Revenue Split Editor

```typescript
// Source: Codebase analysis of RevenueSplitCell in CoachList.tsx
test.describe("Revenue Split Editor (ATST-02)", () => {
  test("inline revenue split editor updates percentage", async ({ page }) => {
    await page.goto("/admin/coaches");

    // Wait for coaches table to load
    await expect(page.locator('text=All Coaches')).toBeVisible();
    await expect(page.locator('text=Test Coach')).toBeVisible({ timeout: 10000 });

    // Find the coach row with revenue split
    const coachRow = page.locator('tr:has-text("Test Coach")').first();

    // Click the pencil edit button next to the current split value
    // RevenueSplitCell renders: <span>70%</span> <Button variant="ghost"><Pencil /></Button>
    const editButton = coachRow.locator('button:has(svg.lucide-pencil), button:has(svg[class*="pencil"])');
    await editButton.click();

    // Input should now be visible (w-16 h-7 text-sm)
    const splitInput = coachRow.locator('input[type="number"]');
    await expect(splitInput).toBeVisible();
    await splitInput.fill("75");

    // Click the green check button to save
    const saveButton = coachRow.locator('button.text-green-600, button:has(svg.lucide-check)');
    await saveButton.click();

    // Verify success toast
    await expect(page.locator('text=Revenue split updated')).toBeVisible({ timeout: 10000 });

    // Verify the new value is displayed
    await expect(coachRow.locator('text=75%')).toBeVisible();
  });
});
```

### ATST-03: Payout Report with CSV Export

```typescript
// Source: Codebase analysis of PayoutReport.tsx and admin/reports/page.tsx
test.describe("Payout Report (ATST-03)", () => {
  test("payout report shows per-coach breakdown", async ({ page }) => {
    await page.goto("/admin/reports");

    // Click Payouts tab
    await page.click('[role="tab"]:has-text("Payouts")');

    // Wait for payout report content
    await expect(page.locator('text=Payout Report')).toBeVisible();

    // Check summary cards (PayoutReport renders 3 summary cards)
    await expect(page.locator('text=Total Revenue')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Coach Payouts')).toBeVisible();
    await expect(page.locator('text=Platform Revenue')).toBeVisible();

    // Check per-coach table headers
    await expect(page.locator('th:has-text("Coach")')).toBeVisible();
    await expect(page.locator('th:has-text("Split %")')).toBeVisible();
    await expect(page.locator('th:has-text("Gross Revenue")')).toBeVisible();
    await expect(page.locator('th:has-text("Coach Payout")')).toBeVisible();
    await expect(page.locator('th:has-text("Platform Share")')).toBeVisible();

    // Check for Total footer row
    await expect(page.locator('td:has-text("Total")')).toBeVisible();
  });

  test("payout report exports CSV", async ({ page }) => {
    await page.goto("/admin/reports");
    await page.click('[role="tab"]:has-text("Payouts")');
    await expect(page.locator('text=Payout Report')).toBeVisible();

    // Start download listener before clicking
    const downloadPromise = page.waitForEvent("download");

    // Click the "Export Payouts CSV" button in the PayoutReport component
    await page.click('button:has-text("Export Payouts CSV")');

    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/payout.*\.csv/);
  });
});
```

## UI Selector Reference

Comprehensive reference of selectors for all pages Phase 9 tests interact with. Derived from direct codebase analysis.

### Coach Signup Page (`/auth/coach-signup`)
| Element | Selector |
|---------|----------|
| Page title | `text=Apply to Coach at YM Movement` |
| Full name input | `input#name` |
| Email input | `input#email` |
| Phone input | `input#phone` |
| Bio textarea | `textarea#bio` |
| Skills input | `input#skills` |
| Certifications textarea | `textarea#certifications` |
| Years of experience | `input#yearsExperience` |
| Submit button (disabled) | `button[type="submit"]:has-text("Submit Application")` |
| Login link | `a[href="/auth/login"]:has-text("Login")` |
| Form element | `form#coach-signup-form` |

### Coach Dashboard (`/coach/dashboard`)
| Element | Selector |
|---------|----------|
| Page heading | `h1:has-text("Coach Dashboard")` |
| Total Students card | `text=Total Students` |
| Upcoming Lessons card | `text=Upcoming Lessons` |
| Completed This Month card | `text=Completed This Month` |
| Monthly Earnings card | `text=Monthly Earnings` |
| Upcoming Lessons section title | Card with `text=Upcoming Lessons` |
| Past Lessons section title | Card with `text=Past Lessons` |
| No upcoming lessons | `text=No upcoming lessons` |
| No past lessons | `text=No past lessons` |

### Coach Profile (`/coach/profile`)
| Element | Selector |
|---------|----------|
| Page heading | `h1:has-text("My Profile")` |
| Account info card | `text=Account Information` |
| Profile details card | `text=Profile Details` |
| Bio textarea | `textarea#bio` |
| Photo URL input | `input#photoUrl` |
| Skills input | `input#skills` |
| Certifications textarea | `textarea#certifications` |
| Years experience input | `input#yearsExperience` |
| Save button | `button:has-text("Save Profile")` |
| Success toast | `text=Profile updated successfully` |
| Lesson rates card | `text=Your Lesson Rates` |
| Revenue split badge | `text=Revenue Split:` |

### Coach Proposals (`/coach/proposals`)
| Element | Selector |
|---------|----------|
| Page heading | `h1:has-text("Time Slot Proposals")` |
| Form title | `text=Propose Time Slot` |
| Rink select trigger | `button:has-text("Select a rink")` |
| Rink option | `[role="option"]:has-text("Test Ice Rink")` |
| Date picker trigger | `button:has-text("Pick a date")` |
| Start time input | `input#startTime` |
| End time input | `input#endTime` |
| Max students input | `input#maxStudents` |
| Submit button | `button:has-text("Propose Time Slot")` |
| My Proposals title | `text=My Proposals` |
| Pending status badge | Badge with `text=Pending` |
| Cancel button | `button:has(svg.lucide-trash-2)` |

### Coach Students (`/coach/students`)
| Element | Selector |
|---------|----------|
| Page heading | `h1:has-text("My Students")` |
| Students table | `table` |
| Empty state | `text=No students have booked lessons with you yet` |
| Name column header | `th:has-text("Name")` |
| Level column header | `th:has-text("Level")` |

### Coach Earnings (`/coach/earnings`)
| Element | Selector |
|---------|----------|
| Page heading | `h1:has-text("Earnings")` |
| Total Earnings card | `text=Total Earnings` |
| This Month card | `text=This Month` |
| Pending Payments card | `text=Pending Payments` |
| Revenue Split card | `text=Revenue Split` |

### Admin Coaches Page (`/admin/coaches`)
| Element | Selector |
|---------|----------|
| Page heading | `h1:has-text("Coach Management")` |
| Add Coach button | `button:has-text("Add Coach")` |
| All Coaches tab | `[role="tab"]:has-text("All Coaches")` |
| Pending Approvals tab | `[role="tab"]:has-text("Pending Approvals")` |
| Proposals tab | `[role="tab"]:has-text("Proposals")` |
| Coaches table | `table` |
| Coach name cell | `td:has-text("[coach name]")` |
| Status badge (Active) | Badge `text=Active` |
| Status badge (Pending) | Badge `text=Pending` |
| Revenue split pencil | `button:has(svg.lucide-pencil)` |
| Revenue split input | `input[type="number"]` (in edit mode) |
| Approve button | `button:has-text("Approve")` |
| Deny button | `button:has-text("Deny")` |
| Actions dropdown | `button:has(svg.lucide-more-horizontal)` |

### Admin Coaches - Proposal Queue (within Proposals tab)
| Element | Selector |
|---------|----------|
| Pending count badge | Badge `text=pending` |
| Coach name in row | `td:has-text("[coach name]")` |
| Rink name in row | `td:has-text("Test Ice Rink")` |
| Approve proposal button | `button:has-text("Approve")` |
| Deny proposal button | `button:has-text("Deny")` |
| Deny dialog title | `text=Deny Proposal` |
| Deny notes textarea | `textarea#denyNotes` |
| Deny Proposal confirm | `button:has-text("Deny Proposal")` |

### Admin Reports - Payouts Tab (`/admin/reports`, Payouts tab)
| Element | Selector |
|---------|----------|
| Reports heading | `h1:has-text("Reports")` |
| Payouts tab | `[role="tab"]:has-text("Payouts")` |
| Payout Report title | `text=Payout Report` |
| Total Revenue card | `text=Total Revenue` |
| Coach Payouts card | `text=Coach Payouts` |
| Platform Revenue card | `text=Platform Revenue` |
| Export Payouts CSV button | `button:has-text("Export Payouts CSV")` |
| Coach column header | `th:has-text("Coach")` |
| Split % column header | `th:has-text("Split %")` |
| Gross Revenue header | `th:has-text("Gross Revenue")` |
| Coach Payout header | `th:has-text("Coach Payout")` |
| Platform Share header | `th:has-text("Platform Share")` |
| Total footer row | `td:has-text("Total")` |
| No data state | `text=No payout data for this period` |

### Toast Messages (Sonner)
| Action | Toast Text |
|--------|-----------|
| Profile saved | `Profile updated successfully` |
| Coach approved (pending) | `Coach approved. Registration email sent.` |
| Coach denied | `Application denied.` |
| Proposal submitted | `Proposal submitted for admin review` |
| Proposal approved (admin) | `Proposal approved. Time slot created.` |
| Proposal denied (admin) | `Proposal denied.` |
| Revenue split updated | `Revenue split updated` |
| Payout CSV exported | `Payout report exported` |
| Proposal cancelled | `Proposal cancelled` |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline loginAsAdmin per spec file | Shared `test.use({ storageState })` from auth.setup.ts | Phase 8 of this project | Tests start pre-authenticated; no login overhead |
| No coach test data | Prisma seed with SUPER_ADMIN, 2 COACHes, STUDENT, CoachStudent | Phase 8 of this project | Coach tests have data ready |
| Single admin role tests | Multi-role tests with storageState switching | Phase 8 of this project | Each describe block can use a different role |

**Deprecated/outdated in this codebase:**
- `scripts/create-test-accounts.js`: Replaced by `tests/helpers/seed-test-data.ts` in Phase 8.
- Inline login functions: Eliminated from all 13 spec files in Phase 8.

## Seed Data Requirements Analysis

### What Phase 8 Already Seeds
| Entity | Details | Used By |
|--------|---------|---------|
| SUPER_ADMIN user | admin@test.com, with Coach record, revenueSplitPercent=100 | CTST-02, ATST-01, ATST-02, ATST-03 |
| COACH user | coach@test.com, approved, active, revenueSplitPercent=70 | CTST-03, CTST-04, CTST-05 |
| COACH 2 user | coach2@test.com, approved, active, revenueSplitPercent=65 | ATST-01 (multi-coach overview) |
| STUDENT user | test.student@example.com, approved | CTST-03 (student list) |
| CoachStudent | coach -> student (primary), coach2 -> student | CTST-03 (student list) |
| Rink | "Test Ice Rink", America/Los_Angeles | CTST-05 (proposal rink selection) |

### New Seed Data Needed for Phase 9
| Entity | Details | Needed By |
|--------|---------|-----------|
| Pending COACH user | coach3@test.com, isApproved=false, isActive=false | CTST-01 (verify pending status), CTST-02 (approve/deny) |
| ProposedTimeSlot | PENDING status, linked to coach@test.com, rinkId from seed rink | CTST-05 (admin approval test) |
| Lesson + Payment (optional) | Completed lesson with payment for coach, current month | ATST-03 (payout data to show in report) |

### testData Additions for test-utils.ts
```typescript
// Add to testData object
coach3: {
  email: "coach3@test.com",
  password: "COACH3PASS2025!",
  name: "Pending Coach",
},
```

## Open Questions

1. **Should ATST-03 require actual payout data or accept empty state?**
   - What we know: The PayoutReport shows "No payout data for this period" when there are no completed payments. Creating a completed payment requires a lesson with a coachId and a payment record.
   - What's unclear: Whether the seed script should create lesson+payment data or the test should assert on the empty state.
   - Recommendation: Seed at least one lesson with a completed payment for the current month so the payout table has real data to verify. This makes ATST-03 more meaningful. If seeding payments is too complex, the test can verify the table structure (headers, export button) and handle both data/empty states gracefully.

2. **Should CTST-02 test both approval AND denial, or just approval?**
   - What we know: The requirement says "admin coach approval and denial flow." The seed script creates one pending coach. If we approve AND deny in the same test run, we need two pending coaches -- or test denial on a different entity.
   - What's unclear: Whether a single pending coach suffices if we order tests carefully (deny first, then create another for approval).
   - Recommendation: Seed two pending coaches (coach3 and coach4), or make the deny test non-destructive by checking the UI flow without completing the action. The simplest approach: seed two pending coaches so approval and denial can be tested independently.

3. **Revenue split column visibility on smaller viewports?**
   - What we know: The RevenueSplitCell is in a column with class `hidden lg:table-cell`, meaning it's invisible below 1024px viewport width.
   - What's unclear: Whether the default Playwright viewport is large enough. Desktop Chrome default is 1280x720 which is above 1024px, so it should be visible.
   - Recommendation: ATST-02 should be fine with default Desktop Chrome viewport (1280px). If using mobile viewports, skip the revenue split test. No action needed.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All coach pages, components, TRPC routes, admin coach management components, reports page, payout report, export utilities, Prisma schema, test infrastructure files
- Phase 8 research and verification reports: `.planning/phases/08-test-infrastructure-legacy-updates/08-RESEARCH.md`, `08-VERIFICATION.md`
- [Playwright Authentication Docs](https://playwright.dev/docs/auth) -- storageState, multi-role auth, setup projects
- [Playwright Configuration (use) Docs](https://playwright.dev/docs/test-use-options) -- test.use() for per-file overrides

### Secondary (MEDIUM confidence)
- [Playwright Download Testing](https://www.tvaidyan.com/2025/03/20/testing-file-download-with-playwright/) -- Download event patterns
- [BrowserStack storageState Guide](https://www.browserstack.com/guide/playwright-storage-state) -- Multi-role storageState patterns

### Tertiary (LOW confidence)
- None needed -- all findings derived from direct codebase analysis and official Playwright docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries; everything from Phase 8
- Architecture: HIGH -- Patterns derived from actual codebase components and Phase 8 infrastructure
- UI Selectors: HIGH -- Derived from reading actual component source code (form IDs, button text, card titles, table headers)
- Pitfalls: HIGH -- Identified through analysis of shadcn components, dynamic imports, Turnstile CAPTCHA, and toast confirmation patterns
- Seed data requirements: HIGH -- Mapped against actual TRPC queries and component data requirements

**Research date:** 2026-03-16
**Valid until:** Stable -- Test patterns and component code are not fast-moving targets
