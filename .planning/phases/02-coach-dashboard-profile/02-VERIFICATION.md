---
phase: 02-coach-dashboard-profile
verified: 2026-03-15T18:00:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 2: Coach Dashboard, Profile, and Onboarding Verification Report

**Phase Goal:** Coaches have a dedicated area to manage their teaching life -- viewing their schedule, students, earnings, and profile -- and the super admin can onboard new coaches through approval or manual creation.
**Verified:** 2026-03-15T18:00:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A coach can log in and see a dedicated dashboard showing their upcoming lessons, past lessons, and a summary of their students and earnings | VERIFIED | CoachOverviewCards (4 stat cards via getDashboardStats), CoachUpcomingLessons (via getUpcomingLessons), CoachPastLessons (via getPastLessons) all use TRPC queries scoped by ctx.coach.id. Dashboard page at /coach/dashboard composes all three. Layout, sidebar, and header all support coach role. |
| 2 | A coach can edit their profile (bio, photo, skills/disciplines, rates, certifications) and the changes persist | VERIFIED | CoachProfileForm uses React Hook Form + Zod, calls api.coach.profile.updateProfile mutation for bio, photoUrl, skills, certifications, yearsExperience. Rates displayed as read-only (admin-set, per requirements). Profile data loaded via api.coach.profile.getProfile. Form resets on load, invalidates cache on success. |
| 3 | A new coach can self-register through a signup flow and their application appears in the super admin's approval queue | VERIFIED | POST /api/auth/coach-signup creates User (role: COACH) + Coach (isApproved: false, isActive: false) in a $transaction. Coach signup page at /auth/coach-signup has Turnstile CAPTCHA, honeypot, rate limiting (5/hr/IP). Admin getPendingCoachApprovals query returns coaches where isApproved: false. CoachPendingApprovals component displays pending queue with approve/deny buttons. |
| 4 | The super admin can approve, deny, manually create, activate, deactivate, or suspend coach accounts from the admin interface | VERIFIED | Admin coaches page at /admin/coaches with 3 tabs (All Coaches, Pending Approvals, Proposals). CoachApprovalQueries: approveCoach (sets isApproved+isActive, sends email with password reset token), denyCoach (deletes User cascading to Coach). CoachManagementQueries: createCoach ($transaction User+Coach, sends registration email), toggleCoachStatus (activate/deactivate/suspend with reason). NewCoachDialog with full pricing and revenue split. CoachStatusActions dropdown with activate, deactivate, suspend (with dialog for reason). All use superAdminProcedure. |
| 5 | A coach can propose time slot availability and the super admin can approve or override those proposals | VERIFIED | Coach proposalQueries: createProposal (rinkId, startTime, endTime, maxStudents), getMyProposals, cancelProposal, getRinks. ProposeAvailabilityForm with rink selector, date picker, time inputs, max students. ProposalsList with status badges (PENDING/APPROVED/DENIED), admin notes column, cancel for pending. Admin proposalApprovalQueries: getPendingProposals, approveProposal ($transaction creates RinkTimeSlot + updates proposal to APPROVED), denyProposal (records admin notes). CoachProposalQueue on admin coaches page "Proposals" tab with approve/deny buttons, deny dialog with notes textarea. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | Coach suspension fields | VERIFIED | suspendedAt, suspendedById, suspendedReason fields present (lines 378-380) |
| `prisma/schema.prisma` | ProposedTimeSlot model + ProposalStatus enum | VERIFIED | ProposalStatus enum (PENDING/APPROVED/DENIED) at line 332, ProposedTimeSlot model at line 419 |
| `src/app/api/auth/me/route.ts` | Returns Coach data for coach users | VERIFIED | Coach select conditional for COACH/SUPER_ADMIN/ADMIN roles (lines 36-47), returns id, isApproved, isActive, suspendedAt, bio, skills |
| `src/hooks/useCurrentUser.ts` | Exposes coachId and isCoach | VERIFIED | coachId state (line 7), COACH fetch block (lines 43-68), ADMIN/SUPER_ADMIN Coach fetch (lines 69-83), isCoach in return (lines 102-105), coachId in return (line 97) |
| `src/lib/root.ts` | coachRouter registered | VERIFIED | `coach: coachRouter` at line 11 |
| `src/features/coach/api/queries/index.ts` | Coach sub-routers aggregated | VERIFIED | dashboard, profile, earnings, students, proposals sub-routers (5 total) |
| `src/features/coach/api/queries/dashboardQueries.ts` | Dashboard TRPC queries | VERIFIED | 115 lines, getUpcomingLessons, getPastLessons, getDashboardStats with coachProcedure scoping |
| `src/features/coach/api/queries/profileQueries.ts` | Profile TRPC queries | VERIFIED | 51 lines, getProfile and updateProfile with coachProcedure scoping |
| `src/features/coach/api/queries/earningsQueries.ts` | Earnings TRPC queries | VERIFIED | 83 lines, getEarningsSummary (with revenue split multiplier) and getPaymentHistory |
| `src/features/coach/api/queries/studentQueries.ts` | Students TRPC query | VERIFIED | 36 lines, getMyStudents from CoachStudent junction with lesson counts |
| `src/features/coach/api/queries/proposalQueries.ts` | Proposal TRPC queries | VERIFIED | 100 lines, getRinks, createProposal, getMyProposals, cancelProposal with coachProcedure scoping |
| `src/components/layout/AppSidebar.tsx` | Coach navigation items | VERIFIED | coachNavigation array with Dashboard, Schedule, Students, Earnings, Proposals, Profile (lines 42-49), role="coach" support |
| `src/components/layout/AppLayout.tsx` | Coach role support | VERIFIED | CoachHeader import, coach navigation in mobile sidebar, CoachCommandPalette in command palette section |
| `src/features/coach/components/layout/CoachHeader.tsx` | Coach header with breadcrumbs, greeting, logout | VERIFIED | 134 lines, breadcrumbs, WarmGreeting, NotificationsPopover, logout dialog |
| `src/features/coach/components/layout/CoachCommandPalette.tsx` | Coach Cmd+K palette | VERIFIED | 78 lines, navigation commands for all coach routes |
| `src/app/(protected)/coach/layout.tsx` | Coach layout | VERIFIED | Wraps AppLayout with role="coach" |
| `src/app/api/auth/coach-signup/route.ts` | Coach signup API | VERIFIED | 266 lines, Zod validation, Turnstile verification, honeypot check, rate limiting, User+Coach $transaction (isApproved: false, isActive: false) |
| `src/app/auth/coach-signup/page.tsx` | Coach signup page | VERIFIED | 403 lines, full form with name, email, phone, bio, skills, certifications, years of experience, Turnstile widget, honeypot field |
| `src/app/(protected)/coach/dashboard/page.tsx` | Dashboard page | VERIFIED | Composes CoachOverviewCards, CoachUpcomingLessons, CoachPastLessons |
| `src/features/coach/components/dashboard/CoachOverviewCards.tsx` | 4 stat cards | VERIFIED | 78 lines, uses getDashboardStats, displays totalStudents, upcomingLessons, completedThisMonth, monthlyEarnings |
| `src/features/coach/components/dashboard/CoachUpcomingLessons.tsx` | Upcoming lessons list | VERIFIED | 85 lines, uses getUpcomingLessons, displays student name, lesson type badge, time, rink, price |
| `src/features/coach/components/dashboard/CoachPastLessons.tsx` | Past lessons list | VERIFIED | 87 lines, uses getPastLessons, displays with muted styling |
| `src/app/(protected)/coach/profile/page.tsx` | Profile page | VERIFIED | Composes CoachProfileForm |
| `src/features/coach/components/profile/CoachProfileForm.tsx` | Profile form with editable fields and read-only rates | VERIFIED | 272 lines, React Hook Form + Zod, editable bio/photoUrl/skills/certifications/yearsExperience, read-only rates section showing all 4 lesson type prices, revenue split badge |
| `src/app/(protected)/coach/earnings/page.tsx` | Earnings page | VERIFIED | Composes EarningsOverview and PaymentHistory |
| `src/features/coach/components/earnings/EarningsOverview.tsx` | 4 earnings summary cards | VERIFIED | 83 lines, uses getEarningsSummary, displays totalEarnings, monthEarnings, pendingAmount, revenueSplitPercent |
| `src/features/coach/components/earnings/PaymentHistory.tsx` | Payment history table | VERIFIED | 87 lines, uses getPaymentHistory, table with date, student, lesson type, amount, status, method |
| `src/app/(protected)/coach/students/page.tsx` | Students page | VERIFIED | Composes CoachStudentList |
| `src/features/coach/components/students/CoachStudentList.tsx` | Student list table | VERIFIED | 68 lines, uses getMyStudents, table with name, email, level, total lessons, active/inactive status |
| `src/app/(protected)/coach/schedule/page.tsx` | Schedule placeholder page | VERIFIED | 27 lines, intentional placeholder with message "coming in a future update" (calendar integration is Phase 6 scope) |
| `src/app/(protected)/coach/proposals/page.tsx` | Proposals page | VERIFIED | Composes ProposeAvailabilityForm and ProposalsList |
| `src/features/coach/components/proposals/ProposeAvailabilityForm.tsx` | Proposal form | VERIFIED | 221 lines, React Hook Form + Zod, rink selector, date picker (Calendar popover), start/end time inputs, max students, submits to createProposal mutation |
| `src/features/coach/components/proposals/ProposalsList.tsx` | Proposals list | VERIFIED | 154 lines, uses getMyProposals, table with status badges (yellow/green/red), admin notes column, cancel button for PENDING |
| `src/app/(protected)/admin/coaches/page.tsx` | Admin coaches page | VERIFIED | 83 lines, tabs (All Coaches, Pending Approvals, Proposals), dynamic imports, NewCoachDialog, "Add Coach" button |
| `src/features/admin/api/queries/coach/coachApprovalQueries.ts` | Admin coach approval queries | VERIFIED | 142 lines, getPendingCoachApprovals, approveCoach (sets isApproved+isActive, sends email), denyCoach (deletes User cascading), superAdminProcedure |
| `src/features/admin/api/queries/coach/coachManagementQueries.ts` | Admin coach management queries | VERIFIED | 323 lines, getAllCoaches, getCoachById, createCoach ($transaction), updateCoachPricing, toggleCoachStatus (activate/deactivate/suspend), superAdminProcedure |
| `src/features/admin/api/queries/coach/proposalApprovalQueries.ts` | Admin proposal approval queries | VERIFIED | 128 lines, getPendingProposals, approveProposal ($transaction: create RinkTimeSlot + update status), denyProposal (records admin notes), getAllProposals |
| `src/features/admin/api/queries/coach/index.ts` | Admin coach router | VERIFIED | Combines approval, management, proposals sub-routers |
| `src/features/admin/api/queries/index.ts` | adminCoachRouter registered in admin router | VERIFIED | `coach: adminCoachRouter` at line 14 |
| `src/features/admin/components/coaches/management/CoachPendingApprovals.tsx` | Pending approvals component | VERIFIED | 164 lines, table with approve/deny buttons, uses getPendingCoachApprovals |
| `src/features/admin/components/coaches/management/CoachList.tsx` | Coach list component | VERIFIED | 161 lines, table with status badges (Pending/Suspended/Active/Inactive), dropdown with CoachStatusActions |
| `src/features/admin/components/coaches/management/NewCoachDialog.tsx` | Manual coach creation dialog | VERIFIED | 261 lines, full form with name, email, bio, skills, certifications, years experience, all 4 pricing fields, revenue split, React Hook Form + Zod |
| `src/features/admin/components/coaches/management/CoachStatusActions.tsx` | Status action dropdown items | VERIFIED | 178 lines, activate/deactivate/suspend actions, suspend dialog with reason textarea, uses toggleCoachStatus mutation |
| `src/features/admin/components/coaches/proposals/CoachProposalQueue.tsx` | Admin proposal queue | VERIFIED | 205 lines, table with approve/deny buttons, deny dialog with notes textarea, uses getPendingProposals |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| CoachOverviewCards | TRPC API | api.coach.dashboard.getDashboardStats.useQuery() | WIRED | Component calls query, renders stats in cards |
| CoachUpcomingLessons | TRPC API | api.coach.dashboard.getUpcomingLessons.useQuery() | WIRED | Component calls query, renders lessons with type badges |
| CoachPastLessons | TRPC API | api.coach.dashboard.getPastLessons.useQuery() | WIRED | Component calls query, renders with muted styling |
| CoachProfileForm | TRPC API | api.coach.profile.getProfile/updateProfile | WIRED | Loads profile, submits edits via mutation, invalidates cache |
| EarningsOverview | TRPC API | api.coach.earnings.getEarningsSummary.useQuery() | WIRED | Component calls query, applies revenue split in display |
| PaymentHistory | TRPC API | api.coach.earnings.getPaymentHistory.useQuery() | WIRED | Component calls query, renders payment table |
| CoachStudentList | TRPC API | api.coach.students.getMyStudents.useQuery() | WIRED | Component calls query, renders student table |
| ProposeAvailabilityForm | TRPC API | api.coach.proposals.createProposal.useMutation() | WIRED | Form submits to mutation, invalidates proposals list |
| ProposalsList | TRPC API | api.coach.proposals.getMyProposals.useQuery() | WIRED | Component calls query, renders with status badges |
| CoachPendingApprovals | TRPC API | api.admin.coach.approval.getPendingCoachApprovals | WIRED | Component calls query, approve/deny buttons call mutations |
| CoachList | TRPC API | api.admin.coach.management.getAllCoaches.useQuery() | WIRED | Component calls query, renders table with status badges and dropdown actions |
| NewCoachDialog | TRPC API | api.admin.coach.management.createCoach.useMutation() | WIRED | Dialog form submits to mutation, closes on success |
| CoachStatusActions | TRPC API | api.admin.coach.management.toggleCoachStatus.useMutation() | WIRED | Dropdown actions call mutation with activate/deactivate/suspend |
| CoachProposalQueue | TRPC API | api.admin.coach.proposals.getPendingProposals/approveProposal/denyProposal | WIRED | Queue table with approve/deny, approve creates RinkTimeSlot in transaction |
| Coach signup page | Coach signup API | fetch("/api/auth/coach-signup") | WIRED | Form submits POST with all fields, handles response, redirects to login |
| coachRouter | root TRPC router | root.ts: coach: coachRouter | WIRED | Registered in appRouter |
| adminCoachRouter | admin TRPC router | admin/queries/index.ts: coach: adminCoachRouter | WIRED | Registered in adminRouter |
| Coach layout | AppLayout | AppLayout role="coach" | WIRED | Coach layout wraps children with AppLayout |
| AppLayout | CoachHeader | role === "coach" ? CoachHeader : ... | WIRED | CoachHeader imported and rendered for coach role |
| AppSidebar | coachNavigation | role === "coach" ternary | WIRED | Coach nav items rendered for coach role |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| AUTH-04 (Coach self-registration) | SATISFIED | None |
| CMGT-01 (Coach approval queue) | SATISFIED | None |
| CMGT-02 (Manual coach creation) | SATISFIED | None |
| CMGT-03 (Coach status management) | SATISFIED | None |
| CMGT-04 (Coach suspension) | SATISFIED | None |
| CDSH-01 (Coach dashboard) | SATISFIED | None |
| CDSH-02 (Coach time slot proposals) | SATISFIED | None |
| CDSH-03 (Coach profile editing) | SATISFIED | None |
| CDSH-04 (Coach earnings view) | SATISFIED | None |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| coach/schedule/page.tsx | 19 | "will be available here" placeholder message | Info | Intentional placeholder; calendar integration is Phase 6 scope per ROADMAP |

No blockers, no TODO/FIXME patterns, no stub implementations found across all 45+ coach-related files.

### Human Verification Required

### 1. Coach Dashboard Visual Layout
**Test:** Log in as a coach user and navigate to /coach/dashboard
**Expected:** See 4 overview cards (Total Students, Upcoming Lessons, Completed This Month, Monthly Earnings) and two columns showing upcoming and past lessons with color-coded type badges
**Why human:** Cannot verify visual layout and data rendering programmatically

### 2. Coach Profile Edit Persistence
**Test:** Navigate to /coach/profile, edit bio field, click Save Profile, refresh page
**Expected:** Bio field retains the updated value after page refresh
**Why human:** Requires database state verification through UI interaction

### 3. Coach Signup Flow
**Test:** Navigate to /auth/coach-signup, fill in all fields including Turnstile verification, submit
**Expected:** Success toast appears, redirect to login page, and application appears in admin coaches pending tab
**Why human:** Requires Turnstile widget interaction and end-to-end flow verification

### 4. Admin Coach Approval Flow
**Test:** As super admin at /admin/coaches, go to Pending Approvals tab, click Approve on a pending coach
**Expected:** Coach status changes, registration email sent, coach can subsequently log in
**Why human:** Requires multi-role testing and email verification

### 5. Proposal Approval Creates Time Slot
**Test:** As coach, submit a proposal. As admin, approve it at /admin/coaches Proposals tab
**Expected:** Real RinkTimeSlot created in database, proposal status changes to APPROVED, coach sees updated status
**Why human:** Requires cross-role interaction and database verification

### Gaps Summary

No gaps found. All 5 success criteria from the ROADMAP are fully satisfied by the codebase:

1. **Coach dashboard** -- Complete with overview cards, upcoming/past lessons, connected to TRPC queries scoped by coachId
2. **Coach profile editing** -- Full React Hook Form implementation with editable bio/photo/skills/certs and read-only rates section
3. **Coach self-registration** -- Complete signup flow with Turnstile, honeypot, rate limiting; creates unapproved Coach+User records
4. **Admin coach management** -- Full CRUD with approval queue, manual creation, activate/deactivate/suspend actions, all using superAdminProcedure
5. **Coach time slot proposals** -- End-to-end proposal system with coach form, admin queue, transactional approval creating RinkTimeSlots, deny with admin notes

The schedule page at /coach/schedule is intentionally a placeholder since the calendar integration is scoped for Phase 6 (Per-Coach Google Calendar). This is not a gap since the Phase 2 success criteria do not require a full calendar -- they require the ability to "propose time slot availability" which is fully implemented via the proposals system.

TypeScript type checking passes with zero errors. No anti-pattern stubs detected across all phase artifacts.

---

_Verified: 2026-03-15T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
