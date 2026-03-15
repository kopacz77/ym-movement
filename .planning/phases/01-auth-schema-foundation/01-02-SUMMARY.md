---
phase: 01-auth-schema-foundation
plan: 02
subsystem: auth
tags: [next-auth, middleware, typescript, role-types, super-admin, coach]

# Dependency graph
requires:
  - phase: 01-auth-schema-foundation plan 01
    provides: TRPC middleware role guards, role helper utility, JWT callback refresh
provides:
  - Next.js middleware accepting SUPER_ADMIN and COACH roles with proper route guards
  - Login page redirecting all four roles to correct dashboards
  - TypeScript role union types updated across 6 type definition files
  - useCurrentUser hook treating SUPER_ADMIN as admin
  - Coach route matcher in middleware (/coach/:path*)
affects:
  - 01-auth-schema-foundation plan 03 (schema migration depends on auth layer being ready)
  - 02-coach-dashboard (coach routes now accepted by middleware)
  - 03-query-scoping (profileQueries.ts still has hardcoded ADMIN checks, Phase 3 scope)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role union ordering: SUPER_ADMIN | ADMIN | COACH | STUDENT (consistent across all files)"
    - "Admin route access: both ADMIN and SUPER_ADMIN allowed"
    - "Coach route access: COACH, SUPER_ADMIN, and ADMIN allowed"

key-files:
  created: []
  modified:
    - middleware.ts
    - src/app/auth/login/page.tsx
    - src/types/index.ts
    - src/lib/enhanced-types.ts
    - src/lib/context-utils.tsx
    - src/contexts/AuthContext.tsx
    - src/contexts/OptimizedAuthContext.tsx
    - src/hooks/useCurrentUser.ts
    - src/app/(protected)/student/schedule/[lessonId]/page.tsx
    - src/app/api/auth/me/route.ts

key-decisions:
  - "SUPER_ADMIN and ADMIN both access /admin/* routes; COACH, SUPER_ADMIN, and ADMIN all access /coach/* routes"
  - "Student route guard redirects non-students to their appropriate dashboard (admin or coach)"
  - "Deferred Coach profile inclusion in /api/auth/me to Plan 03 (Coach model does not exist yet)"

patterns-established:
  - "Role union type ordering: SUPER_ADMIN | ADMIN | COACH | STUDENT across all type definitions"
  - "Multi-role admin check pattern: role === ADMIN || role === SUPER_ADMIN"

# Metrics
duration: 8min
completed: 2026-03-14
---

# Phase 1 Plan 2: Frontend Auth Layer Summary

**Next.js middleware, login redirect, and TypeScript role types updated to accept SUPER_ADMIN and COACH across 10 files**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-15T02:25:17Z
- **Completed:** 2026-03-15T02:34:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Next.js middleware accepts all four roles (SUPER_ADMIN, ADMIN, COACH, STUDENT) with proper route guards
- Login page redirects SUPER_ADMIN to /admin/dashboard and COACH to /coach/dashboard
- All 6 TypeScript role type definitions include SUPER_ADMIN
- useCurrentUser hook returns isAdmin: true for both ADMIN and SUPER_ADMIN
- Coach route matcher (/coach/:path*) added to middleware config

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Next.js middleware and login page for new roles** - `c578d4d` (feat)
2. **Task 2: Update TypeScript role types and frontend auth hooks** - `5876346` (feat)

## Files Created/Modified
- `middleware.ts` - Route guards for all four roles, coach route matcher added
- `src/app/auth/login/page.tsx` - Post-login redirect for SUPER_ADMIN and COACH
- `src/types/index.ts` - User interface role union includes SUPER_ADMIN
- `src/lib/enhanced-types.ts` - UserRole enum includes SUPER_ADMIN
- `src/lib/context-utils.tsx` - AuthState interface role union includes SUPER_ADMIN
- `src/contexts/AuthContext.tsx` - User interface role union includes SUPER_ADMIN
- `src/contexts/OptimizedAuthContext.tsx` - User interface role union includes SUPER_ADMIN
- `src/hooks/useCurrentUser.ts` - isAdmin returns true for SUPER_ADMIN, ADMIN branch handles SUPER_ADMIN
- `src/app/(protected)/student/schedule/[lessonId]/page.tsx` - SUPER_ADMIN can view any student lesson
- `src/app/api/auth/me/route.ts` - TODO comment for Coach profile inclusion (Plan 03)

## Decisions Made
- SUPER_ADMIN and ADMIN both access /admin/* routes (super admin inherits all admin capabilities)
- COACH, SUPER_ADMIN, and ADMIN can all access /coach/* routes (super admin and admin can view coach pages)
- Student routes redirect non-students to role-appropriate dashboards (admin vs coach)
- Deferred /api/auth/me Coach profile inclusion to Plan 03 since Coach model does not exist yet

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Build lock file conflict from stale .next directory required cleanup before build could succeed
- Files were temporarily lost due to concurrent plan execution (01-01) landing commits; re-applied all Task 2 edits after verifying commit state

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Frontend auth layer complete; all middleware and type checks pass for SUPER_ADMIN and COACH
- Ready for Plan 03 (Schema migration and data backfill) which creates the Coach model and adds coachId columns
- Known: profileQueries.ts has 5 hardcoded `=== "ADMIN"` checks -- intentionally deferred to Phase 3 query scoping

---
*Phase: 01-auth-schema-foundation*
*Completed: 2026-03-14*
