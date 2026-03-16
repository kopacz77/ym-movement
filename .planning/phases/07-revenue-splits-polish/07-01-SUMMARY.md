---
phase: 07-revenue-splits-polish
plan: 01
subsystem: notifications
tags: [trpc, notifications, coach, booking, payments, prisma]

# Dependency graph
requires:
  - phase: 06-per-coach-google-calendar
    provides: "Per-coach coachId on time slots and lessons"
  - phase: 02-coach-dashboard-profile
    provides: "Coach model with userId, coachManagementQueries"
provides:
  - "Coach in-app notifications for bookings, cancellations, payment verification, and revenue split changes"
affects: [07-02, 07-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coach notification pattern: lookup coachRecord.userId from Coach.id, then createNotification with userId"
    - "Non-blocking notification: try/catch around createNotification to prevent notification failures from blocking primary operations"

key-files:
  created: []
  modified:
    - "src/features/student/api/queries/bookingQueries.ts"
    - "src/features/admin/api/queries/paymentQueries.ts"
    - "src/features/admin/api/queries/coach/coachManagementQueries.ts"

key-decisions:
  - "[07-01] Separate coach.findUnique for userId in bookLesson (not extending existing coach query) -- lightweight indexed PK lookup, avoids modifying optimized pricing/token query"
  - "[07-01] lessonType variable renamed to lessonTypeFormatted in bookLesson coach notification to avoid shadowing existing admin notification variable"
  - "[07-01] formattedDate renamed to formattedDateForCoach in bookLesson to avoid shadowing existing admin notification variable"
  - "[07-01] Revenue split notification compares old vs new value before sending -- only notifies on actual changes"

patterns-established:
  - "Coach notification lookup: always use coach.findUnique({select:{userId:true}}) then createNotification({userId: coachRecord.userId})"

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 7 Plan 1: Coach Notifications Summary

**Four coach notification triggers across booking, cancellation, payment verification, and revenue split flows using existing createNotification helper**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T05:01:07Z
- **Completed:** 2026-03-16T05:05:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Coach receives SUCCESS notification when a student books a lesson (links to /coach/schedule)
- Coach receives WARNING notification when a student cancels a lesson (includes late cancellation tag)
- Coach receives SUCCESS notification when admin verifies a payment (includes dollar amount)
- Coach receives INFO notification when admin changes revenue split (shows old and new percentages)
- All notification failures are non-blocking with try/catch error logging

## Task Commits

Each task was committed atomically:

1. **Task 1: Add coach notifications to booking and cancellation flows** - `cebfe04` (feat)
2. **Task 2: Add coach notifications to payment verification and revenue split updates** - `18b6ee0` (feat)

## Files Created/Modified
- `src/features/student/api/queries/bookingQueries.ts` - Added coach notification in bookLesson (step 9b) and cancelLesson (step 6b)
- `src/features/admin/api/queries/paymentQueries.ts` - Added createNotification import and coach notification in verifyPayment
- `src/features/admin/api/queries/coach/coachManagementQueries.ts` - Added createNotification import and coach notification in updateCoachPricing

## Decisions Made
- Separate lightweight coach query for userId in bookLesson rather than extending existing pricing/token query -- clean separation of concerns
- Variable names differentiated (lessonTypeFormatted, formattedDateForCoach) to avoid shadowing existing admin notification variables in bookLesson
- Revenue split notification only fires when the value actually changes (compares old coach.revenueSplitPercent to new input.revenueSplitPercent)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing type error in untracked PayoutReport.tsx file (not part of this plan, ignored)
- `pnpm format` touched many pre-existing files; only plan-related changes were committed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All four coach notification triggers are active
- Ready for remaining Phase 7 plans (revenue splits, polish)

---
*Phase: 07-revenue-splits-polish*
*Completed: 2026-03-16*
