---
phase: 15-catalog-browse-measurements
plan: 06
subsystem: ui
tags: [wardrobe, catalog, filters, slider, switch, tooltip, radix, react-day-picker, controlled-component]

# Dependency graph
requires:
  - phase: 15-catalog-browse-measurements
    plan: 01
    provides: "wardrobe.facets endpoint returning distinct colors + sizeLabels; PUBLIC_DRESS_SELECT column list"
  - phase: 15-catalog-browse-measurements
    plan: 02
    provides: "fitScore.ts pure module; sort=bestFit and fitsMe=true gating semantics"
  - phase: 15-catalog-browse-measurements
    plan: 03
    provides: "Slider primitive (src/components/ui/slider.tsx) with onValueCommit support"
  - phase: 15-catalog-browse-measurements
    plan: 04
    provides: "wardrobe.measurements.get TRPC procedure exposing callerHasMeasurements"
provides:
  - "WardrobeFilterBar.tsx: sticky, fully-controlled catalog filter composite"
  - "WardrobeFilterBarProps interface — the contract Plan 15-07 binds against"
  - "ChipGroup<T extends string> internal helper for multi-select chip toggles"
  - "Edge-elision rule for sliders (min == LENGTH_MIN_CM | max == LENGTH_MAX_CM commit as null)"
  - "Pitfall-9-resolved Fits Me tooltip-wrap pattern (focusable span + disabled inner Switch)"
affects: [15-07, 18, 19]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Controlled composite filter bar (props in, callbacks out, zero internal router/URL state)"
    - "Slider draft-commit pattern (onValueChange updates local draft, onValueCommit flushes to parent)"
    - "Edge-elision: edge-of-range slider commits resolve to null so parent omits the URL param"
    - "Tooltip-wraps-disabled-Switch pattern via focusable span (Radix Tooltip Pitfall 9)"
    - "Facet hydration with hide-until-resolved (no empty-chip-cluster UX)"

key-files:
  created:
    - "src/features/wardrobe/components/WardrobeFilterBar.tsx (493 lines)"
  modified: []

key-decisions:
  - "Component is a Client Component but owns ZERO router/URL state — single source of truth for filter persistence lives in Plan 15-07's grid"
  - "Theme query flushes to parent on blur OR Enter, NOT every keystroke — avoids router.replace churn while typing (research Pattern 6)"
  - "Sliders use draft-commit pattern: onValueChange updates local React state during drag, onValueCommit flushes to parent on release (research Pattern 7)"
  - "Edge-of-range thumbs commit as null so URL stays clean when user resets a bound to the default position"
  - "Color and Size chip groups hidden until wardrobe.facets resolves — empty chip clusters confuse users (research Pitfall 7)"
  - "Category chip group uses Object.values(DressCategory) directly (Prisma enum is exhaustive — adding a variant is a compile-error force-update)"
  - "Fits Me disabled state uses tooltip-wrapping span around a natively-disabled Switch (Pitfall 9: Radix Tooltip doesn't fire on natively disabled elements)"
  - "Best Fit sort option uses Select's native disabled prop in parallel with Fits Me — single capability flag callerHasMeasurements drives both"
  - "Internal ChipGroup helper kept inline (no separate file) — no other surface needs it; admins use enum-aware StatusFilterChips"
  - "Slider bound constants (LENGTH_MIN_CM=40 / LENGTH_MAX_CM=160 / PRICE_MIN_CENTS=0 / PRICE_MAX_CENTS=100000) are module-private named constants — elision math has names, not magic numbers"
  - "Price slider step 500 cents ($5 increment) — coarse enough that drag feels responsive, fine enough to express realistic price filters"
  - "2-row md+ grid layout — row 1: 3 chip groups + theme input; row 2: 2 sliders + dates + sort + Fits Me + Clear All — sliders/dates/sort/Fits Me wrap to multiple rows on mobile (single-column stack)"
  - "biome-ignore on the tabIndex={0} span attaches as a JSX attribute comment (not a JSX child comment) — Biome only honors suppressions at the exact token position"

patterns-established:
  - "Sticky-below-AppLayout-header: top-24 z-0 (header is sticky top-0 z-10 h-24) — reusable for any per-page filter bar"
  - "Negative-margin sticky bar (-mx-4 lg:-mx-6) to break out of the AppLayout p-4 lg:p-6 padding for full-width feel"

# Metrics
duration: 5min
completed: 2026-05-29
---

# Phase 15 Plan 06: WardrobeFilterBar Summary

**Sticky controlled filter bar composing 9 catalog filters + sort + Clear All; all URL-state mechanics deferred to the parent grid (Plan 15-07).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-29T16:22:47Z
- **Completed:** 2026-05-29T16:27:45Z
- **Tasks:** 1 of 1
- **Files created:** 1 (WardrobeFilterBar.tsx — 493 lines)
- **Files modified:** 0

## Accomplishments

- Shipped the complete visual surface for CAT-02 (filter parameter set), CAT-04 (Fits Me gating), and CAT-05 (sort modes with Best Fit gating)
- Composed Plan 15-03 Slider primitive with the correct onValueCommit draft-commit pattern so slider drags don't churn the parent's router
- Resolved 15-RESEARCH Pitfall 9 inline (Radix Tooltip on a natively-disabled element doesn't fire) via the focusable-span-wrapping-disabled-Switch pattern
- Established the controlled-composite contract (`WardrobeFilterBarProps`) that Plan 15-07 binds URL state against — bar is reusable in any future faceted-search surface that wants different state management

## Task Commits

1. **Task 1: Create WardrobeFilterBar component** — `981c665` (feat)

## Files Created

- `src/features/wardrobe/components/WardrobeFilterBar.tsx` — Sticky catalog filter bar; exports `WardrobeFilterBar` component and `WardrobeFilterBarProps` interface; composes 9 filter controls (3 chip groups, 1 text input, 2 sliders, 1 date range, 1 switch, 1 sort select) + Clear All button

## Decisions Made

### 1. Controlled composite (no URL state inside the bar)

Bar accepts current filter values via props and emits change events via callbacks. Plan 15-07's `DressCatalogGrid` will own `useSearchParams` + `router.replace` — that single seam can be unit-tested independently from this presentational composite, and the bar is reusable in any future surface that prefers Zustand, Jotai, or local state. The bar has zero `useSearchParams` / `useRouter` imports (verified by grep).

### 2. Theme query flushes on blur/Enter (not every keystroke)

A debounced approach would still trigger `router.replace` mid-typing, which (a) generates browser history noise the user didn't ask for and (b) re-runs the wardrobe.list query on every debounce. Blur/Enter is the explicit user intent gesture. Local React state mirrors the prop on mount and re-syncs when the prop changes externally (browser back/forward or Clear All).

### 3. Slider draft-commit pattern

`onValueChange` updates local React state (`lengthDraft`, `priceDraft`) during drag — gives the user the snappy preview value display ("80 – 140 cm" updating in real-time). `onValueCommit` flushes to the parent on pointer release / keyboard arrow rest, so the URL only updates once per filter intent. Without this, every pixel of drag would call `router.replace` and the URL bar would flicker furiously.

### 4. Edge-elision rule

When the user drags a thumb back to the edge of the range (length min == 40 cm, length max == 160 cm, price min == 0¢, price max == 100000¢), the commit callback resolves to `null` for that bound. The parent treats null as "no filter" and elides the URL parameter entirely. This keeps the canonical "no filters set" URL clean (`/wardrobe`) even after the user explored ranges and reset them.

### 5. Fits Me disabled state via tooltip-wrap (Pitfall 9 resolution)

Per 15-RESEARCH Pitfall 9: Radix Tooltip needs a focusable, event-firing element as its trigger. A natively-disabled element (e.g. `<Switch disabled>`) doesn't bubble pointer events and can't receive focus — the tooltip silently never appears, leaving the user with no explanation for why the switch is grayed out.

Resolution:
```tsx
<TooltipTrigger asChild>
  <span tabIndex={0} aria-disabled="true" className="inline-block cursor-not-allowed opacity-50">
    <Switch checked={false} onCheckedChange={() => {/* no-op */}} disabled />
  </span>
</TooltipTrigger>
<TooltipContent>Set chest, waist, or hips first</TooltipContent>
```

The span owns focus + the aria-disabled semantic; the inner Switch stays visibly disabled but doesn't need to fire any events. Biome's `noNoninteractiveTabindex` flag is suppressed inline with the rationale attached as a JSX attribute comment (not a JSX child comment — Biome only honors suppressions at the exact token).

### 6. Best Fit sort option uses native Select disabled

Single capability flag `callerHasMeasurements` drives both the Fits Me Switch AND the Best Fit `<SelectItem disabled>` — no parallel logic to drift. When the user adds measurements via `/wardrobe/measurements`, both surfaces unlock together.

### 7. Hide color/size chips until facets resolve

`wardrobe.facets` returns distinct color + sizeLabel values from the public catalog. While the query is pending, rendering empty chip groups labeled "Color" and "Size" would look broken. The conditional `{colorOptions && colorOptions.length > 0 && ...}` simply omits the column until data arrives. The grid layout (`md:col-span-3`) doesn't reflow oddly because the parent uses `md:grid-cols-12` and adjacent columns expand naturally.

### 8. Internal `ChipGroup<T extends string>` helper inline

Admin chrome already has `StatusFilterChips` (enum-aware, fixed-label-map). The wardrobe filter bar needs a generic version (string-based, dynamic option lists from facets). Different enough that a shared abstraction would be premature. If a third caller appears, the helper can extract to `src/features/wardrobe/components/ChipGroup.tsx` then; until then it stays scoped.

### 9. 2-row md+ grid layout, single-column stack on mobile

Row 1 (above the fold focus): `categoryChips | colorChips | sizeChips | themeInput` — the discovery surface.
Row 2 (refinement controls): `lengthSlider | priceSlider | dateRange | sort | fitsMe + clearAll` — the per-listing-tuning surface.

`md:grid-cols-12` with `md:col-span-3 / 3 / 3 / 3` in row 1 and `md:col-span-3 / 3 / 2 / 2 / 2` in row 2. On mobile the grid collapses to single-column stack.

## Deviations from Plan

None — plan executed exactly as written. The plan body included a complete code template for the Fits Me tooltip pattern and the chip group helper; followed verbatim.

## Verification

### Programmatic

- **Type-check (`npx tsc --noEmit`):** Pass — only the two pre-existing errors documented in STATE.md remain (`IceParticles.tsx` missing `three` types, `sidebar.tsx` missing `@radix-ui/react-visually-hidden`). Zero new errors introduced by this plan.
- **Lint (`npx biome check`):** Pass on the new file. One inline `biome-ignore lint/a11y/noNoninteractiveTabindex` with rationale referencing 15-RESEARCH Pitfall 9.
- **Grep contract checks:**
  - `grep "onValueCommit" WardrobeFilterBar.tsx` returns 4 hits (2 in comments + 2 in code, one per slider) ✓
  - `grep "wardrobe\.facets" WardrobeFilterBar.tsx` returns 2 hits (1 comment + 1 useQuery call) ✓
  - `grep "useSearchParams\|useRouter" WardrobeFilterBar.tsx` returns 1 hit — and it's the "does NOT call useSearchParams" docblock comment, not an import ✓
- **File size:** 493 lines (plan minimum: 280) ✓
- **Exports:** `WardrobeFilterBar` (function component) + `WardrobeFilterBarProps` (interface) ✓

### Deferred to Plan 15-07

These can only be verified by mounting the bar inside the catalog grid (which 15-07 builds):

- Sticky `top-24 z-0` positions cleanly below the AppLayout header
- Facets query actually resolves with non-empty color/size data in production-shaped DB
- Slider drag visual is responsive (commit-only update happens on release)
- Fits Me tooltip fires on keyboard Tab focus when measurements are absent
- Clear All resets every URL param including page index back to 1
- 2-row grid layout reflows correctly at md breakpoint

## Carried State

- **`@radix-ui/react-visually-hidden` missing module** in `src/components/ui/sidebar.tsx`: blocks runtime compilation of every `(protected)` route. Affects ALL routes not just `/wardrobe`. Type-check + lint clean for this plan's deliverable, but local runtime smoke verification of the filter bar (mounted inside Plan 15-07's grid) is deferred until dependency is unblocked. Recommended fix: `pnpm add @radix-ui/react-visually-hidden` matching radix family version pattern.
- **`BLOB_READ_WRITE_TOKEN` env**: still needed in local `.env` for image upload testing (Phase 14 carryover, unrelated to this plan).

## Next Steps

- **Plan 15-07 (next):** Build `DressCatalogGrid` that mounts `WardrobeFilterBar`, owns the URL-state seam (`useSearchParams` + `router.replace`), consumes `wardrobe.list` with the filter state, and renders the grid of `DressCard` (Plan 15-05) components. Replace the Coming Soon stub at `src/app/(protected)/wardrobe/page.tsx`.

## Related Plans

- 15-01: Provides `wardrobe.facets` endpoint
- 15-02: Provides Best Fit sort + Fits Me filter semantics on the wire
- 15-03: Provides the Slider primitive consumed here
- 15-04: Provides the `callerHasMeasurements` capability via `wardrobe.measurements.get`
- 15-07: Will consume `WardrobeFilterBarProps` and mount this component
