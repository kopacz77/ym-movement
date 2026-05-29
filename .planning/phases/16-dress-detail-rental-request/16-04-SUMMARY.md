---
phase: 16-dress-detail-rental-request
plan: 04
subsystem: ui
tags: [react, nextjs, tailwind, wardrobe, fit-check, presentational]

# Dependency graph
requires:
  - phase: 16-dress-detail-rental-request
    provides: "Plan 16-02 — fitCheckBars.ts pure helper module with computeFitBar(args) returning per-dimension state classification (green/amber/red/unknown) and markerPositionPct"
  - phase: 15-wardrobe-catalog
    provides: "Plan 15-05 — DressCard primitive convention (rounded-xl, slate borders, luxury shadow, plain <img>) extended by detail-page card siblings"
provides:
  - "FitCheckCard — single presentational component rendering three per-dimension fit bars (chest/waist/hips) for /wardrobe/[id] DressDetail (DETAIL-02)"
  - "Brand-mapped state palette: emerald (great fit) / amber (tight fit) / rose (likely won't fit) / slate (unknown) — extends 2026-04-26 sweep convention to fit visualization"
  - "Graceful CTA fallback: when caller has zero measurements set, the entire card renders a single 'Set measurements' link to /wardrobe/measurements instead of three empty bars"
affects:
  - "16-04-DressDetail (next Wave-2 plan): mounts FitCheckCard alongside DressImageCarousel + PricingTierTable + StructuredSizeSummary"
  - "16-05-RequestRentalDialog: students decide to submit based on this card's visual signal — fit confidence is the primary submission trigger"
  - "Future Phase 18 consigner self-listing flow can reuse FitCheckCard verbatim — pure props, no role assumptions"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure presentational card with optional CTA fallback — null-data branches render a route-link fallback INSIDE the same card chrome (preserves layout grid slot)"
    - "Sub-component (FitBarRow) co-located in the same file — lookup tables (DIMENSION_LABEL, STATE_BAR_COLOR, STATE_LABEL, STATE_TEXT_COLOR) declared as module-level Records typed `Record<FitBar['state'], string>` for exhaustive-key compile-time safety"
    - "Layout-symmetric unknown rows: render dimension with muted '—' instead of hiding — three slots stay visually balanced even when waist data is missing"

key-files:
  created:
    - "src/features/wardrobe/components/detail/FitCheckCard.tsx (153 lines, exports FitCheckCard + FitCheckCardProps interface)"
  modified: []

key-decisions:
  - "Exhaustive Record<FitBar['state'], string> lookup tables (DIMENSION_LABEL, STATE_BAR_COLOR, STATE_LABEL, STATE_TEXT_COLOR) for brand-color mapping"
  - "STATE_TEXT_COLOR extracted as a fourth lookup table instead of an inline conditional — biome reflow stability and exhaustive-state guarantee"
  - "Co-located FitBarRow sub-component in same file (NOT a sibling export)"
  - "CTA fallback fires when ALL three measurements are null (any single value triggers the bars view)"
  - "Bar fill spans 100% width with state-driven color; marker dot encodes student position via markerPositionPct"
  - "Card chrome (rounded-xl border-slate-200 bg-white shadow-...) matches the planned 16-XX detail-page sibling components"

patterns-established:
  - "CTA-in-card-shell fallback: when source data is unavailable, render the same outer card chrome with a single Link CTA pointing at the data-entry route. Preserves grid slot AND directs user remediation in one motion. Replicable for any presentational card whose required data may be missing."
  - "Brand-mapping sub-tables co-located with consuming sub-component: Record<UnionType, string> tables for color/label/text keyed by the FitBar.state union. Compile-time exhaustiveness; visual layer fully data-driven."

# Metrics
duration: 1min 15s
completed: 2026-05-29
---

# Phase 16 Plan 04: FitCheckCard Summary

**Per-dimension fit visualization card — three horizontal bars showing chest/waist/hips state against the dress sizing range, with brand-mapped emerald/amber/rose coloring and a CTA fallback when the caller has no measurements set**

## Performance

- **Duration:** 1min 15s
- **Started:** 2026-05-29T17:25:32Z
- **Completed:** 2026-05-29T17:26:47Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments

- Pure presentational FitCheckCard ships at `src/features/wardrobe/components/detail/FitCheckCard.tsx`
- Three per-dimension bars (chest/waist/hips) consume `computeFitBar` from Plan 16-02 — server-side ranking math and client-side fit visualization driven by the same helper, drift structurally impossible
- Brand-palette mapping (emerald/amber/rose/slate) wired through four exhaustive `Record<FitBar['state'], string>` lookup tables
- "Set measurements" CTA fallback when caller has zero measurements set — links to `/wardrobe/measurements` inside the same card chrome
- Layout-symmetric handling for the unknown state: row still renders with muted "—" instead of hiding, so the three-slot rhythm stays intact when waist (or any dimension) is missing
- Card chrome (rounded-xl border-slate-200 bg-white luxury shadow + editorial uppercase header) ready to sit alongside the still-to-build PricingTierTable / StructuredSizeSummary detail-page siblings

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FitCheckCard component** — `abdb0b4` (feat)

**Plan metadata:** (this commit, capturing SUMMARY.md + STATE.md updates)

## Files Created/Modified

- `src/features/wardrobe/components/detail/FitCheckCard.tsx` (created, 153 lines) — Per-dimension fit visualization card. Exports `FitCheckCard` and `FitCheckCardProps`. Renders three bars or a single CTA depending on `measurements` prop. Pure presentational — no TRPC, no fetching, no role checks.

## Decisions Made

- **Four exhaustive `Record<FitBar['state'], string>` lookup tables** (DIMENSION_LABEL, STATE_BAR_COLOR, STATE_LABEL, STATE_TEXT_COLOR) declared at module level. Schema changes to the FitBarState union (e.g. adding a fifth state) force a compile error in every table until extended. The plan body inlined STATE_TEXT_COLOR as a nested ternary; promoted it to a fourth table for symmetry with the other three and biome reflow stability.
- **Co-located FitBarRow sub-component** — kept in the same file rather than exported as a sibling. The component is private to FitCheckCard; exporting it would invite reuse where the FitBar prop shape would otherwise drift. Lookup tables declared above the sub-component for top-down readability.
- **CTA fallback fires when ALL three measurements are null** (any single value triggers the bars view) — `hasAnyMeasurement = chest ?? null != null || waist ?? null != null || hips ?? null != null`. Mirrors the catalog `callerHasMeasurements` capability flag from 15-01 (any one dimension suffices). User with only chest measured still gets the bars view; waist/hips render as unknown rows.
- **Bar fill spans 100% width with state-driven color; marker dot encodes student position via markerPositionPct** — visual encoding is two-layered. Color = state (green/amber/red/unknown), marker position = where the student value sits within the dress range. Decouples "is this a fit?" (color) from "how close to the edge?" (marker). Unknown state renders a 100%-width slate bar at 0.4 opacity with no marker.
- **Card chrome matches the planned 16-XX detail-page sibling components** — rounded-xl border-slate-200 bg-white + `shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]` + editorial `text-xs font-bold uppercase tracking-[0.15em] text-slate-500` header. Same treatment PricingTierTable and StructuredSizeSummary will adopt when they land; the detail page will read as a coherent three-card sequence.
- **`measurements?.chestCm` (with optional chain) passed through to computeFitBar** even though the helper accepts `null | undefined` — preserves the "caller did not fill ANY measurement" vs "caller filled chest but null for waist" distinction. The Hooks's `studentValue ?? null` normalization happens inside the helper.
- **Plain `<img>` not needed** — this card has no images, only Tailwind-styled divs and a single lucide Ruler icon. No `blob.vercel-storage.com` remotePatterns concern from prior 14-03/14-05/15-05 ADRs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's inline import order + JSX whitespace flagged by Biome**
- **Found during:** Task 1 verification (`npx biome check`)
- **Issue:** Plan specified `import Link from "next/link"` BEFORE `import { Ruler } from "lucide-react"` which violates Biome's `organizeImports` (alphabetical by source). Additionally, the multi-line `<span>Set your measurements...</span>` block exceeded Biome's collapse threshold and triggered the formatter.
- **Fix:** Ran `npx biome check --write src/features/wardrobe/components/detail/FitCheckCard.tsx` — auto-sorted imports to `Ruler / Link / computeFitBar` and collapsed the span to a single line. Logic unchanged; behavior identical.
- **Files modified:** `src/features/wardrobe/components/detail/FitCheckCard.tsx`
- **Verification:** Re-ran `npx biome check` — clean. `npx tsc --noEmit` shows only the pre-existing IceParticles three-types blocker (out of scope).
- **Committed in:** `abdb0b4` (Task 1 commit — auto-fix applied before commit)

**2. [Rule 1 - Bug] Plan body inlined STATE_TEXT_COLOR as a nested ternary**
- **Found during:** Task 1 implementation (composing the FitBarRow component)
- **Issue:** Plan's code spec used a nested ternary `${isUnknown ? "text-slate-400" : bar.state === "green" ? "text-emerald-600" : bar.state === "amber" ? "text-amber-600" : "text-rose-600"}` for the state label text color. The other three brand-mapping tables (DIMENSION_LABEL, STATE_BAR_COLOR, STATE_LABEL) were extracted as module-level Records — asymmetry would leave a future contributor confused about which pattern to follow when adding a 5th state.
- **Fix:** Extracted to a fourth `STATE_TEXT_COLOR: Record<FitBar["state"], string>` table for symmetry. The `isUnknown` branch is no longer needed in the className expression — `STATE_TEXT_COLOR.unknown = "text-slate-400"` covers it.
- **Files modified:** `src/features/wardrobe/components/detail/FitCheckCard.tsx`
- **Verification:** All four bar states still render with the correct text color per `STATE_TEXT_COLOR[bar.state]`. Compile-time exhaustiveness preserved (Record<FitBar['state'], …>).
- **Committed in:** `abdb0b4` (Task 1 commit — refactor applied during implementation)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — plan-spec correctness/consistency)
**Impact on plan:** Zero scope creep. Both deviations were purely structural — the plan's logic was correct, but its formatting and exhaustiveness-table pattern needed to align with Biome and with the established sibling-table convention in the same file.

## Issues Encountered

None — single-task plan, single-file output, single commit. The only complications were the two Rule 1 deviations above, both auto-fixed in place before the commit.

## User Setup Required

None — pure presentational component, zero external services, zero env vars. Renders on any (protected) route as soon as a parent passes the two required props.

## Next Phase Readiness

- **Plan 16-03 (DressDetail page) is unblocked.** Will compose at `/wardrobe/[id]/page.tsx`: header + DressImageCarousel + `<FitCheckCard dress={...} measurements={...} />` + (future) PricingTierTable + StructuredSizeSummary + (future) RequestRentalDialog mount.
- **Plan 16-05 (RequestRentalDialog) timing.** The fit signal users see in this card is what tips them into clicking "Request Rental." If 16-03 DressDetail does NOT also display a `BestFitBadge` (from 15-05) at the top, this card is the only fit signal — important to confirm the detail page layout shows both.
- **Server/client math parity verified by construction.** `computeFitBar` was Plan 16-02; this card mounts it without modification. Catalog ranking (Phase 15-02 `scoreDress`) and detail-page bars (this card) draw from the same `ALTERABLE_SLACK_CM` constant — if the alterable-slack policy ever changes, both surfaces update in lockstep.
- **Carried blockers (unchanged from prior plans):**
  - Pre-existing TS error in `src/components/landing/IceParticles.tsx` (missing `three` types) — out of scope for Phase 16.
  - `BLOB_READ_WRITE_TOKEN` still needed in local `.env` for image upload testing on `/admin/wardrobe/new` (Phase 14 carryover).

---
*Phase: 16-dress-detail-rental-request*
*Completed: 2026-05-29*
