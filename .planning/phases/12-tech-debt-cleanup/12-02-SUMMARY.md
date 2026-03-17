---
phase: 12-tech-debt-cleanup
plan: 02
subsystem: testing
tags: [playwright, e2e, test-utils, fixme, proxy, redirect]

# Dependency graph
requires:
  - phase: 12-01
    provides: proxy.ts replacing middleware.ts + Sign Out buttons in sidebar
provides:
  - Clean test-utils.ts with only 4 active exports (down from 22)
  - 9 previously fixme'd/skipped tests re-enabled across role-guards and authentication specs
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Minimal test-utils: only export functions actively imported by spec files"

key-files:
  created: []
  modified:
    - tests/helpers/test-utils.ts
    - tests/role-guards.spec.ts
    - tests/authentication.spec.ts

key-decisions:
  - "Removed 18 orphaned exports rather than deprecating them -- no consumers exist"
  - "Removed expect import since no remaining function uses it"
  - "Replaced FIXME block comments with brief proxy.ts reference comments"

patterns-established:
  - "Test utilities contain only functions with active importers -- no speculative helpers"

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 12 Plan 02: Test Unfixme and Test-Utils Cleanup Summary

**Removed 18 orphaned exports from test-utils.ts (415 to 71 lines) and re-enabled 9 fixme'd redirect/auth tests now that proxy.ts handles request interception**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T15:32:43Z
- **Completed:** 2026-03-17T15:35:18Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Reduced test-utils.ts from 415 lines to 71 lines by removing 18 unused exports
- Re-enabled 6 role-guard redirect tests in role-guards.spec.ts (test.fixme -> test)
- Re-enabled 3 authentication redirect tests in authentication.spec.ts (test.fixme -> test)
- Removed all FIXME comments from both spec files, replaced with proxy.ts references
- TypeScript compilation passes cleanly across all modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove orphaned exports from test-utils.ts** - `4a1b780` (refactor)
2. **Task 2: Unfixme redirect tests and unskip sign-out test** - `33a87a6` (feat)

## Files Created/Modified
- `tests/helpers/test-utils.ts` - Reduced to 4 exports: testData, loginAsSuperAdmin, loginAsAdmin, generateTestEmail
- `tests/role-guards.spec.ts` - 6 test.fixme() changed to test(), FIXME comments removed, middleware references updated to proxy.ts
- `tests/authentication.spec.ts` - 3 test.fixme() changed to test(), FIXME block comments replaced with brief proxy.ts notes

## Decisions Made
- Removed 18 orphaned exports entirely rather than deprecating -- grep confirmed zero consumers across the test suite
- Removed the `expect` import from test-utils.ts since only deleted functions (assertNoConsoleErrors, testFormValidation) used it
- Replaced multi-line FIXME block comments with single-line comments referencing proxy.ts, keeping comments useful without being stale

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All test tech debt is resolved: zero fixme/skip markers remain in redirect/auth tests
- test-utils.ts is clean with only actively-used exports
- Phase 12 (tech-debt-cleanup) is complete -- both plans executed successfully
- Full E2E suite should now run all 9 previously deferred tests

---
*Phase: 12-tech-debt-cleanup*
*Completed: 2026-03-17*
