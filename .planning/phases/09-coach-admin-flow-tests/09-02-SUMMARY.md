---
phase: 09-coach-admin-flow-tests
plan: 02
subsystem: testing
tags: [playwright, e2e, admin-coach-management, revenue-split, payout-report, csv-export]

# Dependency graph
requires:
  - phase: 09-01
    provides: Extended seed script with coaches, pending coaches, completed lesson+payment data
  - phase: 08-test-infrastructure-legacy-updates
    provides: Playwright config, auth setup, seed script, test-utils helpers, storageState files
provides:
  - admin-coach-management.spec.ts with 5 E2E tests covering ATST-01 through ATST-03
affects: [10-student-security-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional data/empty state handling with .or() pattern for resilient tests"
    - "Inline edit cycle: click pencil -> fill input -> click save -> verify toast -> verify display -> cleanup"
    - "CSV download capture with page.waitForEvent('download') before click"

key-files:
  created:
    - tests/admin-coach-management.spec.ts
  modified: []

key-decisions:
  - "No test.use() override needed -- all tests run as super-admin using default storageState"
  - "Revenue split test resets value to 70% after changing to 75% for idempotent test runs"
  - "Payout report and CSV export tests handle both data and empty states gracefully"
  - "Used button filter with svg child for pencil icon selection (more resilient than class selectors)"

patterns-established:
  - "Pattern: Graceful data/empty handling with locator.or() and conditional isVisible() check"
  - "Pattern: Inline edit cleanup to restore original values for test idempotency"
  - "Pattern: Download event listener registered before click to prevent race conditions"

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 9 Plan 2: Admin Coach Management E2E Tests Summary

**5-test admin-coach-management spec covering coach overview with multi-coach table, inline revenue split editor with idempotent cleanup, and payout report with CSV download verification**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T19:15:02Z
- **Completed:** 2026-03-16T19:17:20Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created admin-coach-management.spec.ts with 5 test cases across 3 ATST requirements
- ATST-01: Verifies multi-coach table (Test Coach, Test Coach 2), status badges, column headers, Add Coach button, and Pending Approvals tab
- ATST-02: Full inline revenue split edit cycle with cleanup reset to 70% for idempotency
- ATST-03: Payout report summary cards, per-coach table headers, total footer, and CSV export download with filename verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin-coach-management.spec.ts with ATST-01, ATST-02, ATST-03** - `f882396` (test)

## Files Created/Modified
- `tests/admin-coach-management.spec.ts` - 5 E2E tests covering admin coach overview, inline revenue split editor, and payout report with CSV export

## Decisions Made
- All tests use default super-admin storageState from playwright.config.ts (no file-level test.use() override)
- Revenue split editor test includes cleanup step that resets value to 70% after testing with 75%
- Payout report tests use .or() pattern to handle both data-present and empty states gracefully
- CSV export test conditionally runs download verification only when export button is visible (data exists)
- Used button.filter({ has: page.locator("svg") }).first() for pencil icon selection rather than fragile CSS class selectors

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 9 is now complete (both plans 01 and 02 done)
- All coach lifecycle (CTST-01 through CTST-05) and admin management (ATST-01 through ATST-03) E2E tests are created
- Phase 10 (Student & Security Tests) can proceed independently

---
*Phase: 09-coach-admin-flow-tests*
*Completed: 2026-03-16*
