---
phase: 06-per-coach-google-calendar
plan: 02
subsystem: api
tags: [oauth2, google-calendar, next-auth, encryption, csrf, per-coach]

# Dependency graph
requires:
  - phase: 06-per-coach-google-calendar
    provides: AES-256-GCM encryption module and OAuth2Client factory (Plan 01)
  - phase: 01-auth-schema-foundation
    provides: Coach model with google token fields, NextAuth session
provides:
  - OAuth initiation route (GET /api/auth/google-calendar)
  - OAuth callback route (GET /api/auth/google-calendar/callback)
  - Per-coach calendar.ts with CoachWithTokens type and createEvent/updateEvent/deleteEvent
  - Automatic token refresh persistence via OAuth2Client tokens event
affects: [06-03 call site migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OAuth initiation redirects to Google with coachId in state param"
    - "CSRF: callback verifies state param matches logged-in user's coach record"
    - "Per-coach calendar API: CoachWithTokens first argument on all methods"
    - "Auto-persist refreshed tokens via oauth2Client.on('tokens') event"

key-files:
  created:
    - src/app/api/auth/google-calendar/route.ts
    - src/app/api/auth/google-calendar/callback/route.ts
  modified:
    - src/lib/google/calendar.ts

key-decisions:
  - "CSRF validation uses coachId in state param verified against session user's Coach record"
  - "Calendar methods return null/false gracefully when coach has no tokens (no crash)"
  - "Coach is inherently calendar owner/organizer -- no INSTRUCTOR_EMAIL in attendees"
  - "Token refresh listener uses fire-and-forget .catch() to avoid blocking calendar operations"

patterns-established:
  - "googleCalendar.createEvent(coach, params) -- coach as first arg convention"
  - "getCoachCalendarApi returns null for tokenless coaches (graceful degradation)"
  - "coach.googleCalendarId || 'primary' for calendar targeting"

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 6 Plan 02: OAuth Routes & Calendar Refactor Summary

**OAuth initiation/callback routes with CSRF validation and complete calendar.ts refactor from service account singleton to per-coach OAuth2 pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T04:13:43Z
- **Completed:** 2026-03-16T04:16:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created OAuth initiation route that redirects authenticated coaches to Google's consent screen
- Created OAuth callback route with CSRF validation, token exchange, encrypted storage, and calendar ID resolution
- Completely refactored calendar.ts from JWT service account singleton to per-coach OAuth2 pattern
- Added automatic token refresh persistence via OAuth2Client tokens event listener

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OAuth initiation and callback API routes** - `037a24a` (feat)
2. **Task 2: Refactor calendar.ts from singleton to per-coach pattern** - `5d8157d` (feat)

## Files Created/Modified

- `src/app/api/auth/google-calendar/route.ts` - OAuth initiation: session check, coach lookup, redirect to Google
- `src/app/api/auth/google-calendar/callback/route.ts` - OAuth callback: CSRF validation, token exchange, encryption, storage
- `src/lib/google/calendar.ts` - Per-coach calendar operations with CoachWithTokens type, auto token refresh

## Decisions Made

- [06-02] CSRF validation uses coachId in state param verified against session user's Coach record
- [06-02] Calendar methods return null/false gracefully when coach has no tokens (no crash)
- [06-02] Coach is inherently calendar owner/organizer -- no INSTRUCTOR_EMAIL in attendees (Research Pitfall 5)
- [06-02] Token refresh listener uses fire-and-forget .catch() to avoid blocking calendar operations

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Type-check shows expected errors in lessonQueries.ts and bookingQueries.ts (call sites still using old signature) -- these are resolved in Plan 03.

## User Setup Required

None - no external service configuration required. OAuth routes use existing GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI from .env.

## Next Phase Readiness

- OAuth flow is complete end-to-end: initiation -> Google consent -> callback -> token storage
- calendar.ts exports CoachWithTokens type and per-coach methods ready for call site migration
- Plan 03 will update all call sites (lessonQueries.ts, bookingQueries.ts) to pass CoachWithTokens as first argument
- Expected type errors in call sites will be resolved by Plan 03

---
*Phase: 06-per-coach-google-calendar*
*Completed: 2026-03-16*
