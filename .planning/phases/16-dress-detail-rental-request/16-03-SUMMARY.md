---
phase: 16-dress-detail-rental-request
plan: 03
subsystem: ui

tags: [react, tailwind, brand-palette, presentational-components, wardrobe, lucide-icons]

requires:
  - phase: 13-wardrobe-data-model
    provides: "Dress + RentalRequest + Rental schema; RentalRequestStatus + RentalPaymentStatus enums"
  - phase: 14-admin-dress-inventory
    provides: "DressStatusBadge exhaustive-Record pattern; brand cyan #0891b2 active-state convention; formatCurrencyFromCents helper; standard luxury card shadow class"
  - phase: 15-student-wardrobe-catalog
    provides: "DressCard / BestFitBadge primitives (sibling reuse model); editorial uppercase header style; biome-ignore-noImgElement precedent (14-05)"
  - phase: 16-dress-detail-rental-request
    provides: "16-01 wardrobe.requests TRPC sub-router (consumed by 16-04/16-05/16-06/16-07); 16-02 fitCheckBars helper (consumed by 16-04 FitCheckCard)"

provides:
  - "DressImageCarousel (in-house, zero deps, isPrimary-seeded, empty/single/multi states)"
  - "PricingTierTable (3-tier Competition/Seasonal/Purchase + fees, Purchase elided when null)"
  - "StructuredSizeSummary (5-dimension chest/waist/hips/torso/length + alterable pills)"
  - "RentalStatusBadge (exhaustive Record over RentalRequestStatus + RentalPaymentStatus)"

affects:
  - "16-04 DressDetail page (composes all four primitives plus FitCheckCard above the hero)"
  - "16-06 MyRentalsTabs (consumes RentalStatusBadge for both PENDING/APPROVED requests AND PAID/RETURNED/etc rentals)"
  - "16-07 CancelRequestButton (uses RentalStatusBadge to show current status alongside the destructive action)"
  - "Phase 18 consigner My Listings (DressImageCarousel + PricingTierTable reusable on consigner dress-edit pages)"

tech-stack:
  added: []
  patterns:
    - "In-house carousel pattern (React state + arrow buttons + indicator dots, zero deps)"
    - "isPrimary-seeded initial index (Math.max(0, findIndex)) for image carousel — first frame matches catalog thumbnail"
    - "Two-enum exhaustive Record badge (RentalRequestStatus ∪ RentalPaymentStatus) — single component handles request lifecycle AND rental lifecycle"
    - "Null-safe range() helper for min/max display (5 branches: both null / min null / max null / equal / normal)"
    - "Conditional row elision in tier table (purchasePrice != null gate at JSX boundary, not via separate component variant)"

key-files:
  created:
    - "src/features/wardrobe/components/detail/DressImageCarousel.tsx"
    - "src/features/wardrobe/components/detail/PricingTierTable.tsx"
    - "src/features/wardrobe/components/detail/StructuredSizeSummary.tsx"
    - "src/features/wardrobe/components/request/RentalStatusBadge.tsx"
  modified: []

key-decisions:
  - "Two new subdirectories: components/detail/ (3 hero-area primitives) and components/request/ (rental-flow primitives). Mirrors 14-02 directory-split ADR (root for cross-role, subfolder for role/flow-specific)."
  - "RentalStatusBadge accepts the FULL union of both enums (RentalRequestStatus ∪ RentalPaymentStatus) in a single Record. Plan spec omitted LATE_FEE_OWED but the exhaustive Record contract requires every variant — Rule 2 deviation handled in-place."
  - "DressImageCarousel is pure React state — no Embla, Swiper, or Radix Carousel. ~80 LOC of standard arrow + dot logic, zero new pnpm adds."
  - "Carousel initial index seeded via Math.max(0, images.findIndex(isPrimary)). Coerces -1 (no primary flagged) to 0 safely. The empty-state branch short-circuits before reading images[index], so the array-out-of-bounds case is impossible."
  - "All currency rendered via formatCurrencyFromCents — never inline cents/100 math. Matches Phase 14-01 ADR."
  - "Range helper inline (not extracted to lib/) — only StructuredSizeSummary uses it; extract if a second caller appears."

patterns-established:
  - "components/detail/ subdirectory naming: any future detail-page-only primitive (e.g. SimilarDressesRail in a future polish phase) goes here"
  - "components/request/ subdirectory naming: any future rental-request-flow primitive (e.g. RentalTimeline in Phase 17 approval UX) goes here"
  - "Plan-spec discrepancy resolution: when plan enumerates fewer enum variants than the schema defines, default to the schema (Rule 2: completeness gate is required for the exhaustive-Record contract to hold)"

duration: 3min
completed: 2026-05-29
---

# Phase 16 Plan 03: Detail Page Primitives Summary

**Four presentational primitives — image carousel, 3-tier pricing table, structured size grid, and dual-enum rental status badge — that the Wave-3 DressDetail page (16-04), RequestRentalDialog (16-05), MyRentalsTabs (16-06), and CancelRequestButton (16-07) compose without further leaf-component work.**

## Performance

- **Duration:** 3 min (170s wall-clock)
- **Started:** 2026-05-29T17:25:24Z
- **Completed:** 2026-05-29T17:28:14Z
- **Tasks:** 2
- **Files created:** 4 (no files modified — all greenfield in two new subdirectories)

## Accomplishments

- **DressImageCarousel (80 LOC, zero deps):** Hero carousel for the `/wardrobe/[id]` detail page. Seeds its initial frame from `images.findIndex(i => i.isPrimary)` so the first frame matches the catalog thumbnail (Pitfall 6). Three render modes branch off `total`: 0 → ImageIcon empty-state on aspect-square slate card; 1 → image only, no arrows or dots; 2+ → arrows (ChevronLeft/Right in rounded white pills, absolutely positioned mid-height) plus indicator dots (active = cyan `#0891b2`, inactive = slate-200). Raw `<img>` with `biome-ignore lint/performance/noImgElement` citing the 14-05 SUMMARY deferral rationale (Vercel Blob domain not in `next.config` remotePatterns).
- **PricingTierTable (64 LOC):** Three-tier display rendered as a vertical `<table>` (Competition / Seasonal / Purchase). Purchase row is conditionally omitted when `purchasePrice == null` (DETAIL-01). Cleaning fee + refundable security deposit shown below the table in small slate-500 text. Every price call goes through `formatCurrencyFromCents` — no inline `cents/100` math.
- **StructuredSizeSummary (97 LOC):** 5-dimension grid (chest / waist / hips / torso as min-max ranges + length as single value), header carries the sizeLabel ("Size — XS"), alterable pills below the grid (`bg-cyan-50 text-cyan-700` for true flags, "No alterations possible" copy when both flags false). Internal `range(min, max)` helper covers all five permutations including `≤ N cm` / `≥ N cm` for one-sided null bounds.
- **RentalStatusBadge (42 LOC):** Single component, single `Record<Status, {bg, text, label}>` map, where `Status = RentalRequestStatus | RentalPaymentStatus`. Adding a new variant to either Prisma enum forces a compile error at the Record initializer — same exhaustive-Record contract as `DressStatusBadge`. 10 variants covered total: 5 request lifecycle (PENDING/APPROVED/DECLINED/CONVERTED/CANCELED) + 5 rental lifecycle (AWAITING_PAYMENT/PAID/RETURNED/DEPOSIT_RELEASED/LATE_FEE_OWED).

## Task Commits

Each task was committed atomically:

1. **Task 1: DressImageCarousel + RentalStatusBadge** — `039c8f4` (feat)
2. **Task 2: PricingTierTable + StructuredSizeSummary** — `8a02d53` (feat)

**Plan metadata:** (this commit) — docs

## Files Created/Modified

- `src/features/wardrobe/components/detail/DressImageCarousel.tsx` — In-house image carousel for the detail hero. Empty / single / multi-image states. Seeds initial index from isPrimary. Brand cyan active dot.
- `src/features/wardrobe/components/detail/PricingTierTable.tsx` — Vertical 3-tier pricing card. Purchase row conditionally omitted. Fees below the divider.
- `src/features/wardrobe/components/detail/StructuredSizeSummary.tsx` — 5-dimension size grid + alterable pills + null-safe range() helper.
- `src/features/wardrobe/components/request/RentalStatusBadge.tsx` — Exhaustive-Record badge over RentalRequestStatus ∪ RentalPaymentStatus.

## Decisions Made

- **Two new subdirectories: `components/detail/` and `components/request/`** — mirrors the 14-02 directory-split ADR (root for cross-role primitives, subfolder for role-/flow-specific). DressDetail (16-04) imports from `detail/`; MyRentalsTabs (16-06) + CancelRequestButton (16-07) import from `request/`. Phase 17 admin approval UX will add `request/` siblings (e.g. RequestApprovalCard) without polluting the root.
- **Single RentalStatusBadge over two enums, not two separate badge components** — the same pill visual treatment carries across both lifecycles; splitting would force callers to know whether they hold a Request or a Rental row before choosing a component. The Record-keyed-by-Status union resolves at the type system, not at the call site.
- **In-house carousel, no new pnpm deps** — Embla / Swiper / Radix-Carousel would be overkill for the 80-LOC interaction (prev / next / dots / aspect-square frame). Saves both bundle weight and a dep-bump audit surface. Future polish phase (e.g. pinch-to-zoom for mobile) can introduce a library at that point.
- **`Math.max(0, images.findIndex(isPrimary))` seed expression** — single-line guard that handles both "no primary flagged" (`findIndex` returns -1) and "empty array" (still returns -1, then short-circuited by the `total === 0` branch before `images[index]` is read). One expression, two edge cases neutralized.
- **`range()` helper inline in StructuredSizeSummary (not extracted to `wardrobe/lib/`)** — only one caller; YAGNI. Extract if 16-04 FitCheckCard or a future facet-display ever needs the same `≤ N cm` / `≥ N cm` / `N–M cm` formatting.
- **Currency strictly via `formatCurrencyFromCents`** — no `${cents/100}` interpolation anywhere in the new code. Matches Phase 14-01 ADR (single conversion helper at the display boundary).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] RentalPaymentStatus.LATE_FEE_OWED added to the Record**

- **Found during:** Task 1 (RentalStatusBadge implementation)
- **Issue:** Plan listed only 4 rental lifecycle states (AWAITING_PAYMENT / PAID / RETURNED / DEPOSIT_RELEASED) but `prisma/schema.prisma` declares 5 variants on the `RentalPaymentStatus` enum. The 5th variant `LATE_FEE_OWED` was omitted from the plan's spec. With `Record<Status, {…}>` requiring exhaustive key coverage, the missing variant would have produced TS2740 ("missing properties from type") at the Record initializer.
- **Fix:** Added `LATE_FEE_OWED` to the Record using the rose palette (matches DECLINED — semantically both are "something went wrong, attention needed"): `LATE_FEE_OWED: { bg: "bg-rose-50", text: "text-rose-700", label: "Late Fee Owed" }`.
- **Files modified:** `src/features/wardrobe/components/request/RentalStatusBadge.tsx`
- **Verification:** `npx tsc --noEmit` clean (only the pre-existing IceParticles three-types blocker remains, documented in STATE.md). All 10 enum variants present.
- **Committed in:** `039c8f4` (Task 1 commit)

**2. [Rule 1 - Bug] `range()` helper rewritten with explicit block statements for Biome `useBlockStatements` rule**

- **Found during:** Task 2 (StructuredSizeSummary biome verification)
- **Issue:** Plan spec for the `range()` helper used the inline `if (cond) return X;` form (no braces). Project Biome config enforces `useBlockStatements: "error"`, identical to the 16-02 Rule 1 deviation precedent — Biome flagged all four early-return statements as `lint/style/useBlockStatements`.
- **Fix:** Wrapped each of the four early returns in block statements: `if (min == null && max == null) { return "—"; }` etc. Algorithm semantics unchanged.
- **Files modified:** `src/features/wardrobe/components/detail/StructuredSizeSummary.tsx`
- **Verification:** `npx biome check src/features/wardrobe/components/detail/ src/features/wardrobe/components/request/` clean across all 4 files.
- **Committed in:** `8a02d53` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 2 missing-critical, 1 Rule 1 bug)
**Impact on plan:** Both auto-fixes were necessary for the code to type-check and lint-pass under project standards. No scope creep — both adjustments stayed inside the four artifacts the plan declared. The LATE_FEE_OWED gap is also a heads-up signal for Plan 16-04 / 16-06 reviewers: the badge can already represent the rental-late state when 17/18 wire up the late-fee flow.

## Issues Encountered

- **Stray `FitCheckCard.tsx` + `RequestRentalDialog.tsx` files in the new subdirectories** — These appeared as untracked files during Task 1/2 verification. They belong to Plans 16-04 (FitCheckCard) and 16-05 (RequestRentalDialog), not 16-03. Left untracked; the 16-03 commits explicitly stage only the four files this plan declared in `files_modified`. The stray files' biome warnings (FitCheckCard had an `import` ordering issue plus a formatter-prefers-one-line span) are upstream-plan concerns, not 16-03 blockers.
- **Pre-existing `three`-types TypeScript error** in `src/components/landing/IceParticles.tsx` — Out of scope for this plan; documented in STATE.md Blockers/Concerns since 13-01. `npx tsc --noEmit` against the new files alone (filtering with `grep -v IceParticles`) is clean.

## User Setup Required

None — all four primitives are pure presentational React components with no environment variables, no external services, no schema changes.

## Next Phase Readiness

- **Wave 3 (16-04 DressDetail) unblocked** — page can compose DressImageCarousel + PricingTierTable + StructuredSizeSummary + FitCheckCard (16-02 helper + 16-03's pre-existing stray FitCheckCard.tsx — needs Plan 16-04 to formalize) + RentalStatusBadge (showing checkAvailability's "Currently rented through DATE" line if needed).
- **16-06 MyRentalsTabs** can render `RentalStatusBadge` for both `mine` (request rows: status ∈ RentalRequestStatus) and `myRentals` (rental rows: paymentStatus ∈ RentalPaymentStatus) without conditional component choice.
- **16-07 CancelRequestButton** can show `<RentalStatusBadge status="PENDING" />` adjacent to the cancel CTA so the user sees what they're canceling.
- **No outstanding blockers from this plan.** The stray FitCheckCard.tsx is observable but doesn't affect 16-03's success criteria; 16-04 will own that file's formatting / commit.
- **Carried user-setup items from earlier phases (1 remaining):** `BLOB_READ_WRITE_TOKEN` env still needed in local `.env` for image upload testing on `/admin/wardrobe/new`.

---
*Phase: 16-dress-detail-rental-request*
*Completed: 2026-05-29*
