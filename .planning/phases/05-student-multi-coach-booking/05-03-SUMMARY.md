---
phase: 05-student-multi-coach-booking
plan: 03
subsystem: ui
tags: [react, typescript, coach-display, lesson-card, student-portal, prisma]

# Dependency graph
requires:
  - phase: 05-student-multi-coach-booking
    plan: 01
    provides: Coach includes on all student lesson queries (getStudentLessons, getLesson), Coach relation data in TRPC responses
provides:
  - Coach name displayed in LessonCard component with User icon
  - Coach name displayed in UpcomingLessons dashboard widget
  - Coach name passed through both schedule client transform functions
  - Coach section in lesson detail page via Prisma include
  - Coach column in student payments table
  - LessonWithDetails type includes optional Coach property
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coach display pattern: optional chaining with 'Instructor' fallback for legacy lessons"
    - "Hidden responsive column: 'hidden md:table-cell' for Coach in payments table"

key-files:
  created: []
  modified:
    - src/features/student/types/index.ts
    - src/features/student/components/schedule/LessonCard.tsx
    - src/features/student/components/dashboard/UpcomingLessons.tsx
    - src/app/(protected)/student/schedule/client.tsx
    - src/app/(protected)/student/schedule/StudentScheduleClient.tsx
    - src/app/(protected)/student/schedule/[lessonId]/page.tsx
    - src/app/(protected)/student/payments/page.tsx

key-decisions:
  - "Coach display uses 'Instructor' fallback consistently across all views for legacy lessons without coach data"
  - "UpcomingLessons and payments page use (lesson as any).Coach cast since TRPC return type inference may not include Coach"
  - "Coach column in payments table hidden on small screens (md:table-cell) to preserve mobile layout"
  - "Lesson details page uses direct Prisma Coach include (server component) rather than relying on TRPC"

patterns-established:
  - "Coach name display: User icon + lesson.Coach?.User?.name || 'Instructor'"
  - "Both client.tsx and StudentScheduleClient.tsx updated in parallel (Research Pitfall 5)"

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 5 Plan 3: Student Coach Display Summary

**Coach name displayed across all student-facing views: lesson cards, dashboard, schedule page, lesson details, and payments table with 'Instructor' fallback for legacy data**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T02:39:28Z
- **Completed:** 2026-03-16T02:43:05Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- LessonWithDetails type extended with optional Coach property for type-safe coach display
- LessonCard shows coach name with User icon after rink location for every lesson
- UpcomingLessons dashboard widget shows coach name for each upcoming lesson
- Both schedule client components (client.tsx and StudentScheduleClient.tsx) pass Coach data through transform functions
- Lesson detail page fetches Coach via Prisma include and displays in Lesson Information card
- Payments table has responsive Coach column (hidden on small screens, visible on md+)
- All views gracefully handle legacy lessons without coach data using "Instructor" fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Update types + LessonCard + UpcomingLessons + schedule clients** - `680f99d` (feat)
2. **Task 2: Lesson details page Coach display + payments page Coach column** - `f421fe5` (feat)

## Files Created/Modified
- `src/features/student/types/index.ts` - Added optional Coach property to LessonWithDetails interface
- `src/features/student/components/schedule/LessonCard.tsx` - Added User icon import and coach name row
- `src/features/student/components/dashboard/UpcomingLessons.tsx` - Added User icon and coach name with (lesson as any) cast
- `src/app/(protected)/student/schedule/client.tsx` - Added Coach to Lesson interface and transform function
- `src/app/(protected)/student/schedule/StudentScheduleClient.tsx` - Added Coach to both interfaces and transform function
- `src/app/(protected)/student/schedule/[lessonId]/page.tsx` - Added Coach Prisma include and Coach section in JSX
- `src/app/(protected)/student/payments/page.tsx` - Added Coach table header and cell with responsive hiding

## Decisions Made
- [05-03] Coach display uses "Instructor" fallback consistently across all views for legacy lessons without coach data
- [05-03] UpcomingLessons and payments page use (lesson as any).Coach cast since TRPC return type inference may not include Coach
- [05-03] Coach column in payments table hidden on small screens (hidden md:table-cell) to preserve mobile layout
- [05-03] Lesson details page uses direct Prisma Coach include with User.name select (server component, not TRPC)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing type-check error in `src/app/(protected)/student/book/page.tsx` from Plan 05-02 (BookingCalendar now requires coachId/coachName props but book page not yet updated). Unrelated to this plan's changes -- all 7 modified files compile correctly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- BOOK-02 requirement complete: every student-facing lesson view displays which coach the lesson is with
- All coach display uses consistent pattern (User icon + optional chaining + "Instructor" fallback)
- No blockers for remaining phases
- Pre-existing type error from 05-02 needs resolution in that plan's continuation

---
*Phase: 05-student-multi-coach-booking*
*Completed: 2026-03-16*
