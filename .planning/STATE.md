# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Students can discover, browse, and book lessons from multiple coaches across different disciplines, while the super admin maintains full visibility and control over the entire coaching operation including revenue splits and payouts.
**Current focus:** Phase 4 -- Per-Coach Scheduling

## Current Position

Phase: 4 of 7 (Per-Coach Scheduling)
Plan: 3 of 3
Status: In progress
Last activity: 2026-03-15 -- Completed 04-02-PLAN.md (admin calendar coach filtering)

Progress: ████████████████░░░░ 62% (16/~26 plans, phases 5-7 not yet planned)

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: 4.2min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-auth-schema-foundation | 3/3 | 19min | 6.3min |
| 02-coach-dashboard-profile | 6/6 | 33min | 5.5min |
| 03-query-scoping-super-admin | 4/4 | ~17min | ~4.3min |
| 04-per-coach-scheduling | 2/3 | 6min | 3min |

## Accumulated Context

### Decisions

- 7 phases derived from 26 requirements across 7 categories
- Research identified 179 unscoped queries (SADM-04) -- query scoping in Phase 3 before second coach onboarding
- JWT sessions cache roles -- auth middleware must accept both ADMIN and SUPER_ADMIN before schema migration (Phase 1)
- Google Calendar refactored from singleton to per-coach OAuth deferred to Phase 6 (existing service account works for Yura)
- CoachStudent junction table for many-to-many relationship (students train with multiple coaches)
- Pricing waterfall: student custom pricing > coach pricing > global defaults > hardcoded fallback
- [01-01] superAdminProcedure uses isAdminRole (accepts both ADMIN and SUPER_ADMIN) during transition -- will be tightened later
- [01-01] coachProcedure uses @ts-expect-error for prisma.coach until Plan 03 adds Coach model
- [01-01] isCoachRole includes ADMIN and SUPER_ADMIN in hierarchy -- admins have implicit coach access
- [01-02] SUPER_ADMIN and ADMIN both access /admin/* routes; COACH, SUPER_ADMIN, and ADMIN access /coach/* routes
- [01-02] Role union type ordering standardized: SUPER_ADMIN | ADMIN | COACH | STUDENT across all files
- [01-02] Deferred Coach profile in /api/auth/me to Plan 03 (Coach model does not exist yet)
- [01-03] Coach model placed after BlockedDateRange in schema following alphabetical convention
- [01-03] Data migration script NOT auto-run -- requires manual `pnpm migrate:coach-data`
- [01-03] Yura Coach record uses revenueSplitPercent=100 (owner); new coaches default to 70%
- [01-03] Removed @ts-expect-error from coachProcedure (Coach model now exists in Prisma client)
- [02-01] Coach suspension fields placed after approvedById, before pricing fields in schema
- [02-01] ProposedTimeSlot model placed after CoachStudent following alphabetical convention
- [02-01] ADMIN/SUPER_ADMIN block in useCurrentUser also fetches Coach profile for coachId (silent fail if no Coach record)
- [02-01] /api/auth/me returns Coach select for COACH/ADMIN/SUPER_ADMIN (id, isApproved, isActive, suspendedAt, bio, skills)
- [02-03] Phone collected on coach signup form but not stored (Coach model has no phone column)
- [02-03] Reused sendWelcomeEmail for coach applications (no coach-specific email template yet)
- [02-03] Coach record dual gate: isApproved: false AND isActive: false until admin approval
- [02-02] coachStudentsRouter name avoids collision with existing studentRouter
- [02-02] Coach profile update excludes pricing fields (coach can view but not edit rates)
- [02-02] Revenue split applied as revenueSplitPercent / 100 multiplier on earnings aggregations
- [02-02] Dashboard stats count distinct students via Prisma distinct on studentId
- [02-04] Payment model field is `method` not `paymentMethod` -- corrected during type-check
- [02-04] Profile form Zod schema uses required strings (not optional+default) to align with react-hook-form resolver types
- [02-05] GraduationCap icon used for Coaches nav item to differentiate from Students (Users icon)
- [02-05] Deny flow deletes User (cascades to Coach) matching student rejection pattern
- [02-05] Coach creation uses $transaction for atomic User+Coach record creation
- [02-05] All admin coach queries use superAdminProcedure (not protectedProcedure)
- [02-05] CoachStatusActions renders DropdownMenuItems directly for parent DropdownMenu composition
- [02-06] getRinks added to proposalRouter (coach-scoped) since existing rink queries are admin-only
- [02-06] Approval uses $transaction for atomic RinkTimeSlot creation + proposal status update
- [02-06] RinkTimeSlot field is isActive (not isAvailable as plan stated) -- corrected to match schema
- [02-06] Deny flow opens dialog for optional admin notes (coach sees denial reason in their list)
- [03-01] Students remain shared resource -- getStudents not scoped by coachId
- [03-01] assignStudentToTimeSlot inherits coachId from timeSlot, not from input
- [03-01] Delete operations not scoped by coachId (admin can delete any)
- [03-01] updateTimeSlot overlap check uses existing slot's coachId from DB lookup
- [03-02] Payment coachId filtering uses Lesson relation (Lesson: { coachId }) since Payment has no direct coachId column
- [03-02] Student count in getOverview NOT scoped by coachId (students are shared resources)
- [03-02] bookingQueries.ts keeps protectedProcedure (student-facing, not admin-only)
- [03-02] coachId inherited from timeSlot.coachId in lesson creation (not from user input)
- [03-02] progressQueries.ts excluded (entirely commented-out dead code)
- [03-02] cache-wrapper.ts deferred (different abstraction level)
- [03-03] User model has no image field -- removed from getCoachDetail select (plan specified image but schema lacks it)
- [03-03] Payment scoping always through Lesson relation (Lesson: { coachId }) per research Pitfall 1
- [04-01] Non-null assertion (ctx.session!) for createdById in coach schedule -- coachProcedure guarantees session but TS cannot narrow
- [04-01] Coach field on TimeSlot interface is optional (Coach?) for backward compatibility
- [04-01] getRinks in scheduleRouter includes address field (proposalQueries omits it) for schedule display
- [04-02] getAllCoaches (superAdminProcedure) used in ScheduleManager -- functionally identical to adminProcedure during transition
- [04-02] Coach selection enforced via toast validation in handleEnhancedBookingSubmit (not disabled button)
- [04-02] Coach name appended to calendar event title in brackets [Coach Name] after student count
- [04-03] Coach schedule is read-only for time slots -- no-op callbacks for DesktopCalendarView required props (onSelectSlot, onEventDrop)
- [04-03] Reused admin DesktopCalendarView/MobileCalendarView/TimeSlotDialogAdapter for coach calendar (no coach-specific calendar components)
- [04-03] CoachBlockedDates uses shadcn/ui components (Button, Input, Select) unlike admin WorkingBlockedDatesManager inline styles
- [04-03] Empty students array and no-op handlers passed to TimeSlotDialogAdapter for read-only slot viewing

### Pending Todos

- Run `pnpm migrate:coach-data` to backfill Yura as first coach (creates Coach record, updates role to SUPER_ADMIN, backfills coachId on all data)

### Blockers/Concerns

- trpc.ts and trpc-optimized.ts duplication must be consolidated before adding new middleware (Phase 1)
- Google OAuth consent screen may show unverified app warning -- acceptable for small coaching business
- googleapis version at v150.0.1 (latest v171.4.0) -- consider upgrading before multi-coach work
- Pre-existing `pnpm build` failure: Next.js 16.1.6 post-build 404 copy error (unrelated to auth changes, compilation succeeds)

## Session Continuity

Last session: 2026-03-15
Stopped at: Completed 04-02-PLAN.md (admin calendar coach filtering)
Resume file: None
