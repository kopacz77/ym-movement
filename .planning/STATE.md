# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Students can discover, browse, and book lessons from multiple coaches across different disciplines, while the super admin maintains full visibility and control over the entire coaching operation including revenue splits and payouts.
**Current focus:** Phase 1 -- Auth, Schema, and Data Migration

## Current Position

Phase: 1 of 7 (Auth, Schema, and Data Migration)
Plan: 2 of 3 complete in Phase 1
Status: In progress
Last activity: 2026-03-15 -- Completed 01-02-PLAN.md (frontend auth layer for SUPER_ADMIN and COACH)

Progress: ██░░░░░░░░ ~10% (2 plans of ~21 estimated total)

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 6.5min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-auth-schema-foundation | 2/3 | 13min | 6.5min |

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

### Pending Todos

(None yet)

### Blockers/Concerns

- trpc.ts and trpc-optimized.ts duplication must be consolidated before adding new middleware (Phase 1)
- Google OAuth consent screen may show unverified app warning -- acceptable for small coaching business
- googleapis version at v150.0.1 (latest v171.4.0) -- consider upgrading before multi-coach work
- Pre-existing `pnpm build` failure: Next.js 16.1.6 post-build 404 copy error (unrelated to auth changes, compilation succeeds)

## Session Continuity

Last session: 2026-03-15
Stopped at: Completed 01-02-PLAN.md
Resume file: None
