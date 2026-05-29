---
phase: 17-admin-rental-lifecycle
plan: 05
subsystem: ui
tags: [next-app-router, page-shell, rentals, admin, wardrobe, brand-chrome]

# Dependency graph
requires:
  - phase: 17-admin-rental-lifecycle
    provides: RentalsTable composite (Plan 17-03) — Active + Returns-Due + Late Fee tabs with mark-returned / release-deposit / flag-late-fee mutations + invalidation
  - phase: 14-admin-wardrobe-inventory
    provides: /admin/wardrobe page shell ADR (14-06) — thin client shell pattern, no auth() / business logic in page, editorial header convention
  - phase: 04-app-shell
    provides: AdminLayout (/admin/layout.tsx) — role gate + AppLayout role="admin" chrome, applies to every route under (protected)/admin/
provides:
  - /admin/wardrobe/rentals route surface (RENTAL-04 + RENTAL-05 + RENTAL-06 + RENTAL-07)
  - Editorial Active Rentals header with back-link to /admin/wardrobe
  - Capstone surface for Phase 17 rental lifecycle (mark returned → release deposit → dress AVAILABLE; flag late fee)
affects:
  - Phase 20 (email notifications) — return reminders / overdue notices triggered by the mark-returned + flag-late-fee actions reachable from this page
  - Phase 22 (polish) — sidebar nav entry for /admin/wardrobe/rentals may land if usage frequency warrants

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thin client shell route file (\"use client\" + editorial header + single Wave 2 component) — third instance of the 14-06 ADR in Phase 17 (after 17-04 requests page; sibling to 14-06 /admin/wardrobe/new + /admin/wardrobe/[id]/edit + 14-06 wardrobe/settings)"

key-files:
  created:
    - src/app/(protected)/admin/wardrobe/rentals/page.tsx
  modified: []

key-decisions:
  - "Mirror /admin/wardrobe/settings page exactly: back-link with cyan #0891b2 hover, navy #1a3a5c h1, slate-500 subtitle, no nav-config edit"
  - "Cross-wave coordination: Plan 17-03 (RentalsTable composite) was still in flight at commit time — sub-components MarkReturnedDialog + RecordPaymentDialog had landed but the keystone RentalsTable.tsx hadn't shipped yet. Page committed first because (a) the file is structurally complete and verified independently (biome clean, structural grep passes, all 5 verify-step checks pass except tsc), (b) the only tsc error introduced is the cross-wave import (will resolve when 17-03 lands), (c) the commit is atomic and revertable. Same coordination state as Plan 17-04 vs Plan 17-02 (RequestQueueTable). Per critical notes: retry once after brief pause executed; RentalsTable still missing at retry; proceeded with commit per the wave-coordination contract."
  - "No /admin/wardrobe/rentals sidebar nav entry added (grep `rentals` src/lib/navigation-config.ts returns 0) — admins reach this page via in-page link from /admin/wardrobe per Phase 17 navigation convention (already established by Plan 17-04 requests page)"

patterns-established:
  - "Phase 17 'rental ops sub-routes under /admin/wardrobe/' pattern: /admin/wardrobe/requests (17-04) + /admin/wardrobe/rentals (17-05) both use the back-link-to-/admin/wardrobe header pattern. Future Phase 17/18/19 ops surfaces under /admin/wardrobe/* should follow."
  - "Cross-wave plan commit policy: Wave 3 page shells that import Wave 2 composites can commit safely as soon as the page file itself passes its independent verify-step checks (biome + structural grep). The cross-wave tsc error resolves when the Wave 2 composite lands. Avoids serializing Wave 3 behind Wave 2 unnecessarily."

# Metrics
duration: 2min
completed: 2026-05-29
---

# Phase 17 Plan 05: Admin Rentals Route Page Summary

**Thin client shell at `/admin/wardrobe/rentals` mounting Plan 17-03's RentalsTable inside the standard editorial header + back-link chrome — the route surface for RENTAL-04 + RENTAL-05 + RENTAL-06 + RENTAL-07.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-29T18:19:02Z
- **Completed:** 2026-05-29T18:21:04Z
- **Tasks:** 1
- **Files created:** 1

## Accomplishments

- `/admin/wardrobe/rentals` route created — thin client shell (27 lines post-Biome) composing RentalsTable inside the standard editorial header + back-link chrome
- Mirrors the /admin/wardrobe/settings page exactly (same header layout, same brand colors, same back-link target)
- Zero auth() calls, zero useQuery/useMutation/useState calls, zero nav-config edits — page is purely compositional per the 14-06 thin-shell ADR
- Brand-color audit clean: navy `#1a3a5c` on h1, cyan `#0891b2` on back-link hover (`grep -c "1a3a5c\\|0891b2"` = 2)
- Phase 17 capstone route surface ready: all 5 success criteria (request → approve → mark paid → rental created → mark returned → release deposit → dress AVAILABLE) now have routes once Wave 2 17-03 RentalsTable composite lands

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /admin/wardrobe/rentals/page.tsx** - `96a1279` (feat)

**Plan metadata:** (this docs commit)

## Files Created/Modified

- `src/app/(protected)/admin/wardrobe/rentals/page.tsx` (created, 27 lines post-Biome) — "use client" + editorial header (back-link + h1 + subtitle) + RentalsTable mount. Imports from `@/features/wardrobe/components/admin/RentalsTable` (Wave 2 17-03 keystone, still landing at commit time).

## Decisions Made

- **Mirror /admin/wardrobe/settings exactly**: same header skeleton (back-link with ArrowLeft icon + navy h1 + slate-500 subtitle), same brand colors, same back-link target (/admin/wardrobe). Visual coherence across all `/admin/wardrobe/*` sub-routes; user can navigate any of them via the same muscle memory.
- **No `<auth()>` call, no role guard** at page level — AdminLayout (/admin/layout.tsx) already gates the entire (protected)/admin/ route group via `<AppLayout role="admin">`. Adding auth here would be redundant and violate the 14-06 thin-shell ADR.
- **No filter / sort state at page level** — RentalsTable owns its own queries (`api.admin.wardrobeRentals.listRentals.useQuery` + tabs filter). Page is pure composition; RentalsTable is the controller.
- **No "create rental" CTA** — rentals are only created server-side via Plan 17-02's `markPaymentReceived` mutation reachable from the /admin/wardrobe/requests page. No direct-create button anywhere in the UI by design (rentals must originate from an approved request to preserve the audit chain).
- **No sidebar nav entry** — same reasoning as Plan 17-04 requests page. Admins reach /admin/wardrobe/rentals via an in-page link from /admin/wardrobe (Plan 17-03 RentalsTable adds the entry-point link). Sidebar real-estate is reserved for top-level admin sections; sub-routes use in-page navigation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Biome auto-format] Multi-line `<h1>` collapsed onto single line**
- **Found during:** Task 1 (Create page.tsx)
- **Issue:** Plan spec wrote the `<h1>` across 3 lines (open tag, "Active Rentals" text, close tag). Biome's printer prefers single-line JSX when the entire element fits within the 100-char width budget.
- **Fix:** `npx biome check --write` auto-collapsed `<h1 className="...">Active Rentals</h1>` onto one line. Logic untouched; visual output identical.
- **Files modified:** src/app/(protected)/admin/wardrobe/rentals/page.tsx
- **Verification:** Post-format file still passes all 5 verify-step grep checks; line count 27 (plan spec target was ~20-30).
- **Committed in:** `96a1279` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 Biome reflow)
**Impact on plan:** Zero — pure formatter convention, same family of deviation as 16-01/16-04/16-05/16-06/17-01 ADRs. Project formatter is canonical; line-count constraints should be interpreted post-format.

## Issues Encountered

- **Cross-wave race with Plan 17-03 RentalsTable composite**: at the time this page was committed (`96a1279`), Wave 2 Plan 17-03 had landed sub-components `RecordPaymentDialog.tsx` (commit `b5f7cc0`) and `MarkReturnedDialog.tsx` (untracked), but the keystone `RentalsTable.tsx` composite had not yet been written. The page's `import { RentalsTable } from "@/features/wardrobe/components/admin/RentalsTable"` therefore raises a single TS2307 error at type-check time. This was anticipated by the plan's critical-notes section ("If RentalsTable doesn't exist yet by type-check time, retry once after a brief pause") and is identical to the Wave 2 17-04 vs 17-02 RequestQueueTable coordination (visible as a sibling TS2307 in the same tsc output). The error will resolve automatically when 17-03 commits the RentalsTable.tsx file. Per the wave-coordination contract, this is NOT a Plan 17-05 deviation — it's expected cross-wave coordination state.
- **Pre-existing IceParticles three-types tsc blocker** (`src/components/landing/IceParticles.tsx`): documented since Plan 13-01; out of scope for this plan, surfaced in the same tsc run.

## User Setup Required

None — no external service configuration required. Live-route verification:

1. Sign in as admin.
2. Navigate to `/admin/wardrobe/rentals` (or click a future in-page link from /admin/wardrobe inventory once Plan 17-03 RentalsTable lands).
3. Confirm editorial header: navy "Active Rentals" h1, slate subtitle, cyan "Back to inventory" link.
4. Confirm RentalsTable renders Active + Late Fee tabs (validated against Plan 17-03 success criteria).
5. Confirm Mark Returned / Release Deposit / Flag Late Fee mutations are reachable from the per-row action menus.

## Next Phase Readiness

- **Phase 17 routes complete**: all UI surfaces (admin queue at /admin/wardrobe/requests via 17-04; admin rentals at /admin/wardrobe/rentals via 17-05) have route files. Wave 2 composites (RequestQueueTable from 17-02; RentalsTable from 17-03) will fill in the queries + mutations.
- **Phase 17 capstone success criteria fully verifiable** once 17-02 + 17-03 land: student requests dress (Phase 16) → admin approves at /admin/wardrobe/requests → admin marks paid at /admin/wardrobe/requests (RecordPaymentDialog from 17-03) → Rental row created with snapshotted fees (17-01) → admin sees row at /admin/wardrobe/rentals → admin marks returned (MarkReturnedDialog from 17-03) → dress stays RENTED → admin releases deposit → dress flips to AVAILABLE → audit chain (Request → Rental → returnedAt → depositReleasedAt) preserved end-to-end.
- **No blockers introduced** by this plan. The only outstanding tsc errors after this commit are: (a) the cross-wave RentalsTable import (resolves when 17-03 commits), (b) the cross-wave RequestQueueTable import in 17-04 (resolves when 17-02 commits), and (c) the pre-existing IceParticles three-types blocker (out of scope, documented since 13-01).
- **Phase 18 (consigner) readiness signal**: Phase 17's "thin client shell + Wave 2 composite" pattern is now battle-tested across three sub-routes (14-06 wardrobe/[id]/edit; 17-04 wardrobe/requests; 17-05 wardrobe/rentals). Phase 18 consigner ops surfaces (e.g., /consigner/dresses/[id]/edit) should mirror it.

---
*Phase: 17-admin-rental-lifecycle*
*Completed: 2026-05-29*
