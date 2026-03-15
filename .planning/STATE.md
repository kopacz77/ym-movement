# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Students can discover, browse, and book lessons from multiple coaches across different disciplines, while the super admin maintains full visibility and control over the entire coaching operation including revenue splits and payouts.
**Current focus:** Phase 1 -- Auth, Schema, and Data Migration

## Current Position

Phase: 1 of 7 (Auth, Schema, and Data Migration)
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-14 -- Project initialized, roadmap created

Progress: ░░░░░░░░░░ 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: --

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| -- | -- | -- | -- |

## Accumulated Context

### Decisions

- 7 phases derived from 26 requirements across 7 categories
- Research identified 179 unscoped queries (SADM-04) -- query scoping in Phase 3 before second coach onboarding
- JWT sessions cache roles -- auth middleware must accept both ADMIN and SUPER_ADMIN before schema migration (Phase 1)
- Google Calendar refactored from singleton to per-coach OAuth deferred to Phase 6 (existing service account works for Yura)
- CoachStudent junction table for many-to-many relationship (students train with multiple coaches)
- Pricing waterfall: student custom pricing > coach pricing > global defaults > hardcoded fallback

### Pending Todos

(None yet)

### Blockers/Concerns

- trpc.ts and trpc-optimized.ts duplication must be consolidated before adding new middleware (Phase 1)
- Google OAuth consent screen may show unverified app warning -- acceptable for small coaching business
- googleapis version at v150.0.1 (latest v171.4.0) -- consider upgrading before multi-coach work

## Session Continuity

Last session: 2026-03-14
Stopped at: Project initialization, roadmap created
Resume file: None
