# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-30)

**Core value:** Students can discover, browse, and book lessons from multiple coaches AND browse, fit-match, and rent competition dresses. The super admin manages both coaching operations and the wardrobe marketplace end-to-end.
**Current focus:** Planning next milestone (v2.0 YM Wardrobe shipped 2026-05-30)

## Current Position

Status: **v2.0 milestone complete & archived.** Ready to plan next milestone.
Last activity: 2026-05-30 — v2.0 YM Wardrobe milestone shipped (10 phases, 47 plans, 86 requirements, 177 commits over 3 days). Audit passed (86/86 reqs, 17/17 contracts, 4/4 flows, 8/8 functional checks). Tech debt cleaned in audit polish commit `6cff719`. Archive at `milestones/v2.0-*`.

Next step: `/gsd:discuss-milestone` to figure out what v2.1 (or whatever's next) should be.

Progress: ████████████ v2.0 100% complete

## Performance Metrics

**v1.0 Multi-Coach (completed):**
- Total plans completed: 25 | Average duration: 3.8min

**v1.1 Test & Stabilize (completed):**
- Total plans completed: 11 | Average duration: 10.5min

**v2.0 YM Wardrobe (completed 2026-05-30):**
- Total plans completed: 47 (10 phases)
- 177 commits | 263 files changed | 52,444 insertions | 13,140 LOC wardrobe code
- Timeline: 2026-05-28 → 2026-05-30 (3 calendar days, autonomous orchestration)
- Audit: PASSED (`milestones/v2.0-MILESTONE-AUDIT.md`)

## Accumulated Context

### Decisions

See `.planning/PROJECT.md` "Key Decisions" table for the canonical log across all milestones (v1.0 + v1.1 + v2.0). Phase-level ADRs are preserved per-phase under `.planning/phases/*/`.

### Open Blockers / Concerns (carryover from v2.0 to next milestone)

- Pre-existing `IceParticles.tsx` `three` types declaration error — unrelated to v2.0; ignored throughout v2.0 verification
- pnpm `ERR_PNPM_IGNORED_BUILDS` wrapper quirk affecting `pnpm vitest run` + `pnpm prisma:migrate` — sidestepped via `npx` direct invocation across v2.0 (Phases 20-03 / 21-01 / 21-02 / 22-01 SUMMARYs document this)
- Storybook `viteFinal` alias for `@/lib/security` + `node:crypto` is a tactical workaround — architectural server-only split (`.schema.ts` siblings + `import "server-only"` directive) deferred to next milestone
- Storybook project-wide coverage at ~17% — 200+ components still without stories (audit at `docs/storybook-audit.md` enumerates gaps)
- `vercel.json` cron declarations REPLACE Vercel dashboard schedules on deploy — user must cross-check current dashboard schedule for `/api/cron/send-batch-emails` matches `0 4 * * *` UTC before next `vercel deploy --prod`
- 28 v2.0 VRT baselines auto-approved during Phase 22-03 generation — user visual review still recommended before declaring v2.0 visually-final

### Deferred to Live UAT (user handles independently)

1. Real Resend email delivery rendering across Gmail / iOS Mail / Outlook (Phase 20)
2. Vercel dashboard cron schedule cross-check before next prod deploy (Phase 20)
3. Live E2E run: `pnpm seed:wardrobe:dev` + `pnpm test:e2e tests/wardrobe.spec.ts` (Phase 21)
4. Earnings tab + admin Outstanding Payouts UI verification with seeded data (Phase 19)
5. Visual review of 28 VRT baselines in `tests/storybook-vrt.spec.ts-snapshots/` (Phase 22)
