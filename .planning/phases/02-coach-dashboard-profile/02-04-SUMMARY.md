---
phase: 02-coach-dashboard-profile
plan: 04
subsystem: ui
tags: [react, trpc, coach, dashboard, profile, earnings, students, schedule, react-hook-form, zod]

# Dependency graph
requires:
  - phase: 02-coach-dashboard-profile
    provides: "Coach TRPC router with dashboard/profile/earnings/students sub-routers (02-02)"
  - phase: 02-coach-dashboard-profile
    provides: "Coach model fields, coachId in useCurrentUser (02-01)"
provides:
  - "Coach dashboard page with 4 overview stat cards and upcoming/past lesson lists"
  - "Coach profile page with editable bio/skills/certs and read-only lesson rates"
  - "Coach earnings page with revenue summary and payment history table"
  - "Coach students page with student list and lesson counts"
  - "Coach schedule placeholder page"
affects: [02-05, 02-06, 03-multi-coach-scheduling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coach pages follow same layout pattern as student pages (heading + feature components)"
    - "Lesson type color-coded badges: Purple=Choreography, Blue=Private, Green=Group, Orange=Competition Prep"
    - "Revenue split displayed as read-only badge on profile page"

key-files:
  created:
    - src/app/(protected)/coach/dashboard/page.tsx
    - src/features/coach/components/dashboard/CoachOverviewCards.tsx
    - src/features/coach/components/dashboard/CoachUpcomingLessons.tsx
    - src/features/coach/components/dashboard/CoachPastLessons.tsx
    - src/app/(protected)/coach/profile/page.tsx
    - src/features/coach/components/profile/CoachProfileForm.tsx
    - src/app/(protected)/coach/earnings/page.tsx
    - src/features/coach/components/earnings/EarningsOverview.tsx
    - src/features/coach/components/earnings/PaymentHistory.tsx
    - src/app/(protected)/coach/students/page.tsx
    - src/features/coach/components/students/CoachStudentList.tsx
    - src/app/(protected)/coach/schedule/page.tsx
  modified: []

key-decisions:
  - "Payment model field is `method` not `paymentMethod` -- fixed during type-check"
  - "Profile form Zod schema uses required strings (not optional+default) to align with react-hook-form resolver types"

patterns-established:
  - "Coach UI components mirror student component patterns: loading skeletons, empty states, error handling"
  - "Lesson type badge config as Record<string, { label, className }> for reuse across components"

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 2 Plan 04: Coach Pages Summary

**Five coach-facing pages with dashboard stat cards, upcoming/past lessons, editable profile form, earnings summary with payment history, student list, and schedule placeholder**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T15:32:30Z
- **Completed:** 2026-03-15T15:37:54Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Coach dashboard with 4 overview cards (total students, upcoming lessons, completed this month, monthly earnings) and upcoming/past lesson lists with color-coded type badges
- Coach profile form with editable bio, photo URL, skills (comma-separated with tag display), certifications, years of experience, and read-only lesson rates with revenue split badge
- Coach earnings page with 4 summary cards (total earnings, this month, pending, revenue split) and full payment history table
- Coach students page with table showing name, email, level, total lessons, and active/inactive status
- Schedule placeholder page for future calendar integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Coach dashboard page with overview cards and lesson lists** - `64f94e1` (feat)
2. **Task 2: Coach profile, earnings, students, and schedule pages** - `84b16bb` (feat)

## Files Created/Modified
- `src/app/(protected)/coach/dashboard/page.tsx` - Coach dashboard page composing overview cards and lesson lists
- `src/features/coach/components/dashboard/CoachOverviewCards.tsx` - 4 stat cards with loading skeletons
- `src/features/coach/components/dashboard/CoachUpcomingLessons.tsx` - Upcoming lessons with type badges, time, rink, price
- `src/features/coach/components/dashboard/CoachPastLessons.tsx` - Past lessons with muted styling
- `src/app/(protected)/coach/profile/page.tsx` - Profile page wrapper
- `src/features/coach/components/profile/CoachProfileForm.tsx` - Profile form with React Hook Form + Zod, read-only rates section
- `src/app/(protected)/coach/earnings/page.tsx` - Earnings page composing overview and payment history
- `src/features/coach/components/earnings/EarningsOverview.tsx` - 4 earnings summary cards with revenue split applied
- `src/features/coach/components/earnings/PaymentHistory.tsx` - Payment table with date, student, type, amount, status, method
- `src/app/(protected)/coach/students/page.tsx` - Students page wrapper
- `src/features/coach/components/students/CoachStudentList.tsx` - Student table with lesson counts and status badges
- `src/app/(protected)/coach/schedule/page.tsx` - Schedule placeholder page

## Decisions Made
- Payment model field is `method` (not `paymentMethod`) -- discovered during type-check and corrected
- Profile form Zod schema uses required string fields (not `.optional().default("")`) to align with react-hook-form's zodResolver type expectations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Payment field name mismatch**
- **Found during:** Task 2 (PaymentHistory component)
- **Issue:** Used `payment.paymentMethod` but Prisma model field is `payment.method`
- **Fix:** Changed to `payment.method`
- **Files modified:** `src/features/coach/components/earnings/PaymentHistory.tsx`
- **Verification:** `pnpm type-check` passes
- **Committed in:** `84b16bb`

**2. [Rule 1 - Bug] Zod schema type mismatch with react-hook-form resolver**
- **Found during:** Task 2 (CoachProfileForm)
- **Issue:** Using `.optional().default("")` created input/output type divergence that react-hook-form's zodResolver could not reconcile
- **Fix:** Changed to required string fields with empty string defaults in form defaultValues
- **Files modified:** `src/features/coach/components/profile/CoachProfileForm.tsx`
- **Verification:** `pnpm type-check` passes
- **Committed in:** `84b16bb`

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both bugs caught by type-checker during verification. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 coach-facing pages are functional and accessible at /coach/* routes
- Ready for admin coach management (Plan 05) and time slot proposals (Plan 06)
- Schedule page is a placeholder -- will be implemented with calendar integration in Phase 6

---
*Phase: 02-coach-dashboard-profile*
*Completed: 2026-03-15*
