---
phase: 02-coach-dashboard-profile
plan: 03
subsystem: auth
tags: [coach, signup, turnstile, captcha, honeypot, rate-limiting, zod]

# Dependency graph
requires:
  - phase: 01-auth-schema-foundation
    provides: Coach model in Prisma schema, COACH role in auth
provides:
  - Coach self-registration API endpoint (POST /api/auth/coach-signup)
  - Coach signup page at /auth/coach-signup
  - Security layers matching student signup (Turnstile, honeypot, rate limiting)
affects: [02-05 (admin coach approval queue), 02-06 (coach onboarding flow)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coach signup mirrors student signup pattern with identical security layers"
    - "Coach record starts isApproved: false AND isActive: false (dual gate)"

key-files:
  created:
    - src/app/api/auth/coach-signup/route.ts
    - src/app/auth/coach-signup/page.tsx
  modified: []

key-decisions:
  - "Phone field collected on form but not stored (Coach model has no phone column; preserved for UX consistency with student signup)"
  - "Reused sendWelcomeEmail for coach applications rather than creating a separate email template"
  - "Coach record created with isActive: false (in addition to isApproved: false) as dual gate before coach can operate"

patterns-established:
  - "Coach signup form: comma-separated skills input parsed to array on submit"
  - "Bio textarea with character counter (500 max)"

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 2 Plan 3: Coach Signup Flow Summary

**Coach self-registration with Turnstile CAPTCHA, honeypot, and rate limiting -- creates unapproved Coach+User records pending admin review**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T15:21:46Z
- **Completed:** 2026-03-15T15:26:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Coach signup API endpoint at POST /api/auth/coach-signup with full Zod validation
- Transaction creates User (role: COACH) + Coach (isApproved: false, isActive: false)
- Coach signup page at /auth/coach-signup with bio, skills, certifications, years of experience fields
- All three security layers active: Turnstile CAPTCHA, honeypot field, rate limiting (5/hr/IP)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create coach signup API endpoint** - `706d6b0` (feat)
2. **Task 2: Create coach signup page UI** - `babca4a` (feat)

## Files Created/Modified
- `src/app/api/auth/coach-signup/route.ts` - POST endpoint with Zod validation, Turnstile verification, honeypot check, rate limiting, and User+Coach creation in a Prisma transaction
- `src/app/auth/coach-signup/page.tsx` - Client-side form with name, email, phone, bio, skills (comma-separated), certifications, years of experience, Turnstile widget, and honeypot field

## Decisions Made
- **Phone not stored:** The Coach model has no phone column, so phone is collected on the form but not persisted. This maintains UX consistency with the student signup flow and the data can be stored once a phone field is added to Coach or User.
- **Reused sendWelcomeEmail:** Rather than creating a coach-specific email template, reused the existing welcome email for simplicity. A coach-specific "application received" email can be added later.
- **Dual gate (isApproved + isActive):** New coach records are created with both isApproved: false AND isActive: false. The admin approval flow (Plan 05) will set both to true.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused phone variable and formatPhoneNumber import**
- **Found during:** Task 1 (Coach signup API endpoint)
- **Issue:** Plan specified phone field formatting with `formatPhoneNumber`, but the Coach model has no phone column, so the formatted phone value was unused (lint error)
- **Fix:** Removed the `phone` variable assignment and `formatPhoneNumber` import. Phone is still accepted in the Zod schema for forward compatibility.
- **Files modified:** src/app/api/auth/coach-signup/route.ts
- **Verification:** `pnpm lint` passes with no coach-signup errors
- **Committed in:** 706d6b0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minimal -- removed dead code that would have caused lint failure. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Coach signup flow complete, ready for admin approval queue (Plan 05)
- Coach records are created in unapproved state, waiting for admin review
- No blockers for subsequent plans

---
*Phase: 02-coach-dashboard-profile*
*Completed: 2026-03-15*
