---
phase: 07-revenue-splits-polish
plan: 02
subsystem: ui
tags: [react, trpc, csv-export, revenue-splits, reports]

# Dependency graph
requires:
  - phase: 02-coach-dashboard-profile
    provides: updateCoachPricing mutation and coach management queries
  - phase: 03-query-scoping-super-admin
    provides: superAdminProcedure and getRevenueBreakdown query
provides:
  - Inline revenue split editor in CoachList table
  - PayoutReport component with per-coach breakdown
  - Payouts tab on Reports page
  - CSV export for payout data
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline editable table cells with save/cancel (RevenueSplitCell pattern)"
    - "Payout report with summary cards, per-coach table, and footer totals"

key-files:
  created:
    - src/features/admin/components/reports/PayoutReport.tsx
  modified:
    - src/features/admin/components/coaches/management/CoachList.tsx
    - src/app/(protected)/admin/reports/page.tsx
    - src/lib/export-utils.ts

key-decisions:
  - "downloadCSV helper exported (was private) to enable reuse by payout export"
  - "RevenueSplitCell is a file-scoped component inside CoachList.tsx (not a separate file)"

patterns-established:
  - "Inline edit cell pattern: display mode with pencil icon, edit mode with input/save/cancel"

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 7 Plan 2: Revenue Splits UI and Payout Report Summary

**Inline revenue split editor in CoachList table and PayoutReport component with per-coach breakdown, summary cards, and CSV export on Reports page**

## Performance

- **Duration:** 4min
- **Started:** 2026-03-16T05:01:20Z
- **Completed:** 2026-03-16T05:06:07Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Inline editable revenue split percentage in coach management table with save/cancel UI
- PayoutReport component showing summary cards (total revenue, coach payouts, platform revenue) and per-coach breakdown table with footer totals
- Payouts tab added as third tab on Reports page
- CSV export function for payout data with TOTAL row

## Task Commits

Each task was committed atomically:

1. **Task 1: Add inline revenue split editor to CoachList table** - `6a970cf` (feat)
2. **Task 2: Create PayoutReport component and add Payouts tab to Reports page** - `a8cb58c` (feat)

## Files Created/Modified
- `src/features/admin/components/coaches/management/CoachList.tsx` - Added RevenueSplitCell inline editor component, replaced static % display
- `src/features/admin/components/reports/PayoutReport.tsx` - New component with summary cards, per-coach table, footer totals, CSV export button
- `src/app/(protected)/admin/reports/page.tsx` - Added Payouts tab (third tab), imported PayoutReport, widened TabsList
- `src/lib/export-utils.ts` - Added exportPayoutReportToCSV function, exported downloadCSV helper

## Decisions Made
- [07-02] downloadCSV helper changed from private to exported for reuse by payout export function
- [07-02] RevenueSplitCell component defined inside CoachList.tsx file (not extracted to separate file) since it is tightly coupled to the coach table

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- lint:fix reformatted 25 files across the codebase (pre-existing formatting issues); only task-related files were committed, non-task files were restored to avoid scope creep

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Revenue split configuration and payout reporting UI complete
- Backend infrastructure (updateCoachPricing, getRevenueBreakdown) was already in place from earlier phases
- Ready for Phase 7 Plan 3

---
*Phase: 07-revenue-splits-polish*
*Completed: 2026-03-16*
