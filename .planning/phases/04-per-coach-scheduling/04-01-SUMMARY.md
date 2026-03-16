---
phase: 04-per-coach-scheduling
plan: 01
subsystem: api
tags: [trpc, prisma, coach, schedule, blocked-dates, time-slots]

# Dependency graph
requires:
  - phase: 01-auth-schema-foundation
    provides: coachProcedure middleware with ctx.coach.id
  - phase: 03-query-scoping-super-admin
    provides: per-coach query scoping patterns (coachId filtering)
provides:
  - Coach schedule TRPC router with 6 coachProcedure-scoped endpoints
  - Admin getTimeSlots returning Coach relation (id + User.name)
  - TimeSlot TypeScript interface with optional Coach field
affects:
  - 04-02 (admin calendar coach display needs Coach data from getTimeSlots)
  - 04-03 (coach schedule page UI consumes coach.schedule.* endpoints)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Coach-scoped blocked date CRUD with ownership verification via ctx.coach.id
    - Optional Coach relation on TimeSlot interface for backward compatibility

key-files:
  created:
    - src/features/coach/api/queries/scheduleQueries.ts
  modified:
    - src/features/coach/api/queries/index.ts
    - src/features/admin/api/queries/schedule/timeSlotQueries.ts
    - src/features/admin/components/scheduling/calendarUtils.ts

key-decisions:
  - "Non-null assertion (ctx.session!) for createdById since coachProcedure guarantees session exists but TypeScript cannot narrow the type"
  - "Coach field on TimeSlot interface is optional to avoid breaking existing code that does not include Coach relation"
  - "getRinks in scheduleRouter mirrors proposalQueries pattern but includes address field for schedule display"

patterns-established:
  - "Coach blocked date ownership: verify coachId matches ctx.coach.id before update/delete, throw FORBIDDEN if not"
  - "Coach overlap detection: same logic as admin blockedDateQueries but always scoped to ctx.coach.id"

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 4 Plan 1: Coach Schedule API Endpoints Summary

**Coach-scoped schedule TRPC router with 6 endpoints (time slots, blocked dates CRUD) and Coach relation on admin getTimeSlots**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T00:37:05Z
- **Completed:** 2026-03-16T00:40:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Coach schedule TRPC router with getMyTimeSlots, getMyBlockedDates, getRinks, createBlockedDate, updateBlockedDate, deleteBlockedDate
- Admin getTimeSlots now returns Coach.id and Coach.User.name for each time slot
- TimeSlot TypeScript interface includes optional Coach field for admin calendar display

## Task Commits

Each task was committed atomically:

1. **Task 1: Create coach schedule TRPC router** - `cf1bd4b` (feat)
2. **Task 2: Add Coach relation to admin getTimeSlots and update TypeScript interfaces** - `444892b` (feat)

## Files Created/Modified
- `src/features/coach/api/queries/scheduleQueries.ts` - Coach schedule router with 6 coachProcedure-scoped endpoints
- `src/features/coach/api/queries/index.ts` - Added schedule sub-router to coachRouter
- `src/features/admin/api/queries/schedule/timeSlotQueries.ts` - Added Coach relation to getTimeSlots select
- `src/features/admin/components/scheduling/calendarUtils.ts` - Added optional Coach field to TimeSlot interface

## Decisions Made
- Used non-null assertion (`ctx.session!`) for `createdById` in createBlockedDate since coachProcedure middleware guarantees session exists but TypeScript type system does not narrow it
- Coach field on TimeSlot interface is optional (`Coach?`) to maintain backward compatibility with existing components that do not use Coach data
- getRinks endpoint includes `address` field (unlike proposalQueries which omits it) because schedule display benefits from rink location

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript strict null check on ctx.session**
- **Found during:** Task 1 (scheduleQueries.ts createBlockedDate)
- **Issue:** `ctx.session.user.id` failed type-check because session is typed as possibly null, even though coachProcedure middleware guarantees it
- **Fix:** Used non-null assertion `ctx.session!.user.id`
- **Files modified:** src/features/coach/api/queries/scheduleQueries.ts
- **Verification:** `pnpm type-check` passes cleanly
- **Committed in:** cf1bd4b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minimal - TypeScript strictness workaround, no scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Coach schedule API endpoints ready for Plan 03 (coach schedule page UI)
- Admin getTimeSlots returns Coach data ready for Plan 02 (admin calendar coach display)
- All endpoints use coachProcedure for automatic coach scoping

---
*Phase: 04-per-coach-scheduling*
*Completed: 2026-03-15*
