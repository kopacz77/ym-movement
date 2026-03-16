---
phase: 04-per-coach-scheduling
verified: 2026-03-16T01:00:00Z
status: passed
score: 5/5 must-haves verified
gaps: []
---

# Phase 4: Per-Coach Scheduling Verification Report

**Phase Goal:** Time slots are owned by individual coaches, conflict detection respects coach boundaries, and each coach independently manages their own blocked dates.
**Verified:** 2026-03-16T01:00:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every time slot is associated with a specific coach, and the creation UI requires coach assignment | VERIFIED | ScheduleManager.tsx lines 501-504: validates coachId before creating slot, shows toast error "Please select a coach before creating a time slot" if missing. createTimeSlot mutation includes coachId (line 546). CompactTimeSlotDialog passes selectedCoachId through onBookingSubmit (line 162). |
| 2 | Two different coaches can have overlapping time slots at different rinks without triggering a conflict | VERIFIED | timeSlotQueries.ts createTimeSlot overlap check at line 180 uses `...(input.coachId && { coachId: input.coachId })` -- scoping conflict detection to the same coach only. updateTimeSlot at line 327 similarly scopes with `...(existingSlot.coachId && { coachId: existingSlot.coachId })`. Bulk create at lines 647, 698 also scope per-coach. |
| 3 | Each coach can create, edit, and delete their own blocked dates independently | VERIFIED | scheduleQueries.ts has 3 mutations: createBlockedDate (line 177), updateBlockedDate (line 261), deleteBlockedDate (line 374) -- all use coachProcedure scoping to ctx.coach.id. Update/delete verify ownership (coachId match) and throw FORBIDDEN if not. CoachBlockedDates.tsx provides full UI with create form, edit button populating form, delete with confirmation. |
| 4 | The super admin can view and manage time slots across all coaches from the admin calendar | VERIFIED | ScheduleHeader.tsx has coach selector dropdown (lines 111-130) with "All Coaches" option. ScheduleManager.tsx passes selectedCoach to useTimeSlots and getBlockedDates queries (lines 171, 174-178). When "All Coaches" selected, no coachId filter applied -- admin sees all. Coach name appears in calendar event titles via useCalendarEvents.ts (lines 89-92). |
| 5 | Coach schedule page shows their own time slots and blocked dates on a calendar | VERIFIED | Coach schedule page at `/coach/schedule` renders CoachScheduleManager (page.tsx 7 lines, imports CoachScheduleManager). CoachScheduleManager.tsx (356 lines) uses useCoachTimeSlots hook to fetch coach-scoped data, renders DesktopCalendarView/MobileCalendarView with events and calendarBlockedDates. Read-only for time slots (no-op handlers for onSelectSlot and onEventDrop). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/coach/api/queries/scheduleQueries.ts` | Coach schedule TRPC router with 6 endpoints | VERIFIED (417 lines) | Has getMyTimeSlots, getMyBlockedDates, getRinks, createBlockedDate, updateBlockedDate, deleteBlockedDate. All use coachProcedure. Exported as scheduleRouter. |
| `src/features/coach/api/queries/index.ts` | Coach router includes schedule sub-router | VERIFIED (16 lines) | Line 15: `schedule: scheduleRouter` in coachRouter. Import at line 6. |
| `src/features/admin/components/scheduling/calendarUtils.ts` | TimeSlot interface with optional Coach field | VERIFIED (230 lines) | Lines 51-56: `Coach?: { id: string; User: { name: string \| null; }; }` on TimeSlot interface. |
| `src/features/admin/api/queries/schedule/timeSlotQueries.ts` | getTimeSlots includes Coach relation, createTimeSlot accepts coachId | VERIFIED (831 lines) | Lines 67-74: Coach select in getTimeSlots. Line 33: coachId in getTimeSlots input. Line 138: coachId in createTimeSlot input. Per-coach overlap scoping at lines 180, 327. |
| `src/features/admin/components/scheduling/ScheduleHeader.tsx` | Coach selector dropdown | VERIFIED (229 lines) | Lines 41-43: coach props. Lines 111-130: coach selector Select with "All Coaches" option. |
| `src/features/admin/components/scheduling/ScheduleManager.tsx` | selectedCoach state threaded through | VERIFIED (790 lines) | Line 94: selectedCoach state. Line 98: getAllCoaches query. Lines 627-629: coach props to ScheduleHeader. Line 637: selectedCoachId to CompactTimeSlotDialog. Line 662: coachId to WorkingBlockedDatesManager. Lines 501-504: coach validation on creation. |
| `src/hooks/useTimeSlots.ts` | coachId parameter passed to getTimeSlots | VERIFIED (149 lines) | Line 38: selectedCoachId as third parameter. Line 71: coachId spread into query input. |
| `src/hooks/useCalendarEvents.ts` | Coach name in event titles | VERIFIED (198 lines) | Lines 89-92: `if (slot.Coach?.User?.name) { title += \` [\${slot.Coach.User.name}]\`; }` |
| `src/features/admin/components/scheduling/CompactTimeSlotDialog.tsx` | coachId in booking submit payload | VERIFIED (270 lines) | Line 32: selectedCoachId prop. Lines 33-40: coachId in onBookingSubmit type. Line 162: coachId passed in submit. |
| `src/features/admin/components/scheduling/WorkingBlockedDatesManager.tsx` | coachId prop for filtered queries | VERIFIED (341 lines) | Line 12: coachId prop. Lines 29-31: coachId in getBlockedDates query. Line 86: coachId in createBlockedDate mutation. |
| `src/features/coach/hooks/useCoachTimeSlots.ts` | Hook fetching coach-scoped data | VERIFIED (40 lines) | Calls api.coach.schedule.getRinks, getMyTimeSlots, getMyBlockedDates. Returns { rinks, timeSlots, blockedDates }. |
| `src/features/coach/components/schedule/CoachBlockedDates.tsx` | Coach blocked dates CRUD UI | VERIFIED (371 lines) | Create form, edit flow (handleEdit populates form, updateMutation called), delete with showDeleteConfirmation. Uses coach-scoped endpoints. |
| `src/features/coach/components/schedule/CoachScheduleManager.tsx` | Coach schedule page with calendar | VERIFIED (356 lines) | Renders DesktopCalendarView/MobileCalendarView with coach-scoped data. Rink selector, timezone filter, blocked dates popover. Read-only for time slots (no-op handlers). |
| `src/app/(protected)/coach/schedule/page.tsx` | Coach schedule page route | VERIFIED (7 lines) | Imports and renders CoachScheduleManager. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| scheduleQueries.ts | coachProcedure | import from @/lib/trpc | WIRED | Line 3: `import { coachProcedure, createTRPCRouter } from "@/lib/trpc"`. All 6 endpoints use coachProcedure. |
| coach index.ts | scheduleQueries.ts | import scheduleRouter | WIRED | Line 6: `import { scheduleRouter } from "./scheduleQueries"`. Line 15: `schedule: scheduleRouter`. |
| ScheduleManager.tsx | useTimeSlots.ts | selectedCoach as 3rd arg | WIRED | Line 171: `useTimeSlots(dateRange, selectedRink, selectedCoach)`. |
| ScheduleManager.tsx | CompactTimeSlotDialog | selectedCoachId prop | WIRED | Line 637: `selectedCoachId={selectedCoach}`. |
| ScheduleManager.tsx | WorkingBlockedDatesManager | coachId prop | WIRED | Line 662: `<WorkingBlockedDatesManager coachId={selectedCoach} />`. |
| ScheduleManager.tsx | ScheduleHeader | coach props | WIRED | Lines 627-629: selectedCoachId, onCoachSelect, coaches props. |
| ScheduleManager.tsx | createTimeSlot.mutate | coachId in payload | WIRED | Line 546: `coachId` included in mutation call. |
| useCoachTimeSlots.ts | api.coach.schedule | TRPC queries | WIRED | Lines 9, 14, 28: getRinks, getMyTimeSlots, getMyBlockedDates. |
| CoachScheduleManager.tsx | useCoachTimeSlots | hook call | WIRED | Line 89: `useCoachTimeSlots(dateRange, selectedRink)`. |
| CoachScheduleManager.tsx | DesktopCalendarView | shared calendar | WIRED | Lines 323-348: DesktopCalendarView rendered with events, blockedDateRanges, no-op handlers. |
| CoachBlockedDates.tsx | coach schedule mutations | TRPC mutations | WIRED | Lines 51, 70, 89: createBlockedDate, updateBlockedDate, deleteBlockedDate mutations. Invalidation on success. |
| coach schedule page | CoachScheduleManager | import + render | WIRED | Line 3: import, Line 6: `<CoachScheduleManager />`. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| SCHD-01: Time slots associated with specific coach via coachId | SATISFIED | Admin creation requires coach selection (toast validation). coachId flows through CompactTimeSlotDialog and createTimeSlot mutation. getTimeSlots query returns Coach relation. |
| SCHD-02: Conflict detection scoped per-coach | SATISFIED | createTimeSlot, updateTimeSlot, and createBulkTimeSlots all scope overlap checks with `...(input.coachId && { coachId: input.coachId })`. Different coaches can overlap. |
| SCHD-04: Each coach manages own blocked dates independently | SATISFIED | Coach schedule router has createBlockedDate, updateBlockedDate, deleteBlockedDate -- all coachProcedure-scoped. Ownership verified on update/delete. CoachBlockedDates UI provides full CRUD. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | -- | -- | -- | No anti-patterns found. All placeholder strings in code are HTML form placeholder attributes, not stub indicators. No TODO/FIXME/stub patterns. |

### Human Verification Required

### 1. Coach Schedule Calendar Rendering

**Test:** Log in as a coach, navigate to /coach/schedule, verify the calendar renders with time slots and blocked dates visible.
**Expected:** Calendar shows time slots in correct time zones, blocked dates shown as background events.
**Why human:** Cannot verify visual rendering or calendar library output programmatically.

### 2. Admin Coach Filter End-to-End

**Test:** Log in as admin, navigate to the schedule page, select a coach from the dropdown, verify only that coach's time slots appear.
**Expected:** Calendar events filter to show only the selected coach's slots. Selecting "All Coaches" shows all slots with coach names in brackets.
**Why human:** Requires real data and visual verification of calendar filtering.

### 3. Coach Blocked Date CRUD Flow

**Test:** As a coach, create a blocked date (travel type), edit it to change the title and dates, then delete it.
**Expected:** All three operations succeed with toast notifications. Calendar refreshes to reflect changes.
**Why human:** Requires interactive testing of form submission, popover behavior, and toast feedback.

### 4. Per-Coach Conflict Detection

**Test:** As admin, create a time slot for Coach A at Rink X from 10-11am. Then create a time slot for Coach B at Rink X from 10-11am.
**Expected:** Both creations succeed (different coaches can overlap). Then try creating another slot for Coach A at Rink X from 10:30-11:30am -- this should show a CONFLICT error.
**Why human:** Requires sequential admin actions with specific coach selections and verification of conflict vs. success states.

### Gaps Summary

No gaps found. All 5 observable truths are verified against the actual codebase. All 14 artifacts exist, are substantive (adequate line counts, no stub patterns), and are properly wired into the system. All 12 key links are connected. All 3 requirements (SCHD-01, SCHD-02, SCHD-04) are satisfied. Type-check passes cleanly with zero errors. 4 items flagged for human verification (visual rendering, interactive flows).

---

_Verified: 2026-03-16T01:00:00Z_
_Verifier: Claude (gsd-verifier)_
