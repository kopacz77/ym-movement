---
phase: 02-coach-dashboard-profile
plan: 02
subsystem: api, ui
tags: [trpc, coach, dashboard, layout, sidebar, navigation, earnings, profile]

# Dependency graph
requires:
  - phase: 01-auth-schema-foundation
    provides: "Coach model, coachProcedure, role middleware"
provides:
  - "Coach TRPC router with dashboard, profile, earnings, students sub-routers"
  - "Coach layout shell with sidebar navigation, header, command palette"
  - "api.coach.* namespace registered in root.ts"
affects: [02-04, 02-05, 02-06, 03-multi-coach-scheduling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "coachProcedure scoping all queries by ctx.coach.id"
    - "Revenue split applied via ctx.coach.revenueSplitPercent / 100"
    - "CoachStudent junction table for student-coach relationships"

key-files:
  created:
    - src/features/coach/api/queries/index.ts
    - src/features/coach/api/queries/dashboardQueries.ts
    - src/features/coach/api/queries/profileQueries.ts
    - src/features/coach/api/queries/earningsQueries.ts
    - src/features/coach/api/queries/studentQueries.ts
    - src/features/coach/components/layout/CoachHeader.tsx
    - src/features/coach/components/layout/CoachCommandPalette.tsx
    - src/app/(protected)/coach/layout.tsx
  modified:
    - src/lib/root.ts
    - src/components/layout/AppLayout.tsx
    - src/components/layout/AppSidebar.tsx

key-decisions:
  - "coachStudentsRouter name avoids collision with existing studentRouter"
  - "Profile update excludes pricing fields (coach can view but not edit rates)"
  - "Revenue split applied as multiplier on all earnings aggregations"
  - "Payment history includes Lesson.startTime and Lesson.type for context"

patterns-established:
  - "Coach queries follow same PascalCase relation pattern as admin/student"
  - "Coach layout extends immutable sidebar architecture identically to student"
  - "Coach navigation: Dashboard, Schedule, Students, Earnings, Proposals, Profile"

# Metrics
duration: 7min
completed: 2026-03-15
---

# Phase 2 Plan 02: Coach TRPC Router and Layout Shell Summary

**Coach TRPC router with dashboard/profile/earnings/students sub-routers and full layout shell with sidebar, header, and command palette**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-15T15:21:50Z
- **Completed:** 2026-03-15T15:28:59Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Coach TRPC router registered at api.coach.* with 4 sub-routers (dashboard, profile, earnings, students)
- All queries scoped by ctx.coach.id via coachProcedure middleware
- Earnings queries apply revenueSplitPercent for accurate coach-specific revenue calculation
- Layout system extended with coach role support following immutable sidebar architecture

## Task Commits

Each task was committed atomically:

1. **Task 1: Create coach TRPC router with all sub-routers and register in root** - `5f47273` (feat)
2. **Task 2: Extend layout for coach role** - `2484390` (feat, committed as part of parallel 02-03 execution)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/features/coach/api/queries/index.ts` - Aggregates dashboard, profile, earnings, students sub-routers into coachRouter
- `src/features/coach/api/queries/dashboardQueries.ts` - getUpcomingLessons, getPastLessons, getDashboardStats queries
- `src/features/coach/api/queries/profileQueries.ts` - getProfile and updateProfile (bio, skills, certifications, yearsExperience)
- `src/features/coach/api/queries/earningsQueries.ts` - getEarningsSummary with revenue split, getPaymentHistory
- `src/features/coach/api/queries/studentQueries.ts` - getMyStudents from CoachStudent junction with lesson counts
- `src/lib/root.ts` - Added coach: coachRouter registration
- `src/components/layout/AppLayout.tsx` - Added coach role, CoachHeader import, coach navigation, CoachCommandPalette
- `src/components/layout/AppSidebar.tsx` - Added coachNavigation array and coach role support
- `src/features/coach/components/layout/CoachHeader.tsx` - Breadcrumbs, warm greeting, notifications, logout dialog
- `src/features/coach/components/layout/CoachCommandPalette.tsx` - Cmd+K navigation for coach routes
- `src/app/(protected)/coach/layout.tsx` - Coach layout wrapping AppLayout with role="coach"

## Decisions Made
- Named student sub-router `coachStudentsRouter` to avoid collision with existing `studentRouter`
- Profile update mutation excludes pricing fields (coach can view rates but not edit them, per REQUIREMENTS.md)
- Revenue split applied as `revenueSplitPercent / 100` multiplier on all earnings aggregations
- Payment history includes `Lesson.startTime` and `Lesson.type` for display context
- Dashboard stats count distinct students via Prisma `distinct` on `studentId`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stale Next.js route type cache**
- **Found during:** Task 2 (layout verification)
- **Issue:** `.next/types/routes` had stale types that didn't include `/coach` layout route, causing TS2344 errors
- **Fix:** Removed `.next/types` cache to allow fresh type generation
- **Files modified:** `.next/types/` (cache, not committed)
- **Verification:** `pnpm type-check` passes after cache clear
- **Committed in:** N/A (cache file, not tracked)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Cache issue is routine for new Next.js routes. No scope creep.

## Issues Encountered
- Task 2 layout changes were committed by a parallel plan execution (02-03) that ran concurrently. The identical changes were already in git history, so no separate Task 2 commit was needed. The work is correct and verified.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Coach TRPC API ready for dashboard pages (Plan 04)
- Layout shell renders correctly for coach role
- All queries type-safe and scoped by coach

---
*Phase: 02-coach-dashboard-profile*
*Completed: 2026-03-15*
