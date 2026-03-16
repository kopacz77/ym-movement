# Phase 8: Test Infrastructure & Legacy Updates - Research

**Researched:** 2026-03-16
**Domain:** Playwright E2E test infrastructure, test data seeding, multi-role auth testing
**Confidence:** HIGH

## Summary

Phase 8 updates the existing Playwright E2E test infrastructure (13 spec files, ~5,000 lines, 1 helper file) to support the multi-coach role system introduced in phases 1-7. The existing tests were written for a single-admin system where "ADMIN" was the only admin role. Now the system uses SUPER_ADMIN, ADMIN (legacy/compat), COACH, and STUDENT roles.

The work breaks into three clear areas: (1) a test data seeding script that creates all needed accounts including coaches and coach-student relationships, (2) extending `tests/helpers/test-utils.ts` with new helper functions for coach-related operations, and (3) updating all 13 existing test files to work with SUPER_ADMIN role credentials while consolidating inconsistent login patterns.

**Primary recommendation:** Use Playwright's project dependencies pattern with a setup project that seeds test data via Prisma direct database access, create role-specific storageState files for SUPER_ADMIN/COACH/STUDENT to avoid repeated login overhead, extend test-utils.ts additively (never break existing exports), and update the 5 test files that have hardcoded admin credentials inline to use the shared helpers instead.

## Standard Stack

No new libraries are needed. This phase works entirely within the existing stack.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | 1.57.0 | E2E test runner | Already installed, supports project dependencies and storageState |
| @prisma/client | ^6.19.0 | Database ORM | Already used; needed for seed script direct DB access |
| bcrypt | (installed) | Password hashing | Already used; needed for creating test user passwords |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | (devDep) | TypeScript script runner | Run seed script: `npx tsx tests/helpers/seed-test-data.ts` |

### No New Dependencies Required
All tooling for this phase is already installed.

## Architecture Patterns

### Recommended Test Directory Structure

```
tests/
  helpers/
    test-utils.ts          # Extended: add coach helpers, rename loginAsAdmin -> loginAsSuperAdmin
    seed-test-data.ts      # NEW: Prisma-based test data seeding script
  auth.setup.ts            # NEW: Playwright setup project that seeds + saves storageState
  *.spec.ts                # EXISTING: 13 test files, updated for SUPER_ADMIN
playwright/
  .auth/                   # NEW: gitignored directory for storageState JSON files
    super-admin.json
    coach.json
    student.json
playwright.config.ts       # UPDATED: add setup project + dependencies
```

### Pattern 1: Project Dependencies for Test Data Seeding

**What:** Use Playwright's recommended project dependencies approach to run a setup project before tests. The setup project seeds the database and saves storageState files.

**When to use:** Always -- this replaces the current pattern where tests assume data exists.

**Why project dependencies over globalSetup:** Project dependencies appear in HTML reports, support traces, and use standard Playwright fixtures. This is the officially recommended approach for Playwright 1.57.

**Example config:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // Setup project: seeds DB + saves auth state
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Main browser projects depend on setup
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/super-admin.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "playwright/.auth/super-admin.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: "playwright/.auth/super-admin.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        storageState: "playwright/.auth/super-admin.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 12"],
        storageState: "playwright/.auth/super-admin.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### Pattern 2: Auth Setup Project with Multi-Role StorageState

**What:** A single `auth.setup.ts` file that runs the seed script, then logs in as each role and saves the storageState to separate JSON files.

**Example:**
```typescript
// tests/auth.setup.ts
import { test as setup, expect } from "@playwright/test";
import path from "path";

const SUPER_ADMIN_AUTH = path.join(__dirname, "../playwright/.auth/super-admin.json");
const COACH_AUTH = path.join(__dirname, "../playwright/.auth/coach.json");
const STUDENT_AUTH = path.join(__dirname, "../playwright/.auth/student.json");

setup("seed test data", async () => {
  // Run seed script via child_process or direct Prisma import
  const { execSync } = require("child_process");
  execSync("npx tsx tests/helpers/seed-test-data.ts", { stdio: "inherit" });
});

setup("authenticate as super admin", async ({ page }) => {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', "admin@test.com");
  await page.fill('input[id="password"]', "ADMINPASS2025!");
  await page.click('button[type="submit"]');
  await page.waitForURL("/admin/dashboard", { timeout: 15000 });
  await page.context().storageState({ path: SUPER_ADMIN_AUTH });
});

setup("authenticate as coach", async ({ page }) => {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', "coach@test.com");
  await page.fill('input[id="password"]', "COACHPASS2025!");
  await page.click('button[type="submit"]');
  await page.waitForURL("/coach/dashboard", { timeout: 15000 });
  await page.context().storageState({ path: COACH_AUTH });
});

setup("authenticate as student", async ({ page }) => {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', "test.student@example.com");
  await page.fill('input[id="password"]', "TestPassword123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("/student/dashboard", { timeout: 15000 });
  await page.context().storageState({ path: STUDENT_AUTH });
});
```

### Pattern 3: Seed Script with Prisma Direct Access

**What:** A TypeScript script that uses Prisma directly to create/upsert all test accounts and relationships. This replaces and extends the existing `scripts/create-test-accounts.js`.

**Key data to seed:**
1. SUPER_ADMIN user (admin@test.com) - upgraded from "ADMIN" to "SUPER_ADMIN"
2. SUPER_ADMIN's Coach record (Yura's coach profile)
3. COACH user (coach@test.com) - approved, active
4. COACH user (coach2@test.com) - for multi-coach scenarios
5. STUDENT user (test.student@example.com) - approved, linked to primary coach
6. Rink - test rink for scheduling tests
7. CoachStudent relationships - linking coaches to students
8. At least one RinkTimeSlot with coachId - for scheduling tests

**Example seed structure:**
```typescript
// tests/helpers/seed-test-data.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function seedTestData() {
  console.log("Seeding test data for E2E tests...");

  // 1. Create/upsert SUPER_ADMIN
  const adminHash = await bcrypt.hash("ADMINPASS2025!", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: { password: adminHash, role: "SUPER_ADMIN" },
    create: {
      email: "admin@test.com",
      password: adminHash,
      name: "Test Admin",
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });

  // Ensure admin has a Coach record (mirrors production Yura setup)
  await prisma.coach.upsert({
    where: { userId: adminUser.id },
    update: { isApproved: true, isActive: true },
    create: {
      userId: adminUser.id,
      isApproved: true,
      isActive: true,
      bio: "Test admin coach",
      skills: ["Figure Skating"],
      revenueSplitPercent: 100,
    },
  });

  // 2. Create/upsert COACH
  const coachHash = await bcrypt.hash("COACHPASS2025!", 10);
  const coachUser = await prisma.user.upsert({
    where: { email: "coach@test.com" },
    update: { password: coachHash, role: "COACH" },
    create: {
      email: "coach@test.com",
      password: coachHash,
      name: "Test Coach",
      role: "COACH",
      emailVerified: new Date(),
    },
  });

  const coach = await prisma.coach.upsert({
    where: { userId: coachUser.id },
    update: { isApproved: true, isActive: true },
    create: {
      userId: coachUser.id,
      isApproved: true,
      isActive: true,
      bio: "Test coach profile",
      skills: ["Ice Dance", "Freestyle"],
      revenueSplitPercent: 70,
    },
  });

  // 3. Create/upsert STUDENT + link to coach
  const studentHash = await bcrypt.hash("TestPassword123!", 10);
  const studentUser = await prisma.user.upsert({
    where: { email: "test.student@example.com" },
    update: { password: studentHash },
    create: {
      email: "test.student@example.com",
      password: studentHash,
      name: "Test Student",
      role: "STUDENT",
      emailVerified: new Date(),
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: { isApproved: true },
    create: {
      userId: studentUser.id,
      phone: "555-123-4567",
      level: "PRELIMINARY",
      maxLessonsPerWeek: 2,
      isApproved: true,
      emergencyContact: {
        name: "Test Parent",
        phone: "555-987-6543",
        relationship: "Parent",
      },
    },
  });

  // 4. CoachStudent relationship
  await prisma.coachStudent.upsert({
    where: {
      coachId_studentId: { coachId: coach.id, studentId: student.id },
    },
    update: {},
    create: {
      coachId: coach.id,
      studentId: student.id,
      isPrimary: true,
    },
  });

  // 5. Rink
  await prisma.rink.upsert({
    where: { name: "Test Ice Rink" },
    update: {},
    create: {
      name: "Test Ice Rink",
      address: "123 Ice Street, Test City, TC 12345",
      timezone: "America/Los_Angeles",
    },
  });

  console.log("Test data seeded successfully!");
  await prisma.$disconnect();
}

seedTestData().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
```

### Pattern 4: Test-Specific StorageState Override

**What:** Individual test files that need a different role can override the default storageState.

**Example:**
```typescript
// In a test file that needs coach auth instead of the default super-admin
import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/coach.json" });

test("coach can view their dashboard", async ({ page }) => {
  await page.goto("/coach/dashboard");
  await expect(page.locator("text=Coach Dashboard")).toBeVisible();
});
```

### Anti-Patterns to Avoid

- **Inline login functions in spec files:** Two spec files (`admin-dashboard.spec.ts`, `lesson-scheduling.spec.ts`) define their own `loginAsAdmin` instead of importing from test-utils. This creates duplication and drift (lesson-scheduling uses wrong password `admin123`). Consolidate all to use shared helpers or storageState.
- **Hardcoded credentials scattered across files:** Five spec files hardcode `admin@test.com` / `ADMINPASS2025!` directly. Use test-utils constants or storageState.
- **Re-logging-in every test:** With storageState, most tests should start already authenticated. Only tests that specifically test the login flow should go through the login page.
- **Using `role: "ADMIN"` in seed scripts:** The existing `create-test-accounts.js` creates users with `role: "ADMIN"`. After phase 1, the admin user is `SUPER_ADMIN`. The seed script must use `SUPER_ADMIN`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session persistence | Custom cookie management | Playwright `storageState` | Built-in, handles cookies + localStorage + sessionStorage |
| Test data seeding | HTTP API calls from tests | Prisma direct database access | Faster, more reliable, doesn't depend on running app |
| Test isolation | Manual cleanup between tests | `prisma.upsert()` for idempotent seeding | Upserts are inherently idempotent; no cleanup needed |
| Setup ordering | Custom beforeAll chains | Playwright project `dependencies` | Built into runner, visible in reports, supports traces |
| Multi-role auth | Separate test suites per role | Multiple `storageState` files + `test.use()` override | Standard Playwright pattern, no framework overhead |

**Key insight:** Playwright has mature, built-in solutions for every testing infrastructure need in this phase. The main work is adapting the existing codebase patterns to use them properly, not building new abstractions.

## Common Pitfalls

### Pitfall 1: JWT Cache After Role Change

**What goes wrong:** The seed script changes admin@test.com from ADMIN to SUPER_ADMIN in the database, but if the user was logged in before, their JWT still says "ADMIN". Tests that check SUPER_ADMIN-specific behavior may fail.
**Why it happens:** NextAuth JWT strategy caches the role in the token. Role updates require either re-login or session update trigger.
**How to avoid:** The storageState approach solves this -- auth.setup.ts always does a fresh login after seeding, so the JWT will always contain the current role from the database.
**Warning signs:** Tests pass in isolation but fail when run after other tests that logged in before seeding.

### Pitfall 2: Inconsistent Password in lesson-scheduling.spec.ts

**What goes wrong:** `lesson-scheduling.spec.ts` uses password `admin123` while all other tests and the seed script use `ADMINPASS2025!`. This test has been silently failing or was only run against a different environment.
**Why it happens:** Test was written at a different time or copied from older code without updating credentials.
**How to avoid:** Update to use shared test-utils import or storageState pattern. Eliminate all inline login functions.
**Warning signs:** Login timeout in lesson-scheduling tests.

### Pitfall 3: Coach Signup Turnstile Blocking E2E Tests

**What goes wrong:** Trying to test coach signup flow via the `/auth/coach-signup` page hits Cloudflare Turnstile CAPTCHA which cannot be automated.
**Why it happens:** The coach signup page requires Turnstile verification. Development mode bypasses if no `TURNSTILE_SECRET_KEY` is set, but the client-side still renders the widget and blocks form submission until token is set.
**How to avoid:** For E2E tests that need to create coach accounts, use the Prisma seed script to create them directly in the database. Don't test the coach signup page in automated tests (same as the decision to exclude Google Calendar OAuth tests).
**Warning signs:** Coach signup form submit button is permanently disabled in tests.

### Pitfall 4: storageState Files Committed to Git

**What goes wrong:** The `playwright/.auth/*.json` files contain session tokens and get committed to the repository.
**Why it happens:** The `.gitignore` currently only excludes `playwright-report/`, not `playwright/.auth/`.
**How to avoid:** Add `playwright/.auth/` to `.gitignore` before creating any storageState files.
**Warning signs:** Git status shows new JSON files in `playwright/.auth/`.

### Pitfall 5: Seed Script Race Condition with Dev Server

**What goes wrong:** The auth.setup.ts tries to log in before the dev server is ready, or the seed script modifies data while the app is serving requests.
**Why it happens:** The Playwright `webServer` config starts the dev server, but the seed script runs in a separate process.
**How to avoid:** Structure auth.setup.ts so the seed step runs first (it only needs database, not the app server), then the login steps run after (they need the app server which Playwright guarantees is ready for test execution). Playwright's `webServer` waits for the URL to be available before running tests.
**Warning signs:** Intermittent login failures in CI.

### Pitfall 6: Breaking Existing Test Imports

**What goes wrong:** Renaming `loginAsAdmin` to `loginAsSuperAdmin` in test-utils breaks the 8 files that import it.
**Why it happens:** Aggressive refactoring without backward compatibility.
**How to avoid:** Keep `loginAsAdmin` as a re-export or alias. Add new functions additively. Only remove the alias after all callsites are updated.
**Warning signs:** TypeScript compilation errors across test files.

## Code Examples

### Extending test-utils.ts with Coach Helpers

```typescript
// tests/helpers/test-utils.ts -- ADDITIONS (keep all existing exports)
// Source: Based on existing codebase patterns

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
```

### Updating Spec File to Remove Inline Login

```typescript
// BEFORE (admin-dashboard.spec.ts)
import { expect, test } from "@playwright/test";

// Helper function to login as admin
async function loginAsAdmin(page: any) {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', "admin@test.com");
  await page.fill('input[id="password"]', "ADMINPASS2025!");
  await page.click('button[type="submit"]');
  await page.waitForURL("/admin/dashboard", { timeout: 10000 });
}

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });
  // ...
});

// AFTER (admin-dashboard.spec.ts)
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers/test-utils";

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });
  // ...
});
```

**Note on storageState vs loginAsAdmin:** Once storageState is configured with the default `super-admin.json` in the project config, most tests that currently call `loginAsAdmin` in `beforeEach` can simply navigate directly to the page since they'll already be authenticated. However, the migration to storageState is optional for this phase -- the minimum viable change is consolidating login helpers and fixing credentials. The storageState optimization can be a follow-up within this phase if time permits.

### Fixing lesson-scheduling.spec.ts Credentials

```typescript
// BEFORE
async function loginAsAdmin(page: any) {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', "admin@test.com");
  await page.fill('input[id="password"]', "admin123");  // WRONG PASSWORD
  // ...
}

// AFTER
import { loginAsAdmin } from "./helpers/test-utils";
// Remove inline function entirely
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `globalSetup` config option | Project dependencies with `dependencies` array | Playwright 1.31+ (2023) | Setup visible in reports, supports traces and fixtures |
| Re-login every test | `storageState` with auth setup project | Playwright 1.20+ (2023) | Up to 71% faster test execution |
| `role: "ADMIN"` in test data | `role: "SUPER_ADMIN"` | Phase 1 of this project | All admin test accounts must use SUPER_ADMIN |
| Single admin, single student | Multi-role: SUPER_ADMIN, COACH, STUDENT | Phase 1 of this project | Seed script must create all role types |

**Deprecated/outdated in this codebase:**
- `scripts/create-test-accounts.js`: Uses `role: "ADMIN"`, has `approved: true` typo (should be `isApproved: true`), and is a `.js` file. Replace with TypeScript seed script in `tests/helpers/`.
- Inline `loginAsAdmin` functions in spec files: Duplicated code with inconsistent credentials. Should all use the shared import.

## Detailed File-by-File Analysis

### Files Requiring Updates

**Critical (broken/incorrect):**
1. `tests/lesson-scheduling.spec.ts` -- Uses wrong password `admin123`, has inline loginAsAdmin. MUST fix.
2. `scripts/create-test-accounts.js` -- Creates `role: "ADMIN"` instead of `"SUPER_ADMIN"`, has `approved` typo (should be `isApproved`).

**Moderate (inconsistent but likely functional):**
3. `tests/admin-dashboard.spec.ts` -- Inline loginAsAdmin (correct password). Should import from test-utils.
4. `tests/authentication.spec.ts` -- Hardcoded credentials inline. Some are intentional (testing login flow) but should use testData constants.
5. `tests/debug-student-error.spec.ts` -- Hardcoded admin credentials. Should import from test-utils.
6. `tests/student-signup.spec.ts` -- References `admin@test.com` in duplicate email test. This is fine but could use testData constant.

**Already using shared helpers (minimal changes):**
7. `tests/blocked-dates-management.spec.ts` -- Imports loginAsAdmin from test-utils.
8. `tests/e2e-complete-flow.spec.ts` -- Imports multiple helpers from test-utils.
9. `tests/error-handling-performance.spec.ts` -- Imports loginAsAdmin, loginAsStudent.
10. `tests/notifications-system.spec.ts` -- Imports loginAsAdmin, loginAsStudent.
11. `tests/payment-reminder-email.spec.ts` -- Imports loginAsAdmin.
12. `tests/payments-sorting.spec.ts` -- Imports loginAsAdmin.
13. `tests/reports-dashboard.spec.ts` -- Imports loginAsAdmin.
14. `tests/ui-components.spec.ts` -- Imports loginAsAdmin, loginAsStudent.

**Files 7-14 will "just work" when test-utils.ts is updated** because they import `loginAsAdmin` which will become an alias for `loginAsSuperAdmin`. The seed script ensures the admin account has the `SUPER_ADMIN` role, so login redirects to `/admin/dashboard` as before.

### Infrastructure Files to Create/Update

| File | Action | Purpose |
|------|--------|---------|
| `tests/helpers/seed-test-data.ts` | CREATE | Prisma-based seed script with all roles |
| `tests/helpers/test-utils.ts` | EXTEND | Add coach helpers, coach test data, backward compat aliases |
| `tests/auth.setup.ts` | CREATE | Playwright setup project: seed + storageState |
| `playwright.config.ts` | UPDATE | Add setup project, dependencies, storageState defaults |
| `.gitignore` | UPDATE | Add `playwright/.auth/` |

## Open Questions

1. **Should existing tests migrate to storageState immediately?**
   - What we know: StorageState would make tests faster by avoiding repeated logins.
   - What's unclear: Whether the loginAsAdmin calls in `beforeEach` should all be replaced now or incrementally.
   - Recommendation: Make it work both ways. Set default storageState in project config (so tests start authenticated), but keep loginAsAdmin helper available. Tests that explicitly call loginAsAdmin will effectively re-login (redundant but not harmful). Migration to removing explicit login calls can happen incrementally.

2. **Should the second coach (coach2@test.com) be seeded now or deferred to Phase 9?**
   - What we know: Phase 9 tests will need multi-coach scenarios. Phase 8's requirement TINF-01 says "multi-coach scenarios."
   - What's unclear: Exactly which multi-coach scenarios Phase 9 will need.
   - Recommendation: Seed coach2 now (it's cheap) so Phase 9 has data ready. The requirement explicitly mentions "multi-coach scenarios."

3. **What about the `ADMIN` role (not SUPER_ADMIN)?**
   - What we know: The Role enum has both ADMIN and SUPER_ADMIN. `isAdminRole()` accepts both. The existing admin@test.com user should be SUPER_ADMIN per Phase 1's migration.
   - What's unclear: Whether any tests should verify ADMIN (legacy) role behavior.
   - Recommendation: Don't seed an ADMIN-role test user. The codebase treats ADMIN and SUPER_ADMIN identically via `isAdminRole()`. If needed later, it can be added.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All 13 test files, test-utils.ts, playwright.config.ts, prisma/schema.prisma, src/lib/auth.ts, src/lib/trpc.ts, src/lib/roles.ts, scripts/create-test-accounts.js, coach signup route
- [Playwright Global Setup Docs](https://playwright.dev/docs/test-global-setup-teardown) -- Project dependencies vs globalSetup comparison
- [Playwright Authentication Docs](https://playwright.dev/docs/auth) -- storageState, multi-role auth, setup projects

### Secondary (MEDIUM confidence)
- [Playwright storageState Multi-Role Guide](https://www.testleaf.com/blog/playwright-storage-state-reuse-login-multiple-users/) -- Practical multi-role patterns
- [Database Integration with Playwright](https://medium.com/@Amr.sa/managing-database-integration-with-playwright-4b7484e98615) -- Prisma + Playwright patterns

### Tertiary (LOW confidence)
- None needed -- this phase is well-grounded in existing codebase patterns and official Playwright docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries, all patterns from official Playwright docs
- Architecture: HIGH -- Project dependencies and storageState are standard, well-documented Playwright patterns
- Pitfalls: HIGH -- Identified through direct codebase analysis (wrong password in lesson-scheduling, ADMIN vs SUPER_ADMIN, Turnstile blocking, gitignore gap)
- File-by-file analysis: HIGH -- Every test file was read and categorized

**Research date:** 2026-03-16
**Valid until:** Stable -- Playwright patterns and existing codebase are not fast-moving targets
