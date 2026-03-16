# Phase 11: Stabilization - Research

**Researched:** 2026-03-16
**Domain:** Playwright E2E test stabilization, bug fixing, CI readiness
**Confidence:** HIGH

## Summary

Phase 11 stabilization requires fixing a critical blocking bug in `auth.setup.ts` and then addressing test failures across both legacy (pre-Phase 8) and new (Phases 9-10) spec files. The research involved listing all 222 tests across 18 spec files, running the actual test suite, reading the signup/login source code to verify test selector correctness, and reviewing SUMMARY files from Phases 8-10.

The primary blocker is a `__dirname` reference error in `auth.setup.ts` caused by `"type": "module"` in `package.json`. This prevents ALL tests from running because every browser project depends on the setup project. The fix is straightforward: replace `__dirname` with `import.meta.url` + `fileURLToPath`. Beyond this blocker, the legacy test files contain multiple selector mismatches against the actual UI (Radix components vs native HTML elements, removed form fields, wrong URL patterns).

**Primary recommendation:** Fix the `__dirname` blocker first, then run the full suite to triage failures. Fix new Phase 9-10 tests (high value, few expected issues), then fix or skip legacy tests that have fundamental selector mismatches with the current UI.

## Test Inventory

### Complete Spec File Catalog

| # | Spec File | Tests | Origin | Category |
|---|-----------|-------|--------|----------|
| 1 | admin-dashboard.spec.ts | 22 | Legacy | Admin UI |
| 2 | lesson-scheduling.spec.ts | 22 | Legacy | Scheduling |
| 3 | payments-sorting.spec.ts | 20 | Legacy | Payments |
| 4 | error-handling-performance.spec.ts | 20 | Legacy | Error/Perf |
| 5 | ui-components.spec.ts | 18 | Legacy | UI Components |
| 6 | blocked-dates-management.spec.ts | 16 | Legacy | Blocked Dates |
| 7 | notifications-system.spec.ts | 15 | Legacy | Notifications |
| 8 | authentication.spec.ts | 15 | Legacy | Auth |
| 9 | payment-reminder-email.spec.ts | 14 | Legacy | Payments |
| 10 | reports-dashboard.spec.ts | 13 | Legacy | Reports |
| 11 | coach-flows.spec.ts | 9 | Phase 9 | Coach |
| 12 | student-signup.spec.ts | 8 | Legacy | Auth |
| 13 | role-guards.spec.ts | 7 | Phase 10 | Security |
| 14 | e2e-complete-flow.spec.ts | 6 | Legacy | E2E Journey |
| 15 | data-isolation.spec.ts | 6 | Phase 10 | Security |
| 16 | student-booking-flow.spec.ts | 5 | Phase 10 | Student |
| 17 | admin-coach-management.spec.ts | 5 | Phase 9 | Admin |
| 18 | debug-student-error.spec.ts | 1 | Legacy | Debug |
| **TOTAL** | | **222** | | |

**New tests (Phases 9-10):** 32 tests across 5 files
**Legacy tests (pre-Phase 8):** 190 tests across 13 files

### Test List Parse Status

Running `npx playwright test --list --project=chromium` reports:
- **With dependencies:** FAILS - `ReferenceError: __dirname is not defined in ES module scope` at `auth.setup.ts:5`
- **With `--no-deps`:** SUCCESS - All 222 tests in 18 files parse correctly, zero parse errors

### Known Skips

Only one intentional `test.skip()`:
- `student-booking-flow.spec.ts:106` - Booking test skips gracefully if calendar slot not visible after 3 navigation attempts (by design)

## Critical Bug: __dirname Blocker

### Bug B-001: `__dirname` Not Defined in ES Module Scope

**Severity:** CRITICAL - Blocks ALL 222 tests from running
**File:** `tests/auth.setup.ts:5`
**Root Cause:** `package.json` has `"type": "module"`, making all `.ts` files ESM. `__dirname` is a CommonJS global not available in ESM.

**Current broken code:**
```typescript
import path from "path";
const SUPER_ADMIN_AUTH = path.join(__dirname, "../playwright/.auth/super-admin.json");
```

**Fix:**
```typescript
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPER_ADMIN_AUTH = path.join(__dirname, "../playwright/.auth/super-admin.json");
```

**Confidence:** HIGH - Standard ESM fix, well-documented in Node.js docs and Playwright issue tracker.

**Note from Phase 9 SUMMARY:** This error was known during Phases 9-10 but was not blocking because `--no-deps` was used for test listing verification. However, running the actual test suite requires the setup project to succeed, so this is a hard blocker for Phase 11.

## Bugs Catalog from Code Analysis

### Bug B-002: `authentication.spec.ts:161` Wrong Redirect URL

**Severity:** HIGH - Test will always fail
**File:** `tests/authentication.spec.ts:161`
**Test:** "should prevent student from accessing admin dashboard"

**Problems (2):**
1. Expects redirect to `/auth/signin` but middleware redirects to `/auth/login`
2. Test runs with default storageState (super-admin), so navigating to `/admin` will NOT redirect at all -- the user is already authorized as admin

**Current code:**
```typescript
await page.goto("/admin");
await expect(page).toHaveURL(/\/auth\/signin/);
```

**Fix options:**
- Option A: Override storageState to student, expect redirect to `/student/dashboard`
- Option B: Override storageState to empty (unauthenticated), expect redirect to `/auth\/login/`
- The test description says "prevent student from accessing admin" so Option A is correct

### Bug B-003: `authentication.spec.ts:95` Non-existent Student Account

**Severity:** MEDIUM - Test will fail on login
**File:** `tests/authentication.spec.ts:91-107`
**Test:** "should handle student login (pending approval)"

**Problem:** Uses `student@example.com` which doesn't exist in seed data. Seeded student is `test.student@example.com`.

**Fix:** Either use `testData.student.email` or create the expected account in seed.

### Bug B-004: `student-signup.spec.ts` Multiple Selector Mismatches

**Severity:** HIGH - Multiple tests will fail
**File:** `tests/student-signup.spec.ts`

**Problems:**
1. **Password field removed:** Form no longer has `input[id="password"]` -- passwords are set post-approval during registration completion
2. **No `select[name="level"]`:** Uses Radix `<Select>` component, not native `<select>` -- `selectOption()` won't work
3. **No `input[name="maxLessonsPerWeek"]`:** Field removed from signup form (hardcoded to 3)
4. **No `input[name="emergencyContact.*"]`:** Emergency contact fields removed from signup form
5. **No `input[name="parentConsent"]`:** Uses Radix `<Checkbox>` which renders `<button role="checkbox">`, not `<input type="checkbox">`
6. **Wrong success message:** Test expects "Account created successfully" but form shows "Registration submitted"
7. **Cloudflare Turnstile:** Form requires Turnstile token, automated submission will be blocked
8. **Wrong validation messages:** Test expects "Password must be at least 8 characters" but password field doesn't exist; expects "Name is required" but form uses HTML5 `required` attribute

**Affected tests:** Nearly all 8 tests in this file

**Fix:** Complete rewrite of the spec to match current signup form structure. The signup form now only collects: name, email, phone (optional), skating level (Radix Select), and parent consent (Radix Checkbox). Turnstile bypass needed for testing.

### Bug B-005: `e2e-complete-flow.spec.ts` Signup Section Broken

**Severity:** HIGH - Test #1 will fail at signup step
**File:** `tests/e2e-complete-flow.spec.ts:13-36`

**Same problems as B-004:** The complete flow test starts by signing up a student, which uses the same broken selectors (password, emergencyContact, parentConsent, wrong success message). After signup fails, all subsequent test steps will cascade-fail.

### Bug B-006: `authentication.spec.ts:91-107` Student Login Test Fragile

**Severity:** LOW - May pass or fail depending on state
**Test:** "should handle student login (pending approval)"

**Problem:** Uses `student@example.com` / `StudentPassword123!` which is not a seeded account. Will show "Login Failed" toast and the test checks for either dashboard OR pending approval message, but neither will appear.

### Bug B-007: Legacy Tests Use `loginAsAdmin` Redundantly

**Severity:** LOW - Not a failure, just inefficiency
**Files:** 13 legacy spec files

**Problem:** All 13 legacy spec files call `loginAsAdmin(page)` in beforeEach even though the default storageState is already `super-admin.json`. This means every test performs a redundant login flow (page.goto + fill + click + waitForURL), adding ~3-5 seconds per test.

**Note:** This was explicitly deferred as future work in Phase 8. Not a bug -- tests still pass, just slower.

## CI Readiness Assessment

### playwright.config.ts Analysis

| Setting | Value | CI Ready? | Notes |
|---------|-------|-----------|-------|
| `forbidOnly` | `!!process.env.CI` | YES | Prevents test.only in CI |
| `retries` | `CI ? 2 : 0` | YES | 2 retries on CI for flaky tests |
| `workers` | `CI ? 1 : undefined` | YES | Serial on CI prevents race conditions |
| `reporter` | `"html"` | PARTIAL | Consider adding `list` for CI console output |
| `trace` | `"on-first-retry"` | YES | Good for debugging CI failures |
| `screenshot` | `"only-on-failure"` | YES | Captures failure state |
| `video` | `"retain-on-failure"` | YES | Captures failure video |
| `baseURL` | `env || localhost:3100` | YES | Configurable via env |
| `webServer.command` | `npm run dev` | PARTIAL | CI may need `npm run build && npm start` |
| `webServer.reuseExistingServer` | `!process.env.CI` | YES | Fresh server on CI |
| `webServer.timeout` | `120000` | YES | 2 min should be sufficient |
| `testDir` | `./tests` | YES | Correct |

### CI Concerns

1. **Reporter:** `"html"` only generates an HTML file. CI should also use `"list"` or `"github"` reporter for console output. Recommendation: `reporter: process.env.CI ? [["list"], ["html"]] : "html"`
2. **webServer command:** `npm run dev` runs the dev server. For CI, `npm run build && npm start` would be more production-like but also much slower. Current approach is acceptable since E2E tests are testing behavior, not production build.
3. **Browser projects:** 5 browser projects defined (chromium, firefox, webkit, mobile-chrome, mobile-safari). CI should only run chromium to keep runtime reasonable. Use `--project=chromium` flag or update config.
4. **No global timeout:** Tests without explicit timeouts inherit Playwright's default 30s. This is fine for most tests.
5. **Auth directory:** `playwright/.auth/` is gitignored (added in Phase 8). CI will create fresh auth files per run. Good.

### Seed Script Status

Seed script (`tests/helpers/seed-test-data.ts`) runs successfully:
- All 13 seed sections execute without error
- Idempotent (safe to run multiple times)
- Creates all required test accounts, relationships, and data
- Runtime: ~2 seconds

## Categorized Fix Plan

### Priority 1: Blocker Fix (Must do first)

| Bug | File | Fix | Effort |
|-----|------|-----|--------|
| B-001 | auth.setup.ts | Replace `__dirname` with `import.meta.url` + `fileURLToPath` | 2 min |

### Priority 2: Phase 9-10 Test Fixes (High value, targeted)

These tests were written recently against the current codebase and should mostly work once the blocker is fixed. Issues will emerge from runtime failures only.

| File | Tests | Expected Status | Notes |
|------|-------|----------------|-------|
| coach-flows.spec.ts | 9 | Likely pass | Written against current UI |
| admin-coach-management.spec.ts | 5 | Likely pass | Written against current UI |
| student-booking-flow.spec.ts | 5 | 4 pass, 1 skip | Known skip for calendar navigation |
| data-isolation.spec.ts | 6 | Likely pass | storageState-based, simple assertions |
| role-guards.spec.ts | 7 | Likely pass | Middleware redirect, simple assertions |

### Priority 3: Legacy Test Fixes (Many failures expected)

| Bug | File | Tests Affected | Fix Approach | Effort |
|-----|------|---------------|--------------|--------|
| B-004 | student-signup.spec.ts | ~8 | Rewrite entire spec for new signup form | HIGH |
| B-005 | e2e-complete-flow.spec.ts | 1-6 | Rewrite signup section | HIGH |
| B-002 | authentication.spec.ts | 1 | Fix URL regex and storageState | LOW |
| B-003 | authentication.spec.ts | 1 | Fix email to seeded account | LOW |

### Priority 4: Runtime Failures (Discover by running tests)

The remaining ~170 legacy tests need to be run to discover runtime failures. Many of them use `loginAsAdmin` which does a real login, so they should work if the admin account is seeded correctly. Key risk areas:

- **admin-dashboard.spec.ts (22 tests):** Tests admin sidebar navigation and CRUD operations. May fail if admin dashboard text/selectors have changed since tests were written.
- **lesson-scheduling.spec.ts (22 tests):** Tests time slot creation/editing. Complex UI interactions with calendar and forms.
- **blocked-dates-management.spec.ts (16 tests):** Tests blocked date CRUD. Calendar-dependent.
- **notifications-system.spec.ts (15 tests):** Tests notification bell and popover. Timing-sensitive.
- **payments-sorting.spec.ts (20 tests):** Tests payment table sorting. Depends on seed data structure.
- **error-handling-performance.spec.ts (20 tests):** Performance benchmarks. May fail on slow machines.
- **ui-components.spec.ts (18 tests):** Tests toast notifications, dialogs. UI-dependent.
- **payment-reminder-email.spec.ts (14 tests):** Tests email reminder UI. May depend on specific UI elements.
- **reports-dashboard.spec.ts (13 tests):** Tests reports export. Download and CSV verification.

## Architecture Patterns

### Fix Approach: __dirname ESM Fix

```typescript
// auth.setup.ts - Fixed version
import { test as setup, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPER_ADMIN_AUTH = path.join(__dirname, "../playwright/.auth/super-admin.json");
const COACH_AUTH = path.join(__dirname, "../playwright/.auth/coach.json");
const COACH2_AUTH = path.join(__dirname, "../playwright/.auth/coach2.json");
const STUDENT_AUTH = path.join(__dirname, "../playwright/.auth/student.json");
```

### Fix Approach: Radix Checkbox Interaction

```typescript
// Wrong (native checkbox):
await page.check('input[name="parentConsent"]');

// Correct (Radix Checkbox -- renders as <button role="checkbox">):
await page.locator('#parentConsent[role="checkbox"]').click();

// Or by label:
await page.getByLabel("I am a parent/legal guardian").click();
```

### Fix Approach: Radix Select Interaction

```typescript
// Wrong (native select):
await page.selectOption('select[name="level"]', "PRELIMINARY");

// Correct (Radix Select):
await page.locator('[data-slot="select-trigger"]').click();
await page.locator('[role="option"]').filter({ hasText: "PRELIMINARY" }).click();
```

### Fix Approach: Turnstile Bypass for Tests

```typescript
// In the test, intercept the Turnstile script to provide a bypass:
await page.route('**/turnstile/**', (route) => route.abort());

// Or set the NEXT_PUBLIC_TURNSTILE_SITE_KEY to the Cloudflare test key:
// "1x00000000000000000000AA" is already the fallback in the source code
// This key auto-passes without user interaction in dev mode
```

### Pattern: Test Categorization for Stabilization

```
Phase 11 execution order:
1. Fix auth.setup.ts __dirname (unblocks everything)
2. Run full suite, capture results
3. Fix Phase 9-10 tests (new, high-value, small count)
4. Fix legacy auth/signup tests (broken selectors)
5. Fix remaining legacy tests (runtime failures)
6. Final full suite run to confirm zero failures
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ESM __dirname polyfill | Custom dirname function | `fileURLToPath(import.meta.url)` + `path.dirname()` | Standard Node.js pattern, one-liner |
| Radix component interaction | Custom click sequences | Playwright `getByRole()`, `getByLabel()` | Playwright handles ARIA roles natively |
| Test data cleanup between runs | Manual DB cleanup scripts | Idempotent seed with upsert/deleteMany+create | Already implemented in seed-test-data.ts |
| CI reporter configuration | Custom reporters | Playwright built-in `list`, `html`, `github` | Well-maintained, standard CI output |

## Common Pitfalls

### Pitfall 1: Fixing Tests Without Running Them
**What goes wrong:** Editing test code based on code reading alone, missing runtime-only failures
**Why it happens:** Many failures only surface during actual browser interaction (timing, rendering, network)
**How to avoid:** Always run the full suite after each fix batch, not just the changed file
**Warning signs:** Tests that "look correct" in code review but fail in headless mode

### Pitfall 2: Fixing Legacy Tests One-by-One
**What goes wrong:** Spending hours fixing individual legacy tests that have fundamental selector mismatches
**Why it happens:** Legacy tests were written against a different version of the UI
**How to avoid:** Triage first -- identify which legacy specs need full rewrites vs small fixes. Skip or mark as `test.fixme()` tests that require UI changes that don't exist yet
**Warning signs:** More than 3 selector fixes in a single test

### Pitfall 3: Running All Browser Projects
**What goes wrong:** CI takes 30+ minutes, flaky failures in webkit/firefox
**Why it happens:** 5 browser projects = 5x test runs
**How to avoid:** Run `--project=chromium` only for stabilization. Multi-browser testing is a separate concern.
**Warning signs:** `firefox` and `webkit` failures that don't repro in `chromium`

### Pitfall 4: Ignoring the Seed Script State
**What goes wrong:** Tests fail because seed data was modified by a previous test run
**Why it happens:** Some tests create/modify data that persists between runs
**How to avoid:** Always re-run seed before full test suite. The seed is idempotent.
**Warning signs:** Tests that pass individually but fail in suite

### Pitfall 5: Turnstile Blocking Signup Tests
**What goes wrong:** Student signup tests time out waiting for form submission
**Why it happens:** Cloudflare Turnstile blocks automated form submissions
**How to avoid:** The fallback site key `1x00000000000000000000AA` is a Cloudflare testing key that auto-passes. Verify this works in headless mode. If not, route-intercept the Turnstile script.
**Warning signs:** Signup tests hanging on "Verification Required" toast

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `__dirname` in ESM | `import.meta.url` + `fileURLToPath` | Node.js ESM adoption | auth.setup.ts must be updated |
| Native `<select>` | Radix `<Select>` component | v1.0 shadcn migration | `selectOption()` won't work |
| Native `<input checkbox>` | Radix `<Checkbox>` component | v1.0 shadcn migration | `page.check()` won't work |
| Password in signup | Password set post-approval | Recent app change | signup tests completely broken |
| `loginAsAdmin()` in every test | storageState from setup project | Phase 8 | Redundant but harmless |

## Open Questions

1. **Legacy test rewrite scope:**
   - What we know: student-signup.spec.ts and parts of e2e-complete-flow.spec.ts need full rewrites due to form changes
   - What's unclear: How many of the other ~170 legacy tests will have selector mismatches vs pass cleanly
   - Recommendation: Run full suite after __dirname fix to get actual pass/fail data before committing to rewrite scope

2. **Turnstile in headless mode:**
   - What we know: The fallback site key `1x00000000000000000000AA` is used when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is not set
   - What's unclear: Whether this test key auto-passes in headless Chromium or still requires interaction
   - Recommendation: Test empirically. If it blocks, route-intercept `**/turnstile/**` in signup tests.

3. **CI webServer command:**
   - What we know: Current config uses `npm run dev` which starts Next.js dev server
   - What's unclear: Whether CI should use production build (`npm run build && npm start`) for more realistic testing
   - Recommendation: Keep `npm run dev` for now -- dev mode testing is sufficient for E2E verification

## Sources

### Primary (HIGH confidence)
- Direct code analysis of all 18 spec files in `tests/` directory
- Direct code analysis of `auth.setup.ts`, `test-utils.ts`, `seed-test-data.ts`
- Direct code analysis of `src/app/auth/signup/page.tsx`, `src/app/auth/login/page.tsx`, `middleware.ts`
- `npx playwright test --list --no-deps --project=chromium` output (222 tests, 18 files)
- `npx playwright test --project=chromium` output (blocked by __dirname error)
- `npx tsx tests/helpers/seed-test-data.ts` output (seed runs successfully)
- Phase 8 SUMMARY files (08-01, 08-02)
- Phase 9 SUMMARY files (09-01, 09-02)
- Phase 10 SUMMARY files (10-01, 10-02)
- `playwright.config.ts` direct reading

### Secondary (MEDIUM confidence)
- Playwright GitHub issue #32386 - __dirname in ESM context
- Node.js ESM documentation for `import.meta.url` pattern

### Tertiary (LOW confidence)
- Estimate of legacy test pass rates (need runtime data to confirm)

## Metadata

**Confidence breakdown:**
- __dirname blocker: HIGH - Reproduced, fix verified in docs
- Signup form mismatches: HIGH - Direct code comparison
- Auth test bugs: HIGH - Direct code comparison against middleware
- Legacy test pass estimates: LOW - Need actual runtime data
- CI readiness: HIGH - Direct config reading

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable domain, no external dependencies changing)
