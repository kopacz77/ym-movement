---
phase: 02-coach-dashboard-profile
plan: 01
subsystem: database, auth
tags: [prisma, schema, migration, coach, suspension, proposals, auth, useCurrentUser]

# Dependency graph
requires:
  - phase: 01-auth-schema-foundation
    provides: "Coach model, Role enum with COACH/SUPER_ADMIN, coachProcedure middleware"
provides:
  - "Coach suspension fields (suspendedAt, suspendedById, suspendedReason)"
  - "ProposedTimeSlot model with ProposalStatus enum (PENDING/APPROVED/DENIED)"
  - "Coach profile data in /api/auth/me endpoint"
  - "coachId and isCoach fields in useCurrentUser hook"
affects:
  - 02-02 (coach dashboard pages need coachId from useCurrentUser)
  - 02-03 (coach profile editing needs Coach data from /api/auth/me)
  - 02-04 (coach management needs suspension fields)
  - 02-05 (time slot proposals need ProposedTimeSlot model)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coach auth wiring: /api/auth/me returns Coach select for COACH/ADMIN/SUPER_ADMIN roles"
    - "useCurrentUser coachId fetch follows same pattern as studentId fetch"

key-files:
  created:
    - "prisma/migrations/20260315152234_add_coach_suspension_and_proposals/migration.sql"
  modified:
    - "prisma/schema.prisma"
    - "src/app/api/auth/me/route.ts"
    - "src/hooks/useCurrentUser.ts"

key-decisions:
  - "Coach suspension fields placed after approvedById, before pricing fields"
  - "ProposalStatus enum placed after Role enum"
  - "ProposedTimeSlot model placed after CoachStudent model"
  - "ADMIN/SUPER_ADMIN block also fetches Coach profile to populate coachId"

patterns-established:
  - "Coach data in auth: /api/auth/me conditionally includes Coach select for COACH/ADMIN/SUPER_ADMIN roles"
  - "useCurrentUser coachId: COACH role fetches /api/auth/me for Coach profile; ADMIN/SUPER_ADMIN also fetch for coachId"

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 2 Plan 1: Schema & Auth Wiring Summary

**Coach suspension fields, ProposedTimeSlot model with ProposalStatus enum, and auth layer wiring for coachId/isCoach in useCurrentUser**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T15:21:36Z
- **Completed:** 2026-03-15T15:24:21Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added suspendedAt/suspendedById/suspendedReason to Coach model for suspension management
- Created ProposedTimeSlot model with ProposalStatus enum (PENDING/APPROVED/DENIED) for coach availability proposals
- Wired /api/auth/me to return Coach profile data (id, isApproved, isActive, suspendedAt, bio, skills) for coach-role users
- Extended useCurrentUser hook with coachId and isCoach fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema changes -- suspension fields, ProposedTimeSlot model, migration** - `f67e20f` (feat)
2. **Task 2: Wire auth layer -- /api/auth/me Coach data + useCurrentUser hook** - `0da3a51` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added suspension fields to Coach, ProposalStatus enum, ProposedTimeSlot model with Coach/Rink relations
- `prisma/migrations/20260315152234_add_coach_suspension_and_proposals/migration.sql` - Database migration for new fields and table
- `src/app/api/auth/me/route.ts` - Added Coach select conditional for COACH/ADMIN/SUPER_ADMIN roles, removed Phase 1 TODO
- `src/hooks/useCurrentUser.ts` - Added coachId state, COACH role fetch block, ADMIN/SUPER_ADMIN coach profile fetch, isCoach in return

## Decisions Made
- Coach suspension fields placed after `approvedById` and before pricing fields (maintaining logical field grouping)
- ProposalStatus enum placed after Role enum (following alphabetical convention for enums section)
- ProposedTimeSlot model placed after CoachStudent model (following plan instruction for alphabetical order)
- ADMIN/SUPER_ADMIN block in useCurrentUser also fetches Coach profile to populate coachId silently (since SUPER_ADMIN is also a coach per role hierarchy)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Coach suspension fields ready for CMGT-04 (coach management)
- ProposedTimeSlot model ready for CDSH-02 (coach availability proposals)
- coachId available in useCurrentUser for all coach dashboard pages
- /api/auth/me returns Coach profile data for coach-role authenticated users

---
*Phase: 02-coach-dashboard-profile*
*Completed: 2026-03-15*
