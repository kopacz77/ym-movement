---
phase: 08-test-infrastructure-legacy-updates
plan: 02
subsystem: testing
tags: [playwright, e2e, test-utils, credential-consolidation]

# Dependency graph
requires:
  - phase: 08-01
    provides: shared test-utils.ts with loginAsAdmin alias, testData constants, loginAsStudent
provides:
  - All 13 spec files using shared test-utils imports for credentials
  - Zero inline loginAsAdmin definitions in spec files
  - Zero hardcoded credential strings in spec files
  - debug-student-error.spec.ts using relative URLs compatible with playwright baseURL
affects: [08-03 (if exists), 09-multi-coach-tests, 10-stabilization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All spec files import credentials from tests/helpers/test-utils.ts"
    - "testData.admin.email/password for inline credential references"
    - "loginAsAdmin/loginAsStudent for full login helper functions"
    - "Relative URLs (/) instead of hardcoded localhost:3000"

key-files:
  created: []
  modified:
    - tests/admin-dashboard.spec.ts
    - tests/lesson-scheduling.spec.ts
    - tests/authentication.spec.ts
    - tests/debug-student-error.spec.ts
    - tests/student-signup.spec.ts

key-decisions:
  - "Only changed imports and credential references; zero test logic or assertions modified"
  - "Kept explicit loginAsAdmin calls in beforeEach (redundant with storageState but harmless; migration is future work)"

patterns-established:
  - "Credential single source of truth: all 13 spec files reference test-utils for admin/student credentials"

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 8 Plan 2: Legacy Spec Credential Consolidation Summary

**Consolidated all 13 E2E spec files to use shared test-utils imports, eliminating inline loginAsAdmin definitions, hardcoded credentials, and the broken "admin123" password**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T18:22:24Z
- **Completed:** 2026-03-16T18:24:37Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments
- Removed inline loginAsAdmin from admin-dashboard.spec.ts and lesson-scheduling.spec.ts, replacing with shared test-utils import
- Eliminated the broken "admin123" password in lesson-scheduling.spec.ts (was never the correct password)
- Replaced all hardcoded "admin@test.com" and "ADMINPASS2025!" in authentication.spec.ts, debug-student-error.spec.ts, and student-signup.spec.ts with testData constants
- Converted debug-student-error.spec.ts from hardcoded localhost:3000 URLs to relative paths compatible with playwright baseURL

## Task Commits

Each task was committed atomically:

1. **Task 1: Update admin-dashboard.spec.ts and lesson-scheduling.spec.ts** - `9e4c5d1` (refactor)
2. **Task 2: Update authentication.spec.ts, debug-student-error.spec.ts, and student-signup.spec.ts** - `a6fc48c` (refactor)

## Files Created/Modified
- `tests/admin-dashboard.spec.ts` - Replaced inline loginAsAdmin with import from test-utils
- `tests/lesson-scheduling.spec.ts` - Replaced inline loginAsAdmin (wrong password) and loginAsStudent with imports from test-utils
- `tests/authentication.spec.ts` - Replaced 3 sets of hardcoded admin credentials with testData.admin.* constants
- `tests/debug-student-error.spec.ts` - Replaced hardcoded credentials with testData.admin.*, converted 3 localhost URLs to relative paths
- `tests/student-signup.spec.ts` - Replaced hardcoded admin@test.com in duplicate email test with testData.admin.email

## Decisions Made
- Only swapped credential sources and URLs; zero changes to test logic, assertions, describes, or test structure
- Kept explicit loginAsAdmin() calls in beforeEach blocks (redundant with storageState default but harmless; migrating to pure storageState is future optimization)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 13 spec files now use centralized credentials from test-utils
- Ready for SUPER_ADMIN role migration or multi-coach test scenarios
- No blockers for downstream phases

---
*Phase: 08-test-infrastructure-legacy-updates*
*Completed: 2026-03-16*
