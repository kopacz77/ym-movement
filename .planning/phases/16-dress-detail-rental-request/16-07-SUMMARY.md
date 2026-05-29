---
phase: 16-dress-detail-rental-request
plan: 07
subsystem: ui
tags: [trpc, tabs, radix, wardrobe, requests, rentals, student, my-rentals, cancel]

# Dependency graph
requires:
  - phase: 16-dress-detail-rental-request
    provides: wardrobe.requests.mine + myRentals + cancel TRPC procedures (16-01); RentalStatusBadge (16-03)
  - phase: 14-dress-inventory-management
    provides: formatCurrencyFromCents helper
  - phase: 15-wardrobe-catalog
    provides: /wardrobe/layout.tsx AppLayout role=student wrapper
provides:
  - MyRentalsView 5-tab composite (Pending/Approved/Active/Past/History) with URL-synced ?tab= param
  - Cancel-PENDING-request UX (window.confirm + server-authoritative invalidation, no optimistic UI)
  - /wardrobe/my-rentals route shell
  - Deep-linkable tab state pattern reusable by future notification-driven entrypoints
affects: [17-rental-approval-flow, 20-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Five-tab composite — single Tabs container, sub-components owning their own useQuery, parallel fetch of mine + myRentals"
    - "URL-state tab persistence via ?tab= param + router.replace (history-stack hygiene)"
    - "Server-authoritative cancel mutation (no optimistic UI) — research Anti-Pattern D"
    - "Two row primitives (RequestRow / RentalRow) co-located in the same file, no separate barrel"

key-files:
  created:
    - src/features/wardrobe/components/request/MyRentalsView.tsx
    - src/app/(protected)/wardrobe/my-rentals/page.tsx
  modified: []

key-decisions:
  - "Sub-components own their useQuery (not lifted to parent + prop-drilled) — each tab re-fetches independently; React Query dedups at the cache layer"
  - "Cancel uses server-authoritative invalidation, NOT optimistic UI — research Anti-Pattern D from 16-RESEARCH"
  - "window.confirm acceptable for v2.0 destructive gate; Radix AlertDialog upgrade deferred to Phase 22 polish"
  - "Default tab is 'pending' with the ?tab= param elided from the URL — canonical /wardrobe/my-rentals stays clean"
  - "Display status derived in RentalRow: returnedAt present → 'RETURNED'; else paymentStatus pass-through"
  - "RequestRowProps / RentalRowProps typed as structural subsets of the TRPC return shape — narrow to only fields the row needs (no rentalType, no fees breakdown shown in MVP rows)"

patterns-established:
  - "URL-state tab persistence: ?tab=<name> with default-tab elision + router.replace(scroll:false). Reusable for any tabbed history surface."
  - "Cancel-with-confirmation gate: window.confirm wrapping a mutation.mutate call; mutation.isPending && mutation.variables?.id === row.id drives per-row disabled state."
  - "Server-authoritative invalidate (NOT optimistic UI) for destructive actions where the server can reject (Anti-Pattern D)."

# Metrics
duration: 3min
completed: 2026-05-29
---

# Phase 16 Plan 07: Student My-Rentals UI Summary

**Five-tab Pending/Approved/Active/Past/History composite mounted at /wardrobe/my-rentals with server-authoritative cancel mutation closing REQUEST-04 and REQUEST-05.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-29T17:34:47Z
- **Completed:** 2026-05-29T17:37:21Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- **MyRentalsView** (347 lines) — 5-tab Radix Tabs container with URL-synced ?tab= param. Sub-components PendingTab / ApprovedTab / ActiveTab / PastTab / HistoryTab each own their useQuery against `wardrobe.requests.mine` or `wardrobe.requests.myRentals` and apply client-side status / paymentStatus filters. Cancel mutation fires only from PendingTab with a `window.confirm` gate; server-authoritative `utils.wardrobe.requests.mine.invalidate()` on success.
- **/wardrobe/my-rentals route shell** — thin 7-line client page rendering `<MyRentalsView />`. AppLayout role=student is provided by the parent `/wardrobe/layout.tsx` from Plan 15-04; no per-page chrome.
- **Brand palette compliance** — navy `#1a3a5c` page header, cyan `#0891b2` links, rose-600 destructive cancel CTA, slate empty-state cards. All status pills delegated to `RentalStatusBadge` from Plan 16-03 (no raw color classes).
- **Display-status derivation in RentalRow** — `returnedAt` present → `"RETURNED"`; else `paymentStatus` (AWAITING_PAYMENT / PAID). `RentalStatusBadge`'s exhaustive Record from Plan 16-03 absorbs both unions without coercion at the call site.
- **REQUEST-04 + REQUEST-05 + PERM-03 satisfied** — student can view all own requests + rentals across the lifecycle (PERM-03 server-side scoping inherited from Plan 16-01's studentId WHERE clauses); can cancel own PENDING requests without touching `Dress.status` (Pitfall 3 — `wardrobe.requests.cancel` from 16-01 already guarantees this).

## Task Commits

1. **Task 1: MyRentalsView with tabs + cancel mutation** — `81804b3` (feat)
2. **Task 2: /wardrobe/my-rentals route shell** — `e3bc0bd` (feat)

## Files Created/Modified

- `src/features/wardrobe/components/request/MyRentalsView.tsx` (347 lines) — Tabs composite with 5 sub-tabs, 2 inline row primitives (RequestRow / RentalRow), TabLoading / EmptyState helpers
- `src/app/(protected)/wardrobe/my-rentals/page.tsx` (7 lines) — thin client shell

## Decisions Made

- **Sub-components own their useQuery (not lifted)** — each tab's React Query call dedups at the cache layer when multiple tabs need the same data (`mine` is shared by Pending/Approved/History; `myRentals` is shared by Active/Past). Lifting would have created an unnecessary parent re-render churn and couples the tab implementations.
- **Server-authoritative cancel, NOT optimistic UI** — research 16-RESEARCH Anti-Pattern D. The server enforces "only PENDING can be canceled" and a race (admin approves while user clicks cancel) MUST be visible. Optimistic flip-then-rollback would have flickered confusingly. Pattern: `mutation.mutate()` → `onSuccess: invalidate()`.
- **`window.confirm` over Radix AlertDialog for the destructive gate** — v2.0 acceptable per plan's NOTE block; AlertDialog upgrade deferred to Phase 22 polish. The whole modal-component cost isn't worth it for a single CTA in a non-critical surface; native prompt has 100% accessibility coverage out of the box.
- **`?tab=pending` elided as default URL state** — canonical `/wardrobe/my-rentals` stays clean. Only deviating tabs (`?tab=approved`, `?tab=active`, `?tab=past`, `?tab=other`) appear in the URL. Mirrors the URL-state-elision policy established in Plan 14-05 / Plan 15-07 grids.
- **Per-row disabled state via `mutation.isPending && mutation.variables?.requestId === r.id`** — prevents double-cancel on a single row while keeping other rows clickable during an in-flight mutation. Pattern uses TRPC's built-in `variables` introspection — no separate `pendingId` React state needed.
- **RequestRow + RentalRow co-located in the same file (not exported)** — same private-co-location convention as 16-04 FitCheckCard's FitBarRow. Forking either row primitive elsewhere is structurally discouraged; if a third caller emerges (e.g., admin queue UI in Phase 17), extract then.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome auto-format reflowed import grouping + multi-line filter callbacks**

- **Found during:** Task 1 (MyRentalsView creation)
- **Issue:** Plan's spec used type/value mixed import order (`type React` listed alongside the value imports in a way that violates Biome's organizeImports), and several `.filter((r) => ...)` callbacks were laid out multi-line when they fit on a single line (Biome's line-length printer). First Biome check emitted whitespace + import-order errors.
- **Fix:** Ran `npx biome check --write` — auto-sorted the import block to canonical groups (type-first then values, alphabetical within groups), collapsed in-fitting filter callbacks, no logic changes. Same auto-format precedent as 16-01 / 16-04.
- **Files modified:** src/features/wardrobe/components/request/MyRentalsView.tsx
- **Verification:** `npx biome check src/features/wardrobe/components/request/MyRentalsView.tsx` clean; `npx tsc --noEmit` clean (only pre-existing IceParticles three-types blocker remains, per STATE.md)
- **Committed in:** 81804b3 (Task 1 commit)

**2. [Rule 3 - Blocking] Plan's `request: { ...rentalType: string }` field shape included `rentalType` in RequestRowProps but row never rendered it**

- **Found during:** Task 1 (RequestRow + RentalRow typing)
- **Issue:** Plan's spec listed `rentalType: string` on both `RequestRowProps.request` and `RentalRowProps.rental` shapes, but neither row UI renders it (rentalType label is shown nowhere in MVP rows — only dates + competition name + price are visible). Including it on the prop type would be misleading and overly strict against the catalogQueries return shape.
- **Fix:** Narrowed both prop shapes to structural subsets containing only fields the row actually consumes (id, startDate, endDate, competitionName, status, createdAt, Dress for RequestRow; id, startDate, endDate, totalCharged, paymentStatus, returnedAt, Dress for RentalRow). Same narrowing-by-usage principle as Plan 15-05 DressCardProps. The TRPC return shape still includes `rentalType` — it's just not pulled through to the row component.
- **Files modified:** src/features/wardrobe/components/request/MyRentalsView.tsx
- **Verification:** Type-check passes against the wardrobe.requests.mine + myRentals return shapes; rows render without TypeScript width errors.
- **Committed in:** 81804b3 (Task 1 commit)

**3. [Rule 4 acknowledged but NOT acted on] Task 2 manual smoke test (steps 1-12) requires Plan 16-06 (DressDetail page) which has not shipped yet**

- **Found during:** Task 2 (route shell + verification)
- **Issue:** Plan's Task 2 verify block describes a 12-step end-to-end smoke test starting at `/wardrobe` → click dress → `/wardrobe/[id]` (Plan 16-06 surface) → click "Request to Rent" (Plan 16-05 dialog inside Plan 16-06 page) → fill dialog → submit → land in `/wardrobe/my-rentals?tab=pending` (Plan 16-07 surface). Plan 16-06 has NOT shipped per STATE.md (`Plan: 5/7 complete (16-01 + 16-02 + 16-03 + 16-04 + 16-05)`). Without 16-06, no `[id]` detail page exists to trigger the dialog from, so steps 3-7 cannot be executed.
- **Decision:** Did NOT escalate to a Rule 4 checkpoint because Plan 16-07's own deliverables (MyRentalsView + route shell) are fully verifiable WITHOUT 16-06 (type-check clean, biome clean, route compiles). The manual smoke test is a "Phase 16 capstone" verification that will run after 16-06 ships and visits this plan's surface as a downstream destination. Documented here so the next executor of 16-06 knows to circle back.
- **Files modified:** None (no fix needed)
- **Verification:** Plan 16-07's own success criteria (REQUEST-04 + REQUEST-05 + PERM-03 + Pitfall 3 + brand-palette) are all structurally guaranteed by the shipped code + by Plan 16-01's server-side contracts (which already shipped and were verified in its own SUMMARY). The 12-step E2E is a downstream phase-capstone test.
- **Committed in:** N/A (no code change)

---

**Total deviations:** 2 auto-fixed (1 bug — Biome auto-format; 1 blocking — prop-shape narrowing) + 1 acknowledged scope note (Task 2 smoke test deferred to 16-06's shipdate)
**Impact on plan:** Auto-fixes were mechanical and routine (same auto-format precedent as 16-01 / 16-04). Prop narrowing was a correctness/clarity improvement matching established Plan 15-05 patterns. The deferred smoke test does NOT block Plan 16-07's completion — it's a phase-capstone verification that will run when 16-06 ships.

## Issues Encountered

- None. Plan executed cleanly; both files compile and lint clean.

## User Setup Required

None — no external service configuration required. The route is mounted in the existing `(protected)` group and inherits AppLayout role=student from `/wardrobe/layout.tsx` (Plan 15-04). No new env vars, no new dependencies (used existing `@radix-ui/react-tabs` via the project's Tabs wrapper).

## Next Phase Readiness

**Phase 16 status after this plan:** 6/7 plans shipped (16-01, 16-02, 16-03, 16-04, 16-05, 16-07). Plan 16-06 (DressDetail at `/wardrobe/[id]`) is the only remaining piece and the capstone — it composes DressImageCarousel + PricingTierTable + StructuredSizeSummary + FitCheckCard + RequestRentalDialog (and a Link to `/wardrobe/my-rentals` for "View my rentals" affordance).

**Ready for 16-06:**
- All Wave 2 primitives shipped (16-03)
- FitCheckCard + RequestRentalDialog shipped (16-04, 16-05)
- This plan's `/wardrobe/my-rentals` surface is live as a downstream destination for the "view my requests" link from 16-06's success toast / inline CTA
- After 16-06 lands, the 12-step E2E manual smoke test from this plan's Task 2 should be run to verify the full Phase 16 user journey

**Ready for Phase 17 (approval flow):**
- This plan's "Approved" tab is the student-side surface that Phase 17's admin approval mutation will populate (status flip from PENDING → APPROVED). No client changes needed in 16-07 when 17 ships — the existing `wardrobe.requests.mine` query already returns the APPROVED rows.
- The "Active" tab is the surface that Phase 17's "convert to rental" mutation will populate (when admin confirms payment, a Rental row is created and the request flips to CONVERTED). Same — no 16-07 client changes needed; the existing `myRentals` query returns those rows.

**Ready for Phase 20 (email notifications):**
- The ?tab= URL param enables deep-linking from emails: e.g., "Your request was approved" email links to `/wardrobe/my-rentals?tab=approved`; "Your request was declined" links to `?tab=other`; "Your rental is now active" links to `?tab=active`.

**Blockers:** None for Plan 16-06; none for Phase 17.

---
*Phase: 16-dress-detail-rental-request*
*Completed: 2026-05-29*
