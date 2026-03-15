# Roadmap

**Project:** YM Movement Multi-Coach Platform
**Created:** 2026-03-14
**Phases:** 7

## Overview

This roadmap transforms the existing single-coach YM Movement scheduling platform into a multi-coach marketplace. The phase ordering is driven by two hard constraints: (1) database schema and auth changes must land first because every feature depends on coaches existing in the system, and (2) data isolation (query scoping) must be complete before a second coach is onboarded. The structure follows the dependency chain: foundation, then coach experience, then data safety, then scheduling, then student booking, then integrations, then revenue.

## Phases

### Phase 1: Auth, Schema, and Data Migration

**Goal:** The system recognizes SUPER_ADMIN and COACH roles, the Coach entity exists in the database, and all existing production data is associated with Yura as the first coach -- without breaking any current functionality.
**Depends on:** Nothing (first phase)
**Requirements:** AUTH-01, AUTH-02, AUTH-03, SCHD-03
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md -- Backend auth layer: TRPC middleware update, role helper utility, JWT callback refresh
- [x] 01-02-PLAN.md -- Frontend auth layer: Next.js middleware, login redirect, type definitions, auth contexts
- [x] 01-03-PLAN.md -- Schema migration and data backfill: Coach/CoachStudent models, coachId columns, migration script

**Success Criteria:**
1. Yura can log in with her existing credentials and access all current admin features without interruption (backward compatibility preserved)
2. The database contains a Coach record for Yura, and every existing lesson, time slot, payment, and blocked date is associated with her coachId
3. TRPC middleware enforces SUPER_ADMIN, COACH, and STUDENT role guards on protected routes, rejecting unauthorized access
4. Yura's account is recognized as both SUPER_ADMIN and COACH, and she can access features gated to either role

---

### Phase 2: Coach Dashboard, Profile, and Onboarding

**Goal:** Coaches have a dedicated area to manage their teaching life -- viewing their schedule, students, earnings, and profile -- and the super admin can onboard new coaches through approval or manual creation.
**Depends on:** Phase 1
**Requirements:** AUTH-04, CMGT-01, CMGT-02, CMGT-03, CMGT-04, CDSH-01, CDSH-02, CDSH-03, CDSH-04
**Plans:** 6 plans

Plans:
- [x] 02-01-PLAN.md -- Schema + auth wiring: suspension fields, ProposedTimeSlot model, /api/auth/me Coach data, useCurrentUser hook
- [x] 02-02-PLAN.md -- Coach TRPC router + layout shell: coach API sub-routers, AppLayout/AppSidebar extension, CoachHeader
- [x] 02-03-PLAN.md -- Coach signup + registration: coach-signup API endpoint and signup page with Turnstile/honeypot
- [x] 02-04-PLAN.md -- Coach pages: dashboard with overview cards/lessons, profile form, earnings summary, students list, schedule placeholder
- [x] 02-05-PLAN.md -- Admin coach management: approval queue, coach list, manual creation, status toggle, admin coaches page
- [x] 02-06-PLAN.md -- Coach proposals + admin approval: time slot proposal form, proposal list, admin approval queue

**Success Criteria:**
1. A coach can log in and see a dedicated dashboard showing their upcoming lessons, past lessons, and a summary of their students and earnings
2. A coach can edit their profile (bio, photo, skills/disciplines, rates, certifications) and the changes persist
3. A new coach can self-register through a signup flow and their application appears in the super admin's approval queue
4. The super admin can approve, deny, manually create, activate, deactivate, or suspend coach accounts from the admin interface
5. A coach can propose time slot availability and the super admin can approve or override those proposals

---

### Phase 3: Query Scoping and Super Admin Dashboard

**Goal:** No coach can see another coach's data, and the super admin has full cross-coach visibility over the entire coaching operation.
**Depends on:** Phase 1, Phase 2
**Requirements:** SADM-01, SADM-02, SADM-03, SADM-04
**Plans:** 4 plans

Plans:
- [ ] 03-01-PLAN.md -- Admin schedule query scoping: timeSlotQueries, lessonQueries, blockedDateQueries, recurringPatternQueries upgraded to adminProcedure with optional coachId filtering, per-coach overlap detection
- [ ] 03-02-PLAN.md -- Analytics/payment security fix and scoping: analyticsQueries publicProcedure security fix, payment coachId via Lesson relation, settings/rink procedure upgrade, student booking coachId inheritance
- [ ] 03-03-PLAN.md -- Super admin TRPC queries: coaches overview, coach drill-down, revenue breakdown with payout calculations
- [ ] 03-04-PLAN.md -- Super admin dashboard UI: CoachOverviewCards, CoachDetailView, RevenueBreakdownChart, enhanced admin dashboard page

**Success Criteria:**
1. A coach querying lessons, time slots, students, or payments only sees records associated with their own coachId -- never another coach's data
2. The super admin dashboard shows a coaches overview with each coach's status, total hours booked, and earnings summary
3. The super admin can drill into any individual coach's calendar, upcoming lessons, and student roster
4. Revenue reports display platform-wide totals alongside per-coach breakdowns with payout calculations

---

### Phase 4: Per-Coach Scheduling

**Goal:** Time slots are owned by individual coaches, conflict detection respects coach boundaries, and each coach independently manages their own blocked dates.
**Depends on:** Phase 1, Phase 3
**Requirements:** SCHD-01, SCHD-02, SCHD-04

**Success Criteria:**
1. Every time slot in the system is associated with a specific coach, and the creation UI requires coach assignment
2. Two different coaches can have overlapping time slots at different rinks without triggering a conflict
3. Each coach can create, edit, and delete their own blocked dates (travel, competitions) without affecting other coaches' availability
4. The super admin can view and manage time slots across all coaches from the admin calendar

**Plans:** (created by /gsd:plan-phase)

---

### Phase 5: Student Multi-Coach Booking

**Goal:** Students can discover coaches, view their profiles, and book lessons with any approved coach -- seeing which coach each lesson is with throughout their experience.
**Depends on:** Phase 2, Phase 4
**Requirements:** BOOK-01, BOOK-02, BOOK-03

**Success Criteria:**
1. A student can browse a list of available coaches, view their profiles (bio, specialties, rates), and select a coach to see their available time slots
2. Every lesson card, schedule view, and payment record a student sees displays which coach the lesson is with
3. A single student can book lessons with multiple different coaches and see all bookings unified on their dashboard

**Plans:** (created by /gsd:plan-phase)

---

### Phase 6: Per-Coach Google Calendar

**Goal:** Each coach connects their own Google Calendar so lesson events appear on their personal calendar, replacing the single-admin calendar model.
**Depends on:** Phase 4
**Requirements:** INTG-01

**Success Criteria:**
1. A coach can connect their Google account via an OAuth flow from their settings page, and their authorization persists across sessions
2. When a lesson is booked with a coach who has connected their calendar, the event appears on that coach's Google Calendar automatically
3. If a coach has not connected their Google Calendar, the system gracefully degrades -- lessons still work, but no calendar event is created for that coach

**Plans:** (created by /gsd:plan-phase)

---

### Phase 7: Revenue Splits, Notifications, and Polish

**Goal:** The platform tracks per-coach revenue with configurable split percentages, coaches receive relevant notifications, and the dual-role owner experience is polished.
**Depends on:** Phase 3, Phase 5
**Requirements:** INTG-02, INTG-03

**Success Criteria:**
1. The super admin can configure a revenue split percentage for each coach, and the system calculates platform fee vs. coach earnings on every payment
2. Coaches receive booking confirmation, cancellation, and payment notifications specifically for their own lessons
3. Yura's dual-role experience is seamless -- she can switch between super admin oversight and her own coach dashboard without friction
4. Payout reports show each coach's total earnings, platform fees deducted, and amounts owed for a given period

**Plans:** (created by /gsd:plan-phase)

---

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1 - Auth, Schema, and Data Migration | Complete | 2026-03-15 |
| 2 - Coach Dashboard, Profile, and Onboarding | Complete | 2026-03-15 |
| 3 - Query Scoping and Super Admin Dashboard | Not started | -- |
| 4 - Per-Coach Scheduling | Not started | -- |
| 5 - Student Multi-Coach Booking | Not started | -- |
| 6 - Per-Coach Google Calendar | Not started | -- |
| 7 - Revenue Splits, Notifications, and Polish | Not started | -- |

---

*Roadmap for milestone: v1.0 Multi-Coach*
