---
phase: 13-wardrobe-schema-foundation
plan: 01
subsystem: database
tags: [prisma, postgres, neon, migration, wardrobe, schema]

requires:
  - phase: 01-foundation
    provides: User, Student, Payment models that wardrobe FKs extend from
provides:
  - 4 wardrobe models (Dress, DressImage, RentalRequest, Rental)
  - 6 enums (DressCategory, DressCondition, DressStatus, RentalType, RentalRequestStatus, RentalPaymentStatus)
  - 9 nullable measurement columns on Student
  - Named DressOwner relation on User
  - Transaction-wrapped (BEGIN/COMMIT) migration
  - Extended pre-migration tripwire covering wardrobe tables
  - BLOB_READ_WRITE_TOKEN env placeholder
affects: [14-wardrobe-routes, 15-dress-listing, 16-fit-matching, 17-rental-flow, 18-image-upload]

tech-stack:
  added: []
  patterns:
    - "Manual SQL authoring wrapped in BEGIN;...COMMIT; for atomic, rollback-safe migrations on production"
    - "Restrict cascades on owner/student references; cascade only on dependent collections (DressImage)"
    - "Money fields stored as Int cents to avoid Float drift"
    - "Named Prisma relations when ambiguity is foreseeable (User.OwnedDresses)"

key-files:
  created:
    - prisma/migrations/20260529042222_add_wardrobe/migration.sql
    - .planning/phases/13-wardrobe-schema-foundation/13-01-SUMMARY.md
  modified:
    - prisma/schema.prisma
    - scripts/pre-migration-check.ts
    - .env.example

key-decisions:
  - "Authored migration.sql by hand (CLAUDE.md forbids migrate dev variants entirely)"
  - "Wrapped migration in single BEGIN;...COMMIT; transaction so partial failure is impossible"
  - "Restrict cascades on Dress.Owner, RentalRequest.Dress/Student, Rental.Dress/Student to fail loudly on accidental deletion"
  - "Cascade only on DressImage.Dress (orphan image rows are useless)"
  - "All money in Int cents (no Float)"
  - "Deferred Settings extension to Plan 02 because Settings is a key/value JSON store, not a typed singleton"

patterns-established:
  - "BEGIN;/COMMIT; wrapping: any future schema migration in this repo should follow the same atomic pattern"
  - "Tripwire extension: new tables should be added to pre-migration-check.ts but excluded from the empty-table critical filter on first run"

duration: ~13min
completed: 2026-05-29
---

# Phase 13 Plan 01: Wardrobe Schema Foundation Summary

**4 wardrobe models + 6 enums + 9 Student measurement columns landed in a single transaction-wrapped Prisma migration applied to Neon with zero data loss across 7 critical pre-existing tables.**

## Performance

- **Duration:** ~13 min (most of which was a transient pnpm reinstall recovery)
- **Started:** 2026-05-29T04:12:00Z
- **Completed:** 2026-05-29T04:25:55Z
- **Tasks:** 3
- **Files modified:** 3 (plus 1 created migration.sql)

## Accomplishments

- Wardrobe data model defined in Prisma: Dress, DressImage, RentalRequest, Rental
- Student model extended with 9 nullable body-measurement columns
- Single `BEGIN;...COMMIT;`-wrapped migration applied to dev Neon branch
- Row counts for User / Student / Rink / RinkTimeSlot / Lesson / Payment / Notification unchanged
- Pre-migration tripwire (`pnpm db:check`) now reports wardrobe tables too
- `.env.example` advertises `BLOB_READ_WRITE_TOKEN` for the upcoming Phase 13 image pipeline

## Task Commits

Each task was committed atomically:

1. **Task 1: Author Prisma schema additions** — `1785e00` (feat)
2. **Task 2: Generate transaction-wrapped migration + tripwire + env** — `4283f37` (feat)
3. **Task 3: Apply migration with row-count verification** — no file changes (apply-and-verify only; lockfile + SUMMARY/STATE go in metadata commit)

**Plan metadata:** committed alongside SUMMARY.md + STATE.md updates

## Row Counts (BEFORE vs AFTER migration)

| Table          | Before | After |
| -------------- | ------ | ----- |
| User           | 93     | 93    |
| Student        | 48     | 48    |
| Rink           | 7      | 7     |
| RinkTimeSlot   | 1351   | 1351  |
| Lesson         | 1171   | 1171  |
| Payment        | 1171   | 1171  |
| Notification   | 2921   | 2921  |
| Dress          | n/a    | 0     |
| DressImage     | n/a    | 0     |
| RentalRequest  | n/a    | 0     |
| Rental         | n/a    | 0     |

Zero rows lost. `prisma migrate status` reports "Database schema is up to date!"

## Migration filename

`prisma/migrations/20260529042222_add_wardrobe/migration.sql`

Confirmed wrapped in `BEGIN;` ... `COMMIT;` (first/last lines of the file).

## Files Created/Modified

- `prisma/schema.prisma` — Added 6 enums, 4 models, 9 Student columns, named `OwnedDresses` relation on User
- `prisma/migrations/20260529042222_add_wardrobe/migration.sql` — New migration; CREATE TYPE x6, ALTER TABLE Student (9 columns), CREATE TABLE x4, CREATE INDEX x10 (3 dress + 1 image + 3 request + 3 rental, plus 1 unique on Rental.requestId), ADD FK x7, wrapped in `BEGIN;`/`COMMIT;`
- `scripts/pre-migration-check.ts` — Tripwire now counts Dress, DressImage, RentalRequest, Rental (excluded from emptiness warning on first run)
- `.env.example` — Added `BLOB_READ_WRITE_TOKEN` placeholder with a comment pointing to Vercel dashboard

## Decisions Made

1. **Manual SQL authoring**: CLAUDE.md forbids every `migrate dev` variant (including `--create-only`) because the safety rules in `.claude/settings.local.json` allow only `prisma migrate deploy` and `prisma migrate status`. Authored `migration.sql` by hand using existing migration files as syntactic templates.
2. **`BEGIN;...COMMIT;` transaction wrap**: Per 13-RESEARCH.md Pitfall #5 — partial migration application on Neon would be catastrophic; wrapping forces a clean rollback on any internal failure.
3. **Cascade choices**:
   - `Dress.Owner → User`: `Restrict` (deleting a user with active dresses must fail loudly)
   - `DressImage.Dress`: `Cascade` (orphaned image rows are useless)
   - `RentalRequest.Dress/Student` and `Rental.Dress/Student/Request`: `Restrict` (preserve rental history for audit)
4. **Money as Int cents** (not Float) on all `price` / `fee` / `deposit` / `Charged` / `PayoutAmount` fields to avoid floating-point drift.
5. **Named relation `@relation("DressOwner")`** on both User and Dress, even though there's currently only one User→Dress link, because Phase 16+ may add a `Dress.lastEditedById` link that would otherwise ambiguate.
6. **Settings extension deferred to Plan 02**: The existing Settings model is a key/value JSON-blob store (`key String @unique, value String`), not a typed singleton. Adding columns directly would diverge from the existing `operational` / `payment` / `rinkAreas` convention. Per 13-RESEARCH.md Critical Finding #1, the wardrobe defaults will be inserted as a `key: "wardrobe"` JSON row by Plan 02.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reinstalled node_modules after first `pnpm db:check` invocation triggered an automatic reinstall that failed mid-flight**

- **Found during:** Task 3 BEFORE row-count capture (called pre-emptively before Task 1 schema edits)
- **Issue:** pnpm 11.2.2 detected a `pnpm.overrides` config in package.json (now ignored since the keys were moved to the `overrides` top-level field) and triggered a "Recreating /home/kopacz/projects/ym-movement/node_modules" step. The recreation depleted node_modules, then failed with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` because the lockfile referenced overrides via the legacy `pnpm.overrides` path. The result: node_modules was empty.
- **Fix:** Ran `CI=true pnpm install --no-frozen-lockfile` to restore node_modules with a fresh, consistent lockfile. This is the resolution path printed by pnpm itself.
- **Files modified:** `pnpm-lock.yaml` (regenerated; not user-authored)
- **Verification:** `npx prisma generate` succeeded after install; `prisma/client` was importable; `npx tsx scripts/pre-migration-check.ts` ran cleanly.
- **Committed in:** Will be folded into the final metadata commit (no code/schema impact; pure dependency restoration).
- **Note:** This deviation is purely infrastructural and unrelated to the wardrobe schema work. It surfaced two pre-existing TypeScript errors (`three` and `@radix-ui/react-visually-hidden`) that exist independently of these changes (verified via `git stash` + tsc — same errors). Those errors should be triaged separately and are out of scope for this plan.

**2. [Rule 1 - Bug] BEFORE row-count capture had to use a bypass script instead of `pnpm db:check`**

- **Found during:** Task 3
- **Issue:** The extended tripwire (committed in Task 2) calls `prisma.dress.count()`, which fails with "table public.Dress does not exist" if run BEFORE the migration applies. This is by design — wardrobe tables literally don't exist yet — but means the plan's instruction to "Run `pnpm db:check` BEFORE" can't use the same script verbatim once the script has been extended.
- **Fix:** For BEFORE counts, ran an inline Node one-liner querying only the 7 pre-existing critical tables. Captured to `/tmp/db-check-before.txt`. AFTER the migration, the full extended `pnpm db:check` runs cleanly and is the canonical record.
- **Files modified:** None.
- **Verification:** BEFORE and AFTER counts for User/Student/Rink/RinkTimeSlot/Lesson/Payment/Notification match (93/48/7/1351/1171/1171/2921 on both sides).

---

**Total deviations:** 2 auto-fixed (1 blocking infra issue, 1 self-inflicted script-order quirk)
**Impact on plan:** Zero schema/data impact. Both deviations were process-side issues handled inline.

## Issues Encountered

- **Pre-existing TypeScript errors surfaced after reinstall**: `src/components/landing/IceParticles.tsx` and `src/components/ui/sidebar.tsx` report missing type declarations for `three` and `@radix-ui/react-visually-hidden`. Confirmed via `git stash` + `npx tsc --noEmit` that these errors are NOT caused by the schema changes — they exist on the bare `e86f217` commit too. Out of scope; raise as a separate triage item.
- **dev Neon branch confirmed**: `DATABASE_URL` points to `ep-bold-silence-a5y92881-pooler` which is the dev branch per project memory; production data lives on a separate branch. No production data touched.

## User Setup Required

None - no external service configuration required for this plan. `BLOB_READ_WRITE_TOKEN` is documented but not yet needed (will be in Plan 03's upload pipeline).

## Next Phase Readiness

- **Ready for Plan 02 (Settings + seed)**: wardrobe defaults will be inserted as a `key: "wardrobe"` JSON row in the existing Settings table.
- **Ready for Plan 03 (Vercel Blob upload pipeline)**: `DressImage` table exists, env placeholder in place; `@vercel/blob` install + route handler are next.
- **Ready for Plan 04+ (TRPC routers)**: schema-level FK constraints (Restrict) will catch any router code that tries to delete a User/Dress with active rentals.
- **No blockers.**

---
*Phase: 13-wardrobe-schema-foundation*
*Completed: 2026-05-29*
