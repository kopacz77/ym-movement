---
phase: 03-query-scoping-super-admin
plan: 03
subsystem: super-admin-dashboard
tags: [trpc, prisma, aggregation, revenue, super-admin]

dependency-graph:
  requires: [01-03, 02-02]
  provides: [superAdminDashboardRouter, cross-coach-queries, revenue-breakdown]
  affects: [03-04]

tech-stack:
  added: []
  patterns: [Promise.all-parallel-aggregation, payment-through-lesson-scoping, revenue-split-calculation]

key-files:
  created:
    - src/features/admin/api/queries/superAdminQueries.ts
  modified:
    - src/features/admin/api/queries/index.ts

decisions:
  - User model has no image field -- removed from getCoachDetail select (plan specified image but schema lacks it)
  - Payment scoping always through Lesson relation (Lesson: { coachId }) per Pitfall 1 from research

metrics:
  duration: 3min
  completed: 2026-03-15
---

# Phase 03 Plan 03: Super Admin TRPC Queries Summary

Cross-coach aggregation queries for super admin dashboard: coaches overview, coach drill-down, and revenue breakdown with per-coach payout calculations using revenueSplitPercent.

## What Was Done

### Task 1: Create superAdminQueries.ts with three core queries
- **getCoachesOverview** (SADM-01): Fetches all approved coaches with User info, lesson/student/slot counts via `_count`, hours booked via lesson duration aggregation, and monthly earnings via payment aggregation through Lesson relation. Uses `Promise.all` to parallelize per-coach aggregation queries. Returns coach payout (after split) and total revenue (before split).
- **getCoachDetail** (SADM-02): Fetches single coach profile with upcoming lessons (with Student and Rink includes), student roster via CoachStudent, and monthly stats. Returns NOT_FOUND error for invalid coachId. Re-throws TRPCError instances to preserve error codes.
- **getRevenueBreakdown** (SADM-03): Date-range revenue breakdown across all active coaches. Defaults to current month. Calculates per-coach: totalRevenue, coachPayout (revenue * splitPercent/100), platformRevenue (revenue - payout). Reduces to platform-wide totals: totalRevenue, totalCoachPayouts, totalPlatformRevenue.

### Task 2: Register superAdmin router in admin router
- Imported `superAdminDashboardRouter` from `./superAdminQueries`
- Registered as `superAdmin` key in `adminRouter`
- Queries accessible at `api.admin.superAdmin.getCoachesOverview`, `.getCoachDetail`, `.getRevenueBreakdown`

## Decisions Made

| Decision | Context | Rationale |
|----------|---------|-----------|
| Remove `image` from User select | Plan specified `image` in getCoachDetail | User model has no `image` column in schema -- would cause TS error |
| Payment scoping through Lesson | Plan specified and research warned (Pitfall 1) | Payment has no direct coachId; must use `Lesson: { coachId }` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed non-existent `image` field from User select**
- **Found during:** Task 1 type-check verification
- **Issue:** Plan specified `User: { select: { name, email, image } }` but User model has no `image` column
- **Fix:** Removed `image: true` from select and `image` from return object
- **Files modified:** `src/features/admin/api/queries/superAdminQueries.ts`
- **Commit:** 8fb204c

## Verification Results

- TypeScript compiles with zero errors in new/modified files
- File exports `superAdminDashboardRouter` (264 lines, above 100-line minimum)
- All 3 queries use `superAdminProcedure` (verified via grep)
- Zero matches for `publicProcedure`, `protectedProcedure`, or `adminProcedure`
- Payment aggregation correctly scopes through `Lesson: { coachId }` (3 occurrences)
- Router registered in admin router under `superAdmin` namespace

## Commits

| Hash | Message |
|------|---------|
| 8fb204c | feat(03-03): create superAdminQueries.ts with three core queries |
| 6532253 | feat(03-03): register superAdmin router in admin router |
