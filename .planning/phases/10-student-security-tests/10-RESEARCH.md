# Phase 10: Student & Security Tests - Research

**Researched:** 2026-03-16
**Domain:** Playwright E2E testing for student booking flows, coach name display, data isolation, and role-based access
**Confidence:** HIGH

## Summary

This phase requires writing Playwright E2E tests for six specific requirements: student browse-by-coach flow (STST-01), two-step booking flow (STST-02), coach name display across views (STST-03), coach data isolation (SECT-01), role guard enforcement (SECT-02), and dual-role navigation (SECT-03).

The codebase has a fully functional test infrastructure from Phase 8: three saved storageState files (super-admin, coach, student), a seed script with SUPER_ADMIN + 2 approved coaches + student + rink + lesson + payment, and helper functions (`loginAsSuperAdmin`, `loginAsCoach`, `loginAsStudent`, `navigateToStudentPage`, `navigateToCoachPage`, etc.). The student booking flow is a two-step UI pattern at `/student/book`: step 1 shows a `CoachBrowse` grid of approved coaches, step 2 shows `BookingCalendar` for the selected coach filtered by `coachId`. Coach name display uses `lesson.Coach?.User?.name || "Instructor"` across LessonCard, UpcomingLessons, lesson detail page, and student payments table.

**Primary recommendation:** Write 3-4 new spec files (student-booking-flow.spec.ts, coach-name-display.spec.ts, data-isolation.spec.ts, role-guards.spec.ts) using `test.use({ storageState })` overrides to test as different roles. Extend seed data to create a second coach's time slot for data isolation testing. No new helper functions needed beyond what Phase 8 provides.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | (project-configured) | E2E test framework | Already configured in playwright.config.ts with setup project, multi-browser, storageState |
| Playwright Test Runner | built-in | Test execution | fullyParallel: true, HTML reporter, webServer auto-start on port 3100 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tests/helpers/test-utils.ts | project-local | Login helpers, test data constants, navigation helpers | Every test file imports testData and role-specific login functions |
| tests/helpers/seed-test-data.ts | project-local | Database seeding | Run automatically by auth.setup.ts before all tests |

### No Additional Libraries Needed
The existing Playwright setup is sufficient. No new npm packages required for this phase.

## Architecture Patterns

### Test File Organization
```
tests/
  student-booking-flow.spec.ts    # STST-01, STST-02
  coach-name-display.spec.ts      # STST-03
  data-isolation.spec.ts          # SECT-01
  role-guards.spec.ts             # SECT-02, SECT-03
```

### Pattern 1: StorageState Override for Role-Specific Tests
**What:** Use `test.use({ storageState })` at describe-level to run tests as different roles
**When to use:** Every test that needs a specific authenticated role
**Example (from existing codebase):**
```typescript
// Source: tests/coach-flows.spec.ts (verified in codebase)
test.describe("Coach Dashboard (CTST-03)", () => {
  test.use({ storageState: "playwright/.auth/coach.json" });

  test("displays overview cards", async ({ page }) => {
    await page.goto("/coach/dashboard");
    // ...assertions
  });
});
```

**Available storageState files (from auth.setup.ts):**
- `playwright/.auth/super-admin.json` - SUPER_ADMIN role (default in playwright.config.ts)
- `playwright/.auth/coach.json` - COACH role (coach@test.com / "Test Coach")
- `playwright/.auth/student.json` - STUDENT role (test.student@example.com / "Test Student")

**IMPORTANT:** The default storageState in playwright.config.ts is `super-admin.json`. Tests for student or coach must explicitly override with `test.use()`.

### Pattern 2: Unauthenticated Test (No StorageState)
**What:** Override storageState with empty cookies to test as unauthenticated user
**When to use:** Testing route protection for unauthenticated users
**Example (from existing codebase):**
```typescript
// Source: tests/coach-flows.spec.ts line 6
test.describe("Coach Signup Page (CTST-01)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("coach signup page renders", async ({ page }) => {
    await page.goto("/auth/coach-signup");
    // ...
  });
});
```

### Pattern 3: Testing Coach-as-Second-Role via Direct Navigation
**What:** For SECT-03 (dual-role navigation), the admin sidebar shows "Coach View" link when `currentUser.coachId` exists
**When to use:** Testing admin-to-coach and coach-to-admin role switching
**Key finding:** The AppSidebar.tsx (line 122-143) renders:
- Admin sidebar: "Coach View" link to `/coach/dashboard` (when `currentUser.coachId` is set)
- Coach sidebar: "Admin View" link to `/admin/dashboard` (when `currentUser.isAdmin` is true)

The SUPER_ADMIN test user (admin@test.com) has a Coach record (created in seed-test-data.ts line 25-36), so the dual-role link will appear for it.

**IMPORTANT:** The middleware (middleware.ts line 88-118) allows SUPER_ADMIN to access `/coach/*` routes (line 99-100: `role !== "SUPER_ADMIN" && role !== "ADMIN"`). However, students CANNOT access `/admin/*` or `/coach/*` routes.

### Anti-Patterns to Avoid
- **Do NOT use `loginAsCoach(page)` in tests that use `storageState`** -- the storageState already provides authentication. Only call login helpers when storageState is empty.
- **Do NOT hard-code time slot IDs or lesson IDs** -- the seed data creates them dynamically. Use UI selectors to find elements.
- **Do NOT assume a specific order of coaches in the grid** -- the `CoachBrowse` component orders by `createdAt: "asc"`, but tests should locate by name text.
- **Do NOT use `page.waitForLoadState("networkidle")`** -- it's unreliable with TRPC's continuous polling. Use `expect(locator).toBeVisible({ timeout })` instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication setup | Custom login flows in each test | storageState files from auth.setup.ts | Already works, saves login time per test |
| Test data creation | In-test database manipulation | seed-test-data.ts run by setup project | Idempotent upserts, runs once before all tests |
| Navigation helpers | Custom page.click chains | `navigateToStudentPage(page, "book")` from test-utils | Already handles selector fallbacks |
| Waiting for data | `page.waitForTimeout()` or `waitForLoadState("networkidle")` | `expect(locator).toBeVisible({ timeout: 10000 })` | Playwright auto-waits, networkidle is fragile with TRPC |

## Common Pitfalls

### Pitfall 1: Student Book Page Requires Approval
**What goes wrong:** Student tries to navigate to `/student/book` but sees "Account Approval Required" instead of coach grid
**Why it happens:** The book page wraps content in `<ApprovalGuard>` which checks `isApproved`. The seed data DOES set `isApproved: true` for the test student.
**How to avoid:** Ensure `student.json` storageState is generated AFTER seed data runs and the student is approved. The auth.setup.ts already handles this correctly (seed runs first, then auth).
**Warning signs:** Test sees "Account Approval Required" text instead of "Choose Your Coach"

### Pitfall 2: Coach Browse Shows Admin-Coach Too
**What goes wrong:** The coach grid shows the admin user's coach profile alongside Test Coach and Test Coach 2
**Why it happens:** `getBrowsableCoaches` returns ALL coaches where `isApproved: true AND isActive: true`. The seed creates a Coach record for the admin user (line 25-36 of seed-test-data.ts).
**How to avoid:** In assertions, look for specific coach names ("Test Coach", "Test Coach 2") rather than asserting exact count. The admin coach ("Test Admin") may also appear.
**Warning signs:** Coach count assertion fails with `expected 2, received 3`

### Pitfall 3: Time Slot Must Be in the Future
**What goes wrong:** Booking test fails because the available time slot is in the past
**Why it happens:** The seed creates a time slot 7 days from now (`lessonStart.setDate(lessonStart.getDate() + 7)`), but it already has a COMPLETED lesson assigned. The availability query filters out past slots AND already-booked slots.
**How to avoid:** The seed data creates ONE time slot for coach 1, and it's already occupied by a lesson. To test booking, either:
  1. Extend seed data to create additional UNBOOKED time slots for coach 1 or coach 2
  2. Or create a time slot via the admin UI in a beforeAll step
**Warning signs:** "No time slots available" or empty calendar in booking view

### Pitfall 4: Data Isolation Requires Two Coaches with Separate Data
**What goes wrong:** SECT-01 tests need to verify coach A cannot see coach B's data, but seed only creates lessons/payments for coach 1
**Why it happens:** The seed creates lesson + payment only for the primary coach. Coach 2 has no lessons, students, or earnings to "not see."
**How to avoid:** Extend seed data to create lesson + payment for coach 2 as well, so both coaches have data. Then verify each coach sees ONLY their own data.
**Warning signs:** Test passes vacuously because coach 2 has no data to see anyway

### Pitfall 5: Middleware Redirects vs TRPC Guards
**What goes wrong:** Role guard test expects an error page but gets silently redirected
**Why it happens:** The middleware.ts redirects unauthorized role access (e.g., student trying `/admin/dashboard` gets redirected to `/student/dashboard`). It does NOT show an error. TRPC middleware separately guards API endpoints.
**How to avoid:** For SECT-02, test that:
  - URL redirects happen correctly (student -> `/student/dashboard` when accessing `/admin/dashboard`)
  - The user ends up on their proper dashboard
  - Do NOT expect error messages -- the middleware silently redirects
**Warning signs:** Test waits for "Access Denied" text that never appears

### Pitfall 6: Coach-to-Admin Navigation Requires SUPER_ADMIN + Coach Record
**What goes wrong:** The "Coach View" / "Admin View" links don't appear in the sidebar
**Why it happens:** The sidebar shows the dual-role link only when:
  - Admin sidebar: `currentUser.coachId` is truthy (requires Coach record in DB AND fetch from `/api/auth/me`)
  - Coach sidebar: `currentUser.isAdmin` is truthy (requires ADMIN or SUPER_ADMIN role)
**How to avoid:** Use the `super-admin.json` storageState -- the SUPER_ADMIN user has a Coach record (seed line 25). The sidebar will show "Coach View" on admin pages.
**Warning signs:** `a:has-text("Coach View")` locator times out

## Code Examples

### STST-01: Student Browse-by-Coach Flow
```typescript
// Test coach browse grid at /student/book
test.describe("Student Browse-by-Coach (STST-01)", () => {
  test.use({ storageState: "playwright/.auth/student.json" });

  test("student sees coach grid and can select a coach", async ({ page }) => {
    await page.goto("/student/book");

    // Page title should show "Choose Your Coach"
    await expect(page.locator('h1:has-text("Choose Your Coach")')).toBeVisible({ timeout: 10000 });

    // Coach cards should be visible (grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
    // Look for known seeded coaches
    await expect(page.locator("text=Test Coach").first()).toBeVisible({ timeout: 10000 });

    // Each coach card shows: name, bio, skills badges, price, available slots
    const coachCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: "Test Coach" }).first();
    await expect(coachCard).toBeVisible();

    // Click on a coach card to select
    await coachCard.click();

    // After selection, title changes to "Book a Lesson with Test Coach"
    await expect(page.locator('h1:has-text("Book a Lesson with")')).toBeVisible({ timeout: 10000 });

    // "Change Coach" button appears
    await expect(page.locator('button:has-text("Change Coach")')).toBeVisible();
  });
});
```

### STST-02: Two-Step Booking Flow
```typescript
// NOTE: This requires an unbooked time slot to exist for the selected coach.
// The seed data must be extended to create one.
test("student can book a lesson through two-step flow", async ({ page }) => {
  await page.goto("/student/book");

  // Step 1: Select coach
  const coachCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: "Test Coach" }).first();
  await coachCard.click();

  // Step 2: Calendar loads with "Book a Lesson" card title
  await expect(page.locator('text=Book a Lesson')).toBeVisible({ timeout: 10000 });

  // Wait for calendar to populate (rink auto-selects first rink)
  // Available slots show as green events
  const availableSlot = page.locator('.rbc-event').filter({ hasText: 'Available' }).first();
  // Or for mobile: page.locator('button').filter({ hasText: 'Available' }).first()

  if (await availableSlot.isVisible({ timeout: 5000 }).catch(() => false)) {
    await availableSlot.click();

    // Booking dialog opens
    await expect(page.locator('text=Book a Lesson')).toBeVisible();
    // Shows coach name in details
    await expect(page.locator('text=Coach:')).toBeVisible();

    // Click "Book Lesson" button
    await page.locator('button:has-text("Book Lesson")').click();

    // Success: redirects to lesson detail page or shows success toast
    await expect(
      page.locator('text=Lesson booked successfully').or(page.locator('text=Lesson Details'))
    ).toBeVisible({ timeout: 15000 });
  }
});
```

### SECT-01: Data Isolation Between Coaches
```typescript
test.describe("Coach Data Isolation (SECT-01)", () => {
  test.describe("Coach 1 sees only their data", () => {
    test.use({ storageState: "playwright/.auth/coach.json" });

    test("coach 1 dashboard shows only their lessons", async ({ page }) => {
      await page.goto("/coach/dashboard");
      await expect(page.locator('h1:has-text("Coach Dashboard")')).toBeVisible();
      await expect(page.locator("text=Total Students")).toBeVisible({ timeout: 10000 });
      // Verify data loads -- specific assertions depend on seed data
    });

    test("coach 1 students page shows only assigned students", async ({ page }) => {
      await page.goto("/coach/students");
      await expect(page.locator('h1:has-text("My Students")')).toBeVisible();
      // Test Student should be visible (CoachStudent relationship in seed)
      const content = page.locator("table").or(page.locator("text=No students"));
      await expect(content).toBeVisible({ timeout: 10000 });
    });

    test("coach 1 earnings show only their payments", async ({ page }) => {
      await page.goto("/coach/earnings");
      await expect(page.locator('h1:has-text("Earnings")')).toBeVisible();
      await expect(page.locator("text=Total Earnings")).toBeVisible({ timeout: 10000 });
    });
  });

  // NOTE: Need a SECOND coach auth file OR use loginAsCoach with coach2 credentials
  // The current auth.setup.ts only saves storageState for ONE coach (coach@test.com).
  // For coach2, either:
  //   a) Add a second coach auth setup (playwright/.auth/coach2.json)
  //   b) Use loginAsCoach(page, testData.coach2.email, testData.coach2.password) in tests
});
```

### SECT-02: Role Guard Enforcement
```typescript
test.describe("Role Guards (SECT-02)", () => {
  test.describe("student cannot access admin routes", () => {
    test.use({ storageState: "playwright/.auth/student.json" });

    test("student redirected from /admin/dashboard", async ({ page }) => {
      await page.goto("/admin/dashboard");
      // Middleware redirects student to /student/dashboard
      await expect(page).toHaveURL("/student/dashboard", { timeout: 10000 });
    });

    test("student redirected from /coach/dashboard", async ({ page }) => {
      await page.goto("/coach/dashboard");
      // Middleware redirects student to /student/dashboard
      await expect(page).toHaveURL("/student/dashboard", { timeout: 10000 });
    });
  });

  test.describe("coach cannot access admin routes", () => {
    test.use({ storageState: "playwright/.auth/coach.json" });

    test("coach redirected from /admin/dashboard", async ({ page }) => {
      await page.goto("/admin/dashboard");
      // Middleware redirects coach to /coach/dashboard
      await expect(page).toHaveURL("/coach/dashboard", { timeout: 10000 });
    });
  });

  test.describe("unauthenticated users redirected to login", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("unauthenticated user redirected from /admin/dashboard", async ({ page }) => {
      await page.goto("/admin/dashboard");
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
    });
  });
});
```

### SECT-03: Dual-Role Navigation
```typescript
test.describe("Dual-Role Navigation (SECT-03)", () => {
  test.use({ storageState: "playwright/.auth/super-admin.json" });

  test("admin can switch to coach view and back", async ({ page }) => {
    // Start on admin dashboard
    await page.goto("/admin/dashboard");
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Sidebar should show "Coach View" link
    const coachViewLink = page.locator('a:has-text("Coach View")');
    await expect(coachViewLink).toBeVisible({ timeout: 10000 });

    // Click to switch to coach view
    await coachViewLink.click();
    await expect(page).toHaveURL("/coach/dashboard", { timeout: 10000 });
    await expect(page.locator('h1:has-text("Coach Dashboard")')).toBeVisible();

    // Coach sidebar should show "Admin View" link
    const adminViewLink = page.locator('a:has-text("Admin View")');
    await expect(adminViewLink).toBeVisible({ timeout: 10000 });

    // Click to switch back to admin view
    await adminViewLink.click();
    await expect(page).toHaveURL("/admin/dashboard", { timeout: 10000 });
  });
});
```

## Detailed Route & UI Element Map

### Student Book Page (`/student/book`)
| Element | Selector Strategy | Notes |
|---------|------------------|-------|
| Page title (no coach selected) | `h1:has-text("Choose Your Coach")` | Rendered by BookLessonPage |
| Page title (coach selected) | `h1:has-text("Book a Lesson with")` | Changes dynamically |
| Coach grid container | `.grid.grid-cols-1` (or by children) | CoachBrowse renders cards in grid |
| Coach card | Card with `cursor-pointer` class | CoachProfileCard onClick triggers selection |
| Coach name in card | `h3.font-semibold` inside card | `coach.name || "Coach"` |
| Coach skills badges | `Badge` components with `variant="secondary"` | skills array mapped to badges |
| Available slots count | Badge with `variant="outline"` | `{coach.availableSlots} slots available` |
| Price display | `span.text-sm.font-medium` | `From $XX/hr` |
| "Change Coach" button | `button:has-text("Change Coach")` | Only visible after selection |
| Loading state | `text=Finding available coaches...` | While data loads |
| Empty state | `text=No coaches are currently available.` | No approved/active coaches |

### BookingCalendar (after coach selection)
| Element | Selector Strategy | Notes |
|---------|------------------|-------|
| Calendar card title | `text=Book a Lesson` | CardTitle in BookingCalendar |
| Rink selector | Select with `placeholder="Select a Rink"` | Auto-selects first rink |
| Available event (desktop) | `.rbc-event` with green background | `eventPropGetter` sets green for available |
| Available slot (mobile) | `button` with `text=Available` | Mobile list view |
| Week/Month view buttons | `button:has-text("Week")`, `button:has-text("Month")` | View toggle |
| Today button | `button:has-text("Today")` | Navigation |

### BookingDialog (after slot click)
| Element | Selector Strategy | Notes |
|---------|------------------|-------|
| Dialog title | `text=Book a Lesson` (DialogTitle) | Inside Dialog |
| Date display | Calendar icon + formatted date | `format(new Date(slot.startTime), "EEEE, MMMM d, yyyy")` |
| Coach name | `text=Coach:` followed by name | Only when coachName prop is set |
| Lesson type selector | `Select` with id `lesson-type-select` | PRIVATE, CHOREOGRAPHY options |
| Payment method selector | `Select` with id `payment-method-select` | VENMO, ZELLE, CASH |
| Notes textarea | `textarea#booking-notes` | Optional |
| Book button | `button:has-text("Book Lesson")` | Submits mutation |
| Cancel button | `button:has-text("Cancel")` | Closes dialog |
| Loading state | `button:has-text("Booking...")` | During submission |

### Coach Name Display Locations (STST-03)
| View | Component | Selector | Code Reference |
|------|-----------|----------|----------------|
| Student lesson card | LessonCard.tsx line 69 | `User` icon + text | `lesson.Coach?.User?.name \|\| "Instructor"` |
| Student dashboard upcoming | UpcomingLessons.tsx line 113 | `User` icon + text | `(lesson as any).Coach?.User?.name \|\| "Instructor"` |
| Lesson detail page | [lessonId]/page.tsx line 127 | `h3:has-text("Coach")` + sibling p | `lesson.Coach?.User?.name \|\| "Instructor"` |
| Student payments table | payments/page.tsx line 152 | `td` in Coach column | `(lesson as any).Coach?.User?.name \|\| "Instructor"` |
| Booking dialog | BookingDialog.tsx line 194 | `text=Coach:` | `Coach: {coachName}` |

### Middleware Role Redirect Map (SECT-02)
| From Role | Accessing Route | Redirected To | Middleware Line |
|-----------|----------------|---------------|-----------------|
| STUDENT | `/admin/*` | `/student/dashboard` | 88-95 |
| STUDENT | `/coach/*` | `/student/dashboard` | 98-107 |
| COACH | `/admin/*` | `/coach/dashboard` | 88-95 |
| COACH | `/student/*` | `/coach/dashboard` | 110-118 |
| ADMIN/SUPER_ADMIN | `/student/*` | `/admin/dashboard` | 110-118 |
| ADMIN/SUPER_ADMIN | `/coach/*` | ALLOWED (no redirect) | 98-107 |
| Unauthenticated | any protected | `/auth/login` | 54-59 |

## Seed Data Gap Analysis

### Current Seed State
The seed script creates:
- 1 SUPER_ADMIN (admin@test.com) with Coach record
- 2 approved COACHes (coach@test.com, coach2@test.com) with Coach records
- 2 pending COACHes (coach3@test.com, coach4@test.com)
- 1 approved STUDENT (test.student@example.com)
- 1 Rink ("Test Ice Rink")
- CoachStudent: coach1->student (primary), coach2->student (non-primary)
- 1 RinkTimeSlot for coach1 (7 days from now, 10-11am) -- OCCUPIED by completed lesson
- 1 Lesson (COMPLETED, PRIVATE, $120) for coach1
- 1 Payment (COMPLETED, VENMO) for coach1

### Gaps That Must Be Addressed

**Gap 1: No unbooked time slots for booking test (STST-02)**
The only time slot is already occupied by a completed lesson. The booking flow needs at least one AVAILABLE (unbooked) time slot for the selected coach.

**Recommendation:** Add to seed script:
```typescript
// Create an available (unbooked) time slot for coach1
const bookableStart = new Date();
bookableStart.setDate(bookableStart.getDate() + 10); // 10 days from now
bookableStart.setHours(14, 0, 0, 0);
const bookableEnd = new Date(bookableStart);
bookableEnd.setHours(15, 0, 0, 0);

await prisma.rinkTimeSlot.create({
  data: {
    rinkId: rink.id,
    coachId: coach.id,
    startTime: bookableStart,
    endTime: bookableEnd,
    maxStudents: 1,
    isActive: true,
  },
});
```

**Gap 2: No data for coach2 to test data isolation (SECT-01)**
Coach 2 has no lessons, payments, or time slots. Testing "coach A cannot see coach B's data" requires BOTH coaches to have data.

**Recommendation:** Add to seed script:
```typescript
// Create time slot, lesson, and payment for coach2
const coach2SlotStart = new Date();
coach2SlotStart.setDate(coach2SlotStart.getDate() + 7);
coach2SlotStart.setHours(12, 0, 0, 0);
const coach2SlotEnd = new Date(coach2SlotStart);
coach2SlotEnd.setHours(13, 0, 0, 0);

const coach2TimeSlot = await prisma.rinkTimeSlot.create({
  data: {
    rinkId: rink.id, coachId: coach2.id,
    startTime: coach2SlotStart, endTime: coach2SlotEnd,
    maxStudents: 1, isActive: true,
  },
});

const coach2Lesson = await prisma.lesson.create({
  data: {
    studentId: student.id, rinkId: rink.id, coachId: coach2.id,
    startTime: coach2SlotStart, endTime: coach2SlotEnd,
    duration: 60, type: "CHOREOGRAPHY", status: "COMPLETED",
    price: 90.0, timeSlotId: coach2TimeSlot.id, notes: "E2E test coach2 lesson",
  },
});

await prisma.payment.create({
  data: {
    lessonId: coach2Lesson.id, studentId: student.id,
    amount: 90.0, method: "ZELLE", status: "COMPLETED",
    referenceCode: "TEST-COACH2-001", lesson_date: coach2SlotStart,
    verifiedAt: new Date(), verifiedBy: adminUser.id,
  },
});
```

**Gap 3: No storageState for coach2 (SECT-01)**
Auth setup only saves state for `coach@test.com`. To test as coach2, either:
- Add `coach2.json` storageState to auth.setup.ts
- OR use `loginAsCoach(page, testData.coach2.email, testData.coach2.password)` in the test (skipping storageState)

**Recommendation:** Add a coach2 auth setup step to auth.setup.ts:
```typescript
setup("authenticate as coach2", async ({ page }) => {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', "coach2@test.com");
  await page.fill('input[id="password"]', "COACH2PASS2025!");
  await page.click('button[type="submit"]');
  await page.waitForURL("/coach/dashboard", { timeout: 15000 });
  await page.context().storageState({ path: COACH2_AUTH });
});
```

## TRPC Coach Data Scoping Verification

All coach TRPC queries use `coachProcedure` which injects `ctx.coach` from the logged-in user's Coach record. Every query filters by `ctx.coach.id`:

| Query | Filter | File |
|-------|--------|------|
| `getUpcomingLessons` | `where: { coachId: ctx.coach.id }` | dashboardQueries.ts:18 |
| `getPastLessons` | `where: { coachId: ctx.coach.id }` | dashboardQueries.ts:47 |
| `getDashboardStats` | `where: { coachId: ctx.coach.id }` (4 queries) | dashboardQueries.ts:72-105 |
| `getMyTimeSlots` | `where: { coachId: ctx.coach.id }` | scheduleQueries.ts:20 |
| `getMyStudents` | `where: { coachId: ctx.coach.id }` | studentQueries.ts:5 |
| `getEarningsSummary` | `where: { Lesson: { coachId: ctx.coach.id } }` | earningsQueries.ts:14-38 |
| `getPaymentHistory` | `where: { Lesson: { coachId: ctx.coach.id } }` | earningsQueries.ts:62 |
| `getMyBlockedDates` | `where: { coachId: ctx.coach.id }` | scheduleQueries.ts:115 |

**Conclusion:** Data isolation is enforced at the TRPC middleware level. The E2E test primarily needs to verify that the UI shows different data for different coaches (not that the backend is buggy).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `loginAsAdmin` helper | `storageState` files + `test.use()` | Phase 8 | Tests skip login, faster execution |
| Single role testing | Multi-role with describe-level overrides | Phase 8 | Each describe block can be a different role |
| Manual DB setup | `seed-test-data.ts` auto-run in setup project | Phase 8 | Consistent data across all test runs |

## Open Questions

1. **Coach2 StorageState vs Login Helper**
   - What we know: auth.setup.ts only creates 3 auth states (super-admin, coach, student). Coach2 has no saved auth.
   - What's unclear: Whether to add a 4th auth setup or use `loginAsCoach(page, ...)` inline
   - Recommendation: Add coach2 auth to setup for consistency and speed. Minimal effort, high benefit.

2. **Booking Test Fragility**
   - What we know: The booking calendar uses react-big-calendar with complex event rendering. Clicking calendar events in E2E can be fragile.
   - What's unclear: How reliably Playwright can click `rbc-event` elements
   - Recommendation: If desktop calendar clicks are flaky, test on mobile viewport where the list view renders plain `<button>` elements (much more reliable to click).

3. **Coach Name Fallback "Instructor"**
   - What we know: All coach name displays use `Coach?.User?.name || "Instructor"`. The seed creates coaches with names.
   - What's unclear: Whether any edge case could show "Instructor" instead of the coach name
   - Recommendation: Assert the actual coach name (e.g., "Test Coach") rather than just checking something appears.

## Sources

### Primary (HIGH confidence)
- `/home/kopacz/projects/yura-scheduler-v3/middleware.ts` - Route protection rules (lines 88-118)
- `/home/kopacz/projects/yura-scheduler-v3/src/lib/trpc.ts` - TRPC middleware (isAuthed, isAdmin, isCoach procedures)
- `/home/kopacz/projects/yura-scheduler-v3/src/lib/roles.ts` - Role hierarchy (isAdminRole, isCoachRole)
- `/home/kopacz/projects/yura-scheduler-v3/src/components/layout/AppSidebar.tsx` - Dual-role navigation links (lines 121-143)
- `/home/kopacz/projects/yura-scheduler-v3/src/app/(protected)/student/book/page.tsx` - Two-step booking flow
- `/home/kopacz/projects/yura-scheduler-v3/src/features/student/components/booking/CoachBrowse.tsx` - Coach grid
- `/home/kopacz/projects/yura-scheduler-v3/src/features/student/components/booking/BookingCalendar.tsx` - Calendar view
- `/home/kopacz/projects/yura-scheduler-v3/src/features/student/components/booking/BookingDialog.tsx` - Booking dialog
- `/home/kopacz/projects/yura-scheduler-v3/src/features/student/components/schedule/LessonCard.tsx` - Coach name in card (line 69)
- `/home/kopacz/projects/yura-scheduler-v3/src/features/student/components/dashboard/UpcomingLessons.tsx` - Coach name in dashboard (line 113)
- `/home/kopacz/projects/yura-scheduler-v3/src/app/(protected)/student/schedule/[lessonId]/page.tsx` - Coach name in detail (line 127)
- `/home/kopacz/projects/yura-scheduler-v3/src/app/(protected)/student/payments/page.tsx` - Coach name in payments (line 152)
- `/home/kopacz/projects/yura-scheduler-v3/src/features/coach/api/queries/dashboardQueries.ts` - Coach-scoped queries
- `/home/kopacz/projects/yura-scheduler-v3/src/features/coach/api/queries/earningsQueries.ts` - Coach-scoped earnings
- `/home/kopacz/projects/yura-scheduler-v3/src/features/coach/api/queries/studentQueries.ts` - Coach-scoped students
- `/home/kopacz/projects/yura-scheduler-v3/src/features/coach/api/queries/scheduleQueries.ts` - Coach-scoped schedule
- `/home/kopacz/projects/yura-scheduler-v3/tests/helpers/seed-test-data.ts` - Current seed data
- `/home/kopacz/projects/yura-scheduler-v3/tests/helpers/test-utils.ts` - Test helpers
- `/home/kopacz/projects/yura-scheduler-v3/tests/auth.setup.ts` - Auth setup
- `/home/kopacz/projects/yura-scheduler-v3/playwright.config.ts` - Test configuration
- `/home/kopacz/projects/yura-scheduler-v3/tests/coach-flows.spec.ts` - Existing test patterns
- `/home/kopacz/projects/yura-scheduler-v3/tests/admin-coach-management.spec.ts` - Admin test patterns

### Secondary (MEDIUM confidence)
- Playwright documentation for storageState patterns (training knowledge, well-established)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Playwright and all test infrastructure already configured and verified working
- Architecture: HIGH - All UI components, routes, selectors, and TRPC queries verified by reading source code
- Pitfalls: HIGH - All pitfalls identified by tracing actual data flow through seed -> auth -> UI -> TRPC
- Seed data gaps: HIGH - Gap analysis done by comparing seed data against test requirements

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable -- only invalidated if app routes or booking flow changes)
