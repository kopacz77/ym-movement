# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-28)

**Core value:** Students can discover, browse, and book lessons from multiple coaches AND browse, fit-match, and rent competition dresses. The super admin manages both coaching operations and the wardrobe marketplace end-to-end.
**Current focus:** v2.0 YM Wardrobe — defining requirements

## Current Position

Phase: 13 of 22 (Wardrobe Schema Foundation)
Plan: 01 of N (Wardrobe Schema + Migration) — completed
Status: In progress
Last activity: 2026-05-29 — Completed 13-01-PLAN.md (wardrobe schema, transaction-wrapped migration applied to dev Neon, zero data loss)

Progress: █░░░░░░░░░ ~10% of v2.0 milestone

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
- **(13-01) Author Prisma migration.sql by hand**: CLAUDE.md + .claude/settings.local.json forbid every migrate dev variant; `prisma migrate deploy` (= `pnpm prisma:migrate`) is the only allowed apply command
- **(13-01) Wrap migrations in `BEGIN;...COMMIT;`**: forces clean rollback on partial failure
- **(13-01) Restrict cascades on Dress.Owner, RentalRequest.*, Rental.*; Cascade only on DressImage.Dress**: protect audit history, allow orphan-image cleanup
- **(13-01) All wardrobe money fields stored as Int cents** (no Float, to avoid drift)
- **(13-01) Settings extension deferred to Plan 02**: existing Settings is key/value JSON, not typed singleton; wardrobe defaults will be a `key: "wardrobe"` row
- **(13-01) Named `@relation("DressOwner")` on User<->Dress**: pre-empt ambiguity if a `lastEditedById` link is added later

### Pending Todos

(None)

### Completed Todos

- ~~Set up Google OAuth credentials for production~~ — Configured in GCP project `yuras-app` with redirect URI `https://ym-movement.com/api/auth/google-calendar/callback`, env vars added to Netlify
- ~~Run `pnpm migrate:coach-data` before production deployment~~ — Verified applied (5 coaches, 0 null coachIds, 67 CoachStudent links)
- ~~Pre-existing `pnpm build` failure: Next.js post-build 404 copy error~~ — Resolved by Next.js 16.1.1 → 16.1.6 upgrade

### Blockers/Concerns

- **(13-01) Pre-existing TypeScript errors uncovered after node_modules re-install**: `src/components/landing/IceParticles.tsx` (missing `three` types) and `src/components/ui/sidebar.tsx` (missing `@radix-ui/react-visually-hidden`). Confirmed pre-existing via git stash; out of scope for Plan 13-01 but should be triaged separately.
- **(13-01) pnpm 11.2.2 ignores legacy `pnpm.overrides` key in package.json** — caused a node_modules wipe + reinstall mid-session. Lockfile was regenerated via `pnpm install --no-frozen-lockfile`. Future invocations of `pnpm db:check` should be stable, but if pnpm tries to "Recreate node_modules" again, the root cause is the same — the `pnpm.overrides` block in package.json should eventually be removed or migrated to pnpm-workspace.yaml.

## Session Continuity

Last session: 2026-05-29T04:25:55Z
Stopped at: Completed 13-01-PLAN.md (wardrobe schema authored, transaction-wrapped migration applied to dev Neon, zero data loss across 7 critical tables).
Resume file: None
Next step: `/gsd:plan-phase 13` next plan (Settings JSON blob + wardrobe defaults seed), or proceed to `/gsd:plan-phase 14`.
