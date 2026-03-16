---
phase: 04-per-coach-scheduling
plan: 03
subsystem: ui
tags: [react, calendar, coach, scheduling, blocked-dates, trpc]

# Dependency graph
requires:
  - phase: 04-per-coach-scheduling/04-01
    provides: "Coach schedule API endpoints (getMyTimeSlots, getMyBlockedDates, getRinks, createBlockedDate, updateBlockedDate, deleteBlockedDate)"
provides:
  - "Coach schedule page with calendar view (DesktopCalendarView + MobileCalendarView)"
  - "Coach blocked dates management UI (create, edit, delete)"
  - "useCoachTimeSlots hook for coach-scoped data fetching"
  - "CoachBlockedDates component for blocked date CRUD"
affects: [05-student-coach-selection, 06-multi-coach-calendar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coach schedule reuses admin calendar components (DesktopCalendarView, MobileCalendarView, TimeSlotDialogAdapter)"
    - "No-op callbacks for required DesktopCalendarView props (onSelectSlot, onEventDrop) in read-only views"
    - "BlockedDateRange conversion pattern for DesktopCalendarView integration"

key-files:
  created:
    - src/features/coach/hooks/useCoachTimeSlots.ts
    - src/features/coach/components/schedule/CoachBlockedDates.tsx
    - src/features/coach/components/schedule/CoachScheduleManager.tsx
  modified:
    - src/app/(protected)/coach/schedule/page.tsx

key-decisions:
  - "Coach schedule is read-only for time slots (no direct CRUD); coaches use proposal workflow from Phase 2"
  - "Reused admin DesktopCalendarView/MobileCalendarView/TimeSlotDialogAdapter rather than creating coach-specific calendar components"
  - "No-op callbacks passed for required DesktopCalendarView props (onSelectSlot, onEventDrop) to keep coach view read-only"
  - "CoachBlockedDates uses shadcn/ui components (Button, Input, Select) unlike admin WorkingBlockedDatesManager which uses inline styles"

patterns-established:
  - "Coach components reuse admin calendar components with restricted functionality via no-op handlers"
  - "Coach blocked dates follow same date creation pattern as admin (T00:00:00/T23:59:59 local time construction)"

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 4 Plan 3: Coach Schedule UI Summary

**Coach schedule page with calendar view (desktop + mobile), read-only time slot viewing, and blocked dates CRUD (create/edit/delete) using shared admin calendar components**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T00:42:25Z
- **Completed:** 2026-03-16T00:45:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Coach schedule page renders a full calendar with time slots and blocked dates (replaces placeholder)
- Blocked dates management with create, edit, and delete functionality via CoachBlockedDates component
- Time slot viewing is read-only -- clicking a slot opens TimeSlotDialogAdapter with no edit/delete/assign actions
- Rink filtering and timezone selector work correctly for multi-rink scenarios
- Both desktop (DesktopCalendarView) and mobile (MobileCalendarView) views render properly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useCoachTimeSlots hook and CoachBlockedDates component** - `8b1d830` (feat)
2. **Task 2: Build CoachScheduleManager and update coach schedule page** - `7bbf016` (feat)

## Files Created/Modified
- `src/features/coach/hooks/useCoachTimeSlots.ts` - Hook fetching coach-scoped time slots, blocked dates, and rinks via api.coach.schedule.*
- `src/features/coach/components/schedule/CoachBlockedDates.tsx` - Coach blocked dates management UI with create/edit/delete using shadcn/ui components
- `src/features/coach/components/schedule/CoachScheduleManager.tsx` - Coach schedule page component with calendar view, rink selector, timezone filter, and blocked dates popover
- `src/app/(protected)/coach/schedule/page.tsx` - Updated from placeholder to render CoachScheduleManager

## Decisions Made
- Coach schedule is read-only for time slots (no direct CRUD); coaches use proposal workflow from Phase 2
- Reused admin DesktopCalendarView/MobileCalendarView/TimeSlotDialogAdapter rather than creating coach-specific calendar components
- No-op callbacks passed for required DesktopCalendarView props (onSelectSlot, onEventDrop) to keep coach view read-only
- CoachBlockedDates uses shadcn/ui components (Button, Input, Select) unlike admin WorkingBlockedDatesManager which uses inline styles
- Empty students array and no-op handlers passed to TimeSlotDialogAdapter for effectively read-only slot viewing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Coach schedule page is fully functional with calendar, time slots, and blocked dates
- Phase 4 Plan 2 (admin multi-coach features) can proceed independently
- Ready for Phase 5 (student coach selection) -- students can now see coach schedules

---
*Phase: 04-per-coach-scheduling*
*Completed: 2026-03-16*
