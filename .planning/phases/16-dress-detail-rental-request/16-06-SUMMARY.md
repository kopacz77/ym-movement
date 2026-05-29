---
phase: 16-dress-detail-rental-request
plan: 06
subsystem: ui
tags: [next-app-router, trpc, wardrobe, react-use, dress-detail, composition-root]

# Dependency graph
requires:
  - phase: 15-wardrobe-catalog
    provides: wardrobe.byId + wardrobe.measurements.get TRPC procedures; fitScore.ts helpers; AppLayout role=student at /wardrobe/layout.tsx
  - phase: 16-dress-detail-rental-request (Wave 1+2)
    provides: 16-01 wardrobe.requests router + createRequestSchema; 16-03 DressImageCarousel + PricingTierTable + StructuredSizeSummary + RentalStatusBadge; 16-04 FitCheckCard; 16-05 RequestRentalDialog
provides:
  - /wardrobe/[id] detail route renders full composition (carousel + title + badges + description + size + pricing + fit-check + Request CTA)
  - DressDetailHero.tsx — header section composing carousel + title block + CategoryBadge + DressStatusBadge + BestFitBadge + Request to Rent / Sign in CTA
  - DressDetailView.tsx — composition root fetching byId + measurements in parallel, deriving fitScorePercent client-side, mounting hero + grid + dialog
  - Loading skeleton + NotFound state both shipped (no crash on missing data)
  - DETAIL-01/02/03 + REQUEST-01/02/03 acceptance criteria satisfied
affects: [phase-17-admin-approval, phase-18-consigner-listings, phase-19-public-marketplace]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thin client shell pattern for dynamic routes: 'use client' + React `use()` to unwrap params + delegate to view component (extends 14-06 + 15-07 ADRs to dynamic segments)"
    - "Composition root pattern: page-level view component fetches all required queries in parallel (useQuery × 2), derives client-side composed state (fitScorePercent), mounts presentational primitives + controlled modal"
    - "Cross-import strategy: client-side reuse of pure server-shared helpers (fitScore.ts scoreDress + scoreToPercent) for ranking parity between catalog list and detail page"

key-files:
  created:
    - "src/features/wardrobe/components/detail/DressDetailHero.tsx — 90 lines, hero section (carousel + title + badges + CTA)"
    - "src/features/wardrobe/components/detail/DressDetailView.tsx — 141 lines, composition root with queries + skeleton + NotFound + dialog state"
    - "src/app/(protected)/wardrobe/[id]/page.tsx — 10 lines (post-Biome reflow), thin client shell unwrapping params via use()"
  modified: []

key-decisions:
  - "Thin client shell for /wardrobe/[id]/page.tsx — same pattern as 14-06 + 15-07, extended to dynamic-segment params Promise unwrapped by React use()"
  - "scoreDress + scoreToPercent imported as top-level imports (NOT require()) — plan's illustrative require call replaced with proper import per the plan's own NOTE"
  - "computeFitPercent guards hasAny via OR across chest/waist/hips — matches FitCheckCard's hasAnyMeasurement contract (16-04 ADR), only fully-null short-circuits to null"
  - "fitScorePercent derived client-side from byId + measurements queries — CAT-08 preserved (no modification to PUBLIC_DRESS_SELECT in catalogQueries.ts), fit math composes in DressDetailView, byId stays catalog-shaped"
  - "DressDetailHero suppresses DressStatusBadge when status === AVAILABLE — mirrors DressCard 15-05 convention so the default state doesn't compete with CategoryBadge for visual weight"
  - "BestFitBadge mount gated by fitScorePercent != null in DressDetailHero — defense-in-depth even though BestFitBadge null-guards internally; saves a hidden-span layout slot"
  - "Description card conditionally rendered via {dress.description && ...} — empty descriptions don't reserve grid space, matches the 14-05 default-elision philosophy"
  - "DetailSkeleton mirrors the hero 2-column grid exactly — no flash-of-content as the byId query resolves; structure-preserved loading"
  - "NotFoundState handles BOTH dressQuery.error AND !dressQuery.data — TRPC NOT_FOUND throws into error, but defense-in-depth covers any null-data race"
  - "measurements.get retry:false suppresses NOT_FOUND retries — admins/coaches with no Student row see the FitCheckCard CTA fallback, not a perpetual loading spinner"
  - "RequestRentalDialog mounted at the View level (not the Hero level) — controlled by useState in the composition root; Hero just emits the onRequestClick callback. Keeps Hero presentational; future call sites (Phase 18 consigner preview, Phase 19 public marketplace) reuse Hero without inheriting the dialog mount"
  - "3-column grid: description + size at 2/3, pricing + fit-check at 1/3 — matches plan body; pricing's tabular density slots naturally to the narrower column"

patterns-established:
  - "Pattern: Cross-layer fit-score composition — server's catalogQueries.list and client's DressDetailView both call scoreDress(dress, measurements) with the same fields, drift impossible by shared module"
  - "Pattern: Detail-page CTA hand-off — Hero presentational primitive emits onClick callback, View owns the modal state. Replicable for any detail page with a primary action"
  - "Pattern: Dynamic-route client shell — Next.js 16 params Promise unwrapped via React use() inside a 'use client' page component; AppLayout provided by route group layout, never the page"

# Metrics
duration: 3min
completed: 2026-05-29
---

# Phase 16 Plan 06: Dress Detail Page Composition Summary

**`/wardrobe/[id]` route assembled — hero (carousel + title + badges + Request CTA) atop a 3-column grid composing description + StructuredSizeSummary + PricingTierTable + FitCheckCard, with RequestRentalDialog wired through a controlled useState.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-29T17:34:36Z
- **Completed:** 2026-05-29T17:37:48Z
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 0

## Accomplishments

- **Phase 16 detail surface complete:** Students landing from CatalogGrid's DressCard links (Plan 15-07) now see a full composition page. All DETAIL-01/02/03 + REQUEST-01/02/03 acceptance criteria satisfied via the assembled Wave 2 primitives.
- **`DressDetailHero` (90 lines):** Carousel + title + back link + CategoryBadge + conditional DressStatusBadge (AVAILABLE suppressed) + conditional BestFitBadge + Request to Rent / Sign in CTA. `canRequest` gate restricts the CTA to AVAILABLE/PENDING statuses.
- **`DressDetailView` (141 lines):** Composition root running `wardrobe.byId.useQuery` + `wardrobe.measurements.get.useQuery({retry: false})` in parallel; `computeFitPercent` composes `scoreDress + scoreToPercent` from the Phase 15 fitScore helpers; mounts `DressDetailHero` + 3-column grid (`description + StructuredSizeSummary` at 2/3, `PricingTierTable + FitCheckCard` at 1/3) + `RequestRentalDialog`; ships `DetailSkeleton` (mirrors hero layout) and `NotFoundState` (Back to wardrobe link) as defensive sub-components.
- **`/wardrobe/[id]/page.tsx` (10 lines, post-format):** Thin client shell unwrapping `params: Promise<{id: string}>` via React `use()`. Renders `<DressDetailView dressId={id} />`. AppLayout role=student inherited from `/wardrobe/layout.tsx`.
- **CAT-08 immutability preserved:** Zero modifications to `catalogQueries.ts` PUBLIC_DRESS_SELECT. Fit math composes client-side from the byId response + the measurements query. Verified at grep time: every field DressDetailView reads from `dress.*` (description, category, status, color, sizeLabel, all chest/waist/hips/torso/lengthCm bounds, alterableSmaller/alterableLarger, all four pricing fields, Images relation) is already in PUBLIC_DRESS_SELECT.

## Task Commits

Each task was committed atomically:

1. **Task 1: DressDetailHero — carousel + title + badges + CTA** — `942c444` (feat)
2. **Task 2: DressDetailView — composition + queries + dialog state** — `7bd8ffa` (feat)
3. **Task 3: /wardrobe/[id]/page.tsx route shell** — `dc23564` (feat)

**Plan metadata:** committed separately after SUMMARY + STATE updates.

## Files Created/Modified

- **Created:** `src/features/wardrobe/components/detail/DressDetailHero.tsx` (90 lines) — hero section: back link, carousel, title, badges, CTA button
- **Created:** `src/features/wardrobe/components/detail/DressDetailView.tsx` (141 lines) — composition root with byId + measurements queries, computeFitPercent, 3-col grid, dialog state, skeleton, NotFound
- **Created:** `src/app/(protected)/wardrobe/[id]/page.tsx` (10 lines) — thin client shell, params Promise unwrapped via React use()

## Decisions Made

See `key-decisions` in frontmatter — 12 decisions documented covering the composition pattern, CAT-08 preservation strategy, conditional rendering rules for badges/description, modal mount hierarchy, and the dynamic-route client-shell convention.

Highlights:
- **Hero is presentational; View owns the modal:** RequestRentalDialog is mounted in DressDetailView, not DressDetailHero. The Hero emits `onRequestClick` only. This separation lets Phase 18 (consigner preview) and Phase 19 (public marketplace) reuse Hero without inheriting modal state.
- **Client-side fit-score composition:** DressDetailView calls the same `scoreDress + scoreToPercent` the server's catalog ranking uses. Single fitScore.ts module → drift between catalog "Best Fit %" and detail page percent is structurally impossible.
- **Defense-in-depth NotFound:** Covers BOTH `dressQuery.error` (TRPC NOT_FOUND thrown by Plan 15-01 for ARCHIVED/REJECTED/missing) AND `!dressQuery.data` (null-data race). Single state handles both branches.
- **Dynamic-route client shell pattern:** Extends the 14-06 + 15-07 thin-shell ADR to Next.js 16's `params: Promise<...>` contract. React `use()` is the canonical client-side unwrap; AppLayout role=student is inherited from `/wardrobe/layout.tsx`, never duplicated at the page level.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/Style] Biome auto-format reflowed page.tsx function signature**
- **Found during:** Task 3 (route shell verify step)
- **Issue:** Plan body specified the function signature in multi-line form (`function DressDetailPage({\n  params,\n}: {\n  params: Promise<{ id: string }>;\n})`). Biome's printer prefers single-line when the signature fits, and the project enforces formatter output as canonical.
- **Fix:** Ran `npx biome check --write src/app/(protected)/wardrobe/[id]/page.tsx`; signature collapsed onto one line. Side effect: page.tsx ended at 10 lines instead of plan's declared `min_lines: 12`. Same family of deviation as 16-01/16-04/16-05 ADRs — formatter is project-canonical, plan body line count was a pre-format estimate.
- **Files modified:** `src/app/(protected)/wardrobe/[id]/page.tsx`
- **Verification:** `npx biome check` reports zero issues; `npx tsc --noEmit` reports only the pre-existing IceParticles three-types blocker.
- **Committed in:** `dc23564` (Task 3 commit)

**2. [Rule 1 - Bug] Replaced plan's `require()` call inside computeFitPercent with top-level import**
- **Found during:** Task 2 (DressDetailView creation)
- **Issue:** Plan body included a `require()` call inside `computeFitPercent` for dynamic import of fitScore helpers. The plan body itself flagged this with a NOTE: "Replace the `require()` inside `computeFitPercent` with a top-level `import { scoreDress, scoreToPercent } from "@/features/wardrobe/lib/fitScore";` instead — `require` is the wrong pattern." Plan's deviation, plan's own remediation instruction.
- **Fix:** Imported `{ scoreDress, scoreToPercent }` at the top of the file alongside the other top-level imports; `computeFitPercent` now calls them directly. Removed the `// eslint-disable-next-line @typescript-eslint/no-require-imports` comment since it's no longer needed.
- **Files modified:** `src/features/wardrobe/components/detail/DressDetailView.tsx`
- **Verification:** `npx tsc --noEmit` clean; functions called identically; rendering parity with the plan's intent.
- **Committed in:** `7bd8ffa` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 formatter reflow per project Biome convention, 1 plan-flagged require → import correction)
**Impact on plan:** Both deviations were anticipated by the plan body itself. No scope creep. Logic identical to plan intent.

## Issues Encountered

None. All three tasks executed cleanly. byId's PUBLIC_DRESS_SELECT was verified at grep time to include every field DressDetailView reads — no addendum to the catalog select was needed (per plan's defensive instruction).

## User Setup Required

None - no external service configuration required for this plan.

Carried from prior phases (still pending):
- `BLOB_READ_WRITE_TOKEN` env still needed in local `.env` for image upload testing on `/admin/wardrobe/new` (carried from 13-02).

## Next Phase Readiness

**Phase 16 is one plan away from complete.** Plan 16-07 (CancelRequestButton) is the last remaining Wave 3 deliverable. It depends on 16-01 (wardrobe.requests router with the cancel mutation) and 16-03 (RentalStatusBadge for the adjacent status pill). Both deps are shipped.

**For Phase 17 (admin approval workflow):**
- Dress detail page is the visible surface students land on after CatalogGrid → DressCard navigation. Request-to-rent flow is wired end-to-end (CatalogGrid → DressCard → /wardrobe/[id] → Request to Rent button → RequestRentalDialog → wardrobe.requests.create mutation → in-app Notification to dress.ownerId).
- Approval flow can reuse `RentalStatusBadge` (16-03) for status display in the admin queue. The catalog already exposes PENDING-status dresses (PUBLIC_STATUSES from 15-01); admin queue surfaces pending RentalRequests against those dresses.
- `DressDetailView` composition root pattern is reusable for an admin "preview as student" view if needed for approval-flow QA.

**For Phase 18 (consigner self-listing):**
- `DressDetailHero` is now the reusable header primitive. Consigner-preview page can mount Hero with `isAuthenticated={false}` or with a different CTA (e.g. "Edit listing") — only the CTA branch needs to be parameterized further if a third option emerges.

**Blockers/concerns:** None new. Pre-existing IceParticles TypeScript blocker (three-types) is unrelated and out of scope for Phase 16. ERR_PNPM_IGNORED_BUILDS pnpm wrapper issue persists; `npx` invocations used throughout for type-check and lint.

---
*Phase: 16-dress-detail-rental-request*
*Plan: 06*
*Completed: 2026-05-29*
