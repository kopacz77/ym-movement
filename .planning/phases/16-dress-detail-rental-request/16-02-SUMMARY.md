---
phase: 16-dress-detail-rental-request
plan: 02
subsystem: ui
tags: [wardrobe, pure-module, typescript, fit-math]

# Dependency graph
requires:
  - phase: 15-catalog-browse-measurements
    provides: "fitScore.ts ALTERABLE_SLACK_CM constant — single source of truth for the 2cm alterable slack threshold"
provides:
  - "Pure helper module src/features/wardrobe/lib/fitCheckBars.ts exporting computeFitBar + FitBar + FitBarState"
  - "Per-dimension fit classification (green/amber/red/unknown) with marker position normalization for FitCheckCard bar visualization"
affects:
  - "16-03 (FitCheckCard) — direct consumer of computeFitBar for chest/waist/hips bar rendering"
  - "16-04 (DressDetail page) — mounts FitCheckCard, indirect consumer"
  - "Any future surface that needs per-dimension fit visualization (Phase 18 consigner preview, Phase 19 admin override UI)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-module helpers for wardrobe fit math (server + client use identical code, drift structurally impossible)"
    - "Shared constant import pattern: ALTERABLE_SLACK_CM lives in fitScore.ts; fitCheckBars.ts re-imports rather than re-declares"

key-files:
  created:
    - "src/features/wardrobe/lib/fitCheckBars.ts"
  modified: []

key-decisions:
  - "Separate fitCheckBars.ts module instead of extending fitScore.ts — different output shape (per-dimension state object vs scalar score), shared constant only"
  - "computeFitBar takes a single args object (not positional params) — 6 fields including 2 booleans, named-args readability beats brevity at the call site"
  - "FitBarState union excludes 'orange'/'yellow' brand variants — UI layer (16-03) maps green→emerald, amber→amber, red→rose for the brand sweep; logic layer stays semantic"
  - "Range fallback `|| 1` for the collapsed-range case (dressMin === dressMax) — mirrors fitScore.ts halfRange `+1` guard, prevents div-by-zero / NaN marker position"
  - "Green-first classification with sequential demotion (amber overwrites green if outside raw range, red overwrites amber if outside slack-extended range) — algorithm is order-dependent but expresses 'best case, then degrade' intent directly"

patterns-established:
  - "Pure wardrobe lib modules live under src/features/wardrobe/lib/ alongside fitScore.ts and catalogFilters.ts; no React/Prisma/TRPC/async imports allowed (purity guard enforced via grep at verification time)"
  - "Per-dimension fit output shape: { dimension, state, studentValue, dressMin, dressMax, markerPositionPct } — every field always present even in 'unknown' state, so consumers never check for property existence (only value types)"

# Metrics
duration: 3min
completed: 2026-05-29
---

# Phase 16 Plan 02: Fit-Check Bar Helper Summary

**Pure helper module `fitCheckBars.ts` shipping `computeFitBar` for the FitCheckCard's per-dimension green/amber/red bar visualization — imports ALTERABLE_SLACK_CM from fitScore.ts to keep slack behavior in lockstep with the catalog's fitsMe filter and bestFit sort.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-29T17:11:25Z
- **Completed:** 2026-05-29T17:14:15Z
- **Tasks:** 1
- **Files modified:** 1 (new)

## Accomplishments

- New `src/features/wardrobe/lib/fitCheckBars.ts` (64 lines) — pure module with zero React/Prisma/TRPC/async dependencies
- Exports `computeFitBar` (the workhorse), `FitBar` (per-dimension output type), `FitBarState` (green | amber | red | unknown union)
- Imports `ALTERABLE_SLACK_CM` from `fitScore.ts` — slack constant lives in exactly one place, cannot drift between filter logic and bar visualization
- Algorithm verified with 13 in-shell `npx tsx` assertions covering every state branch, slack boundary, collapsed-range edge case, and marker clamp behavior — script deleted post-verification per critical_notes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create fitCheckBars.ts with computeFitBar + types** — `2e1bad0` (feat)

**Plan metadata:** (to be added after this SUMMARY commit)

## Files Created/Modified

- `src/features/wardrobe/lib/fitCheckBars.ts` — Pure helper module exposing computeFitBar (returns per-dimension fit classification + marker position) and the FitBar / FitBarState types. Consumed by FitCheckCard in 16-03.

## Decisions Made

- **Separate module (not an extension of fitScore.ts):** computeFitBar returns a per-dimension object shape (dimension/state/studentValue/dressMin/dressMax/markerPositionPct), while fitScore.ts's scoreDress returns a scalar. Stuffing both into fitScore.ts would mix output models; a sibling file is cleaner. Drift prevention is enforced via the shared `ALTERABLE_SLACK_CM` import, not via co-location.
- **Single-args-object signature:** `computeFitBar({ dimension, studentValue, dressMin, dressMax, alterableSmaller, alterableLarger })`. Six parameters including two booleans — positional order would be a footgun (mis-pass alterableSmaller and alterableLarger and the bug is silent). Named args at the call site beat brevity here.
- **Semantic FitBarState (green/amber/red/unknown):** matches the natural-language label users see, NOT the brand-mapped colors (emerald/amber/rose). The UI layer (16-03 FitCheckCard) owns the brand mapping. Keeps logic and presentation cleanly separated and lets the brand palette evolve without rewriting fit math.
- **Range fallback `|| 1` for collapsed ranges:** when `dressMin === dressMax`, `range = 0` would NaN out the marker position. Falling back to 1 means the marker is always 0 at the single allowed value (since `studentValue - dressMin = 0`). Mirrors the `+1` guard in fitScore.ts's `halfRange` formula — same family of pathology, same family of fix.
- **Green-first classification with sequential demotion** (not a switch on a derived score): the if/elseif chain literally reads "default to green, demote to amber if outside raw range, demote to red if outside slack-extended range." Algorithm is order-dependent but the order encodes intent directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome `useBlockStatements` lint errors on inline if-statements**

- **Found during:** Task 1 (post-write verification)
- **Issue:** Plan's authoritative code spec used inline form: `if (studentValue < dressMin || studentValue > dressMax) state = "amber";` — Biome `lint/style/useBlockStatements` is enabled in this project and flags the inline form as an error.
- **Fix:** Wrapped both inline state-assignment branches in block statements. Algorithm semantics unchanged.
- **Files modified:** `src/features/wardrobe/lib/fitCheckBars.ts`
- **Verification:** `npx biome check src/features/wardrobe/lib/fitCheckBars.ts` reports zero errors after the fix; all 13 algorithm assertions still pass.
- **Committed in:** `2e1bad0` (part of Task 1 commit — fix landed before the commit was created, so no separate fixup needed)

---

**Total deviations:** 1 auto-fixed (1 lint bug from plan's inline-if spec)
**Impact on plan:** Single mechanical formatting fix to satisfy the project's lint config. Zero algorithmic or shape changes. No scope creep.

## Issues Encountered

- **Pre-existing TS errors in unrelated files** (`src/components/landing/IceParticles.tsx` missing `three` types AND `src/features/wardrobe/api/queries/requestQueries.ts` line 123 `as const` misuse). Both are out of scope for this plan: the IceParticles error is a documented STATE blocker; `requestQueries.ts` is uncommitted work from a sibling Phase 16 plan currently in flight on disk. Whole-project `npx tsc --noEmit` therefore shows 2 errors, but neither involves `fitCheckBars.ts`. Isolated type-check of just the new file (`npx tsc --noEmit fitCheckBars.ts fitScore.ts --strict --skipLibCheck`) is clean.
- **`npx biome check src/features/wardrobe/lib/`** (whole directory) surfaces 6 pre-existing formatter issues in `catalogFilters.ts` and `fitScore.ts` (multi-line function signatures that biome wants collapsed). Not regressions from this plan; the per-file check on `fitCheckBars.ts` is clean.

## User Setup Required

None — pure code module, no external service configuration required.

## Next Phase Readiness

- **Ready for 16-03 (FitCheckCard component):** The component will `import { computeFitBar, type FitBar, type FitBarState } from "@/features/wardrobe/lib/fitCheckBars"` and map FitBarState → brand colors (green→emerald-500, amber→amber-500, red→rose-500, unknown→slate-300). The pre-resolved `markerPositionPct` (0..1) drops straight into a CSS `left: ${pct * 100}%` on the marker element — no math in the component layer.
- **Bar UX spec stays consistent with catalog filters:** the same 2cm alterable slack that's been authoritative in `passesFitsMeFilter` since Plan 15-02 now drives the bar's amber/red boundary. A dress that fits via `fitsMe=true` in the catalog will show all-green-or-amber bars on the detail page — no contradictions across surfaces.
- **No blockers** for 16-03. The IceParticles + requestQueries pre-existing TS errors do not block 16-03 either (16-03 is a UI component file; those errors are in unrelated subsystems).

---
*Phase: 16-dress-detail-rental-request*
*Completed: 2026-05-29*
