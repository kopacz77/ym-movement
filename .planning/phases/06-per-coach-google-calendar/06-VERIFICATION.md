---
phase: 06-per-coach-google-calendar
verified: 2026-03-16T05:30:00Z
status: passed
score: 7/7 must-haves verified
gaps: []
human_verification:
  - test: "Connect Google Calendar via OAuth from coach profile page"
    expected: "Clicking 'Connect Google Calendar' redirects to Google consent screen, authorizing redirects back to profile with 'Connected' badge and calendarId displayed"
    why_human: "Requires live Google OAuth credentials and browser interaction"
  - test: "Book a lesson with a calendar-connected coach and verify event appears"
    expected: "After booking, the lesson event appears on the coach's personal Google Calendar with correct title, time, and student attendee"
    why_human: "Requires live Google Calendar API credentials and access to coach's calendar"
  - test: "Book a lesson with a coach who has NOT connected their calendar"
    expected: "Lesson is created successfully with no errors; no calendar event is created; booking flow completes normally"
    why_human: "Requires running application with database to verify graceful degradation in a real scenario"
  - test: "Disconnect Google Calendar from coach profile page"
    expected: "Clicking 'Disconnect' clears tokens, badge changes to 'Not Connected', toast confirms disconnection"
    why_human: "Requires running application with authenticated coach session"
---

# Phase 6: Per-Coach Google Calendar Verification Report

**Phase Goal:** Each coach connects their own Google Calendar so lesson events appear on their personal calendar, replacing the single-admin calendar model.
**Verified:** 2026-03-16T05:30:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A coach can connect their Google account via an OAuth flow from their profile page | VERIFIED | `GoogleCalendarConnect.tsx` renders connect button that navigates to `/api/auth/google-calendar`. Route file (`route.ts`) validates session, looks up coach, calls `generateAuthUrl(coach.id)`, redirects to Google consent. |
| 2 | OAuth authorization persists across sessions (encrypted token storage) | VERIFIED | Callback route (`callback/route.ts`) exchanges code for tokens, encrypts via `encrypt()` (AES-256-GCM), stores on Coach record (`googleAccessToken`, `googleRefreshToken`, `googleTokenExpiresAt`, `googleCalendarId`). Auto-refresh via `oauth2Client.on("tokens")` in `calendar.ts`. |
| 3 | When a lesson is booked with a calendar-connected coach, the event appears on that coach's Google Calendar | VERIFIED | `bookingQueries.ts` line 214-232 and `lessonQueries.ts` lines 91-105, 406-419 all call `googleCalendar.createEvent(coach, {...})` with coach token lookup. Calendar module (`calendar.ts`) uses decrypted per-coach tokens to insert events via `calendar.events.insert()`. |
| 4 | If a coach has NOT connected their calendar, lessons still work but no calendar event is created | VERIFIED | `getCoachCalendarApi()` returns `null` when `googleAccessToken` or `googleRefreshToken` is null (line 30-33 in calendar.ts). All 7 call sites guard with `if (coachWithTokens)` / `if (coachForCalendar)` / `if (coach)` before calling calendar methods. Calendar methods themselves return `null`/`false` gracefully. |
| 5 | A coach can disconnect their Google Calendar from their profile page | VERIFIED | `profileQueries.ts` has `disconnectCalendar` mutation (line 63-74) that nullifies all 4 google fields. `GoogleCalendarConnect.tsx` calls this mutation on disconnect button click with toast feedback. |
| 6 | INSTRUCTOR_EMAIL is no longer added as an attendee to any calendar event | VERIFIED | Zero matches for `INSTRUCTOR_EMAIL` in `src/` directory. All attendee arrays contain only the student. |
| 7 | The application type-checks with zero errors | VERIFIED | `pnpm type-check` (tsc --noEmit) passes with zero errors. |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/encryption.ts` | AES-256-GCM encrypt/decrypt | VERIFIED | 33 lines, exports `encrypt` and `decrypt`, uses `createCipheriv`/`createDecipheriv` with `aes-256-gcm`, iv:tag:ciphertext base64 format. No stubs. Imported by `calendar.ts` and `callback/route.ts`. |
| `src/lib/google/oauth.ts` | OAuth2Client factory and auth URL generator | VERIFIED | 21 lines, exports `createOAuth2Client` and `generateAuthUrl`, uses `google.auth.OAuth2`, `prompt: "consent"` for refresh token, `state: coachId`. Imported by 3 files. |
| `src/lib/google/calendar.ts` | Per-coach Google Calendar operations | VERIFIED | 249 lines, exports `CoachWithTokens` type and `googleCalendar` object with `createEvent`, `deleteEvent`, `updateEvent` -- all take `CoachWithTokens` as first arg. Auto-persists refreshed tokens. No JWT/service account code. Imported by `bookingQueries.ts` and `lessonQueries.ts`. |
| `src/app/api/auth/google-calendar/route.ts` | OAuth initiation GET endpoint | VERIFIED | 24 lines, exports `GET`, validates session (401 if not), looks up coach (403 if not found), redirects to `generateAuthUrl(coach.id)`. |
| `src/app/api/auth/google-calendar/callback/route.ts` | OAuth callback GET endpoint | VERIFIED | 61 lines, exports `GET`, CSRF validates state param against session coach ID, exchanges code for tokens, encrypts and stores, resolves primary calendar ID, redirects to `/coach/profile?calendar=connected`. |
| `src/features/coach/components/profile/GoogleCalendarConnect.tsx` | Connect/disconnect UI card | VERIFIED | 120 lines, "use client" component, uses `getCalendarStatus` query and `disconnectCalendar` mutation, shows Connected/Not Connected badges, connect button redirects to OAuth, disconnect button with loading state, toast on callback params. |
| `src/features/coach/api/queries/profileQueries.ts` | Calendar status and disconnect TRPC endpoints | VERIFIED | 75 lines, `getCalendarStatus` query returns `isConnected` boolean + `calendarId`, `disconnectCalendar` mutation nullifies all 4 google fields. Both use `coachProcedure`. |
| `src/app/(protected)/coach/profile/page.tsx` | Coach profile page with calendar connect | VERIFIED | 17 lines, imports and renders `GoogleCalendarConnect` inside `<Suspense>` wrapper below `CoachProfileForm`. |
| `src/features/student/api/queries/bookingQueries.ts` | Student booking with per-coach calendar | VERIFIED | Imports `CoachWithTokens` and `googleCalendar`. Booking (line 214) passes `coachWithTokens` as first arg. Cancellation (line 513) looks up coach and passes to `deleteEvent`. INSTRUCTOR_EMAIL removed from attendees. |
| `src/features/admin/api/queries/schedule/lessonQueries.ts` | Admin lesson CRUD with per-coach calendar | VERIFIED | Imports `CoachWithTokens` and `googleCalendar`. 5 call sites all pass coach with tokens: createLesson (line 92), cancelLesson (line 181), assignStudent (line 407), updateLessonType (line 550), unassignStudent (line 684). INSTRUCTOR_EMAIL removed from all attendees. |
| `src/types/env.d.ts` | TOKEN_ENCRYPTION_KEY declared, INSTRUCTOR_EMAIL removed | VERIFIED | Contains `TOKEN_ENCRYPTION_KEY?: string`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`. No `INSTRUCTOR_EMAIL`, no `GOOGLE_REFRESH_TOKEN`. |
| `.env.example` | Documents per-coach OAuth2 env vars | VERIFIED | Contains `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY` under "Per-Coach OAuth2" section. No `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `GoogleCalendarConnect.tsx` | `/api/auth/google-calendar` | `window.location.href` redirect | WIRED | Line 42: `window.location.href = "/api/auth/google-calendar"` |
| `route.ts` (initiation) | `oauth.ts` | `generateAuthUrl` import | WIRED | Line 4: imports `generateAuthUrl`, line 22: calls `generateAuthUrl(coach.id)` |
| `callback/route.ts` | `encryption.ts` | `encrypt` import for token storage | WIRED | Line 5: imports `encrypt`, lines 49-50: encrypts both tokens |
| `callback/route.ts` | `oauth.ts` | `createOAuth2Client` import | WIRED | Line 6: imports `createOAuth2Client`, line 36: creates client for token exchange |
| `calendar.ts` | `encryption.ts` | `decrypt`/`encrypt` for token usage/refresh | WIRED | Line 2: imports both, line 37-38: decrypts tokens, line 47-49: encrypts refreshed tokens |
| `calendar.ts` | `oauth.ts` | `createOAuth2Client` import | WIRED | Line 3: imports `createOAuth2Client`, line 35: creates client per-coach |
| `bookingQueries.ts` | `calendar.ts` | `googleCalendar.createEvent(coachWithTokens, ...)` | WIRED | Line 9: imports both types, line 215: `googleCalendar.createEvent(coachWithTokens, {...})` |
| `bookingQueries.ts` | `calendar.ts` | `googleCalendar.deleteEvent(coach, ...)` | WIRED | Line 513: `googleCalendar.deleteEvent(coach, lesson.googleCalendarEventId)` |
| `lessonQueries.ts` | `calendar.ts` | 5 calendar call sites with coach first arg | WIRED | Lines 92, 181, 407, 550, 684 -- all pass coach with token fields as first argument |
| `GoogleCalendarConnect.tsx` | `profileQueries.ts` | TRPC `getCalendarStatus`/`disconnectCalendar` | WIRED | Lines 15, 18, 21: queries/mutations wired via `api.coach.profile.*` |
| `profileQueries.ts` | `prisma.coach.update` | nullify google fields on disconnect | WIRED | Lines 64-70: sets all 4 google fields to null |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| INTG-01: Each coach connects their own Google Calendar via OAuth, with encrypted token storage | SATISFIED | None |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns found in any phase 6 artifacts |

Zero TODO/FIXME/PLACEHOLDER markers. Zero stub patterns. Zero empty implementations. Zero old service account references in `src/`.

### Human Verification Required

### 1. OAuth Flow End-to-End
**Test:** Log in as a coach, navigate to profile page, click "Connect Google Calendar", complete Google consent screen, verify redirect back to profile
**Expected:** Profile shows green "Connected" badge with calendar ID; tokens are encrypted in database
**Why human:** Requires live Google OAuth credentials, browser interaction, and Google account

### 2. Calendar Event Creation on Booking
**Test:** Book a lesson (as student or admin) with a coach who has connected their calendar, then check the coach's Google Calendar
**Expected:** Event appears on coach's Google Calendar with correct summary, time, student attendee, and location
**Why human:** Requires live Google Calendar API integration and access to coach's actual calendar

### 3. Graceful Degradation for Unconnected Coach
**Test:** Book a lesson with a coach who has NOT connected their Google Calendar
**Expected:** Lesson is created successfully, no errors shown, no calendar event created
**Why human:** Requires running application with database to verify complete flow

### 4. Calendar Disconnect Flow
**Test:** As a connected coach, click "Disconnect" on the Google Calendar card
**Expected:** Badge changes to "Not Connected", toast confirms disconnection, tokens are cleared from database
**Why human:** Requires running application with authenticated coach session

### Gaps Summary

No gaps found. All 7 observable truths are verified. All 12 artifacts exist, are substantive (no stubs), and are properly wired. All 11 key links are connected and functional. The old singleton service account pattern (JWT, INSTRUCTOR_EMAIL, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID) is completely removed from the source code. TypeScript type-check passes with zero errors.

The phase goal -- "Each coach connects their own Google Calendar so lesson events appear on their personal calendar, replacing the single-admin calendar model" -- is structurally achieved. Human verification is recommended for the live OAuth flow and actual Google Calendar event creation, which cannot be tested programmatically.

---

_Verified: 2026-03-16T05:30:00Z_
_Verifier: Claude (gsd-verifier)_
