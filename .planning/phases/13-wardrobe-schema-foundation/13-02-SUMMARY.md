---
phase: 13-wardrobe-schema-foundation
plan: 02
subsystem: api
tags: [trpc, zod, settings, wardrobe, prisma, json-blob]

requires:
  - phase: 13-wardrobe-schema-foundation
    plan: 01
    provides: Settings table (existing key/value JSON store) that wardrobe defaults piggy-back on
provides:
  - WARDROBE_SETTINGS_KEY constant (single source of truth for the Settings row key)
  - wardrobeSettingsSchema (Zod) encoding defaults 15/7/1 in one place
  - getWardrobeSettings(prisma) helper - lazy read, fail-soft on corrupt JSON
  - updateWardrobeSettings(prisma, patch) helper - partial-merge upsert
  - admin.wardrobeSettings.get TRPC query (admin-only)
  - admin.wardrobeSettings.update TRPC mutation (admin-only, partial input)
affects: [14-wardrobe-routes, 17-rental-flow, 20-notifications]

tech-stack:
  added: []
  patterns:
    - "Settings extension via existing key/value JSON row (NOT new typed columns) - mirrors operational/payment/rinkAreas"
    - "Defaults encoded in Zod .default() and parsed once at module load - single source of truth"
    - "Fail-soft read: try/catch around JSON.parse + Zod parse falls back to defaults rather than crashing"
    - "Lazy upsert: no seed row created at boot; row appears only on first real update"
    - "Single WARDROBE_SETTINGS_KEY constant exported and imported everywhere - prevents typo-key drift"

key-files:
  created:
    - src/features/admin/api/queries/wardrobeSettingsQueries.ts
    - .planning/phases/13-wardrobe-schema-foundation/13-02-SUMMARY.md
  modified:
    - src/features/admin/api/queries/index.ts

key-decisions:
  - "Implemented as JSON blob under Settings.key=\"wardrobe\" - NOT new typed columns - because actual Settings model is key/value, contrary to design-spec proposal (13-RESEARCH.md Critical Finding #1)"
  - "Mirrored existing settingsQueries.ts shape exactly: Zod schema → findUnique → JSON.parse → fall back to defaults on missing or corrupt row → upsert with stringified JSON"
  - "Exported WARDROBE_SETTINGS_KEY as a single const to avoid the typo failure mode (writer A uses \"wardrobe\", writer B uses \"Wardrobe\", neither sees the other's row)"
  - "Defaults (15% commission, 7-day rental request expiry, 1-day return reminder) encoded in Zod .default() so they are reachable from both schema.parse({}) and runtime fallback"
  - "Lazy upsert chosen over a seed migration - matches existing operational/payment/rinkAreas pattern and avoids polluting fresh-DB state"
  - "Both procedures require adminProcedure - non-admin consumers (e.g. consigner form pre-fill in later phases) should call the helper functions directly from server code rather than expose a public TRPC endpoint"

patterns-established:
  - "Key/value Settings JSON: any future global-settings group should add (a) Zod schema, (b) helper pair (get/update), (c) TRPC sub-router mounted on the admin namespace - matching wardrobeSettingsQueries.ts"
  - "Fail-soft settings reads: bad rows should never brick a feature; always fall back to defaults and log out-of-band"

duration: 16m
completed: 2026-05-29
---

# Phase 13 Plan 02: Wardrobe Global Settings Summary

**Wardrobe defaults (commission 15%, rental-request expiry 7d, return reminder 1d) now reachable via `admin.wardrobeSettings.get/update` TRPC procedures, stored as a JSON blob under the existing `Settings.key="wardrobe"` row - no new schema columns.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-05-29T04:28:47Z
- **Completed:** 2026-05-29T04:44:56Z
- **Tasks:** 3
- **Files modified:** 2 (1 created, 1 edited)

## Accomplishments

- New feature-module file `wardrobeSettingsQueries.ts` exports `WARDROBE_SETTINGS_KEY`, `wardrobeSettingsSchema`, `WardrobeSettings` type, `getWardrobeSettings`, `updateWardrobeSettings`, and `wardrobeSettingsRouter`
- `admin.wardrobeSettings.get` and `admin.wardrobeSettings.update` are reachable on the typed TRPC client (admin-only)
- End-to-end round-trip verified against the live Neon database: defaults → 15/7/1; after `update({ defaultConsignmentCommissionPct: 20 })` → 20/7/1; refetched → 20/7/1; cleaned up → row null
- Lazy-upsert contract preserved: no `Settings` row with `key="wardrobe"` exists in the database post-execution
- Zero TypeScript regressions; only pre-existing `IceParticles.tsx` (`three` types) and `sidebar.tsx` (`@radix-ui/react-visually-hidden`) errors carried over

## Task Commits

1. **Task 1: Implement WardrobeSettings helpers and TRPC router** - `e683884` (feat)
2. **Task 2: Mount wardrobeSettings sub-router on admin TRPC router** - `7bf5408` (feat)
3. **Task 3: Smoke-test get/update round-trip against the database** - (no commit - verification + cleanup task, leaves no on-disk artifacts)

**Plan metadata commit:** to be made after this summary is written.

## Files Created/Modified

- `src/features/admin/api/queries/wardrobeSettingsQueries.ts` (created, 96 lines) - Zod schema with defaults, two helper functions (lazy-read + merge-upsert), admin-only TRPC router with `get` and `update` procedures, narrow PrismaWithSettings cast mirroring existing settingsQueries.ts
- `src/features/admin/api/queries/index.ts` (modified, +2 lines) - imports `wardrobeSettingsRouter` and mounts it under the admin namespace as `wardrobeSettings`

## Decisions Made

- **JSON blob over typed columns (key=\"wardrobe\")** - the actual `Settings` model in this codebase is a key/value JSON store, not a typed singleton. The design spec assumed a typed shape (`defaultConsignmentCommissionPct` as a column). 13-RESEARCH.md Critical Finding #1 documented this gap. Plan 13-02 is the resolution.
- **Single key constant exported and imported everywhere** - protects against the silent-no-row failure mode where two writers use different casings of the same key.
- **Zod-encoded defaults via `.default()`** - `wardrobeSettingsSchema.parse({})` at module load yields the canonical defaults. If a future engineer changes a default, both the read fallback and the new-row creation path see the new value automatically.
- **Lazy upsert** - no seed migration. Matches the existing `operational`/`payment`/`rinkAreas` pattern. Fresh databases get defaults by virtue of an empty `findUnique` result, not by reading a pre-seeded row.
- **Fail-soft on corrupt rows** - if a row exists with `key=\"wardrobe\"` but its `value` is invalid JSON or schema-incompatible, `getWardrobeSettings` returns defaults rather than throwing. Bad data must not brick the wardrobe.
- **Admin-only at the TRPC boundary; helpers callable directly from server code** - later phases (e.g. consigner forms pre-filling commission %) call the helper functions directly inside server-only modules. Non-admin TRPC exposure is intentionally not provided.

## Deviations from Plan

None - plan executed exactly as written. The Task 3 smoke test had to fall back from `pnpm tsx -e` to `npx tsx scripts/smoke-wardrobe-settings.ts` (a temporary file), but the plan explicitly authorized this fallback ("If `pnpm tsx -e` does not work because of ts-config/ESM issues, fall back to creating a temporary file..."). The temp script was deleted before commit, leaving no on-disk trace.

## Issues Encountered

- **`pnpm` install pre-check fails on every `pnpm` invocation** - `pnpm 11.2.2` blocks every script (`type-check`, `tsx`) on `ERR_PNPM_IGNORED_BUILDS` because the project's `pnpm.overrides` block in `package.json` is ignored. Pre-existing issue, already documented in STATE.md Blockers/Concerns. Worked around by invoking the underlying binaries directly via `npx` (`npx tsc --noEmit`, `npx tsx scripts/smoke-wardrobe-settings.ts`).
- **`npx tsx -e` inline-script mode hangs in this sandbox shell** - likely a shell-escaping or stdin-buffering issue. Worked around by writing the verification script to a temp file (`scripts/verify-wardrobe-import.ts`), running it via `npx tsx`, then deleting the file. Both Task 3 smoke test and final import verification used the temp-file pattern; both confirmed expected outputs.
- **Neon serverless cold-start latency** - first DB connection took ~30s. Subsequent queries within the same script run were fast. No code changes needed.

## User Setup Required

None - no external service configuration required. The new TRPC procedures are wired through the existing admin auth middleware; the Settings table is the same one already in production.

## Next Phase Readiness

- Phase 14 (settings UI) can now consume `trpc.admin.wardrobeSettings.get` and `trpc.admin.wardrobeSettings.update` from a settings panel
- Phase 17 (rental approval) can read `wardrobeRentalRequestExpiryDays` via `getWardrobeSettings(prisma)` inside server actions when computing request expiry
- Phase 20 (notifications) can read `wardrobeReturnReminderDays` via the same helper when computing the return-reminder send window
- Phase 14's consigner-form pre-fill can call `getWardrobeSettings(prisma)` directly inside a server component or server action to source `defaultConsignmentCommissionPct` (no TRPC needed because the helper is callable from any server code)
- No blockers carried into Phase 14

---
*Phase: 13-wardrobe-schema-foundation*
*Completed: 2026-05-29*
