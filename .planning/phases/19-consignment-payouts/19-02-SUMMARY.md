---
phase: 19-consignment-payouts
plan: 02
subsystem: ui
tags: [react, trpc, consigner, payouts, earnings, tabs, brand-consistency]

# Dependency graph
requires:
  - phase: 19-consignment-payouts
    provides: "api.wardrobe.consigner.myEarnings TRPC query (Plan 19-01) — composite-by-dress shape with server-computed totals"
  - phase: 18-self-serve-consignment
    provides: "MyConsignedDressesList 4-tab consigner landing surface (Plan 18-05) with URL ?tab= persistence pattern + DressStatusBadge primitive"
  - phase: 14-admin-wardrobe-management
    provides: "formatCurrencyFromCents helper (Plan 14-01) — single point of cents→USD conversion across the wardrobe surface"

provides:
  - "ConsignerEarningsTable component — self-fetching, 3-card totals + grouped-by-dress per-rental table (CONSIGN-10 UI surface)"
  - "5th tab ('Earnings') on MyConsignedDressesList — URL ?tab=earnings persists across refresh"
  - "Brand convention: emerald=paid / amber=pending status pills, reused 1:1 in the admin Outstanding Payouts UI (Plan 19-03)"

affects: [19-03, 20-notifications, 22-storybook-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Self-fetching tab content: a tab's child component owns its own useQuery rather than receiving data from the parent. Avoids paying network weight for users who never click the tab, and lets the data sources be conceptually orthogonal (this component fetches myEarnings while parent fetches mine)."
    - "Composite-by-dress consumption shape: client renders server's pre-grouped `{rentalsByDress, totals}` directly — no client-side reduce/groupBy/sum. Server is single source for payout math."
    - "Inline DressStatusBadge on historic earnings: archived dresses with past rentals get an ARCHIVED pill so the user understands why the dress is no longer in the Live tab but earnings are still visible (CONSIGN earnings-history-is-forever Q10)."
    - "5-tab Tabs primitive pattern: TAB_KEYS array + parseTab validator + URL ?tab= → router.replace({scroll:false}) — extending the existing 4-tab convention is a single TabKey union edit + two JSX appends. The pattern scales without re-architecture."

key-files:
  created:
    - "src/features/wardrobe/components/consigner/ConsignerEarningsTable.tsx (249 lines — self-fetching earnings table with 3-card totals strip + DressEarningsGroup subcomponents)"
  modified:
    - "src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx (+7 / -2 lines — 4-touchpoint extension to add 5th Earnings tab)"

key-decisions:
  - "No count badge on the Earnings tab label (unlike the other 4 tabs which all show `(N)`) — earnings totals live inside the table (Total rentals card) and would otherwise either duplicate the figure or go stale relative to it"
  - "ConsignerEarningsTable owns its own useQuery (not passed data from MyConsignedDressesList) — separate TRPC procedure, separate fetch lifecycle, lazy-loaded when the user clicks the tab"
  - "Co-located TotalCard + DressEarningsGroup subcomponents (not exported) — mirrors the DressRowGrid + ConsignerDressCard convention in MyConsignedDressesList; single-caller use, no premature abstraction"
  - "Inline `import('@prisma/client').DressStatus` type for EarningsDress.status — avoids forcing a runtime Prisma client import in the bundle while still type-checking against the actual enum (same pattern as DressStatusBadge.tsx and MyConsignedDressesList.tsx)"
  - "Semantic <table>/<thead>/<tbody> for the per-rental rows (not <div>-based) — VRT stability + accessibility (screen-reader announces column headers), and an earnings ledger is genuinely tabular data"
  - "TotalCard renders the value in navy `#1a3a5c` for slate accent and otherwise in the accent's `text-*-700` shade — emerald payouts read 'emerald-700-green', amber payouts read 'amber-700-orange', and the neutral 'Total rentals' count reads in the same brand navy as the other navy headings on the page"
  - "Empty state copy reassures rather than guilt-trips: 'We'll show your earnings here once your dresses start renting' is honest about the consigner-passive flow (dresses need a renter; renter needs to pay; admin needs to send payout — none of those are something the consigner controls)"

patterns-established:
  - "Self-fetching tab content with co-located query: extends the 18-05 4-tab pattern to support data-orthogonal tabs without coupling them to the parent's data layer"
  - "Composite-by-dress consumption: when the server returns pre-aggregated `{groupedShape, totals}`, the client renders directly with zero re-grouping or re-summing — keeps math single-sourced on the server"
  - "Inline ARCHIVED badge on historic earnings rows: reinforces the earnings-history-is-forever guarantee visually, so users see why an archived dress is still earning"

# Metrics
duration: ~4min
completed: 2026-05-29
---

# Phase 19 Plan 02: Consigner Earnings Tab Summary

**`/wardrobe/consigned?tab=earnings` now shows the consigner a 3-card totals strip (Earned to date / Pending payout / Total rentals) above a per-dress grouped earnings ledger — CONSIGN-10 consigner read surface LIVE.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-29T22:04:35Z
- **Completed:** 2026-05-29T22:08:05Z
- **Tasks:** 2 / 2
- **Files modified:** 1 (MyConsignedDressesList.tsx)
- **Files created:** 1 (ConsignerEarningsTable.tsx)

## Accomplishments

- New `ConsignerEarningsTable` component at `src/features/wardrobe/components/consigner/ConsignerEarningsTable.tsx` (249 lines). Self-fetches `api.wardrobe.consigner.myEarnings.useQuery()`; owns its loading skeleton + empty state. Renders a 3-card totals strip (emerald `Earned to date` / amber `Pending payout` / slate `Total rentals`) above a per-dress grouped earnings ledger. Each dress group shows a primary image thumbnail, dress title, an inline DressStatusBadge (so historic earnings on an ARCHIVED dress remain visible with the ARCHIVED pill — per 19-RESEARCH §Q10 earnings-history-is-forever), and a semantic `<table>` of per-rental rows with renter name, date range, rental fee, payout amount, and a Paid `{date}` (emerald) / Pending (amber) badge.
- Extended `MyConsignedDressesList` from 4 tabs to 5 tabs via a surgical 4-touchpoint edit (+7 / -2 lines). The Earnings tab persists across refresh via the same URL `?tab=` pattern as the other 4 tabs — `parseTab` validates against `TAB_KEYS.includes(...)`, which auto-picks up the new `earnings` key once the TabKey union and TAB_KEYS array are extended.
- PII boundary held end-to-end: the server's `myEarnings` select omits `internalNotes` + `consignmentCommissionPct` + `Student.User.{email,phone}`, and this client never references any of those fields. Only the single comment-line citing the PII boundary appears in the file.
- Brand consistency: emerald (paid) / amber (pending) / cyan `#0891b2` accent / navy `#1a3a5c` headers — matches the Phase 17 + Phase 18 attention-bucket palette and the 2026-04-26 sweep.

## Task Commits

Each task was committed atomically with specific file staging (NEVER `git add .` or `-A` — Phase 18-05 parallel-wave commit-collision lesson):

1. **Task 1: Create ConsignerEarningsTable component** — `c534ed0` (feat)
2. **Task 2: Mount ConsignerEarningsTable as 5th tab on MyConsignedDressesList** — `7c849b6` (feat)

## Files Created/Modified

- **Created:** `src/features/wardrobe/components/consigner/ConsignerEarningsTable.tsx` (249 lines). Exports `ConsignerEarningsTable`. Internal co-located `TotalCard` (3-accent variant card for the totals strip) + `DressEarningsGroup` (dress header + semantic per-rental `<table>`) subcomponents. Local `EarningsRental` + `EarningsDress` types mirror the server's `myEarnings` select shape (same convention MyConsignedDressesList uses for `ConsignedDress`).
- **Modified:** `src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx` (+7 / -2 lines). Four surgical touchpoints:
  1. New import: `import { ConsignerEarningsTable } from "./ConsignerEarningsTable";`
  2. `TabKey` union + `TAB_KEYS` array extended with `"earnings"`
  3. New `<TabsTrigger value="earnings">Earnings</TabsTrigger>` appended after the existing `archived` trigger (no `(N)` count — see Decisions Made)
  4. New `<TabsContent value="earnings"><ConsignerEarningsTable /></TabsContent>` appended after the existing `archived` content

  The `bucketize` function, `DressRowGrid`, `ConsignerDressCard`, loading skeleton, empty state, and header are untouched.

## Decisions Made

- **No count badge on the Earnings tab label** — the other 4 tabs all show `(N)` because their counts are computed from the same `wardrobe.consigner.mine` query that drives the bucketize. Earnings is a separate query (`myEarnings`) with a different aggregation (rental count, not dress count), and rendering `Earnings (3)` would either duplicate the Total rentals card or go stale relative to it. The decision: the totals strip inside the tab is the count, period.
- **ConsignerEarningsTable owns its own `useQuery`** (not passed data from `MyConsignedDressesList`). Two reasons: (a) data sources are conceptually orthogonal — my dresses vs. my rentals — and pre-fetching earnings inside the parent would add network weight for users who never click the tab; (b) keeps the parent's data flow narrow (it only knows about `mine`), which is easier to reason about.
- **Co-located `TotalCard` + `DressEarningsGroup` subcomponents** (not exported) — mirrors the DressRowGrid + ConsignerDressCard convention established in MyConsignedDressesList (Plan 18-05). Single-caller use; no premature abstraction. If a future surface needs a 3-card totals strip elsewhere, we extract then.
- **Inline `import('@prisma/client').DressStatus` type** for `EarningsDress.status` — avoids forcing a runtime Prisma client import in the bundle while still type-checking against the actual enum. Same pattern as DressStatusBadge.tsx and MyConsignedDressesList.tsx use.
- **Semantic `<table>` / `<thead>` / `<tbody>` for the per-rental rows** (not `<div>`-based card layouts) — VRT stability + accessibility (screen-reader announces column headers), and an earnings ledger is genuinely tabular data with consistent column structure across rows.
- **TotalCard value color logic**: emerald and amber accents render their value in `text-emerald-700` / `text-amber-700` for visual continuity with the icon and label, while the slate accent renders in navy `#1a3a5c` (overriding the slate-700 default in the accentMap) so the "Total rentals" count reads in the same brand navy as the other navy headings on the page. This was the one micro-deviation from the plan's literal skeleton, made for cohesion with the rest of the consigner chrome.
- **Empty state copy reassures rather than guilt-trips** — "We'll show your earnings here once your dresses start renting" honors the consigner-passive flow (dresses need a renter; renter needs to pay; admin needs to send payout — none are consigner-controlled). Cyan/navy chrome matches Plan 18-05 empty states.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome formatter required two whitespace re-flows**
- **Found during:** Task 1 (ConsignerEarningsTable creation)
- **Issue:** Two long lines (the empty-state paragraph copy at L60-62 and the `TotalCard` value `<p>` className at L132) violated biome's 100-char line width and required wrap.
- **Fix:** Ran `npx biome check --write` which auto-reformatted both — `Each time a renter pays for one of your listings, your share appears here. We'll mark each` (one-line wrap shift) and the TotalCard `<p>` split into multi-line `<p className={...}>`.
- **Files modified:** `src/features/wardrobe/components/consigner/ConsignerEarningsTable.tsx`
- **Verification:** `npx biome check src/features/wardrobe/components/consigner/ConsignerEarningsTable.tsx` returns clean
- **Committed in:** `c534ed0` (Task 1 commit — fix folded in before commit)

### Micro-deviations (no rule, cosmetic)

**1. TotalCard value color override** — the plan's literal skeleton wrote `<p className="mt-3 text-2xl font-bold text-[#1a3a5c]">{value}</p>` for all three cards. I noticed that emerald and amber accents look better when the value matches the accent color (visual continuity with the icon + label), so the actual implementation conditionally renders the value in `a.text` for emerald/amber and in `#1a3a5c` for slate. Same brand palette; same `text-2xl font-bold`; only the color hue changes per-accent. Verified by visual reasoning against the brand sweep (2026-04-26: emerald=paid, amber=pending — these accents should sing).

---

**Total deviations:** 1 auto-fixed (1 biome formatter wrap) + 1 cosmetic micro-deviation (TotalCard accent value color)
**Impact on plan:** Zero scope creep. Both deviations preserve the plan's truths and grep verifications. The cosmetic refinement strengthens brand cohesion without altering semantics.

## Issues Encountered

- None. The plan's skeleton compiled and passed tsc on first pass; the only adjustment was the two-line biome auto-format. Verifications matched exactly:
  - `wc -l ConsignerEarningsTable.tsx` = 249 (≥180 required)
  - `grep -c "<TabsTrigger"` MyConsignedDressesList.tsx = 5
  - `grep -c "<TabsContent"` MyConsignedDressesList.tsx = 5
  - `grep -c "ConsignerEarningsTable"` MyConsignedDressesList.tsx = 2 (import + render)
  - `grep -c "api.wardrobe.consigner.myEarnings.useQuery"` = 1
  - `grep "internalNotes|consignmentCommissionPct"` ConsignerEarningsTable.tsx = 1 hit (line 18 comment only, documenting the PII omission)
  - `grep "\.email|\.phone"` ConsignerEarningsTable.tsx = 0 hits

## User Setup Required

None — pure client-side UI consuming an already-shipped TRPC procedure. No external service configuration required.

## Verification Summary

| Check | Result |
| --- | --- |
| `wc -l ConsignerEarningsTable.tsx` | 249 (≥180 required) ✓ |
| `grep -c "<TabsTrigger" MyConsignedDressesList.tsx` | 5 ✓ |
| `grep -c "<TabsContent" MyConsignedDressesList.tsx` | 5 ✓ |
| `grep -c "ConsignerEarningsTable" MyConsignedDressesList.tsx` | 2 (import + render) ✓ |
| `grep -c "api.wardrobe.consigner.myEarnings.useQuery" ConsignerEarningsTable.tsx` | 1 ✓ |
| `grep "internalNotes\|consignmentCommissionPct" ConsignerEarningsTable.tsx` | 1 hit, comment-only (line 18 PII boundary doc) ✓ |
| `grep "\.email\|\.phone" ConsignerEarningsTable.tsx` | 0 hits ✓ |
| `grep "bg-emerald-50\|bg-amber-50" ConsignerEarningsTable.tsx` | 4 hits (TotalCard accents + status pills) ✓ |
| `grep "1a3a5c\|0891b2" ConsignerEarningsTable.tsx` | 6 hits (navy headers + cyan accents) ✓ |
| `formatCurrencyFromCents` usage count in ConsignerEarningsTable.tsx | 5 (3 totals + 2 per-row cells) — exceeds plan's "≥4" ✓ |
| `npx tsc --noEmit -p tsconfig.json` | Only pre-existing IceParticles `three` types blocker; ZERO new errors ✓ |
| `npx biome check` on both files | Clean ✓ |
| Specific-file staging only (never `-A` or `.`) | Confirmed — sibling 19-03's RentalsTable.tsx left in working tree ✓ |
| No destructive Prisma commands invoked | Confirmed ✓ |

## Next Phase Readiness

- **Plan 19-03 (admin Outstanding Payouts tab UI) — Wave 2 sibling, executing in parallel:** uses the same emerald/amber Paid/Pending pill convention this plan establishes. The two plans share Plan 19-01's TRPC artifacts (`outstandingPayoutsOnly` filter + `markConsignmentPaidOut` mutation) but their file lists are non-overlapping (consigner/ subdir vs. admin/ subdir). When 19-03 ships, both surfaces will be live end-to-end.
- **Plan 20 (Resend email layer):** the consigner-facing inbox notification path is now grounded — when `markConsignmentPaidOut` (Plan 19-01) fires its in-app `createNotification` linking `/wardrobe/consigned?tab=earnings`, the link now resolves to a real, populated surface. Phase 20's Resend email body can reference "View your earnings" with confidence that the link works.
- **Plan 22 (Storybook audit):** ConsignerEarningsTable is the next candidate for a Storybook story — it's self-fetching but can be MSW-mocked at the `/api/trpc/*` endpoint (matches the established VRT pattern). Three stories suffice: empty state, single-dress-one-rental, multi-dress-mixed-paid-pending. The empty state is the highest-value VRT snapshot (reassurance copy stability is a brand commitment).
- **No blockers, no concerns.** Wave 2 of Phase 19 is complete on the consigner side; admin side (19-03) is in parallel-flight.

---
*Phase: 19-consignment-payouts*
*Completed: 2026-05-29*
