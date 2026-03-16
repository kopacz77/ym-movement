---
phase: 11-stabilization
plan: 01
subsystem: testing
tags: [playwright, esm, baseline, ci]

requires:
  - phase: 08-test-infrastructure
    provides: "Playwright config, auth.setup.ts, test helpers, seed data"
  - phase: 09-coach-tests
    provides: "Coach flow and admin coach management spec files"
  - phase: 10-student-security-tests
    provides: "Student booking, data isolation, role guards spec files"
provides:
  - "ESM-compatible auth.setup.ts that runs without __dirname errors"
  - "CI-ready Playwright reporter config (list + html)"
  - "Reliable serial auth setup with hydration-safe login flow"
  - "Complete baseline of 222 tests: 92 pass, 130 fail across 18 spec files"
affects: [11-02, 11-03, 11-04]

tech-stack:
  added: []
  patterns:
    - "ESM __dirname replacement: fileURLToPath(import.meta.url) + path.dirname()"
    - "Serial setup mode for dev server cold compilation reliability"
    - "waitForLoadState('networkidle') before form interaction"

key-files:
  created: []
  modified:
    - tests/auth.setup.ts
    - playwright.config.ts

key-decisions:
  - "Auth setup runs serially to avoid overwhelming dev server during cold route compilation"
  - "waitForURL timeout increased from 15s to 30s for first-time Next.js route compilation"
  - "CI reporter uses list + html; local development keeps html only"

patterns-established:
  - "Login helper function with networkidle wait + visible element wait before form fill"

duration: 29min
completed: 2026-03-16
---

# Phase 11 Plan 01: Fix ESM Blocker and Capture Baseline Summary

**Fixed critical __dirname ESM blocker in auth.setup.ts, stabilized auth setup reliability, added CI reporter config, and captured full baseline: 92/222 tests pass (41%), 130 fail (59%)**

## Performance

- **Duration:** 29 min
- **Started:** 2026-03-16T21:39:18Z
- **Completed:** 2026-03-16T22:08:54Z
- **Tasks:** 2/2 completed
- **Files modified:** 2 (tests/auth.setup.ts, playwright.config.ts)

## Accomplishments

- Fixed the __dirname ReferenceError that blocked ALL 222 tests from running
- Stabilized auth.setup.ts with serial mode and hydration-safe login flow
- Added CI-aware reporter config (list + html on CI, html only locally)
- Ran full chromium test suite and captured comprehensive baseline results
- All 5 setup tests now pass reliably (seed + 4 auth logins)

## Baseline Test Results

**Run date:** 2026-03-16
**Project:** chromium only (per stabilization strategy)
**Duration:** 18.7 minutes
**Workers:** 2

### Overall Results

| Metric | Count | Percentage |
|--------|-------|------------|
| Total tests | 222 | 100% |
| Passed | 92 | 41% |
| Failed | 130 | 59% |
| Skipped | 0 | 0% |

### Results by Spec File

| # | Spec File | Total | Pass | Fail | Origin | Priority |
|---|-----------|-------|------|------|--------|----------|
| 1 | admin-coach-management.spec.ts | 5 | 1 | 4 | Phase 9 | HIGH |
| 2 | admin-dashboard.spec.ts | 22 | 5 | 17 | Legacy | MEDIUM |
| 3 | authentication.spec.ts | 15 | 8 | 7 | Legacy | MEDIUM |
| 4 | blocked-dates-management.spec.ts | 16 | 9 | 7 | Legacy | LOW |
| 5 | coach-flows.spec.ts | 9 | 1 | 8 | Phase 9 | HIGH |
| 6 | data-isolation.spec.ts | 6 | 0 | 6 | Phase 10 | HIGH |
| 7 | debug-student-error.spec.ts | 1 | 0 | 1 | Legacy | LOW |
| 8 | e2e-complete-flow.spec.ts | 6 | 0 | 6 | Legacy | LOW |
| 9 | error-handling-performance.spec.ts | 20 | 11 | 9 | Legacy | LOW |
| 10 | lesson-scheduling.spec.ts | 22 | 16 | 6 | Legacy | MEDIUM |
| 11 | notifications-system.spec.ts | 15 | 4 | 11 | Legacy | MEDIUM |
| 12 | payment-reminder-email.spec.ts | 14 | 10 | 4 | Legacy | LOW |
| 13 | payments-sorting.spec.ts | 20 | 10 | 10 | Legacy | MEDIUM |
| 14 | reports-dashboard.spec.ts | 13 | 1 | 12 | Legacy | MEDIUM |
| 15 | role-guards.spec.ts | 7 | 0 | 7 | Phase 10 | HIGH |
| 16 | student-booking-flow.spec.ts | 5 | 0 | 5 | Phase 10 | HIGH |
| 17 | student-signup.spec.ts | 8 | 2 | 6 | Legacy | LOW |
| 18 | ui-components.spec.ts | 18 | 14 | 4 | Legacy | LOW |

### Phase 9-10 Test Results (HIGH PRIORITY)

| Spec File | Origin | Pass | Fail | Total |
|-----------|--------|------|------|-------|
| admin-coach-management.spec.ts | Phase 9 | 1 | 4 | 5 |
| coach-flows.spec.ts | Phase 9 | 1 | 8 | 9 |
| student-booking-flow.spec.ts | Phase 10 | 0 | 5 | 5 |
| data-isolation.spec.ts | Phase 10 | 0 | 6 | 6 |
| role-guards.spec.ts | Phase 10 | 0 | 7 | 7 |
| **TOTAL** | | **2** | **30** | **32** |

Phase 9-10 pass rate: 6% (2/32) -- these are high-value tests written against current codebase, most failures are selector/timing issues that should be fixable.

### Legacy Test Results

| Spec File | Pass | Fail | Total |
|-----------|------|------|-------|
| admin-dashboard.spec.ts | 5 | 17 | 22 |
| authentication.spec.ts | 8 | 7 | 15 |
| blocked-dates-management.spec.ts | 9 | 7 | 16 |
| debug-student-error.spec.ts | 0 | 1 | 1 |
| e2e-complete-flow.spec.ts | 0 | 6 | 6 |
| error-handling-performance.spec.ts | 11 | 9 | 20 |
| lesson-scheduling.spec.ts | 16 | 6 | 22 |
| notifications-system.spec.ts | 4 | 11 | 15 |
| payment-reminder-email.spec.ts | 10 | 4 | 14 |
| payments-sorting.spec.ts | 10 | 10 | 20 |
| reports-dashboard.spec.ts | 1 | 12 | 13 |
| student-signup.spec.ts | 2 | 6 | 8 |
| ui-components.spec.ts | 14 | 4 | 18 |
| **TOTAL** | **90** | **100** | **190** |

Legacy pass rate: 47% (90/190)

### Failure Categories

| Error Type | Count | Description |
|------------|-------|-------------|
| toBeVisible failure | 49 | Element not found or not visible |
| strict mode violation | 35 | Selector resolves to 2+ elements (duplicate sidebar/main content) |
| toHaveURL failure | 13 | Wrong redirect URL or page didn't navigate |
| element not found | 12 | Selector targets non-existent element |
| localStorage SecurityError | 10 | Access denied to localStorage in test context |
| locator.click strict mode | 10 | Click target ambiguous |
| locator.isVisible strict mode | 9 | Visibility check target ambiguous |
| TimeoutError | 7 | Page/element load timeout |
| page.waitForEvent ended | 6 | Test ended before expected event |
| Performance assertions | 6 | toBeLessThanOrEqual / toBeGreaterThanOrEqual |
| Test timeout | 10 | Various locator operations exceeding 30s |
| CSS selector parse error | 2 | Invalid CSS selector syntax |
| Other | 3 | RegExp syntax error, page aborted, etc. |

### Key Observations

1. **Strict mode violations (35+)** are the #1 systematic issue. The sidebar renders duplicate elements (heading, tabs, search inputs) that tests find ambiguously. Fix: scope selectors to `main` content area or use `getByRole()` with `exact: true`.

2. **toBeVisible failures (49)** often cascade from strict mode violations -- when the locator resolves to 2 elements, Playwright treats it as a failure even if one is visible.

3. **localStorage SecurityError (10)** affects tests that try to access localStorage in contexts where it's denied (likely unauthenticated pages or cross-origin iframes).

4. **Phase 9-10 tests (30/32 failed)** were written against the current UI but never run with the setup project enabled. Most failures are likely selector scoping or timing issues, not fundamental test logic problems.

5. **student-signup.spec.ts (6/8 failed)** has fundamental selector mismatches: form no longer has password field, uses Radix Select/Checkbox instead of native elements, requires Turnstile bypass. Needs full rewrite.

6. **e2e-complete-flow.spec.ts (6/6 failed)** starts with student signup which has the same broken selectors, cascading all subsequent tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Auth setup flaky due to parallel cold compilation**

- **Found during:** Task 2 initial run
- **Issue:** All 4 auth setup tests ran in parallel (5 workers), each hitting different dashboard routes simultaneously. The Next.js dev server was still compiling routes during the 15-second timeout, causing TimeoutError. Screenshots showed "Compiling..." in the dev tools indicator and "Loading..." on the submit button.
- **Fix:** Added `setup.describe.configure({ mode: "serial" })` to run setup tests one at a time, increased waitForURL timeout from 15s to 30s, added `waitForLoadState("networkidle")` and `waitFor({ state: "visible" })` before form interaction, extracted shared `login()` helper function.
- **Files modified:** tests/auth.setup.ts
- **Verification:** All 5 setup tests pass reliably on subsequent runs (40s total)
- **Committed in:** c8ccac9

---

**Total deviations:** 1 auto-fixed (blocking issue preventing baseline capture)
**Impact on plan:** Essential fix -- without serial auth setup, zero tests could run for baseline.

## Issues Encountered

- The baseline run took 18.7 minutes for 222 tests with 2 workers. This is slow but expected for a cold dev server with many route compilations.
- The 130/222 failure rate (59%) is higher than anticipated. The research predicted Phase 9-10 tests would "likely pass" but 30/32 failed, suggesting selector scoping issues are more pervasive than expected.

## Next Phase Readiness

- Baseline data captured -- Plans 02 and 03 can now triage fixes by priority
- Phase 9-10 tests (32 tests, 30 failing) should be fixed first as HIGH priority
- Legacy tests with strict mode violations (~35 failures) can likely be batch-fixed by scoping selectors to `main` content area
- student-signup.spec.ts and e2e-complete-flow.spec.ts need full rewrites (known from research)
- Raw test output saved at `.planning/phases/11-stabilization/baseline-raw-output.txt`

---
*Phase: 11-stabilization*
*Completed: 2026-03-16*
