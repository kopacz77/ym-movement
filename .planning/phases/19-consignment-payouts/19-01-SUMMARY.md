---
phase: 19-consignment-payouts
plan: 01
subsystem: api
tags: [trpc, prisma, consignment, payouts, notifications]

# Dependency graph
requires:
  - phase: 13-wardrobe-foundation
    provides: Rental.consignmentPayoutAmount + consignmentPaidOut + consignmentPaidOutAt columns (initial wardrobe migration 20260529042222)
  - phase: 17-admin-rental-lifecycle
    provides: wardrobeRentalRouter + adminProcedure + createNotification post-commit pattern + RENTAL-03 consignmentPayoutAmount snapshotting
  - phase: 18-self-serve-consignment
    provides: consignerRouter (protectedProcedure + ownerId scoping + explicit-select PII-omission convention) + Dress.Owner relation
provides:
  - "api.wardrobe.consigner.myEarnings — composite-by-dress earnings shape + server-computed totals (CONSIGN-10 read surface)"
  - "api.admin.wardrobeRentals.markConsignmentPaidOut — idempotent payout-flip mutation with 3 defensive checks + in-app notification (RENTAL-08 write surface)"
  - "api.admin.wardrobeRentals.listRentals — extended with outstandingPayoutsOnly: boolean input flag + Dress.Owner.{id,name} in include shape"
affects: [19-02, 19-03, 20-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composite-by-dress query shape: server returns `{rentalsByDress: [{dress, rentals}], totals: {...}}` so client never re-groups OR re-computes payout math"
    - "Conditional WHERE branch (outstandingPayoutsOnly) overrides default paymentStatus filter rather than ANDing — keeps the two list modes orthogonal"
    - "List-query caller-owns enforcement via WHERE clause (ownerId === ctx.session.user.id), distinct from per-row assertOwnsDress used by mutations"
    - "Idempotent admin mutation: 3-layer defense (NOT_FOUND + BAD_REQUEST on null payout + BAD_REQUEST on already-paid) + closed-state semantics matching DEPOSIT_RELEASED + ARCHIVED"

key-files:
  created: []
  modified:
    - "src/features/wardrobe/api/queries/consignerQueries.ts (+101 lines — appended myEarnings procedure)"
    - "src/features/admin/api/queries/wardrobeRequestQueries.ts (+96 / -5 lines — input schema extension + listRentals where/include + new markConsignmentPaidOut procedure)"

key-decisions:
  - "Filter to paymentStatus IN (PAID, RETURNED, DEPOSIT_RELEASED, LATE_FEE_OWED) — explicitly EXCLUDES AWAITING_PAYMENT so consigners only see rentals where money has actually changed hands"
  - "Archived dresses with past rentals DO appear in myEarnings — earnings history is forever; archive does not hide historic earnings"
  - "Server returns Student.User.name only (NO email/phone) — same PII boundary as Phase 17 wardrobe.requests.mine; matches CONSIGN-02 + CAT-08 precedent"
  - "outstandingPayoutsOnly is a branch (override) on the WHERE clause, not an additive filter — when true, the default ['PAID', 'RETURNED'] paymentStatus default is dropped because consigners get paid out across PAID/RETURNED/DEPOSIT_RELEASED/LATE_FEE_OWED states"
  - "markConsignmentPaidOut does NOT wrap in $transaction (single-row write — matches Phase 17 markReturned / flagLateFee single-row pattern). Notification fires AFTER the update via try/catch (non-blocking)"
  - "Notification targets Dress.Owner.id (consigner, NOT Student.User.id) — first cross-cutting notification path that pages a consigner about a rental event. Link points at /wardrobe/consigned?tab=earnings (the Plan 19-02 surface)"
  - "NO Resend email here — Phase 20 (NOTIFY-09) wires email side-by-side with the in-app notification (do NOT replace; both run together once shipped)"

patterns-established:
  - "Composite-by-dress aggregation shape with separate `totals` field: prevents client re-grouping AND keeps payout math server-authoritative"
  - "outstandingPayoutsOnly override semantics: when a filter is conceptually orthogonal to the default, branch the entire WHERE rather than spreading-in"

# Metrics
duration: ~25min
completed: 2026-05-29
---

# Phase 19 Plan 01: Payouts TRPC Backbone Summary

**`wardrobe.consigner.myEarnings` (composite-by-dress + server totals) + `admin.wardrobeRentals.markConsignmentPaidOut` (3-check idempotent) + `listRentals` extended with `outstandingPayoutsOnly` flag and `Dress.Owner.{id,name}` include — Phase 19 backend ready for Wave 2.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-05-29T21:58:49Z
- **Tasks:** 2 / 2
- **Files modified:** 2
- **Files created:** 0

## Accomplishments
- New `api.wardrobe.consigner.myEarnings` query — returns `{rentalsByDress, totals: {earnedToDate, pendingPayout, rentalCount}}` with caller-owns enforced via WHERE clause (NOT per-row assertOwnsDress, because this is a list query). PII boundary held: `internalNotes` + `consignmentCommissionPct` + `Student.User.{email,phone}` never appear in the wire shape.
- New `api.admin.wardrobeRentals.markConsignmentPaidOut` mutation — 3 defensive checks (NOT_FOUND on unknown rentalId, BAD_REQUEST when `consignmentPayoutAmount` IS NULL for Yura-owned dresses, BAD_REQUEST when already paid out as idempotency guard). Single update sets both `consignmentPaidOut=true` + `consignmentPaidOutAt=new Date()`. Fires non-blocking try/catch `createNotification` to `Dress.Owner.id` (the consigner) linking `/wardrobe/consigned?tab=earnings`. NO email — Phase 20 owns that layer.
- Extended `api.admin.wardrobeRentals.listRentals` with optional `outstandingPayoutsOnly: boolean` input flag and `Dress.Owner: {select: {id, name}}` in the include shape. Filter branches the WHERE clause (override semantics, not additive) — when set, constrains to `consignmentPayoutAmount IS NOT NULL` + `consignmentPaidOut: false`.
- Zero new dependencies; zero schema migrations (the Rental payout columns shipped in the initial 20260529042222_add_wardrobe migration, verified via grep + `npx prisma migrate status` reporting "Database schema is up to date!").

## Task Commits

Each task was committed atomically with specific file staging:

1. **Task 1: Pre-flight schema verification + extend consignerRouter with myEarnings** — `aaab771` (feat)
2. **Task 2: Extend wardrobeRentalRouter with markConsignmentPaidOut + extend listRentals input/where/include** — `8e205e5` (feat)

## Files Created/Modified
- `src/features/wardrobe/api/queries/consignerQueries.ts` (+101 lines) — appended `myEarnings: protectedProcedure.query(...)` alongside the existing 6 consigner procedures. Includes JSDoc documenting CAT-08 / CONSIGN-02 PII omissions, the paymentStatus IN filter rationale, and the archived-dress earnings-forever guarantee.
- `src/features/admin/api/queries/wardrobeRequestQueries.ts` (+96 / -5 lines) — three surgical edits: (A) `listRentalsInputSchema` gains `outstandingPayoutsOnly?: boolean`; (B) `listRentals` WHERE branches on the flag (override semantics) and include shape gains `Dress.Owner.{id,name}` for the 19-03 confirm-toast; (C) new `markConsignmentPaidOut` procedure with 3 defensive checks + post-commit `createNotification`.

## Decisions Made

- **Composite-by-dress shape over a flat Rental-list-with-dress-included shape:** the consigner UI in 19-02 groups earnings by dress (each dress has 0..N historical rentals); returning the grouped shape from the server avoids a client-side `reduce` AND keeps the per-dress shape stable across the codebase. Trade-off: marginally redundant Dress data when N>1 rentals share a dress, but at the expected scale (≤10 rentals per consigner during MVP), that's negligible.
- **Server-computed totals (`earnedToDate` + `pendingPayout` + `rentalCount`) in a separate `totals` field at the top level, not embedded in each dress entry:** the UI's hero strip ("$1,250 earned to date, $300 pending") needs the global numbers, not per-dress breakdowns. Embedding them per-dress would either duplicate the global figure on every entry or force the client to recompute. Top-level `totals` is the honest single source.
- **`paymentStatus IN (PAID, RETURNED, DEPOSIT_RELEASED, LATE_FEE_OWED)` — explicitly EXCLUDES `AWAITING_PAYMENT`:** consigners should see earnings only once money has actually changed hands. An APPROVED-but-unpaid request has a `consignmentPayoutAmount` already snapshotted by Phase 17's `markPaymentReceived`, but no money is in Yura's possession until the student pays. Surfacing AWAITING earnings would mislead the consigner into thinking they have pending payout when in fact the deal could still fall through.
- **Archived dresses with past rentals appear in `myEarnings`:** earnings history is forever. CONSIGN-05's archive is a "stop accepting new rentals" signal, not a "forget this dress ever earned anything" signal. The status field is returned so the UI can render an inline ARCHIVED badge for historical clarity.
- **Caller-owns enforcement at the WHERE-clause layer (not `assertOwnsDress`):** `assertOwnsDress` is the convention for per-row mutations (update/archive/resubmit/byId). `myEarnings` is a list query — the WHERE clause `Dress.ownerId === ctx.session.user.id` is the structural enforcement. A caller cannot construct an input that smuggles in someone else's dresses; there is no input.
- **Branch-the-WHERE override semantics for `outstandingPayoutsOnly` (not additive `...spread`):** the default `listRentals` defaults to PAID + RETURNED (active rentals tab). The "Outstanding Payouts" tab is conceptually orthogonal — a payout could be outstanding on a DEPOSIT_RELEASED rental (e.g., admin released deposit but hasn't sent consigner check yet). ANDing the two would silently constrain the outstanding-payouts view to PAID+RETURNED, hiding legitimate payouts owed on already-closed rentals. Branching the entire WHERE keeps the two list modes honest.
- **`markConsignmentPaidOut` is NOT wrapped in `$transaction`:** single-row write, matches Phase 17's `markReturned` / `flagLateFee` single-row pattern. The two atomic fields (`consignmentPaidOut` + `consignmentPaidOutAt`) update together inside one Prisma `update` call which is row-atomic by Postgres guarantee. No second table mutated.
- **Notification fires AFTER the update, in a try/catch — non-blocking:** matches Phase 17's `respondToRequest` / `markPaymentReceived` / `releaseDeposit` pattern. A notification-delivery failure must never roll back the payout state change (the payout actually happened in the real world — the admin physically sent a check; we cannot pretend it didn't because Notification table was down).
- **Phase 20 NOTIFY-09 will add the Resend email line BESIDE this in-app notification (do NOT replace):** documented inline as a JSDoc note. The convention is both notifications fire together — in-app for the dashboard badge, email for the inbox confirmation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Inline `if/else` shorthand violated biome `useBlockStatements` lint**
- **Found during:** Task 1 (myEarnings procedure)
- **Issue:** The plan's literal snippet used `if (r.consignmentPaidOut) earnedToDate += amt;` followed by `else pendingPayout += amt;` — biome's `lint/style/useBlockStatements` rule is enforced in this codebase and rejects the inline form.
- **Fix:** Wrapped both branches in block statements (`if (...) { earnedToDate += amt; } else { pendingPayout += amt; }`)
- **Files modified:** `src/features/wardrobe/api/queries/consignerQueries.ts`
- **Verification:** `npx biome check src/features/wardrobe/api/queries/consignerQueries.ts` returns clean
- **Committed in:** `aaab771` (Task 1 commit, fix folded in before commit)

---

**Total deviations:** 1 auto-fixed (1 bug — biome lint)
**Impact on plan:** Cosmetic only; semantics byte-identical. No scope creep.

## Issues Encountered

- **`pnpm prisma:migrate` failed at the install layer with `ERR_PNPM_IGNORED_BUILDS`:** the `pnpm install` step prompted for build-script approval on prisma + sharp + esbuild + msw and failed in non-interactive mode. The `prisma migrate deploy` step never ran via `pnpm prisma:migrate`. **Resolution:** ran `npx prisma migrate status` directly which reported "Database schema is up to date!" — same authoritative answer the plan requires (no pending migrations). The plan's pre-flight intent (confirm DB sync) was satisfied via the direct CLI invocation. No mutation to package.json or lockfile.

- **Grep pattern in plan verification (`'"This rental has no consignment payout"'`) returned 0** because the actual error message string includes a trailing `" (Yura-owned dress)"` suffix beyond the plan's grep literal. Reran with looser `grep "This rental has no consignment payout"` (no surrounding quotes), confirmed presence at line 652. Content matches plan; only the grep pattern was overly strict.

- **`grep "internalNotes" consignerQueries.ts` returned 1** — that one hit is the JSDoc meta-reference inside `myEarnings`' docstring documenting the omission (`Explicit select OMITS internalNotes (admin-only) AND consignmentCommissionPct ...`). The actual SELECT block contains no `internalNotes: true` key. Verified via `awk '/myEarnings/,/^  \}\),$/'` then grep — returns zero. PII boundary holds. The docstring meta-reference is conventional in this file (the file header comments also name the omitted fields).

## User Setup Required

None — no external service configuration required for this plan. Phase 19 backend is pure TRPC + Prisma; Resend keys / OAuth / etc. are unchanged.

## Verification Summary

| Check | Result |
| --- | --- |
| `grep -c "myEarnings" consignerQueries.ts` | 2 hits (procedure + docstring meta-ref) ✓ |
| `grep -c "markConsignmentPaidOut" wardrobeRequestQueries.ts` | 3 hits (input schema decl + procedure decl + docstring meta-ref) ✓ |
| `grep -c "outstandingPayoutsOnly" wardrobeRequestQueries.ts` | 3 hits (input schema field + conditional WHERE branch + JSDoc) ✓ |
| `grep "internalNotes" consignerQueries.ts inside myEarnings select` | 0 hits ✓ |
| `grep "consignmentCommissionPct" consignerQueries.ts inside myEarnings select` | 0 hits ✓ |
| `grep "email\|phone" consignerQueries.ts inside myEarnings select` | 0 hits ✓ |
| `npx tsc --noEmit -p tsconfig.json` | Only pre-existing IceParticles `three` types blocker; ZERO new errors ✓ |
| `npx biome check` on both modified files | Clean ✓ |
| `npx prisma migrate status` | "Database schema is up to date!" — no pending migrations ✓ |
| No destructive Prisma commands invoked | Confirmed ✓ |

## Next Phase Readiness

- **Plan 19-02 (consigner earnings tab UI):** can now consume `api.wardrobe.consigner.myEarnings` directly. Shape contract: `{rentalsByDress: Array<{dress: {id, title, sizeLabel, color, status, Images: Array<{url}>}, rentals: Array<{id, startDate, endDate, rentalType, rentalFee, consignmentPayoutAmount, consignmentPaidOut, consignmentPaidOutAt, paymentStatus, Student: {User: {name}}}>}>, totals: {earnedToDate: number, pendingPayout: number, rentalCount: number}}`. All money in cents (Int).
- **Plan 19-03 (admin Outstanding Payouts tab UI):** can consume `api.admin.wardrobeRentals.listRentals({outstandingPayoutsOnly: true})` for the new tab AND `api.admin.wardrobeRentals.markConsignmentPaidOut({rentalId})` for the Mark-Paid action. The confirm-toast can show `rental.Dress.Owner.name` from the extended include.
- **Plan 20 (Resend email layer):** the `markConsignmentPaidOut` notification call site is the documented insertion point. The plan should add a Resend send beside the in-app `createNotification` (both run together, both wrapped in independent try/catch).
- **No blockers, no concerns.** Wave 2 (Plans 19-02 + 19-03) can begin.

---
*Phase: 19-consignment-payouts*
*Completed: 2026-05-29*
