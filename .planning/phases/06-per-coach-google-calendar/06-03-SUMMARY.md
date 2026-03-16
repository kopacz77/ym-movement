---
phase: 06-per-coach-google-calendar
plan: 03
subsystem: api
tags: [google-calendar, oauth2, per-coach, trpc, react, graceful-degradation]

# Dependency graph
requires:
  - phase: 06-per-coach-google-calendar
    provides: Per-coach calendar.ts with CoachWithTokens type and OAuth routes (Plans 01-02)
  - phase: 01-auth-schema-foundation
    provides: Coach model with google token fields
provides:
  - All 7 calendar call sites updated to per-coach pattern
  - GoogleCalendarConnect UI component on coach profile page
  - getCalendarStatus and disconnectCalendar TRPC endpoints
  - Complete removal of old service account references from source code
affects: [07-polish-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coach lookup with google token fields before every calendar operation"
    - "Skip calendar operations gracefully when coach has no tokens or no coachId"
    - "TRPC getCalendarStatus/disconnectCalendar on coachProcedure"
    - "OAuth callback success/error detected via URL search params + toast"

key-files:
  created:
    - src/features/coach/components/profile/GoogleCalendarConnect.tsx
  modified:
    - src/features/student/api/queries/bookingQueries.ts
    - src/features/admin/api/queries/schedule/lessonQueries.ts
    - src/features/coach/api/queries/profileQueries.ts
    - src/app/(protected)/coach/profile/page.tsx
    - src/types/env.d.ts
    - src/lib/enhanced-types.ts
    - src/lib/env-validation.ts

key-decisions:
  - "CoachWithTokens lookup reuses existing coach query in bookingQueries (extended select) to avoid duplicate DB call"
  - "Calendar operations skipped entirely when coachId is null or coach has no tokens (graceful degradation)"
  - "Old service account env vars removed from enhanced-types.ts and env-validation.ts (straggler references)"

patterns-established:
  - "Coach token lookup pattern: ctx.prisma.coach.findUnique with id/googleAccessToken/googleRefreshToken/googleTokenExpiresAt/googleCalendarId select"
  - "GoogleCalendarConnect card on coach profile with Suspense wrapper for useSearchParams"

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 6 Plan 03: Call Site Migration & Coach Calendar UI Summary

**All 7 Google Calendar call sites migrated to per-coach CoachWithTokens pattern with connect/disconnect UI and complete removal of old service account references**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-16T04:18:01Z
- **Completed:** 2026-03-16T04:23:17Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Updated all 7 calendar call sites (2 in bookingQueries.ts, 5 in lessonQueries.ts) to pass CoachWithTokens as first argument
- Removed all INSTRUCTOR_EMAIL references from attendees arrays across both files
- Added getCalendarStatus query and disconnectCalendar mutation to coach profile router
- Created GoogleCalendarConnect card component with connect/disconnect UI, toast notifications on OAuth callback
- Cleaned up old service account references from env.d.ts, enhanced-types.ts, and env-validation.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Update all 7 calendar call sites to use per-coach pattern** - `5f4282c` (feat)
2. **Task 2: Add calendar status/disconnect TRPC endpoints and connect UI component** - `17983fe` (feat)
3. **Task 3: Clean up old service account references and verify full build** - `25acf17` (chore)

## Files Created/Modified

- `src/features/student/api/queries/bookingQueries.ts` - Student booking/cancellation with per-coach calendar (2 call sites)
- `src/features/admin/api/queries/schedule/lessonQueries.ts` - Admin lesson CRUD with per-coach calendar (5 call sites)
- `src/features/coach/api/queries/profileQueries.ts` - getCalendarStatus and disconnectCalendar endpoints
- `src/features/coach/components/profile/GoogleCalendarConnect.tsx` - Connect/disconnect UI card for Google Calendar
- `src/app/(protected)/coach/profile/page.tsx` - Added GoogleCalendarConnect with Suspense wrapper
- `src/types/env.d.ts` - Removed INSTRUCTOR_EMAIL
- `src/lib/enhanced-types.ts` - Replaced old service account vars with OAuth vars in EnvironmentConfig
- `src/lib/env-validation.ts` - Replaced old service account vars with OAuth vars in validation schema

## Decisions Made

- [06-03] CoachWithTokens lookup reuses existing coach query in bookingQueries (extended select) to avoid duplicate DB call
- [06-03] Calendar operations skipped entirely when coachId is null or coach has no tokens (graceful degradation)
- [06-03] Old service account env vars (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID) cleaned from enhanced-types.ts and env-validation.ts (straggler references found during verification sweep)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cleaned straggler service account references in enhanced-types.ts and env-validation.ts**
- **Found during:** Task 3 (verification sweep)
- **Issue:** enhanced-types.ts EnvironmentConfig and env-validation.ts schema still referenced GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID (old service account vars)
- **Fix:** Replaced with GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, TOKEN_ENCRYPTION_KEY (matching new OAuth pattern)
- **Files modified:** src/lib/enhanced-types.ts, src/lib/env-validation.ts
- **Verification:** grep confirms zero matches for old vars in src/
- **Committed in:** 25acf17 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix was necessary for complete cleanup. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. OAuth routes use existing GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI from .env.

## Next Phase Readiness

- Phase 6 (Per-Coach Google Calendar) is complete
- Each coach can connect their own Google Calendar via OAuth from their profile page
- Lesson events are created on the specific coach's calendar
- Coaches without calendar connections experience graceful degradation (lessons work, no calendar events)
- The old singleton service account pattern is fully removed
- Ready for Phase 7 (Polish & Testing)

---
*Phase: 06-per-coach-google-calendar*
*Completed: 2026-03-16*
