# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Students can discover, browse, and book lessons from multiple coaches across different disciplines, while the super admin maintains full visibility and control over the entire coaching operation including revenue splits and payouts.
**Current focus:** Between milestones — v1.1 complete, next milestone not started

## Current Position

Phase: —
Plan: —
Status: Milestone v1.1 complete
Last activity: 2026-03-17 — Completed v1.1 Test & Stabilize milestone

## Performance Metrics

**v1.0 Multi-Coach (completed):**
- Total plans completed: 25
- Average duration: 3.8min

**v1.1 Test & Stabilize (completed):**
- Total plans completed: 11
- Average duration: 10.5min

## Accumulated Context

### Decisions

- Playwright E2E for test coverage (not unit tests) — E2E tests verify real user flows
- Extend existing test helpers (not rewrite) — test-utils.ts has proven patterns
- Google Calendar OAuth tests excluded — cannot test real OAuth in automated tests
- Use project dependencies pattern (not globalSetup) for Playwright setup ordering
- Default storageState is super-admin.json; tests override with test.use() for other roles
- proxy.ts replaces middleware.ts for Next.js 16 (function renamed from middleware to proxy)
- Sign Out button text must be exactly "Sign Out" to match test selector
- Use 2 workers for local dev server testing (prevents compilation overload)
- Use domcontentloaded instead of networkidle to avoid cold-compilation timeouts

### Pending Todos

- Run `pnpm migrate:coach-data` before production deployment
- Set up Google OAuth credentials for production
- Pre-existing `pnpm build` failure: Next.js post-build 404 copy error (unrelated, compilation succeeds)

### Blockers/Concerns

(None — all v1.1 blockers resolved)

## Session Continuity

Last session: 2026-03-17
Stopped at: Completed v1.1 milestone archival
Resume file: None
