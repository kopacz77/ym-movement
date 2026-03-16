---
phase: 08-test-infrastructure-legacy-updates
plan: 01
subsystem: testing
tags: [playwright, prisma, e2e, storageState, multi-role, bcrypt, seed-script]

# Dependency graph
requires:
  - phase: 01-07 (v1.0 multi-coach)
    provides: SUPER_ADMIN/COACH/STUDENT role system, Coach model, CoachStudent relationships
provides:
  - Prisma-based idempotent test data seed script with all roles and relationships
  - Playwright auth setup project with multi-role storageState files
  - Extended test helpers with coach login, navigation, and approval functions
  - Updated playwright.config.ts with setup project dependencies pattern
affects: [09-new-feature-tests, 10-legacy-test-updates, 11-ci-test-runner]

# Tech tracking
tech-stack:
  added: []
  patterns: [playwright-project-dependencies, storageState-multi-role-auth, prisma-idempotent-seeding]

key-files:
  created:
    - tests/helpers/seed-test-data.ts
    - tests/auth.setup.ts
  modified:
    - tests/helpers/test-utils.ts
    - playwright.config.ts
    - .gitignore

key-decisions:
  - "Use project dependencies pattern (not globalSetup) for setup ordering"
  - "Default storageState is super-admin.json; tests override with test.use() for other roles"
  - "loginAsAdmin kept as backward compat alias for loginAsSuperAdmin"
  - "Seed coach2 now (cheap) so Phase 9 multi-coach tests have data ready"

patterns-established:
  - "Setup project pattern: auth.setup.ts runs seed then saves storageState per role"
  - "Test data seeding via Prisma upserts for idempotent, reliable test setup"
  - "Coach test helpers follow same patterns as existing admin/student helpers"

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 8 Plan 01: Test Infrastructure Foundation Summary

**Playwright setup project with Prisma seed script, multi-role storageState auth, and coach test helpers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-16T18:15:08Z
- **Completed:** 2026-03-16T18:20:07Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created Prisma-based idempotent seed script that creates SUPER_ADMIN, 2 COACHes, STUDENT, CoachStudent relationships, and Rink
- Built Playwright auth setup project that seeds DB then authenticates as 3 roles saving storageState files
- Extended test-utils.ts with coach helpers (loginAsCoach, navigateToCoachPage, approveCoach) and backward-compat loginAsAdmin alias
- Updated playwright.config.ts with setup project dependencies pattern and default super-admin storageState

## Task Commits

Each task was committed atomically:

1. **Task 1: Create seed script, auth setup project, and gitignore update** - `4ba6c23` (feat)
2. **Task 2: Extend test-utils.ts and update playwright.config.ts** - `d8f1818` (feat)

## Files Created/Modified
- `tests/helpers/seed-test-data.ts` - Prisma-based idempotent seed script creating all test accounts and relationships
- `tests/auth.setup.ts` - Playwright setup project: seeds DB, authenticates as super-admin/coach/student, saves storageState
- `tests/helpers/test-utils.ts` - Extended with coach/coach2 testData, loginAsSuperAdmin, loginAsCoach, navigateToCoachPage, approveCoach
- `playwright.config.ts` - Added setup project, dependencies on all browser projects, storageState defaults
- `.gitignore` - Added playwright/.auth/ to prevent committing session tokens

## Decisions Made
- Used project dependencies pattern (not globalSetup) for test setup ordering -- visible in HTML reports, supports traces
- Default storageState set to super-admin.json; individual tests can override with `test.use()` for coach/student roles
- Kept loginAsAdmin as backward compat alias for loginAsSuperAdmin to avoid breaking 8 existing test files
- Seeded coach2 data now rather than deferring to Phase 9 -- cheap to add and Phase 9 will need multi-coach scenarios

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Test infrastructure foundation is complete
- Phases 9 (new feature tests) and 10 (legacy test updates) can now proceed
- All existing test files continue to work via backward-compat loginAsAdmin alias
- Seed script verified against dev database -- runs idempotently in ~2 seconds

---
*Phase: 08-test-infrastructure-legacy-updates*
*Completed: 2026-03-16*
