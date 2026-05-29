---
phase: 15-catalog-browse-measurements
plan: 02
subsystem: api
tags: [trpc, wardrobe, catalog, fit-score, pure-module, sort, filter]

# Dependency graph
requires:
  - phase: 13-wardrobe-foundation
    provides: Student.chest/waist/hips/heightCm columns, Dress.{chest,waist,hips}{Min,Max}Cm + lengthCm + alterableSmaller/Larger columns
  - phase: 15-catalog-browse-measurements
    plan: 01
    provides: catalogQueries.list with TODO(15-02) stub markers + callerHasMeasurements gate + PUBLIC_DRESS_SELECT shape
provides:
  - "fitScore.ts — pure module exporting scoreDress, passesFitsMeFilter, scoreToPercent, expectedDressLengthForHeight, ALTERABLE_SLACK_CM, DressFitFields, StudentFitFields"
  - "catalogQueries.list now wires sort=bestFit (descending by scoreDress) and fitsMe (passesFitsMeFilter predicate)"
  - "Per-item annotation on list response: fitScorePercent (0..100 | null) and fitsCaller (boolean | null)"
  - "Tightened BAD_REQUEST gate — sort=bestFit OR fitsMe=true requires ANY of chest/waist/hips set, not all three"
affects:
  - 15-05 (DressCard consumes item.fitScorePercent for BestFitBadge display)
  - 15-06 (WardrobeFilterBar consumes callerHasMeasurements + item.fitsCaller to gate the Fits Me toggle and visually mark non-fitting cards)
  - 16    (FitCheckCard on detail page reuses scoreDress + scoreToPercent for per-dimension red/amber/green bars)
  - 18    (consigner price-suggestion UI may reuse the same scorer to surface "this dress would fit X of your followers")

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure module pattern — zero React/Prisma/TRPC imports; server AND client use the same code path; no transport drift possible"
    - "Two-phase pipeline — filter (fitsMe) BEFORE sort (bestFit) BEFORE pagination; sort over the filtered set, not the global set"
    - "Per-item annotation shape branches on caller capability — items always have the same key set (fitScorePercent/fitsCaller), null when not applicable"
    - "Algorithm constants exported (ALTERABLE_SLACK_CM); tolerances kept private (EXPECTED_LENGTH_TOLERANCE_CM)"

key-files:
  created:
    - src/features/wardrobe/lib/fitScore.ts
  modified:
    - src/features/wardrobe/api/queries/catalogQueries.ts

key-decisions:
  - "Pure module — zero React, Prisma, ctx, or async — single source of truth that runs identically on the server (sort=bestFit ranking) and the future client (BestFitBadge in 15-05, FitCheckCard in Phase 16). Drift is impossible."
  - "EXPECTED_LENGTH_TOLERANCE_CM kept module-private (not exported) — only passesFitsMeFilter uses it; exposing it would invite drift between filter and (future) badge-color thresholds. If a UI needs the threshold, expose a derived helper, not the raw constant."
  - "scoreDress contribution formula uses `halfRange + 1` to prevent div-by-zero when min == max — keeps the helper safe against degenerate (collapsed-range) listings without a special case."
  - "Null structured dimension penalty (-0.1) is per missing PAIR not per missing bound — sparse listings get penalized in [0, -0.3] range; tunable in one place if user feedback says it's too harsh."
  - "scoreToPercent clamps to [0, 100] AFTER zero-floor on the negative-score input — a dress with three null dimensions (score=-0.3) presents as 0% rather than 'unranked', honest about missing data."
  - "fitScorePercent and fitsCaller always present on items — null when callerHasMeasurements is false. Client never has to check for property existence, only value type."
  - "Filter BEFORE sort BEFORE paginate ordering — fitsMe trims the ranked pool before bestFit orders it; the alternative (sort then filter) would deliver inconsistent page counts as filter pressure grew."
  - "BAD_REQUEST gate keeps the 15-01 'any one of chest/waist/hips' semantics — research Open Question 5 explicitly chose 'any' over 'all three' so partially-filled profiles can still use Best Fit; gate text was kept as-is by 15-01 and confirmed correct."

patterns-established:
  - "Pure-helpers-in-feature-lib pattern — algorithmic code lives in `src/features/<feature>/lib/`, no transport or UI imports, importable from TRPC procedures AND React components without bundle bloat"
  - "Item-shape annotation via map after pagination — server attaches derived per-row metadata (fitScorePercent, fitsCaller) post-pagination to avoid scoring 1000 dresses to show 24, but BEFORE the response leaves the procedure"

# Metrics
duration: 5min
completed: 2026-05-29
---

# Phase 15 Plan 02: Fit Score Module + catalogQueries.list Wiring Summary

**Pure fit-scoring helpers (alterable-slack + null-penalty algorithm) shipped as `src/features/wardrobe/lib/fitScore.ts`; catalogQueries.list now wires sort=bestFit, fitsMe filter, and per-item fitScorePercent/fitsCaller annotations.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-29T16:03:32Z
- **Completed:** 2026-05-29T16:08:35Z
- **Tasks:** 2 (both auto)
- **Files modified:** 2 (1 created + 1 modified)
- **Commits:**
  - `8289f1a` — feat(15-02): add pure fitScore.ts module for catalog scoring + filter
  - `bb98677` — feat(15-02): wire fitScore into catalogQueries.list (bestFit + fitsMe)

## Algorithm Summary

### Alterable-slack formula
For each of chest / waist / hips dimensions:
```
slackLo = alterableSmaller ? 2 : 0
slackHi = alterableLarger  ? 2 : 0
minWithSlack = dressMin - slackLo
maxWithSlack = dressMax + slackHi
```

A dress with `alterableSmaller=true` extends its lower bound by 2 cm (a slightly-too-small dress can be let out). `alterableLarger=true` extends the upper bound by 2 cm (a slightly-too-large dress can be taken in). Both default to false — no slack.

### passesFitsMeFilter predicate
For each dimension `(s = student.dim, dMin/dMax = dress bounds)`:
- If `s == null || dMin == null || dMax == null` → MATCH (no penalty, no rejection)
- Else fail if `s < dMin - slackLo` OR `s > dMax + slackHi`

Plus a length check: when both `dress.lengthCm` and `student.heightCm` are set, reject if `|dress.lengthCm - round(0.45 * heightCm)| > 8 cm`.

### scoreDress contribution
For each dimension that has BOTH caller `s` and dress bounds present:
```
center = (minWithSlack + maxWithSlack) / 2
halfRange = (maxWithSlack - minWithSlack) / 2 + 1   // +1 avoids div-by-zero
contribution = 1 - min(1, |s - center| / halfRange)
score += contribution
```

For each dimension that is missing on either side: `nullDimensions += 1`.

Final: `score - nullDimensions * 0.1`. Range is approximately [-0.3, 3.0]. `scoreToPercent` clamps to [0, 100] via `round((max(0, score) / 3) * 100)`.

### Null-penalty rule
Each missing structured PAIR (one of chestMin/Max, waistMin/Max, hipsMin/Max NOT BOTH SET) costs `-0.1`. A dress with no measurements at all scores `-0.3` → presents as 0% — visible signal to admins that the listing is incomplete.

## Unit Assertions (Task 1)

Inline `scripts/unit-fit-score.ts` (deleted after passing) ran 10 assertions; ALL passed:

| # | Assertion | Result |
|---|-----------|--------|
| 1 | `ALTERABLE_SLACK_CM === 2` | PASS |
| 2 | Student matching dress range exactly → `true` | PASS |
| 3 | Student 2.5cm below min + `alterableSmaller=true` → `false` (slack=2) | PASS |
| 4 | Student 2cm below min + `alterableSmaller=true` → `true` (slack covers exactly) | PASS |
| 5 | All caller dims null → `true` (short-circuit MATCH) | PASS |
| 6 | `scoreDress` all three dressbound pairs null → ≈ `-0.3` | PASS |
| 7 | `scoreToPercent(-0.3) === 0` (clamp) | PASS |
| 8 | `scoreToPercent(3) === 100` | PASS |
| 9 | `scoreToPercent(1.5) === 50` | PASS |
| 10 | `expectedDressLengthForHeight(170) === 77` | PASS |

## Smoke Test (Task 2)

End-to-end `scripts/smoke-15-02.ts` (deleted after passing) seeded 3 AVAILABLE dresses with distinct fit profiles (tight/loose/out-of-range) against a real Student row on dev Neon; mutated chest/waist/hips/heightCm to known values; ran the `list` procedure through `catalogRouter.createCaller(ctx)`; restored originals and deleted seeded dresses in `finally`. All 11 assertions passed:

| # | Assertion | Result |
|---|-----------|--------|
| 1 | `list({})` — `callerHasMeasurements === true` | PASS |
| 2 | `list({})` — `items[0].fitScorePercent` is a number | PASS |
| 3 | `list({})` — `items[0].fitsCaller` is a boolean | PASS |
| 4 | `list({})` — EVERY item has number `fitScorePercent` | PASS |
| 5 | `list({})` — EVERY item has boolean `fitsCaller` | PASS |
| 6 | `list({sort:bestFit})` — `items[0].score >= items[last].score` | PASS |
| 7 | `list({sort:bestFit})` — monotonic descending across all items | PASS |
| 8 | `list({fitsMe:true})` — EVERY item `fitsCaller === true` | PASS |
| 9 | `list({fitsMe:true})` — out-of-range seeded dress excluded | PASS |
| 10 | `list({sort:bestFit})` with null chest/waist/hips → `BAD_REQUEST` | PASS |
| 11 | `list({fitsMe:true})` with null chest/waist/hips → `BAD_REQUEST` | PASS |

## TODO(15-02) Markers Resolved

Plan 15-01 left two `TODO(15-02)` markers in `catalogQueries.list`:

1. **Sort=bestFit stub** (was: "fall back to newest ordering"). Resolved — now `[...filtered].map(d => ({d, score: scoreDress(d, callerFit)})).sort((a,b) => b.score - a.score).map(({d}) => d)`.
2. **fitsMe filter stub** (was: "no-op pass-through"). Resolved — now `filtered = filtered.filter(d => passesFitsMeFilter(d, callerFit))` applied BEFORE the sort + paginate phase.

`grep -n "TODO(15-02)" src/features/wardrobe/api/queries/catalogQueries.ts` returns nothing.

## List Response Shape Changes

The `wardrobe.list` response now includes two new per-item fields. Plans 15-05 (DressCard) and 15-06 (FilterBar) are the immediate consumers; Phase 16 (detail page) reuses the same math via `scoreDress` directly.

### Before (15-01)
```ts
{
  items: Array<PublicDressShape>,   // PUBLIC_DRESS_SELECT
  total: number,
  page: number,
  limit: number,
  callerHasMeasurements: boolean,
}
```

### After (15-02)
```ts
{
  items: Array<PublicDressShape & {
    fitScorePercent: number | null,  // null when caller has no measurements
    fitsCaller:      boolean | null, // null when caller has no measurements
  }>,
  total: number,
  page: number,
  limit: number,
  callerHasMeasurements: boolean,
}
```

**When `callerHasMeasurements === true`:**
- `fitScorePercent` is a 0..100 integer; consumed by `BestFitBadge` (15-05) for percentage display.
- `fitsCaller` is a boolean; consumed by `WardrobeFilterBar` (15-06) to grey-out non-fitting cards when "Fits Me" toggle is OFF and to gate the toggle to enabled.

**When `callerHasMeasurements === false`:**
- Both fields are `null` — neither badge nor filter UI shows; properties always present so the client never has to existence-check.

## Purity Verification

`grep -E "(react|prisma|@trpc)" src/features/wardrobe/lib/fitScore.ts` returns nothing. The module is reusable across:
- **Server**: `catalogQueries.list` (this plan)
- **Client (Plan 15-05)**: `BestFitBadge` component will import `scoreToPercent`
- **Client (Phase 16)**: `FitCheckCard` will import `scoreDress` for per-dimension bar display
- **Future shared**: any cross-cutting consigner / admin "fit fanout" tooling

## Deviations from Plan

None. Plan executed exactly as written. The BAD_REQUEST gate in 15-01 already had the "any of chest/waist/hips" semantics the planner requested, so no widening of the gate was required.

## Authentication Gates

None. Pure module + procedure wiring; no external services touched.

## Next Phase Readiness

The catalog API surface is now feature-complete for browse + fit-match. Subsequent Phase 15 plans:
- **15-03**: Slider primitive + Vercel Blob `next.config.js` images.remotePatterns config (independent of fit-score)
- **15-04**: `/wardrobe/measurements` form — consumes `wardrobe.measurements.get/update`
- **15-05**: `DressCard` + `BestFitBadge` — consumes `item.fitScorePercent`, imports `scoreToPercent` from this plan's module
- **15-06**: `WardrobeFilterBar` — consumes `callerHasMeasurements` to gate "Fits Me" + "Best Fit" toggles, `item.fitsCaller` to visually distinguish non-fitting cards
- **15-07**: Catalog grid composition replaces the `Coming Soon` stub at `src/app/(protected)/wardrobe/page.tsx`

No blockers identified. The `BLOB_READ_WRITE_TOKEN` env-var requirement (carried from Phase 14 live-UX checklist) is unrelated to fit-score and only affects image upload smoke testing.
