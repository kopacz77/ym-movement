# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Students can discover, browse, and book lessons from multiple coaches across different disciplines, while the super admin maintains full visibility and control over the entire coaching operation including revenue splits and payouts.
**Current focus:** Phase 2 -- Coach Dashboard, Profile, and Onboarding

## Current Position

Phase: 2 of 7 (Coach Dashboard, Profile, and Onboarding)
Plan: 4 of 6
Status: In progress
Last activity: 2026-03-15 -- Completed 02-04-PLAN.md (coach dashboard, profile, earnings, students, schedule pages)

Progress: ██████░░░░░░░░░░░░░░ 29% (7/~24 plans, phases 3-7 not yet planned)

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 4.6min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-auth-schema-foundation | 3/3 | 19min | 6.3min |
| 02-coach-dashboard-profile | 4/6 | 22min | 5.5min |

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

### Pending Todos

- Run `pnpm migrate:coach-data` to backfill Yura as first coach (creates Coach record, updates role to SUPER_ADMIN, backfills coachId on all data)

### Blockers/Concerns

- trpc.ts and trpc-optimized.ts duplication must be consolidated before adding new middleware (Phase 1)
- Google OAuth consent screen may show unverified app warning -- acceptable for small coaching business
- googleapis version at v150.0.1 (latest v171.4.0) -- consider upgrading before multi-coach work
- Pre-existing `pnpm build` failure: Next.js 16.1.6 post-build 404 copy error (unrelated to auth changes, compilation succeeds)

## Session Continuity

Last session: 2026-03-15
Stopped at: Completed 02-04-PLAN.md (coach dashboard, profile, earnings, students, schedule pages)
Resume file: None
