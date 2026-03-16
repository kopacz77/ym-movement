---
phase: 09-coach-admin-flow-tests
plan: 01
subsystem: testing
tags: [playwright, e2e, coach-lifecycle, storageState, prisma-seed]

# Dependency graph
requires:
  - phase: 08-test-infrastructure-legacy-updates
    provides: Playwright config, auth setup, seed script, test-utils helpers, storageState files
provides:
  - Extended seed script with pending coaches, ProposedTimeSlot, completed lesson+payment
  - coach3 and coach4 test data entries in test-utils.ts
  - coach-flows.spec.ts with 9 E2E tests covering CTST-01 through CTST-05
affects: [09-02-admin-coach-management-tests, 10-student-security-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role-switching via test.use({ storageState }) in nested describe blocks"
    - "Shadcn Select interaction: click trigger then click [role=option]"
    - "Popover Calendar interaction: click trigger then click gridcell button"
    - "Custom toast confirmation: click button:has-text(Delete) for showDeleteConfirmation"
    - "deleteMany + create pattern for seed data without unique constraints"

key-files:
  created:
    - tests/coach-flows.spec.ts
  modified:
    - tests/helpers/seed-test-data.ts
    - tests/helpers/test-utils.ts

key-decisions:
  - "Two pending coaches (coach3, coach4) seeded independently for approve/deny test isolation"
  - "Completed lesson+payment seeded for ATST-03 payout report data (shared across plans)"
  - "Rink upsert return value captured for downstream ProposedTimeSlot and Lesson creation"
  - "Deny confirmation uses button:has-text(Delete) matching showDeleteConfirmation toast pattern"

patterns-established:
  - "Pattern: Seed data uses deleteMany + create for entities without unique constraints (ProposedTimeSlot, Lesson)"
  - "Pattern: Test role switching via nested test.describe with test.use({ storageState })"
  - "Pattern: Wait for first data-dependent element with { timeout: 10000 } before asserting siblings"

# Metrics
duration: 6min
completed: 2026-03-16
---

# Phase 9 Plan 1: Coach Flows E2E Tests Summary

**Extended test seed with pending coaches, proposals, and lesson/payment data; created 9-test coach-flows spec covering signup, approval/denial, dashboard, profile persistence, and proposal lifecycle**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-16T19:04:46Z
- **Completed:** 2026-03-16T19:11:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Extended seed script with coach3 (pending for approval), coach4 (pending for denial), a PENDING ProposedTimeSlot, and a completed lesson+payment for payout reports
- Created coach-flows.spec.ts with 9 test cases across 5 CTST requirements using storageState role switching
- All seed operations are idempotent (verified by running twice without errors)
- Playwright test list confirms all 9 tests parse correctly across all 5 requirement groups

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend seed script and test-utils with Phase 9 data** - `672f655` (feat)
2. **Task 2: Create coach-flows.spec.ts with CTST-01 through CTST-05** - `152b87d` (test)

## Files Created/Modified
- `tests/coach-flows.spec.ts` - 9 E2E tests covering coach signup page rendering, admin approval/denial, coach dashboard/students/earnings, profile edit persistence, and proposal submit/approve flows
- `tests/helpers/seed-test-data.ts` - Extended with coach3, coach4 (pending), ProposedTimeSlot (PENDING), RinkTimeSlot, Lesson (COMPLETED), and Payment (COMPLETED) for E2E test scenarios
- `tests/helpers/test-utils.ts` - Added coach3 and coach4 entries to testData object

## Decisions Made
- Seeded two separate pending coaches (coach3 for approval, coach4 for denial) to allow independent testing without ordering dependencies
- Used deleteMany + create pattern for ProposedTimeSlot, Lesson, and Payment since these lack unique constraints suitable for upsert
- Captured rink upsert return value (previously discarded) to use as foreign key for ProposedTimeSlot and Lesson creation
- Deny confirmation button identified as "Delete" from showDeleteConfirmation() toast pattern (not "Confirm" as initially suggested)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing `__dirname` error in auth.setup.ts when running in ESM context prevents `--list` with dependencies, but `--no-deps` confirms spec file parses correctly with all 9 tests. This is a known pre-existing issue unrelated to this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- coach-flows.spec.ts ready for full E2E execution against dev server (all tests listed successfully)
- Seed data now includes all entities needed for both 09-01 (coach flows) and 09-02 (admin coach management) tests
- Pending coaches, ProposedTimeSlot, and completed lesson+payment data available for admin management tests

---
*Phase: 09-coach-admin-flow-tests*
*Completed: 2026-03-16*
