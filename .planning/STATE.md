# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Students can discover, browse, and book lessons from multiple coaches across different disciplines, while the super admin maintains full visibility and control over the entire coaching operation including revenue splits and payouts.
**Current focus:** v1.1 Test & Stabilize — E2E tests for multi-coach features

## Current Position

Milestone: v1.1 Test & Stabilize
Phase: Not started (run /gsd:define-requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-16 — Milestone v1.1 started

## Accumulated Context

### Decisions

- Playwright E2E for test coverage (not unit tests) — E2E tests verify real user flows
- Extend existing test helpers (not rewrite) — test-utils.ts has proven patterns
- Google Calendar OAuth tests may need mocking (can't test real OAuth in CI)
- Test data seeding needed for coach accounts and multi-coach scenarios

### Pending Todos

- Run `pnpm migrate:coach-data` before production deployment
- Set up Google OAuth credentials for production
- 21-item human verification checklist from v1.0 audit informs test scenarios

### Blockers/Concerns

- Pre-existing `pnpm build` failure: Next.js 16.1.6 post-build 404 copy error (unrelated, compilation succeeds)
- Google OAuth consent screen may show unverified app warning

## Session Continuity

Last session: 2026-03-16
Stopped at: v1.1 milestone initialized, ready for requirements definition
Resume file: None
