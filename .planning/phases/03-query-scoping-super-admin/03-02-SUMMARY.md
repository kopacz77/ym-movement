---
phase: 03-query-scoping-super-admin
plan: 02
subsystem: api
tags: [trpc, security, adminProcedure, coachId, query-scoping, prisma]

# Dependency graph
requires:
  - phase: 01-auth-schema-foundation
    provides: "adminProcedure middleware in trpc.ts"
  - phase: 01-auth-schema-foundation
    provides: "Coach model with coachId on Lesson and RinkTimeSlot"
provides:
  - "Analytics queries secured behind adminProcedure (no more unauthenticated access)"
  - "Optional coachId filtering on analytics and payment queries"
  - "Payment coachId scoping through Lesson relation pattern"
  - "All admin query files upgraded from protectedProcedure to adminProcedure"
  - "Student bookLesson inherits coachId from time slot"
affects: [coach-dashboard, super-admin-dashboard, multi-coach-queries]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Payment coachId scoping via Lesson relation (Payment has no direct coachId)"
    - "Optional coachId spread pattern: ...(input?.coachId && { coachId: input.coachId })"
    - "adminProcedure for all admin query files (consistent authorization)"

key-files:
  modified:
    - "src/features/admin/api/queries/analyticsQueries.ts"
    - "src/features/admin/api/queries/paymentQueries.ts"
    - "src/features/admin/api/queries/settingsQueries.ts"
    - "src/features/admin/api/queries/schedule/rinkQueries.ts"
    - "src/features/admin/api/queries/student/studentQueries.ts"
    - "src/features/admin/api/queries/student/approvalQueries.ts"
    - "src/features/admin/api/queries/student/noteQueries.ts"
    - "src/features/admin/api/queries/student/pricingQueries.ts"
    - "src/features/student/api/queries/bookingQueries.ts"

key-decisions:
  - "Payment coachId filtering uses Lesson relation (Lesson: { coachId }) since Payment has no direct coachId column"
  - "Student count in getOverview is NOT scoped by coachId (students are shared resources)"
  - "bookingQueries.ts keeps protectedProcedure (student-facing, not admin-only)"
  - "coachId inherited from timeSlot.coachId in lesson creation (not from user input)"
  - "progressQueries.ts excluded (entirely commented-out dead code)"
  - "cache-wrapper.ts deferred (operates at different abstraction level)"

patterns-established:
  - "Payment coachId scoping: always use Lesson: { coachId } pattern, never direct coachId on Payment"
  - "Optional coachId input: z.object({ coachId: z.string().optional() }).optional() for backward compatibility"
  - "Shared resources (students, rinks, settings) are NOT scoped by coachId"

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 3 Plan 2: Analytics, Payment, and Admin Query Security Summary

**Closed critical publicProcedure vulnerability on analytics, upgraded 26 procedures across 8 admin files to adminProcedure, and wired coach-scoped filtering through Lesson relation on payments**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T21:01:04Z
- **Completed:** 2026-03-15T21:05:11Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- SECURITY FIX: Removed publicProcedure from all 4 analytics queries (getOverview, getStudentActivity, getRevenueReport, getStudentAttendance) -- revenue data no longer accessible without authentication
- Added optional coachId filtering to analytics and payment queries for multi-coach support
- Upgraded 26 procedure definitions across 8 admin files from protectedProcedure to adminProcedure
- Wired student bookLesson to inherit coachId from time slot into lesson creation

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix analytics security + scope analytics and payment queries** - `162c040` (fix)
2. **Task 2: Upgrade settings/rink/student-management queries + wire student booking coachId** - `ea93df9` (feat)

## Files Modified
- `src/features/admin/api/queries/analyticsQueries.ts` - Replaced publicProcedure/protectedProcedure with adminProcedure, added coachId filtering
- `src/features/admin/api/queries/paymentQueries.ts` - Added coachId filtering via Lesson relation to getPayments and getPaymentStats
- `src/features/admin/api/queries/settingsQueries.ts` - Upgraded 3 procedures to adminProcedure
- `src/features/admin/api/queries/schedule/rinkQueries.ts` - Upgraded 4 procedures to adminProcedure
- `src/features/admin/api/queries/student/studentQueries.ts` - Upgraded 8 procedures to adminProcedure
- `src/features/admin/api/queries/student/approvalQueries.ts` - Upgraded 4 procedures to adminProcedure
- `src/features/admin/api/queries/student/noteQueries.ts` - Upgraded 3 procedures to adminProcedure
- `src/features/admin/api/queries/student/pricingQueries.ts` - Upgraded 4 procedures to adminProcedure
- `src/features/student/api/queries/bookingQueries.ts` - Added coachId inheritance from time slot to lesson create

## Decisions Made
- Payment coachId filtering uses `Lesson: { coachId }` pattern since Payment model has no direct coachId column
- Student count in getOverview is NOT scoped by coachId -- students are shared resources across coaches
- bookingQueries.ts keeps protectedProcedure -- these are student-facing queries, not admin-only
- coachId comes from timeSlot.coachId (data layer), not from student input (security)
- progressQueries.ts excluded from this plan -- entirely commented-out dead code with zero runtime impact
- cache-wrapper.ts deferred -- operates at a different abstraction level, will be addressed separately

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All admin query files now use adminProcedure (consistent authorization)
- coachId filtering pattern established for analytics and payments
- Student booking creates lessons with correct coachId from time slot
- Ready for remaining query scoping work in subsequent plans

---
*Phase: 03-query-scoping-super-admin*
*Completed: 2026-03-15*
