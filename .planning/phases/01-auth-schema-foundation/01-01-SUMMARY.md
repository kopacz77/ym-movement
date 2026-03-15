---
phase: 01-auth-schema-foundation
plan: 01
subsystem: auth
tags: [trpc, nextauth, jwt, roles, middleware]

# Dependency graph
requires:
  - phase: none
    provides: "First plan in project -- no prior dependencies"
provides:
  - "AppRole type and role hierarchy helpers (isAdminRole, isCoachRole, dashboardForRole)"
  - "TRPC adminProcedure accepting both ADMIN and SUPER_ADMIN roles"
  - "New superAdminProcedure and coachProcedure TRPC exports"
  - "JWT callback with trigger=update for role refresh without re-login"
affects:
  - "01-02 (middleware and login page updates)"
  - "01-03 (schema migration -- Coach model enables coachProcedure)"
  - "Phase 2 (coach routes will use coachProcedure)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Centralized role helpers in src/lib/roles.ts -- all role checks go through isAdminRole/isCoachRole"
    - "TRPC middleware pattern: role check via helper, not direct string comparison"
    - "@ts-expect-error for forward references to models not yet in schema"

key-files:
  created:
    - "src/lib/roles.ts"
  modified:
    - "src/lib/trpc.ts"
    - "src/lib/trpc-optimized.ts"
    - "src/lib/auth.ts"

key-decisions:
  - "superAdminProcedure is functionally identical to adminProcedure during transition -- will be tightened to SUPER_ADMIN-only later"
  - "coachProcedure uses @ts-expect-error for prisma.coach since Coach model comes in Plan 03"
  - "isCoachRole includes ADMIN and SUPER_ADMIN in the role hierarchy (admins implicitly have coach access)"

patterns-established:
  - "Role checks: always use isAdminRole()/isCoachRole() from @/lib/roles -- never compare role strings directly"
  - "JWT refresh: call session.update() on the client to trigger database role refresh"

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 1 Plan 1: Auth Layer SUPER_ADMIN Compatibility Summary

**TRPC middleware updated to accept SUPER_ADMIN alongside ADMIN via centralized role helpers, with JWT callback supporting triggered role refresh from database**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T02:25:08Z
- **Completed:** 2026-03-15T02:30:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created centralized role helper utility (src/lib/roles.ts) with AppRole type, isAdminRole(), isCoachRole(), and dashboardForRole()
- Updated TRPC adminProcedure middleware in both trpc.ts and trpc-optimized.ts to accept SUPER_ADMIN via isAdminRole()
- Added superAdminProcedure and coachProcedure exports to trpc.ts for future Phase 2 routes
- Updated NextAuth JWT callback to support role refresh via trigger="update" -- enables role changes without re-login

## Task Commits

Each task was committed atomically:

1. **Task 1: Create role helper utility and update TRPC middleware** - `f42f886` (feat)
2. **Task 2: Update NextAuth JWT callback to support role refresh** - `2cf5743` (feat)

## Files Created/Modified
- `src/lib/roles.ts` - New centralized role helper with AppRole type, isAdminRole(), isCoachRole(), dashboardForRole()
- `src/lib/trpc.ts` - Updated isAdmin middleware, added isSuperAdmin and isCoach middlewares, exported superAdminProcedure and coachProcedure
- `src/lib/trpc-optimized.ts` - Updated isAdmin middleware to use isAdminRole() for consistency
- `src/lib/auth.ts` - Added trigger parameter to JWT callback with database role refresh on update

## Decisions Made
- superAdminProcedure uses isAdminRole (accepts both ADMIN and SUPER_ADMIN) during the transition period. It will be tightened to SUPER_ADMIN-only after all existing ADMIN users are migrated.
- coachProcedure includes a @ts-expect-error for prisma.coach since the Coach model will be added in Plan 03. This is intentional and will resolve automatically after schema migration.
- isCoachRole includes ADMIN and SUPER_ADMIN in the hierarchy -- admins implicitly have coach-level access.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing `pnpm build` failure: Next.js 16.1.6 post-build step fails copying `_not-found.html` to `pages/404.html`. Verified this is pre-existing (not caused by our changes). TypeScript compilation and static page generation both succeed. This infrastructure issue is unrelated to auth/role changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Role helpers and updated middleware are ready for Plan 02 (middleware.ts and login page updates)
- coachProcedure export is available but will produce TypeScript errors until Plan 03 adds the Coach model to the Prisma schema
- JWT refresh capability is ready -- the frontend can call `session.update()` after role changes

---
*Phase: 01-auth-schema-foundation*
*Completed: 2026-03-15*
