---
phase: 19-consignment-payouts
plan: 03
subsystem: ui
tags: [admin, rentals, payouts, table, tabs, trpc, brand-cyan]

# Dependency graph
requires:
  - phase: 17-admin-rental-lifecycle
    provides: RentalsTable.tsx 2-tab admin rentals surface + per-row state-machine actions + showConfirmationToast object-form precedent
  - phase: 19-consignment-payouts
    plan: 01
    provides: api.admin.wardrobeRentals.markConsignmentPaidOut mutation + listRentals outstandingPayoutsOnly: boolean input flag + Dress.Owner.{id,name} include
provides:
  - "Admin '/admin/wardrobe/rentals' 3rd tab Outstanding Payouts (server-filtered list of consigned + un-sent payouts)"
  - "Per-row Mark Payout Sent button (cyan-600) rendered across all 3 tabs when row is consigned + un-paid"
  - "Confirmation toast showing consigner name + payout amount + dress title before the mutation fires"
affects: [20-notifications, 21-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Widen sibling action prop signatures to nullable for focused-surface tab variants (Outstanding Payouts hides Mark Returned/Release Deposit; existing tabs unchanged)"
    - "isPending → disabled on confirmation-toast-fired mutation buttons (Phase 17 markReturned precedent, applied to markPayoutSent)"
    - "Override semantics on server flag (outstandingPayoutsOnly): client passes only the new flag; server branches the WHERE rather than ANDing"

key-files:
  created: []
  modified:
    - "src/features/wardrobe/components/admin/RentalsTable.tsx (5 surgical edits: RentalRow interface + 3rd query hook + markPayoutSent mutation + handleMarkPayoutSent handler + 3rd TabsTrigger/Content + per-row Mark Payout Sent button + widened RentalRows prop nullables)"

key-decisions:
  - "Single-file additive extension over a new RentalPayoutsTable component — the data primitive (Rental row) and table chrome are identical to the existing 2 tabs; extracting would duplicate the loading/empty/Section/RentalRows machinery for zero readability gain"
  - "Outstanding Payouts tab suppresses Mark Returned / Release Deposit / Flag Late Fee buttons via nullable props — focused payout-action surface; same rows still render those actions when viewed via Active or Late Fee tabs"
  - "Plain useState tab persistence inherited from Phase 17 (no URL ?tab= sync) — minimizes diff; the existing 2-tab implementation never adopted URL-state, so the 3rd tab follows suit"
  - "Mark Payout Sent button rendered ACROSS ALL 3 TABS where row is eligible (consignmentPayoutAmount != null AND !consignmentPaidOut) — admin who spots a payout-ready rental on the Active tab doesn't have to switch to Outstanding Payouts to act"
  - "Belt-and-suspenders guard in handleMarkPayoutSent (`if (... null || paidOut) return`) protects against keyboard-activation race conditions even though the button is conditionally rendered"
  - "Cyan-600 (Tailwind shortcut class) over hex literal — matches surrounding file's existing Mark Returned convention. Both render the same #0891b2 brand cyan"
  - "Confirmation copy explicitly includes payout amount AND consigner name AND dress title — admins know exactly what they're confirming; matches Release Deposit confirmation pattern from Phase 17"

patterns-established:
  - "Focused-surface tab variant pattern: when a list is filtered to a specific intent (e.g. Outstanding Payouts), suppress unrelated state-machine action buttons by widening their prop types to nullable and passing null"
  - "Confirmation copy template for payout/financial admin actions: include the dollar amount (via formatCurrencyFromCents), the recipient name (Dress.Owner.name with 'the consigner' fallback), and the asset identifier (Dress.title)"

# Metrics
duration: ~3min
completed: 2026-05-29
---

# Phase 19 Plan 03: Admin Outstanding Payouts UI Summary

**RentalsTable gains 3rd "Outstanding Payouts" tab + per-row Mark Payout Sent action wired to Plan 19-01 backend — RENTAL-08 / CONSIGN-10 admin write surface live.**

## Performance

- **Duration:** ~3 min
- **Completed:** 2026-05-29T22:08:00Z
- **Tasks:** 1 / 1
- **Files modified:** 1
- **Files created:** 0

## Accomplishments

- Extended `RentalRow` interface with the 3 Plan 19-01 payout columns (`consignmentPayoutAmount: number | null`, `consignmentPaidOut: boolean`, `consignmentPaidOutAt: Date | null`) and `Dress.Owner: { id: string; name: string | null }` — these all flow from the server's now-extended listRentals include shape.
- Added a 3rd top-level tab "Outstanding Payouts" with its own listRentals query call (`outstandingPayoutsOnly: true`), display count, loading state, empty state ("No outstanding payouts. All consigned rentals are settled."), and rendered via the same `RentalRows` sub-component used by Active and Late Fee tabs.
- Added `markPayoutSent` mutation hook calling `api.admin.wardrobeRentals.markConsignmentPaidOut` with `onSuccess` toast.success + listRentals.invalidate(), and `onError` toast.error with verbatim server message (so the BAD_REQUEST "Payout already marked as sent" idempotency rejection surfaces friendly).
- Added `handleMarkPayoutSent` confirmation-toast handler using `showConfirmationToast` object form with title="Mark payout sent", description includes `formatCurrencyFromCents(consignmentPayoutAmount)` + consigner name + dress title, confirmLabel="Mark Sent", `onConfirm` fires `markPayoutSent.mutate({ rentalId })`.
- Added per-row Mark Payout Sent button (`bg-cyan-600 hover:bg-cyan-700 text-white`, size="sm") rendered conditionally when `consignmentPayoutAmount != null && !consignmentPaidOut`, with `disabled={markPayoutSent.isPending}` to prevent double-clicks.
- Widened `RentalRowsProps.onMarkReturned` and `onReleaseDeposit` from `(r: RentalRow) => void` to `((r: RentalRow) => void) | null` so the Outstanding Payouts tab can suppress those unrelated state-machine actions (focused-surface variant). The existing Active and Late Fee tabs pass the non-null callbacks unchanged.

## Task Commits

1. **Task 1: Five surgical edits to RentalsTable.tsx** — `7ce3dc2` (feat)

## Files Created/Modified

- `src/features/wardrobe/components/admin/RentalsTable.tsx` (+143 / -22 lines) — 5 surgical edits:
  1. `RentalRow` interface extended with 3 Plan 19-01 payout columns + `Dress.Owner.{id,name}` (lines 65-87)
  2. New `outstandingPayoutsQuery` hook calling `listRentals({ outstandingPayoutsOnly: true })` (lines 118-126)
  3. New `markPayoutSent` mutation hook + `handleMarkPayoutSent` confirmation-toast handler (lines 145-160, 200-217)
  4. New `<TabsTrigger value="outstanding-payouts">` + `<TabsContent value="outstanding-payouts">` block (lines 241-244, 293-312)
  5. `RentalRowsProps.onMarkReturned`/`onReleaseDeposit` widened to nullable + button-cell logic gated on non-null + new Mark Payout Sent button (lines 367-377, 444-486)

## Decisions Made

- **Single-file additive extension over a separate RentalPayoutsTable component:** the data primitive (Rental row) and table chrome (loading state, empty state, Section header, Table with image/dress/student/dates/fee/status/actions columns) are byte-identical to the existing 2 tabs. Extracting would have duplicated all that machinery for zero readability gain. The file grew from 411 → 522 lines, still well within readability bounds.
- **Plain useState tab persistence inherited from Phase 17 (no URL `?tab=` sync):** the existing 2-tab implementation never adopted URL state, so the 3rd tab follows suit. Could be added in a future polish pass if admins request bookmarkable tab selection, but minimizing diff scope is the right call here.
- **Mark Payout Sent button rendered ACROSS ALL 3 TABS where row is eligible:** an admin who spots a payout-ready rental on the Active tab shouldn't have to switch tabs to act. The conditional render (`consignmentPayoutAmount != null && !consignmentPaidOut`) is universal; the same row appears with the button on whichever tab it lands in.
- **Outstanding Payouts tab suppresses Mark Returned / Release Deposit / Flag Late Fee buttons** via the new nullable props on `RentalRowsProps`. Conceptually the Outstanding Payouts surface is "what do I still owe?" — surfacing rental lifecycle actions there would conflate two workflows. The same rows still expose those actions on Active / Late Fee tabs.
- **Belt-and-suspenders guard in `handleMarkPayoutSent`** (`if (r.consignmentPayoutAmount == null || r.consignmentPaidOut) return;`) — the button is already conditionally rendered (UI gate), but keyboard activation races and future code paths could theoretically slip through. The guard is cheap.
- **Cyan-600 (Tailwind shortcut class) over `#0891b2` hex literal:** the existing Mark Returned button at line 446 uses `bg-cyan-600 hover:bg-cyan-700 text-white` — matched that convention for consistency. Both render the same brand cyan per CLAUDE.md 2026-04-26 sweep.
- **Confirmation toast copy template:** "Confirm that you have sent {amount} payout to {consigner-name} for "{dress-title}"? This action cannot be undone." — includes all three pieces of context (financial amount, recipient, asset). The "the consigner" fallback covers the rare `Owner.name === null` case without exposing the User.id.
- **Empty state copy "No outstanding payouts. All consigned rentals are settled."** — celebrates the cleared queue rather than just stating absence, matches the brand voice in Phase 18-05 empty states.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome formatter line-cap overrun on `outstandingPayouts` const declaration**

- **Found during:** Task 1 verification
- **Issue:** The single-line `const outstandingPayouts = (outstandingPayoutsQuery.data?.rentals ?? []) as unknown as RentalRow[];` was 99 characters but biome's formatter reflowed it across two lines for the 100-char width rule (the closing-paren-cast pattern prefers a line break before the cast in this codebase's biome config).
- **Fix:** Ran `npx biome check --write` to auto-reflow. Semantics byte-identical.
- **Files modified:** `src/features/wardrobe/components/admin/RentalsTable.tsx`
- **Verification:** `npx biome check` returns clean (no errors, no fixes applied)
- **Committed in:** `7ce3dc2` (Task 1 commit, fix folded in before commit)

**Total deviations:** 1 auto-fixed (1 bug — biome formatter)
**Impact on plan:** Cosmetic only; semantics byte-identical. No scope creep.

## Issues Encountered

None — the plan was extremely well-specified and the server-side Plan 19-01 work landed cleanly enough that the entire UI extension was a straight implementation pass.

The plan's verification grep for `TabsTrigger` expected "returns 3" but actual returns 7 (1 import + 3 opening tags + 3 closing tags). Semantically there are 3 tabs as intended; the plan's expected number was structurally off. All other grep counts match or exceed plan expectations (`outstandingPayoutsOnly`=2, `markConsignmentPaidOut`=2, `Mark Payout Sent`=10 (header comment + JSDoc + label + 3 occurrences in plan-style references), `handleMarkPayoutSent`=5, `showConfirmationToast`=6, `markPayoutSent.isPending`=4, `bg-cyan-600`=2).

## User Setup Required

None — pure UI extension on top of shipped backend. No external service configuration. No env changes. No migrations.

## Verification Summary

| Check | Result |
| --- | --- |
| `grep -c "TabsTrigger"` (plan expected ≥3 — actual counts import + tags) | 7 (1 import + 3 opening + 3 closing) ✓ |
| `grep -c "outstandingPayoutsOnly"` | 2 (query call + comment ref) ✓ |
| `grep -c "markConsignmentPaidOut"` | 2 (mutation hook + comment ref) ✓ |
| `grep -c "Mark Payout Sent"` | 10 (button label + multiple JSDoc/comment references) ✓ |
| `grep -c "handleMarkPayoutSent"` | 5 (1 declaration + 4 call sites across 3 tabs and the focused payout tab) ✓ |
| `grep -c "showConfirmationToast"` | 6 (1 import + 3 existing handlers + 1 new handler call + 1 reference) ✓ |
| `grep -c "markPayoutSent.isPending"` | 4 (4 call sites — one per RentalRows mount + one in the disabled prop) ✓ |
| `grep -E "bg-cyan-600\|bg-\[#0891b2\]"` | 2 hits (existing Mark Returned + new Mark Payout Sent) ✓ |
| `npx biome check` on touched file | Clean ✓ |
| `npx tsc --noEmit -p tsconfig.json` | Only pre-existing IceParticles `three` types blocker; ZERO new errors ✓ |
| No destructive Prisma commands invoked | Confirmed ✓ |
| `AppSidebar.tsx` modified | NO — untouched per CLAUDE.md immutability ✓ |
| `AppLayout.tsx` modified | NO — untouched per CLAUDE.md immutability ✓ |
| New files created | 0 ✓ |
| New pages created | 0 ✓ |
| New sidebar entries | 0 ✓ |
| Specific-file staging (no `git add .` or `-A`) | Confirmed — only `git add src/features/wardrobe/components/admin/RentalsTable.tsx` ✓ |

## Pattern Reuse from Phase 17

- **showConfirmationToast object form** — `handleMarkPayoutSent` mirrors `handleReleaseDeposit` and `handleFlagLateFee` structurally (title + description + confirmLabel + onConfirm). All three handlers in the file now use the same object-form convention.
- **invalidate-then-toast lifecycle** — `markPayoutSent.onSuccess` fires `toast.success(...)` first then `utils.admin.wardrobeRentals.listRentals.invalidate()`, matching the order in `releaseDeposit` and `flagLateFee` onSuccess handlers. (Order is purely cosmetic — both async; the toast UX feels snappier when it appears before the refetch lands.)
- **isPending → disabled on confirmation-toast-fired mutations** — `markPayoutSent.isPending` wired to the button's `disabled` prop replicates the Phase 17 pattern where dialog buttons gate on `respond.isPending` to prevent double-fires.

## Tech-stack Delta

**None.** Zero new dependencies, zero new components, zero new abstractions. Pure additive extension on top of:
- `@/lib/toast-confirmations` (existing helper from pre-Phase 14)
- `@/lib/utils` `formatCurrencyFromCents` (existing helper from Phase 14-01)
- `api.admin.wardrobeRentals.listRentals` + `markConsignmentPaidOut` (shipped Plan 19-01)
- `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (existing Radix primitives in `@/components/ui/tabs`)
- `Button` (existing `@/components/ui/button`)

## Next Phase Readiness

- **Phase 19 status:** **3/3 plans shipped — PHASE 19 COMPLETE.** Payouts backend (Plan 19-01) + consigner earnings UI (Plan 19-02) + admin Outstanding Payouts UI (this plan) all live. CONSIGN-10 + RENTAL-08 closed end-to-end.
- **Plan 20 (notifications / NOTIFY-09 Resend email):** the `markConsignmentPaidOut` mutation in `wardrobeRequestQueries.ts:628` is the documented insertion point for the consigner email send. The plan should add a Resend `sendConsignmentPayoutSentEmail` call beside the existing `createNotification` call (both run together, both wrapped in independent try/catch — see Plan 19-01 JSDoc).
- **No blockers, no concerns.** The 3rd tab + per-row action are smoke-test-ready as soon as a Yura-side dev session loads `/admin/wardrobe/rentals` against a database that has at least one consigned rental with `consignmentPayoutAmount != null && !consignmentPaidOut`.

---
*Phase: 19-consignment-payouts*
*Completed: 2026-05-29*
