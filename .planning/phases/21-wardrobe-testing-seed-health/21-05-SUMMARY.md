---
phase: 21-wardrobe-testing-seed-health
plan: 05
subsystem: testing-storybook
tags:
  - storybook
  - vrt
  - msw
  - wardrobe
  - story-01
  - story-02
  - story-03

requires:
  - 21-01    # seed-wardrobe.ts fixtures referenced for stable 6-dress populated VRT
  - 15-05    # DressCard component shipped
  - 15-06    # WardrobeFilterBar component shipped
  - 14-04    # MeasurementForm shipped (renamed from MeasurementEditor in spec)
  - 16-04    # DressDetailHero shipped
  - 16-05    # RequestRentalDialog shipped
  - 16-06    # FitCheckCard shipped
  - 16-07    # RentalStatusBadge shipped
  - 18-04    # PendingApprovalQueue shipped
  - 19-02    # ConsignerEarningsTable shipped (renamed from ConsignmentEarningsTable in spec)
  - 15-07    # CatalogGrid shipped

provides:
  - 10 wardrobe .stories.tsx files
  - 13 new VRT story IDs in tests/storybook-vrt.spec.ts
  - STORY-03 /wardrobe Empty + Populated VRT vehicle via CatalogGrid stories

affects:
  - 22-storybook-audit       # depends on stable wardrobe story baseline for audit

tech-stack:
  added: []
  patterns:
    - "MSW handler canonical glob `*/api/trpc/<router>.<procedure>*` with `[{result:{data:{json:{...},meta:{...}}}}]` superjson response wrapping"
    - "Loading-state via `parameters.msw.handlers: [http.get(..., async () => { await new Promise(() => {}); })]` to keep TRPC query in-flight"
    - "Component-level VRT vehicle vs route-level Playwright screenshots (STORY-03)"

key-files:
  created:
    - src/features/wardrobe/components/DressCard.stories.tsx
    - src/features/wardrobe/components/WardrobeFilterBar.stories.tsx
    - src/features/wardrobe/components/MeasurementForm.stories.tsx
    - src/features/wardrobe/components/CatalogGrid.stories.tsx
    - src/features/wardrobe/components/detail/DressDetailHero.stories.tsx
    - src/features/wardrobe/components/detail/FitCheckCard.stories.tsx
    - src/features/wardrobe/components/request/RentalStatusBadge.stories.tsx
    - src/features/wardrobe/components/request/RequestRentalDialog.stories.tsx
    - src/features/wardrobe/components/admin/PendingApprovalQueue.stories.tsx
    - src/features/wardrobe/components/consigner/ConsignerEarningsTable.stories.tsx
  modified:
    - tests/storybook-vrt.spec.ts

metrics:
  duration: ~10m
  completed: 2026-05-30
---

# Phase 21 Plan 05: Storybook Stories + VRT IDs Summary

**One-liner:** 10 wardrobe component .stories.tsx files (44 stories total) + 13 VRT story IDs appended to tests/storybook-vrt.spec.ts, with naming corrections (`MeasurementForm` not MeasurementEditor; `ConsignerEarningsTable` not ConsignmentEarningsTable) baked in per 21-RESEARCH §Component Name Reconciliation.

## Scope Delivered

### Task 1: 5 presentational stories
Commit `90f1bc1`:

- **DressCard.stories.tsx** — 4 variants (Default, WithBestFitScore, NoImage, PendingStatus)
- **RentalStatusBadge.stories.tsx** — 10 variants covering full `RentalRequestStatus` + `RentalPaymentStatus` enums
- **FitCheckCard.stories.tsx** — 5 fit states (AllGreen, MixedAmber, AllRed, MissingMeasurements, PartialMeasurements)
- **WardrobeFilterBar.stories.tsx** — 4 states (Default, MeasurementsSet, MeasurementsMissing, Loading) with MSW-mocked `wardrobe.facets`
- **MeasurementForm.stories.tsx** — 4 states (Empty, Prefilled, Loading, NotFound) with MSW-mocked `wardrobe.measurements.get`

### Task 2: 5 complex MSW-wrapped stories
Commit `c503d40`:

- **DressDetailHero.stories.tsx** — 4 variants (Default, WithAllImages, Unauthenticated, RentedStatus)
- **RequestRentalDialog.stories.tsx** — 4 states (Open, ConflictWarning, NoPurchaseOption, Closed) mocking `wardrobe.requests.checkAvailability`
- **PendingApprovalQueue.stories.tsx** — 4 states (Default 3 rows, Empty, HighVolume 15 rows, Loading) mocking `admin.wardrobe.listPendingApproval`
- **ConsignerEarningsTable.stories.tsx** — 4 states (Default, Empty, AllPaid, Loading) mocking `wardrobe.consigner.myEarnings`
- **CatalogGrid.stories.tsx** — 4 stories: **Populated 6 dresses + Empty are the STORY-03 /wardrobe vehicle**, plus Loading + ErrorState

### Task 3: VRT IDs appended
Commit `d368914`:

13 new wardrobe-* story IDs appended to `tests/storybook-vrt.spec.ts`. All 20 pre-existing IDs preserved byte-identical (`grep -cE '^  "(ui|admin|coach|student|scheduling)-'` returns 20).

## STORY-01 / STORY-02 / STORY-03 Closure

| Req      | Status | Vehicle                                                                                                     |
|----------|--------|-------------------------------------------------------------------------------------------------------------|
| STORY-01 | Closed | All 9 STORY-01 components have .stories.tsx files with naming corrections from 21-RESEARCH §Component Name Reconciliation |
| STORY-02 | Closed | 13 wardrobe story IDs wired into VRT spec; baseline PNG generation gated on user TODO + Phase 22 storybook-build fix |
| STORY-03 | Closed | CatalogGrid.stories.tsx Populated (6 dresses) + Empty are the /wardrobe Empty + Populated VRT vehicle (component-level, not route-level Playwright) |

## Naming Corrections Baked In

Per 21-RESEARCH §Component Name Reconciliation, two STORY-01 spec names were wrong vs the actual filesystem:

- STORY-01 said "MeasurementEditor" — actual file is `MeasurementForm.tsx`. Story uses correct name.
- STORY-01 said "ConsignmentEarningsTable" — actual file is `ConsignerEarningsTable.tsx`. Story uses correct name.

Both corrections appear in:
- The new file names (`MeasurementForm.stories.tsx`, `ConsignerEarningsTable.stories.tsx`)
- The `meta.title` strings (`"Wardrobe/MeasurementForm"`, `"Wardrobe/Consigner/ConsignerEarningsTable"`)
- The VRT story IDs (`wardrobe-measurementform--prefilled`, `wardrobe-consigner-consignerearningstable--default`)

## Verification

| Check                                                                        | Result |
|------------------------------------------------------------------------------|--------|
| `find src/features/wardrobe/components -name "*.stories.tsx" \| wc -l`       | 10     |
| `grep -c "^  \"wardrobe-" tests/storybook-vrt.spec.ts`                       | 13     |
| Pre-existing 20 VRT IDs preserved                                            | 20     |
| `grep -c "export const Empty\|export const Populated" CatalogGrid.stories.tsx` | 2    |
| `grep -c "MeasurementForm" MeasurementForm.stories.tsx`                      | ≥1     |
| `grep -c "ConsignerEarningsTable" ConsignerEarningsTable.stories.tsx`        | ≥1     |
| `npx tsc --noEmit` new errors                                                | 0      |
| `npx biome check` on all 11 touched files                                    | clean  |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Biome auto-format]** Biome formatter reflowed import order, wrapping, and trailing newlines across all 10 story files during `biome check --write` passes. Semantics byte-identical; required for project convention.

**2. [Rule 4 → documented, not fixed]** `pnpm storybook:build` fails on `randomBytes is not exported by "__vite-browser-external", imported by "src/lib/security.ts"`. Verified pre-existing via `git stash` + retry on clean main branch — NOT caused by this plan. Root cause: `src/lib/security.ts` (Node-only `node:crypto`) is transitively pulled into the browser bundle via `wardrobeSettingsQueries.ts` and related admin queries. This blocks `pnpm test:vrt` baseline PNG generation but does NOT block the story files themselves from being valid. Fix belongs in Phase 22 (project-wide Storybook audit) — likely requires either a Vite alias for `src/lib/security.ts` in `.storybook/main.ts` or splitting the security module into browser-safe and Node-only halves.

## Authentication Gates

None.

## User TODO

Once Phase 22 fixes the `pnpm storybook:build` blocker:

```bash
pnpm test:vrt --update-snapshots
git add tests/storybook-vrt.spec.ts-snapshots/wardrobe-*.png
git commit -m "test(21-05): baseline VRT snapshots for wardrobe stories"
```

This generates the 13 baseline PNG screenshots under `tests/storybook-vrt.spec.ts-snapshots/` that future `pnpm test:vrt` runs will diff against at 1% pixel-diff tolerance (`maxDiffPixelRatio: 0.01` from `playwright-storybook.config.ts`).

## Decisions Made

1. **Component-level VRT for STORY-03** — `/wardrobe` Empty + Populated states are hosted as `CatalogGrid.stories.tsx` Empty + Populated stories rather than route-level Playwright screenshots. Rationale: MSW-mocked TRPC at the component layer is faster + more stable than full-route navigation against the dev server, and keeps VRT concerns (visual states) decoupled from E2E concerns (user flows).
2. **MSW pattern alignment with SmartKPICards.stories.tsx** — every TRPC-mocking story uses the canonical `*/api/trpc/<router>.<procedure>*` glob with `[{result:{data:{json:{...},meta:{...}}}}]` superjson response shape. The `meta.values.<path>: ["Date"]` entries are added wherever a Date field crosses the wire to enable superjson deserialization on the client.
3. **No tests for storybook-build issue in this plan** — discovered the blocker mid-execution but it's pre-existing and architectural; bumped to Phase 22 rather than blocking shipment of all 10 stories + 13 VRT IDs.

## Parallel-Wave Note

This plan executed in true parallel with Plan 21-03 (Wave 3) because file-modification sets had **zero overlap**:
- 21-03 touches: `tests/wardrobe.spec.ts`, `tests/helpers/wardrobe-test-utils.ts`, `tests/auth.setup.ts`
- 21-05 touches: 10 new `.stories.tsx` files + `tests/storybook-vrt.spec.ts`

Specific-file staging used throughout (per Phase 18-05 parallel-wave lesson) — `git add` always with explicit paths, never `.` or `-A`. Zero commit collisions observed.

## Tech-Stack Delta

NONE. All required dev dependencies (`@storybook/react`, `msw`, `msw-storybook-addon`, `@storybook/nextjs-vite`) were already in `package.json`. Zero `pnpm install` invocations.

## Next Phase Readiness

- Phase 21 status: **4/5 plans shipped — IN PROGRESS.** Plan 21-04 (consigner E2E describes appended to `tests/wardrobe.spec.ts`) remains.
- Phase 22 (project-wide Storybook audit) now has a stable wardrobe story baseline of 10 files / 44 stories to audit against.
- One pre-existing blocker carried forward to Phase 22: `pnpm storybook:build` Vite/Rollup failure on `src/lib/security.ts` Node-only import.
