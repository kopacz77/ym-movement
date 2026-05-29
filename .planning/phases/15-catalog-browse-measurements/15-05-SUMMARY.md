---
phase: 15-catalog-browse-measurements
plan: 05
subsystem: ui
tags: [react, tailwind, wardrobe, catalog, presentational-primitive, lucide-react]

# Dependency graph
requires:
  - phase: 14-wardrobe-admin
    provides: CategoryBadge + DressStatusBadge primitives (14-02), formatCurrencyFromCents helper (14-01)
  - phase: 15-catalog-browse-measurements
    provides: catalogQueries.list per-item fitScorePercent annotation (15-02) consumed by DressCard
provides:
  - DressCard catalog grid tile primitive (id, title, category, status, sizeLabel, competitionPrice, color, Images, optional fitScorePercent, optional href)
  - BestFitBadge pill primitive with tiered coloring (>=80 emerald, 50-79 cyan, <50 amber)
affects: [15-07 (catalog grid composition consumes DressCard), 18 (consigner My Listings reuses DressCard with href override), 19 (consigner earnings view)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Presentational primitive: pure props in, JSX out, zero TRPC/Prisma/router calls"
    - "Optional href prop on grid tiles enables Phase 18+ reuse without forking the component"
    - "Status badge suppression when status === default (AVAILABLE): reduces visual noise on the common case"
    - "biome-ignore lint/performance/noImgElement comment references the upstream SUMMARY that deferred next.config.images.remotePatterns (14-05) — traceable rationale at the call site"

key-files:
  created:
    - "src/features/wardrobe/components/BestFitBadge.tsx"
    - "src/features/wardrobe/components/DressCard.tsx"
  modified: []

key-decisions:
  - "DressCard hides DressStatusBadge when status === AVAILABLE — AVAILABLE is the default catalog state; coloring it would compete with CategoryBadge"
  - "BestFitBadge tier thresholds: percent >= 80 → emerald, 50..79 → cyan (brand), < 50 → amber (caution). Single source of truth for fit-score visual encoding"
  - "fitScorePercent null/undefined → BestFitBadge renders nothing. Callers don't need to guard; the badge component owns the absent-data case"
  - "Optional href prop on DressCard (defaults to `/wardrobe/${dress.id}`) so Phase 18 consigner view can retarget the tile to `/consigner/dresses/${id}/edit` without forking the component"
  - "Plain <img> (biome-ignored) for blob URLs — matches 14-03/14-05 precedent; next.config.js images.remotePatterns deferred until a public optimization pass"
  - "Both primitives import-stable for 15-07: no barrel files, direct file-path imports — matches the Phase 14-02 convention"

patterns-established:
  - "Catalog grid tile contract: DressCardProps.dress shape is the minimum cross-section of wardrobe.list output that any grid surface needs (id/title/category/status/sizeLabel/competitionPrice/color/Images[url,isPrimary,sortOrder]). 15-07 + Phase 18 + Phase 19 all reuse this same shape"
  - "Fit-score tier-color encoding: emerald=excellent, cyan=brand-neutral, amber=caution. Reused by any future surface that visualizes a single fit percent (e.g. Phase 16 FitCheckCard)"
  - "Card chrome: rounded-xl + slate-200 border + standardized luxury shadow + `transition hover:-translate-y-1 hover:shadow-lg` — locked to the 2026-04-26 brand sweep"

# Metrics
duration: ~2min
completed: 2026-05-29
---

# Phase 15 Plan 05: DressCard + BestFitBadge Summary

**Catalog grid tile primitive (DressCard) and tiered Best Fit pill (BestFitBadge), wired to consume catalogQueries.list output unchanged — ready for 15-07 grid composition.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-29T16:12:32Z
- **Completed:** 2026-05-29T16:14:12Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- `BestFitBadge.tsx` — pill with Sparkles icon, tier-colored by percent (≥80 emerald, 50-79 cyan, <50 amber). Null/negative percent renders nothing so callers don't guard.
- `DressCard.tsx` — catalog grid tile composing CategoryBadge (14-02) + DressStatusBadge (14-02, suppressed when AVAILABLE) + BestFitBadge (this plan) + formatCurrencyFromCents (14-01). Aspect-square image cell with ImageIcon fallback when Images[] is empty.
- Both primitives import-stable for Plan 15-07 grid composition and Phase 18 consigner view reuse (via optional `href` override prop).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BestFitBadge component** — `40ff2ac` (feat)
2. **Task 2: Create DressCard component** — `ef959e9` (feat)

## Files Created/Modified

- `src/features/wardrobe/components/BestFitBadge.tsx` — pill component, exports `BestFitBadge` + `BestFitBadgeProps`. ~35 lines.
- `src/features/wardrobe/components/DressCard.tsx` — grid tile component, exports `DressCard` + `DressCardProps`. ~84 lines.

## DressCardProps Contract (for Plan 15-07)

```ts
export interface DressCardProps {
  dress: {
    id: string;
    title: string;
    category: DressCategory;
    status: DressStatus;
    sizeLabel: string;
    competitionPrice: number; // cents — formatted via formatCurrencyFromCents
    color: string;
    Images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
  };
  /** From wardrobe.list when caller has measurements; null when not. */
  fitScorePercent?: number | null;
  /** Override the default /wardrobe/[id] link (used by Phase 18 consigner view). */
  href?: string;
}
```

Every field in `dress` is already a strict subset of the `wardrobe.list` per-item shape from Plan 15-01's `PUBLIC_DRESS_SELECT`. The grid in 15-07 maps directly without massaging.

`fitScorePercent` maps 1:1 to the `fitScorePercent: number | null` field on each item from Plan 15-02's annotation.

## BestFitBadgeProps Contract

```ts
export interface BestFitBadgeProps {
  /** 0..100 integer score. Pass null/undefined to render nothing. */
  percent: number | null | undefined;
  /** Optional override to color the pill by tier (>=80 emerald, >=50 cyan, else amber). */
  tier?: "auto" | "cyan";
}
```

Tier thresholds:
- `percent >= 80` → emerald (`bg-emerald-50 text-emerald-700`)
- `50 <= percent < 80` → cyan (`bg-cyan-50 text-cyan-700`)
- `percent < 50` → amber (`bg-amber-50 text-amber-700`)
- `percent == null || percent < 0` → renders nothing

`tier="cyan"` forces brand color regardless of percent (reserved for surfaces that want a single visual tone, e.g. dashboard widgets).

## Reused Primitives (No Duplicates)

- `CategoryBadge` — Phase 14-02, slate-neutral category metadata pill
- `DressStatusBadge` — Phase 14-02, tiered status palette (AVAILABLE=emerald, PENDING=cyan "Pending Rental", etc.)
- `formatCurrencyFromCents` — Phase 14-01, single edge for cents→dollar display formatting

## Decisions Made

- **Hide DressStatusBadge when status === AVAILABLE.** AVAILABLE is the default catalog state — virtually every visible tile in `/wardrobe` will be AVAILABLE. Coloring all of them with an emerald badge would (a) compete with the CategoryBadge for visual attention and (b) erase the signal value of the badge for non-default states. PENDING (a dress mid-rental flow, surfaced because Plan 15-01's `PUBLIC_STATUSES` includes both AVAILABLE+PENDING) still shows the cyan "Pending Rental" pill — that's the case the badge is for.
- **BestFitBadge tier thresholds locked to 80/50.** ≥80 emerald (excellent match — celebrate it), 50-79 cyan (acceptable, brand-neutral color), <50 amber (caution — possible misfit, render but warn). Single source of truth; if Phase 16 FitCheckCard wants the same encoding it imports BestFitBadge or reuses the threshold constants.
- **Optional `href` prop on DressCard.** Default is `/wardrobe/${dress.id}`. Phase 18 consigner view will override to `/consigner/dresses/${id}/edit`. No forking, no two-class hierarchy — a thin override prop is enough to keep the primitive single-source.
- **Plain `<img>` for primary image (biome-ignored).** Vercel Blob domain (`blob.vercel-storage.com`) would need `next.config.js images.remotePatterns` to use `next/image`. That config edit is deferred (per 14-05 SUMMARY) until a public-facing image optimization pass. Comment at the lint-ignore explicitly references 14-05 for traceability.
- **`fitScorePercent` null-guard lives in BestFitBadge, not DressCard.** DressCard does check `fitScorePercent != null` before mounting the badge as a layout optimization (avoids reserving space for a hidden element), but BestFitBadge ALSO short-circuits on null — defense-in-depth so any other caller can pass the raw value without guarding.

## Deviations from Plan

None — plan executed exactly as written. The two minor adjustments during execution were lint-driven:
1. Wrapped `BestFitBadge` early-return in `{ ... }` block (biome `noStatements` style rule); identical semantics.
2. Joined the `primaryImage` const declaration onto one line (biome formatter); identical semantics.

Both adjustments are pure formatting fixes the plan would have written had it been formatter-aware.

## Issues Encountered

None. Both files type-check (only pre-existing `IceParticles.tsx` + `sidebar.tsx` errors remain, documented in STATE.md L138) and lint clean.

## User Setup Required

None — no external service configuration. Components are pure presentational React.

## Next Phase Readiness

- **Plan 15-06 (`WardrobeFilterBar`)** is unblocked. Should consume `callerHasMeasurements` + per-item `fitsCaller` annotations from catalogQueries.list (15-02).
- **Plan 15-07 (catalog grid composition)** is fully unblocked. It imports `DressCard` from `@/features/wardrobe/components/DressCard`, maps `wardrobe.list` results, passes `item.fitScorePercent` straight through. No additional adapter layer needed.
- **Phase 18 consigner "My Listings"** can reuse `DressCard` with `href={'/consigner/dresses/${id}/edit'}` — no change needed in this file.

### Open items carried forward

- `BLOB_READ_WRITE_TOKEN` still needs to be added to local `.env` for end-to-end image testing (Phase 14 carry-over; affects what the empty `Images[]` fallback looks like in dev when admins upload real photos).
- `next.config.js images.remotePatterns` for `blob.vercel-storage.com` still deferred — when a public image optimization pass happens, swap the `<img>` for `next/image` and remove the biome-ignore comment in `DressCard.tsx`.

---
*Phase: 15-catalog-browse-measurements*
*Completed: 2026-05-29*
