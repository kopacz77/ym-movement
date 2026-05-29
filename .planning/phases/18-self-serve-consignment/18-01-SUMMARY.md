---
phase: 18-self-serve-consignment
plan: 01
subsystem: database
tags: [prisma, postgres, neon, migration, wardrobe, consignment]

# Dependency graph
requires:
  - phase: 13-wardrobe-data-model
    provides: Dress model with internalNotes + consignmentCommissionPct columns; transaction-wrapped migration SQL convention
provides:
  - "Dress.rejectionReason String? nullable column added via transaction-wrapped migration"
  - "Migration timestamp 20260529185841 for forward reference from sibling plans"
  - "Generated Prisma client exposes Dress.rejectionReason: string | null"
affects: [18-02, 18-05, 18-06, 18-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Transaction-wrapped additive nullable column migrations (extends Phase 13 ADR to single-column ALTER)"
    - "Hand-authored migration directory + SQL pattern with UTC timestamp prefix (mirrors 20260529042222_add_wardrobe)"

key-files:
  created:
    - "prisma/migrations/20260529185841_add_dress_rejection_reason/migration.sql"
  modified:
    - "prisma/schema.prisma"

key-decisions:
  - "Column is plain nullable TEXT with no DEFAULT, no CHECK constraint, and no index — read per-row from consigner edit page + admin queue, never WHERE-filtered"
  - "Position the field between internalNotes and the Images relation to keep admin-controlled string fields grouped before relations"
  - "Migration wrapped in BEGIN;...COMMIT; (Phase 13 ADR) even for a single ALTER — convention preserved for consistent rollback semantics across all wardrobe migrations"
  - "Distinct field from internalNotes — internalNotes is admin-only and HIDDEN from consigners per CONSIGN-02; rejectionReason is explicitly consigner-visible to support resubmit (CONSIGN-09)"
  - "Use npx invocations (npx prisma migrate deploy, npx prisma generate, npx tsx scripts/pre-migration-check.ts) instead of pnpm wrappers, per known ERR_PNPM_IGNORED_BUILDS workaround documented in STATE.md Blockers"
  - "Retry prisma migrate deploy once when first invocation fails with P1001 (Neon scale-to-zero takes ~10s to wake on a cold pooler)"

patterns-established:
  - "Single-column nullable column add: transaction-wrapped, no DEFAULT, no index, descriptive SQL comment naming both the setter and clearer procedures"
  - "UTC timestamp prefix (YYYYMMDDHHMMSS) for migration directories — mirrors Phase 13 convention"

# Metrics
duration: 4min
completed: 2026-05-29
---

# Phase 18 Plan 01: Add Dress.rejectionReason Column Summary

**Nullable rejectionReason TEXT column added to Dress model via transaction-wrapped migration; zero data loss verified across all 11 critical tables (6,762 rows unchanged), generated Prisma client now exposes Dress.rejectionReason: string | null to TypeScript.**

## Performance

- **Duration:** 3 min 33 sec
- **Started:** 2026-05-29T18:58:06Z
- **Completed:** 2026-05-29T19:01:39Z
- **Tasks:** 2/2 (autonomous)
- **Files modified:** 2 (1 schema edit + 1 new migration SQL)

## Accomplishments

- Added `rejectionReason String?` to `model Dress` in `prisma/schema.prisma`, positioned between `internalNotes` and the `Images` relation block
- Hand-authored migration directory `prisma/migrations/20260529185841_add_dress_rejection_reason/` containing a single `migration.sql` with `BEGIN;...COMMIT;`-wrapped `ALTER TABLE "Dress" ADD COLUMN "rejectionReason" TEXT;`
- Applied migration to dev Neon via `npx prisma migrate deploy` — log shows "Applying migration `20260529185841_add_dress_rejection_reason`" and "All migrations have been successfully applied"
- Verified zero data loss: pre-migration baseline (User=93, Student=48, Rink=7, RinkTimeSlot=1351, Lesson=1171, Payment=1171, Notification=2921, Dress=0, DressImage=0, RentalRequest=0, Rental=0, total=6762) is byte-identical to post-migration baseline
- Regenerated Prisma client via `npx prisma generate`; type-level proof script (`Dress["rejectionReason"]` accepts both `null` and `"test reason"`) compiled cleanly under the project's tsconfig.json
- `npx prisma migrate status` reports "Database schema is up to date!"

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rejectionReason field to Dress model in schema.prisma** — `dc1cea5` (feat)
2. **Task 2: Hand-author migration SQL, run pre-migration safety check, apply migration, verify generated client** — `121c798` (feat)

**Plan metadata:** will be added with this SUMMARY.md (final commit)

## Files Created/Modified

- `prisma/schema.prisma` — Added 1 line: `rejectionReason          String?` inside `model Dress`, between `internalNotes` and `Images`
- `prisma/migrations/20260529185841_add_dress_rejection_reason/migration.sql` — New 8-line file with header comment naming the setter (admin.wardrobe.rejectDress) and clearer (approveDress + consigner.resubmit) procedures, wrapped in BEGIN;...COMMIT;

## Pre/Post Migration Row Counts (proof of zero data loss)

| Table         | Before | After | Δ |
|---------------|--------|-------|---|
| User          | 93     | 93    | 0 |
| Student       | 48     | 48    | 0 |
| Rink          | 7      | 7     | 0 |
| RinkTimeSlot  | 1351   | 1351  | 0 |
| Lesson        | 1171   | 1171  | 0 |
| Payment       | 1171   | 1171  | 0 |
| Notification  | 2921   | 2921  | 0 |
| Dress         | 0      | 0     | 0 |
| DressImage    | 0      | 0     | 0 |
| RentalRequest | 0      | 0     | 0 |
| Rental        | 0      | 0     | 0 |
| **TOTAL**     | **6762** | **6762** | **0** |

## Decisions Made

- **Plain nullable TEXT, no DEFAULT/CHECK/index** — the column is read per-row from two surfaces (consigner edit page, admin queue) and never WHERE-filtered. Adding an index would only burn write throughput without read benefit. NULL is the natural "no rejection has occurred" state; a literal `DEFAULT NULL` is redundant.
- **Positioned between `internalNotes` and the `Images` relation block** — keeps admin-controlled string fields grouped before relations. Schema alignment matches `internalNotes` column-for-column (24-space pad before `String?`).
- **BEGIN;...COMMIT; even for a single ALTER** — Phase 13 ADR convention preserved; all wardrobe migrations follow the same shape so rollback semantics are uniform across the directory.
- **Distinct field from `internalNotes`, not a reuse** — CONSIGN-02 makes internalNotes admin-only and hidden from consigners; CONSIGN-09 makes rejection reason explicitly consigner-visible. Reusing one column for both audiences would either leak admin commentary or muzzle the resubmit flow.
- **`npx` invocations instead of `pnpm` wrappers** — STATE.md Blockers/Concerns documents `ERR_PNPM_IGNORED_BUILDS` blocking `pnpm <script>` calls in this sandbox; `npx prisma migrate deploy`, `npx prisma generate`, and `npx tsx scripts/pre-migration-check.ts` are the canonical workaround.
- **Retry `prisma migrate deploy` once on P1001** — first invocation failed with "Can't reach database server" because the Neon pooler had scaled to zero; second invocation (immediately after) succeeded. `pre-migration-check.ts` had already woken the database via the Prisma client, but `prisma migrate deploy` opens its own connection without auto-retry. Documented for future single-column migrations.

## Deviations from Plan

None — plan executed exactly as written.

The plan's prescribed flow (Task 1 schema edit → Task 2 Steps A-E) ran top-to-bottom with no Rule 1/2/3/4 deviations. The single operational quirk (P1001 on first `prisma migrate deploy` invocation, resolved by single retry as Neon's pooler woke up) is a known Neon scale-to-zero behavior, not a deviation from the plan; the plan's success criteria are unaffected.

## Issues Encountered

- **Neon P1001 on first `prisma migrate deploy`:** First invocation failed with "Can't reach database server at ep-bold-silence-a5y92881-pooler.us-east-2.aws.neon.tech:5432". Cause: Neon scale-to-zero — the dev pooler had cooled between `pre-migration-check.ts` (which connects via the Prisma client and waits ~10s on cold start) and the subsequent `prisma migrate deploy` (which connects via a separate engine that doesn't auto-retry). Resolution: immediate retry succeeded; migration applied cleanly. No data risk because the failure was a connection-time error before any SQL ran.
- **Initial `index.d.ts` grep returned 0 matches even after `prisma generate`:** Prisma 6.x emits model types via `client.d.ts` re-exports rather than inlining them into `index.d.ts`. Verified by (a) confirming `rejectionReason` is present in the generated `.prisma/client/schema.prisma` mirror, (b) running `npx tsc --noEmit -p tsconfig.json` on a 4-line proof script (`const _: Dress["rejectionReason"] = null;`) — compiled cleanly with no errors beyond the pre-existing IceParticles `three` types blocker (documented in STATE.md Blockers). Proof script deleted post-verification.

## User Setup Required

None — no external service configuration required. Database migration applied to dev Neon; production deployment will pick up the same migration via the standard `prisma migrate deploy` step in the Vercel build.

## Next Phase Readiness

- **Ready for Plan 18-02 (consignerQueries.ts):** TRPC procedures can now reference `rejectionReason` in their `data: {}` upsert payloads with full type safety. Specifically: `admin.wardrobe.rejectDress` will write `rejectionReason: input.reason`; `admin.wardrobe.approveDress` and `wardrobe.consigner.resubmit` will write `rejectionReason: null` to clear the field on each resubmit cycle. Plan 18-05's `MyConsignedDressesList` will read it for display.
- **Migration timestamp `20260529185841`** is the forward-reference handle for any cross-plan dependency check; subsequent plans (18-02 onward) should NOT redo the migration step.
- **No blockers introduced.** The pre-existing IceParticles `three` types issue (documented in STATE.md Blockers/Concerns) is unchanged.

---
*Phase: 18-self-serve-consignment*
*Completed: 2026-05-29*
