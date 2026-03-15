---
phase: 03-query-scoping-super-admin
plan: 04
subsystem: super-admin-dashboard
tags: [react, trpc, dashboard, analytics, revenue, coach-management]

dependency-graph:
  requires:
    - phase: 03-03
      provides: superAdminDashboardRouter with getCoachesOverview, getCoachDetail, getRevenueBreakdown queries
  provides:
    - CoachOverviewCards component (coaches grid with status, stats, earnings)
    - CoachDetailView component (drill-down with profile, lessons, roster)
    - RevenueBreakdownChart component (per-coach revenue with payout calculations)
    - Enhanced admin dashboard page with coach and revenue sections
  affects: []

tech-stack:
  added: []
  patterns: [dynamic-import-lazy-loading, coach-card-click-drill-down, revenue-split-display]

key-files:
  created:
    - src/features/admin/components/analytics/CoachOverviewCards.tsx
    - src/features/admin/components/analytics/CoachDetailView.tsx
    - src/features/admin/components/analytics/RevenueBreakdownChart.tsx
  modified:
    - src/app/(protected)/admin/dashboard/page.tsx

key-decisions:
  - "No decisions required -- plan executed as specified"

patterns-established:
  - "Coach card click-to-drill-down: selectedCoachId state in parent renders CoachDetailView below grid"
  - "Revenue display: platform totals (before split, coach payouts, platform share) above per-coach table"

metrics:
  duration: 3min
  completed: 2026-03-15
---

# Phase 03 Plan 04: Super Admin Dashboard UI Summary

**CoachOverviewCards grid, CoachDetailView drill-down, and RevenueBreakdownChart with per-coach payout display integrated into admin dashboard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T21:09:00Z
- **Completed:** 2026-03-15T21:12:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 4

## Accomplishments

- CoachOverviewCards renders a responsive grid of coach cards with status badges, lesson/student/slot stats, monthly earnings (after revenue split), and hours booked
- Click-to-drill-down opens CoachDetailView below the grid showing coach profile (bio, skills, revenue split), upcoming lessons table, and student roster
- RevenueBreakdownChart displays platform-wide totals (total revenue, coach payouts, platform share) with per-coach breakdown table sorted by revenue descending
- Admin dashboard page enhanced with Coaches Overview and Revenue Breakdown sections below existing content, using dynamic imports matching existing patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CoachOverviewCards and CoachDetailView components** - `2a4a866` (feat)
2. **Task 2: Create RevenueBreakdownChart and enhance dashboard page** - `a56ed4c` (feat)
3. **Task 3: Visual verification checkpoint** - approved (no commit, checkpoint only)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified

- `src/features/admin/components/analytics/CoachOverviewCards.tsx` - Coaches grid with status badges, stats, earnings; manages selectedCoachId state for drill-down
- `src/features/admin/components/analytics/CoachDetailView.tsx` - Individual coach drill-down with profile section, upcoming lessons table, student roster grid
- `src/features/admin/components/analytics/RevenueBreakdownChart.tsx` - Platform-wide revenue totals and per-coach breakdown table with payout calculations
- `src/app/(protected)/admin/dashboard/page.tsx` - Added Coaches Overview and Revenue Breakdown sections below existing Student Activity content

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 03 (Query Scoping and Super Admin Dashboard) is now complete with all 4 plans finished
- All admin queries are scoped by coachId for multi-coach isolation
- Super admin has cross-coach visibility with dashboard UI
- Ready for Phase 04 (Student Booking and Multi-Coach Discovery) or remaining phases

---
*Phase: 03-query-scoping-super-admin*
*Completed: 2026-03-15*
