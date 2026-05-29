---
phase: 19-consignment-payouts
verified: 2026-05-29T22:30:00Z
status: passed
score: 5/5 must-haves verified
human_verification_deferred:
  - test: "Navigate to /wardrobe/consigned?tab=earnings as a consigner who has rentals"
    expected: "5th tab activates, totals strip shows earned/pending/total counts, dresses grouped with per-rental rows showing renter name + dates + fee + payout amount + paid/pending badge"
    why_human: "Requires authenticated browser session + seeded consigner-owned rentals with payout amounts to render meaningfully"
  - test: "Navigate to /admin/wardrobe/rentals, click Outstanding Payouts tab, click Mark Payout Sent on a row"
    expected: "Confirmation toast shows consigner name + payout amount + dress title; on confirm, row disappears from Outstanding Payouts and Paid badge appears on consigner earnings view; double-click is blocked by isPending disabled state"
    why_human: "Requires live mutation execution against seeded data + visual confirmation of toast/badge state transitions"
  - test: "Trigger the BAD_REQUEST idempotency rejection (e.g., mark same rental twice via API client or rapid double-fire)"
    expected: "toast.error displays 'Payout already marked as sent' verbatim with no stack trace"
    why_human: "Requires deliberate race-condition trigger against a live mutation endpoint"
---

# Phase 19: Consignment Payouts Verification Report

**Phase Goal:** Consigners see their earnings; admin tracks which payouts have been sent.
**Verified:** 2026-05-29T22:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `api.wardrobe.consigner.myEarnings` returns caller-owned dresses with rentals + server totals | VERIFIED | `consignerQueries.ts:354-427` — `ownerId: ctx.session.user.id` WHERE clause, composite-by-dress shape, server-computed `earnedToDate`/`pendingPayout`/`rentalCount` |
| 2 | PII boundary holds: myEarnings response NEVER includes internalNotes or consignmentCommissionPct | VERIFIED | `consignerQueries.ts:365-394` — select block omits both; Student.User.name only (no email/phone) |
| 3 | `api.admin.wardrobeRentals.markConsignmentPaidOut` has 3 defensive checks + atomic update + in-app notification | VERIFIED | `wardrobeRequestQueries.ts:628-685` — NOT_FOUND, BAD_REQUEST (null amount), BAD_REQUEST (already paid), `update({consignmentPaidOut: true, consignmentPaidOutAt: new Date()})`, try/catch createNotification |
| 4 | `listRentals` accepts `outstandingPayoutsOnly` filter + exposes payout columns + Dress.Owner | VERIFIED | `wardrobeRequestQueries.ts:384, 416-426, 443` — input schema field, conditional WHERE clause, Owner include |
| 5 | UI surfaces: ConsignerEarningsTable + 5th Earnings tab + 3rd Outstanding Payouts tab + Mark Payout Sent button | VERIFIED | Component renders + tabs wired + button conditional + showConfirmationToast handler all present |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/features/wardrobe/api/queries/consignerQueries.ts` | Extends consignerRouter with myEarnings | VERIFIED | 428 lines; `myEarnings: protectedProcedure.query` at line 354; exported via `src/features/wardrobe/api/queries/index.ts:29` as `consigner: consignerRouter` |
| `src/features/admin/api/queries/wardrobeRequestQueries.ts` | Extends wardrobeRentalRouter with markConsignmentPaidOut + listRentals input/where/include | VERIFIED | 686 lines; mutation at line 628, input schema at line 398, listRentals where extension at line 416, Owner include at line 443; exported via `src/features/admin/api/queries/index.ts:26` as `wardrobeRentals: wardrobeRentalRouter` |
| `src/features/wardrobe/components/consigner/ConsignerEarningsTable.tsx` | New self-fetching consigner earnings table + 3-card totals summary | VERIFIED | 249 lines (exceeds 180 min); calls `api.wardrobe.consigner.myEarnings.useQuery()` at line 30; uses `formatCurrencyFromCents` 4× at lines 74, 80, 222, 225; uses DressStatusBadge at line 193; emerald/amber palette confirmed; brand cyan/navy hex confirmed |
| `src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx` | Extended 5-tab consigner landing surface | VERIFIED | 279 lines; ConsignerEarningsTable imported line 40; TAB_KEYS extended to include 'earnings' line 69; 5 TabsTriggers (lines 175-179); 5 TabsContents (lines 182-196); URL state inherited via existing parseTab/useSearchParams pattern |
| `src/features/wardrobe/components/admin/RentalsTable.tsx` | Extended admin rentals table with Outstanding Payouts tab + per-row Mark Payout Sent action | VERIFIED | 532 lines; 3 TabsTriggers (lines 233, 237, 241); `outstandingPayoutsOnly: true` query at line 123; `markConsignmentPaidOut.useMutation` at line 150; `handleMarkPayoutSent` at line 210; per-row button with `bg-cyan-600 hover:bg-cyan-700`, conditional on `consignmentPayoutAmount != null && !consignmentPaidOut`, `disabled={markPayoutSent.isPending}` |

All artifacts: EXISTS + SUBSTANTIVE + WIRED.

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| consignerQueries.ts | Dress.ownerId scoping | WHERE clause in myEarnings | WIRED | `ownerId: ctx.session.user.id` at line 357 (third occurrence in file, alongside existing mine/byId) |
| wardrobeRequestQueries.ts | createNotification | post-update try/catch targeting Dress.Owner.id | WIRED | Lines 672-682: try { await createNotification({ userId: rental.Dress.Owner.id, ... }) } catch — non-blocking, link to `/wardrobe/consigned?tab=earnings` |
| wardrobeRequestQueries.ts | listRentals WHERE clause | conditional WHERE on outstandingPayoutsOnly flag | WIRED | Lines 416-426: ternary on input.outstandingPayoutsOnly applies `consignmentPayoutAmount: {not: null}, consignmentPaidOut: false` |
| ConsignerEarningsTable.tsx | api.wardrobe.consigner.myEarnings | useQuery on mount | WIRED | Line 30: `api.wardrobe.consigner.myEarnings.useQuery()` |
| MyConsignedDressesList.tsx | ConsignerEarningsTable | import + render in TabsContent value='earnings' | WIRED | Import line 40, render line 195 inside TabsContent value='earnings' |
| ConsignerEarningsTable.tsx | formatCurrencyFromCents | import from @/lib/utils + 4 call sites | WIRED | Import line 27; calls at lines 74, 80, 222, 225 — no client-side division-by-100 anywhere |
| RentalsTable.tsx | api.admin.wardrobeRentals.markConsignmentPaidOut | useMutation with onSuccess invalidate | WIRED | Line 150 `useMutation`; onSuccess invalidates `utils.admin.wardrobeRentals.listRentals` + toast.success |
| RentalsTable.tsx | api.admin.wardrobeRentals.listRentals | useQuery with outstandingPayoutsOnly flag | WIRED | Line 123: `outstandingPayoutsOnly: true` in the 3rd-tab query |
| handleMarkPayoutSent | showConfirmationToast | imported from @/lib/toast-confirmations | WIRED | Import line 57, called at line 217 with title/description/confirmLabel/onConfirm object form |

All key links: WIRED.

### Requirements Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| CONSIGN-10 — `/wardrobe/consigned` shows owner's dresses across all statuses + per-rental earnings + payout status | SATISFIED | Truths 1, 2, 5 verified; URL-state Earnings tab renders ConsignerEarningsTable with grouped per-rental rows + paid/pending badges |
| RENTAL-08 — Admin can mark consignment paid out (sets `consignmentPaidOut`, `consignmentPaidOutAt`) | SATISFIED | Truths 3, 4, 5 verified; admin Outstanding Payouts tab + per-row Mark Payout Sent button + atomic update of both columns |

### Anti-Patterns Found

None. The `internalNotes`/`consignmentCommissionPct` mentions in `consignerQueries.ts` (lines 10, 13, 63, 69, 135, 150, 279, 313, 348) are in OTHER procedures (input schemas for create, mine for owner's commission view, byId for owner's commission view) or in comments — NOT inside the `myEarnings` select shape. PII boundary for myEarnings holds.

The `internalNotes`/`consignmentCommissionPct` mention in `ConsignerEarningsTable.tsx` at line 18 is a comment documenting the PII boundary — not a render. Component code uses only Student.User.name.

### Sidebar/Layout Immutability

`src/components/layout/AppSidebar.tsx` and `src/components/layout/AppLayout.tsx`: UNTOUCHED. Git log shows last modification at `506c361 feat: luxury athletic redesign` (pre-Phase 19). `git status` confirms no working-tree changes to either file.

### TypeScript Check

`npx tsc --noEmit` returns ONLY the pre-existing `src/components/landing/IceParticles.tsx(6,24): error TS7016: Could not find a declaration file for module 'three'` error. ZERO new errors from Phase 19 work.

### Human Verification Deferred

Three browser-only tests cannot be verified programmatically (require authenticated session, seeded data, live mutation execution against real DB). Documented in frontmatter for live UAT but do not block phase completion — all structural verification passed.

### Gaps Summary

None. All 5 must-have truths, all 5 artifacts (existence + substantive + wired), all 9 key links, both requirements, and the sidebar/layout immutability constraint are verified. Phase 19 goal achieved at the code level.

---

_Verified: 2026-05-29T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
