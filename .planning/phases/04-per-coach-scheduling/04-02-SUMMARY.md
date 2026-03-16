---
phase: 04-per-coach-scheduling
plan: 02
subsystem: ui
tags: [react, trpc, coach, calendar, schedule, admin, filtering]

# Dependency graph
requires:
  - phase: 04-per-coach-scheduling
    provides: Coach relation on admin getTimeSlots, optional Coach field on TimeSlot interface
  - phase: 03-query-scoping-super-admin
    provides: coachId filtering on getTimeSlots and getBlockedDates queries
provides:
  - Coach selector dropdown in admin schedule header for filtering by coach
  - Coach-aware time slot creation (coachId required via validation)
  - Coach-aware blocked date creation from admin calendar
  - Coach name display in calendar event titles
affects:
  - 04-03 (coach schedule page UI can reuse patterns from admin coach filtering)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Coach selector in schedule header alongside rink selector (same Select pattern)
    - coachId threaded through ScheduleManager state to all child components
    - Coach validation on time slot creation (toast error if no coach selected)

key-files:
  created: []
  modified:
    - src/features/admin/components/scheduling/ScheduleHeader.tsx
    - src/features/admin/components/scheduling/ScheduleManager.tsx
    - src/features/admin/components/scheduling/CompactTimeSlotDialog.tsx
    - src/features/admin/components/scheduling/WorkingBlockedDatesManager.tsx
    - src/hooks/useTimeSlots.ts
    - src/hooks/useCalendarEvents.ts

key-decisions:
  - "getAllCoaches query uses superAdminProcedure (functionally identical to adminProcedure during transition) -- documented with source comment"
  - "Coach selection enforced via toast validation in handleEnhancedBookingSubmit, not via disabled button"
  - "Coach name appended to calendar event title in brackets [Coach Name] after student count"

patterns-established:
  - "Coach state threaded from ScheduleManager through props to ScheduleHeader, CompactTimeSlotDialog, WorkingBlockedDatesManager"
  - "activeCoaches filtered from getAllCoaches by isApproved && isActive for dropdown population"

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 4 Plan 2: Admin Calendar Coach Filtering Summary

**Coach selector dropdown in admin schedule with coach-filtered queries, coachId in all create mutations, and coach names on calendar events**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T00:42:21Z
- **Completed:** 2026-03-16T00:46:09Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Admin schedule header shows coach selector dropdown alongside rink selector
- Selecting a coach filters time slots and blocked dates to that coach
- Creating a time slot requires coach selection (toast error if missing) and includes coachId in mutation
- Calendar events display "[Coach Name]" when Coach data is available
- Blocked dates created from admin calendar include selected coachId

## Task Commits

Each task was committed atomically:

1. **Task 1: Add coach selector to admin schedule header and thread coachId through ScheduleManager** - `fc0ebe4` (feat)
2. **Task 2: Add coachId to CompactTimeSlotDialog, WorkingBlockedDatesManager, and coach names in calendar events** - `fe06ae9` (feat)

## Files Created/Modified
- `src/features/admin/components/scheduling/ScheduleHeader.tsx` - Added coach selector dropdown props and UI
- `src/features/admin/components/scheduling/ScheduleManager.tsx` - Added selectedCoach state, coaches query, coachId threading to all operations
- `src/hooks/useTimeSlots.ts` - Added selectedCoachId parameter passed to getTimeSlots query
- `src/features/admin/components/scheduling/CompactTimeSlotDialog.tsx` - Added selectedCoachId prop included in onBookingSubmit payload
- `src/features/admin/components/scheduling/WorkingBlockedDatesManager.tsx` - Added coachId prop for filtered queries and creation
- `src/hooks/useCalendarEvents.ts` - Added coach name in event titles when Coach data is available

## Decisions Made
- getAllCoaches uses superAdminProcedure which is functionally identical to adminProcedure during transition (both check isAdminRole) -- documented with source code comment
- Coach selection enforced via toast validation error in handleEnhancedBookingSubmit rather than disabling UI elements
- Coach name appended after student count in calendar event title as `[Coach Name]` bracket notation
- activeCoaches filtered from full list by isApproved AND isActive to avoid showing suspended/pending coaches

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Admin calendar is fully coach-aware: filtering, creation, and display
- Coach schedule page (Plan 03) can now reuse useCalendarEvents and DesktopCalendarView patterns
- Per-coach conflict detection confirmed: overlap check scoped to coachId in createTimeSlot
- SCHD-01 satisfied: every new time slot associated with a specific coach
- SCHD-02 satisfied: different coaches can have overlapping time slots

---
*Phase: 04-per-coach-scheduling*
*Completed: 2026-03-15*
