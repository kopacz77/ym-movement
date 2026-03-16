---
phase: 05-student-multi-coach-booking
plan: 01
subsystem: api
tags: [trpc, prisma, pricing, coach, booking, multi-coach]

# Dependency graph
requires:
  - phase: 01-auth-schema-foundation
    provides: Coach model, CoachStudent junction table, coachId on RinkTimeSlot and Lesson
  - phase: 03-query-scoping-super-admin
    provides: coachId scoping on admin queries, Coach relation on time slots/lessons
  - phase: 04-per-coach-scheduling
    provides: Coach-scoped time slot creation and management
provides:
  - coachBrowseRouter with getBrowsableCoaches and getCoachProfile endpoints
  - Coach-aware pricing waterfall (student > coach > global > hardcoded)
  - coachId filter on student availability queries
  - Coach relation includes on all student lesson queries
  - CoachStudent junction upsert during booking
  - Coach name in booking notifications and Google Calendar events
affects:
  - 05-02 (student booking UI needs these endpoints)
  - 05-03 (student lesson display needs Coach includes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coach-aware pricing waterfall: student custom > coach pricing > global defaults > hardcoded"
    - "CoachStudent upsert on booking for relationship tracking"
    - "Coach browse endpoint uses protectedProcedure (student-facing, not admin-only)"

key-files:
  created:
    - src/features/student/api/queries/coachBrowseQueries.ts
  modified:
    - src/features/student/api/queries/index.ts
    - src/features/student/api/queries/availabilityQueries.ts
    - src/features/student/api/queries/bookingQueries.ts
    - src/features/student/api/queries/profileQueries.ts
    - src/features/student/api/queries/lessonQueries.ts
    - src/lib/pricing.ts

key-decisions:
  - "coachBrowseRouter uses protectedProcedure (not adminProcedure) since students call it"
  - "Coach pricing parameter added as LAST optional argument to pricing functions for backward compatibility"
  - "getStudentPricing updated to accept optional coachId and apply full pricing waterfall via getHourlyRateForLessonType"
  - "CoachStudent upsert is non-blocking (error logged but booking continues)"
  - "Coach name fetched once early in bookLesson and reused for calendar, notifications, and admin alerts"

patterns-established:
  - "Student-facing coach query pattern: filter isApproved+isActive, expose only public fields, never revenueSplitPercent/tokens"
  - "Pricing waterfall parameter ordering: (lessonType, student, defaultPricing, coach) with coach always last and optional"

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 5 Plan 1: Student Multi-Coach Booking Backend Summary

**TRPC endpoints for coach browsing, coach-aware pricing waterfall, coachId-filtered availability, Coach includes on all lesson queries, and CoachStudent upsert during booking**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-16T02:32:21Z
- **Completed:** 2026-03-16T02:37:06Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- New coachBrowseRouter with getBrowsableCoaches (list approved+active coaches with public profiles) and getCoachProfile (single coach detail) endpoints
- Pricing waterfall extended: student custom > coach-specific > global defaults > hardcoded fallback, with backward-compatible optional coach parameter
- getAvailableTimeSlots accepts optional coachId filter and returns Coach relation data
- All student lesson queries (getStudentLessons, getLesson, getStudentPricing) now include Coach relation and support coach-aware pricing
- Booking flow creates CoachStudent junction records and includes coach name in student/admin notifications and Google Calendar events

## Task Commits

Each task was committed atomically:

1. **Task 1: Coach browse endpoint + pricing waterfall + availability coachId filter** - `e9ecae6` (feat)
2. **Task 2: Coach includes on lesson queries + booking coach pricing + CoachStudent upsert + notification update** - `dd0b182` (feat)

## Files Created/Modified
- `src/features/student/api/queries/coachBrowseQueries.ts` - New router with getBrowsableCoaches and getCoachProfile endpoints
- `src/features/student/api/queries/index.ts` - Registered coachBrowseRouter in student router
- `src/features/student/api/queries/availabilityQueries.ts` - Added coachId input filter and Coach relation include
- `src/lib/pricing.ts` - Added coach pricing step to getHourlyRateForLessonType and calculateLessonPrice
- `src/features/student/api/queries/profileQueries.ts` - Added Coach include to getStudentLessons; updated getStudentPricing with coachId and full pricing waterfall
- `src/features/student/api/queries/lessonQueries.ts` - Added Coach include to getLesson
- `src/features/student/api/queries/bookingQueries.ts` - Coach pricing in bookLesson, CoachStudent upsert, coach name in notifications/calendar

## Decisions Made
- [05-01] coachBrowseRouter uses protectedProcedure (not adminProcedure) since students call it
- [05-01] Coach pricing parameter added as LAST optional argument to pricing functions for backward compatibility
- [05-01] getStudentPricing updated to accept optional coachId and apply full waterfall via getHourlyRateForLessonType (not simple ?? fallback)
- [05-01] CoachStudent upsert is non-blocking (error logged but booking succeeds)
- [05-01] Coach name fetched once early in bookLesson and reused across calendar event, student notification, and admin notification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All backend endpoints ready for frontend plans 05-02 (booking UI with coach selection) and 05-03 (coach display in lesson views)
- coachBrowse router accessible via api.student.coachBrowse.getBrowsableCoaches and api.student.coachBrowse.getCoachProfile
- getAvailableTimeSlots accepts coachId for filtering
- All lesson queries return Coach.User.name for display
- No blockers

---
*Phase: 05-student-multi-coach-booking*
*Completed: 2026-03-16*
