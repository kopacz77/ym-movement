# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Students can discover, browse, and book lessons from multiple coaches across different disciplines, while the super admin maintains full visibility and control over the entire coaching operation including revenue splits and payouts.
**Current focus:** Phase 9/10 — Coach & Admin Flow Tests / Student & Security Tests

## Current Position

Phase: 9 of 10 (Coach & Admin Flow Tests)
Plan: 2 of 2 in phase (phase complete)
Status: Phase 9 complete
Last activity: 2026-03-16 — Completed 09-02-PLAN.md (admin coach management E2E tests)

Progress: ████████░░░░░░░░░░░░░░░░░ 31% (4/? plans)

## Performance Metrics

**v1.0 Multi-Coach (completed):**
- Total plans completed: 25
- Average duration: 3.8min

**v1.1 Test & Stabilize:**
- Total plans completed: 4
- Average duration: 3.6min

## Accumulated Context

### Decisions

- Playwright E2E for test coverage (not unit tests) — E2E tests verify real user flows
- Extend existing test helpers (not rewrite) — test-utils.ts has proven patterns
- Google Calendar OAuth tests excluded — cannot test real OAuth in automated tests
- Phases 9 and 10 can run in parallel (both depend only on Phase 8)
- Use project dependencies pattern (not globalSetup) for Playwright setup ordering
- Default storageState is super-admin.json; tests override with test.use() for other roles
- loginAsAdmin kept as backward compat alias for loginAsSuperAdmin
- Seed coach2 data now so Phase 9 multi-coach tests have data ready
- Only swap credential sources in legacy specs; do not change test logic or assertions
- Keep explicit loginAsAdmin() calls in beforeEach (storageState migration is future work)
- Two pending coaches (coach3, coach4) seeded for independent approve/deny testing
- deleteMany + create pattern for seed entities without unique constraints (ProposedTimeSlot, Lesson)
- Deny confirmation uses button:has-text("Delete") matching showDeleteConfirmation() toast pattern
- Admin coach management tests use default super-admin storageState (no test.use override needed)
- Revenue split test resets to 70% after edit for idempotent runs
- Payout report tests handle both data and empty states with .or() pattern

### Pending Todos

- Run `pnpm migrate:coach-data` before production deployment
- Set up Google OAuth credentials for production
- 21-item human verification checklist from v1.0 audit informs test scenarios

### Blockers/Concerns

- Pre-existing `pnpm build` failure: Next.js post-build 404 copy error (unrelated, compilation succeeds)
- Existing tests may need database seeding changes for SUPER_ADMIN role (seed script now handles this)

## Session Continuity

Last session: 2026-03-16
Stopped at: Completed 09-02-PLAN.md — Phase 9 complete, ready for Phase 10
Resume file: None
