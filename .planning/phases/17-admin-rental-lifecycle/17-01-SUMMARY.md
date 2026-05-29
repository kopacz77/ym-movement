---
phase: 17-admin-rental-lifecycle
plan: 01
subsystem: api
tags: [trpc, prisma, transactions, state-machine, wardrobe, admin]

# Dependency graph
requires:
  - phase: 13-wardrobe-foundation
    provides: Prisma Dress/RentalRequest/Rental models, RentalRequestStatus + RentalPaymentStatus + RentalType enums, getWardrobeSettings helper
  - phase: 14-admin-inventory
    provides: wardrobeDressRouter + wardrobeSettingsRouter sibling pattern, adminProcedure usage convention
  - phase: 16-dress-detail-rental-request
    provides: student-side requestQueries.ts (createNotification call shape, post-tx try/catch wrapper to mirror)
provides:
  - admin.wardrobeRequests.listRequests query (PENDING queue, competitionDate ASC NULLS LAST)
  - admin.wardrobeRequests.respondToRequest mutation (APPROVE/DECLINE state machine)
  - admin.wardrobeRequests.markPaymentReceived mutation (RENTAL-01 + RENTAL-02 + RENTAL-03 conversion)
  - admin.wardrobeRentals.listRentals query (active rentals — PAID/RETURNED default)
  - admin.wardrobeRentals.markReturned mutation (RENTAL-05 — does NOT touch Dress.status)
  - admin.wardrobeRentals.releaseDeposit mutation (RENTAL-06 — atomic dress→AVAILABLE)
  - admin.wardrobeRentals.flagLateFee mutation (RENTAL-07)
  - pickRentalFee + computeConsignmentPayout module-private helpers
affects:
  - 17-02-admin-requests-queue-ui
  - 17-03-admin-respond-dialog
  - 17-04-admin-active-rentals-ui
  - 17-05-admin-rental-detail-actions
  - 18-consigner-portal (reuse of RENTAL-03 payout formula)
  - 20-email-notifications (will read in-app Notification rows + add email layer on top of the same triggers)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Interactive prisma.$transaction(async (tx) => {...}) wrapping multi-row writes; single-row writes skip the wrapper"
    - "Post-commit notifications inside try/catch (non-blocking) to insulate state writes from notification infra failures"
    - "Module-private helpers for snapshot math (pickRentalFee, computeConsignmentPayout) co-located with the only callers"
    - "Discriminated decision input (APPROVE/DECLINE) on one mutation rather than two siblings"
    - "Defensive dress-status returning on DECLINE: only flip dress→AVAILABLE if it was PENDING from THIS request"

key-files:
  created:
    - src/features/admin/api/queries/wardrobeRequestQueries.ts
  modified:
    - src/features/admin/api/queries/index.ts

key-decisions:
  - "Two routers in one file, exported as named consts (wardrobeRequestRouter + wardrobeRentalRouter)"
  - "All 7 procedures use adminProcedure (no new middleware needed)"
  - "Snapshot fees from request.Dress at conversion time — admins changing prices after rental creation MUST NOT retroactively re-bill (RENTAL-02)"
  - "consignmentCommissionPct === 0 ⇒ payout null (Yura/platform owned); > 0 ⇒ computed payout (RENTAL-03 LOCKED)"
  - "markReturned + flagLateFee never touch Dress.status (research Pitfall 8)"
  - "releaseDeposit is the ONLY procedure that flips Dress back to AVAILABLE"
  - "Decline returns dress to AVAILABLE only if dress.status was PENDING from this exact request — defensive"
  - "No email sends here — Phase 20 owns email layer; in-app Notification rows are sufficient"

patterns-established:
  - "Two-router-one-file pattern (named exports) for semantic namespace grouping under a parent router"
  - "State machine matrix encoded as one transaction per multi-row write, with documentation comments citing pitfalls"
  - "Snapshot math in module-private helpers, never inlined in mutation bodies (audit trail clarity)"

# Metrics
duration: 9min
completed: 2026-05-29
---

# Phase 17 Plan 01: Admin Rental Lifecycle TRPC Backbone Summary

**Two TRPC sub-routers (wardrobeRequestRouter + wardrobeRentalRouter) with 7 admin procedures encoding the full rental approval and lifecycle state machine — atomic via interactive `$transaction`, non-blocking notifications, fee snapshotting at conversion.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-29T18:04:12Z
- **Completed:** 2026-05-29T18:13:37Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 edited)

## Accomplishments

- Built the Phase 17 backend keystone: 7 admin procedures across 2 sub-routers in a single ~595-line file
- Encoded the full state machine matrix (research Pitfall 8): dress stays RENTED through RETURNED until releaseDeposit; markReturned + flagLateFee never touch Dress.status
- Atomicized all multi-row writes (`respondToRequest`, `markPaymentReceived`, `releaseDeposit`) via `ctx.prisma.$transaction(async (tx) => ...)`
- Snapshotted RENTAL-02 fees (rentalFee from rentalType-matched price, plus cleaningFee + securityDeposit) at conversion time so dress-price edits never retroactively re-bill
- Implemented RENTAL-03 consignment payout: `consignmentCommissionPct === 0 ⇒ null`, else `rentalFee - round(rentalFee * pct / 100)`
- Non-blocking post-commit notifications wrapped in try/catch on all three notification-producing procedures
- Mounted both routers at `admin.wardrobeRequests` and `admin.wardrobeRentals`, adjacent to existing wardrobe siblings

## Task Commits

1. **Task 1: Create wardrobeRequestQueries.ts with 7 admin procedures + helpers** — `fa41ad9` (feat)
2. **Task 2: Mount both routers on adminRouter + smoke-test the schema** — `8627176` (feat)

## Files Created/Modified

- `src/features/admin/api/queries/wardrobeRequestQueries.ts` — NEW. Contains both sub-routers, the pickRentalFee + computeConsignmentPayout helpers, and all 7 procedure definitions with inline state-machine documentation citing Pitfalls 8 + 9 and RENTAL-02/03.
- `src/features/admin/api/queries/index.ts` — MODIFIED. Added 1 import line + 2 mount lines (`wardrobeRequests: wardrobeRequestRouter` + `wardrobeRentals: wardrobeRentalRouter`) directly under the existing `wardrobeSettings` line for semantic clustering.

## Procedure Surfaces (for Plans 17-02..05 callers)

### wardrobeRequests.listRequests
- **Input:** `{ status?: RentalRequestStatus, page?: number = 1, limit?: number = 20 }` (defaults `status: "PENDING"` when omitted)
- **Output:** `{ requests, total, page, limit }` where each request includes Dress (id, title, sizeLabel, color, all 3 prices, cleaningFee, securityDeposit, consignmentCommissionPct, status, primary Image url) and Student (id + User name/email)
- **Sort:** `competitionDate ASC NULLS LAST, createdAt ASC`

### wardrobeRequests.respondToRequest
- **Input:** `{ requestId: cuid, decision: "APPROVE" | "DECLINE", responseMessage: string (1-1000) }`
- **Output:** `{ id, decision }`
- **State:** request PENDING→APPROVED/DECLINED, dress AVAILABLE→PENDING on APPROVE (or PENDING→AVAILABLE on DECLINE if held by this request)
- **Errors:** NOT_FOUND (no request) | BAD_REQUEST ("Only PENDING…" / "Request has expired" / "Dress is already held by another approved request")
- **Notification:** SUCCESS (APPROVE) or WARNING (DECLINE) → student, link `/wardrobe/my-rentals`

### wardrobeRequests.markPaymentReceived
- **Input:** `{ requestId: cuid, paymentMethod: PaymentMethod }`
- **Output:** `{ id }` (Rental.id)
- **State:** request APPROVED→CONVERTED, Rental row created (status PAID, depositCollectedAt: now), dress PENDING→RENTED
- **Snapshots:** rentalFee (per RentalType), cleaningFee, securityDeposit, consignmentPayoutAmount (per RENTAL-03), totalCharged = rentalFee + cleaningFee + securityDeposit
- **Errors:** NOT_FOUND | BAD_REQUEST ("Only APPROVED…" / "Dress is not in PENDING state" / "This dress is not offered for purchase")
- **Notification:** SUCCESS → student, "Payment confirmed", link `/wardrobe/my-rentals`

### wardrobeRentals.listRentals
- **Input:** `{ paymentStatus?: RentalPaymentStatus[], page?: number = 1, limit?: number = 20 }` (defaults to `["PAID", "RETURNED"]` — active rentals per RENTAL-04)
- **Output:** `{ rentals, total, page, limit }` where each rental includes Dress (id, title, sizeLabel, color, primary Image url) and Student (id + User name/email)
- **Sort:** `endDate ASC, createdAt ASC`

### wardrobeRentals.markReturned
- **Input:** `{ rentalId: cuid, conditionOnReturn: string (1-2000) }`
- **Output:** updated Rental row
- **State:** Rental PAID→RETURNED, returnedAt + conditionOnReturn set. **Dress.status untouched** (stays RENTED).
- **Errors:** NOT_FOUND | BAD_REQUEST ("Only PAID rentals can be marked returned")

### wardrobeRentals.releaseDeposit
- **Input:** `{ rentalId: cuid }`
- **Output:** `{ id }` (updated Rental.id)
- **State:** Rental RETURNED→DEPOSIT_RELEASED, depositReleasedAt: now, Dress RENTED→AVAILABLE (atomic)
- **Errors:** NOT_FOUND | BAD_REQUEST ("Rental must be RETURNED before deposit release")
- **Notification:** SUCCESS → student, "Deposit released", link `/wardrobe/my-rentals`

### wardrobeRentals.flagLateFee
- **Input:** `{ rentalId: cuid }`
- **Output:** updated Rental row
- **State:** Rental.paymentStatus → LATE_FEE_OWED. **Dress.status untouched.**
- **Errors:** NOT_FOUND | BAD_REQUEST ("Cannot flag a closed rental")
- **No notification** (Phase 20 owns the fee-collection email)

## consignmentPayoutAmount Formula (RENTAL-03 LOCKED)

```typescript
if (dress.consignmentCommissionPct === 0) return null;          // Yura/platform-owned
return rentalFee - Math.round((rentalFee * dress.consignmentCommissionPct) / 100);
```

- `0%` ⇒ `null` (no consigner owed)
- `>0%` ⇒ `rentalFee - round(rentalFee * pct / 100)` (consigner gets the remainder after platform takes its share)
- Math.round is JS half-up; if a downstream audit prefers banker's rounding, swap in one place

## State Machine Matrix (As Shipped)

| Procedure | RentalRequest transition | Rental transition | Dress.status transition |
| --- | --- | --- | --- |
| respondToRequest APPROVE | PENDING → APPROVED | — | AVAILABLE → PENDING |
| respondToRequest DECLINE | PENDING → DECLINED | — | PENDING → AVAILABLE (only if dress was PENDING from this request) |
| markPaymentReceived | APPROVED → CONVERTED | (create) → PAID | PENDING → RENTED |
| markReturned | — | PAID → RETURNED | **untouched** (stays RENTED) |
| releaseDeposit | — | RETURNED → DEPOSIT_RELEASED | RENTED → AVAILABLE |
| flagLateFee | — | * → LATE_FEE_OWED (any except DEPOSIT_RELEASED) | **untouched** |

## Decisions Made

- **Two routers in one file** rather than two sibling files: both encode the same rental lifecycle and share helpers (pickRentalFee, computeConsignmentPayout) — splitting them would force the helpers into a third util file or duplicate them. Named exports keep the import surface clean (`import { wardrobeRequestRouter, wardrobeRentalRouter } from "./wardrobeRequestQueries"`).
- **Module-private helpers (not exported, not separate file)** for fee snapshot math: the only callers live in this file, and exposing them would invite drift between server snapshot logic and any future per-Rental display logic. UIs that need to show "what the consigner would get" should call a dedicated read procedure, not re-implement the formula client-side.
- **Discriminated APPROVE/DECLINE input on one mutation** (research Pattern 4) rather than two procedures: the validation flow (request exists, status === PENDING, not expired) is identical; only the dress-status branch and the notification copy differ. One procedure with a 4-line branch is easier to keep correct than two procedures sharing a helper.
- **Decline-returns-AVAILABLE guarded by `dress.status === "PENDING"`**: defensive against the (currently impossible but cheap to enforce) scenario where a dress is held by an APPROVED request and a PENDING request is later declined. Flipping the dress to AVAILABLE in that case would orphan the APPROVED request's hold.
- **No `Yura email lookup`** for the consignment payout calculation: `consignmentCommissionPct === 0` is the canonical "platform-owned" signal per RENTAL-03 LOCKED. Tied to the dress row, not to the owner email — survives email changes and account deletions without breaking the payout math.
- **No batch-approve procedure**: out of scope per research Pitfall 9. If it lands later, it should be a separate procedure that iterates the same single-request transaction logic (not a batch tx — partial failure must surface per-request).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome `useBlockStatements` lint failure on guard-clause one-liner**
- **Found during:** Task 1 (post-write biome check)
- **Issue:** Plan body's `if (dress.consignmentCommissionPct === 0) return null;` triggered Biome's `lint/style/useBlockStatements` rule — project lint config requires block statements.
- **Fix:** Applied Biome's unsafe auto-fix (`biome check --write --unsafe`) which wrapped the body in braces: `if (...) { return null; }`. Same family of fix as Plan 16-02 Rule 1 deviation.
- **Files modified:** `src/features/admin/api/queries/wardrobeRequestQueries.ts`
- **Verification:** `npx biome check src/features/admin/api/queries/wardrobeRequestQueries.ts` → no errors. Logic semantics unchanged.
- **Committed in:** `fa41ad9` (Task 1 commit — fix applied before commit)

---

**Total deviations:** 1 auto-fixed (1 bug / lint compliance)
**Impact on plan:** Cosmetic lint fix only. No behavior change, no scope creep.

## Issues Encountered

- **Temp verification script initial output was empty array** (Task 2): first version of `scripts/verify-phase-17-router.ts` tried to walk `_def.procedures.wardrobeRequests._def.procedures` as a nested structure, but TRPC v11 flattens nested router procedures into dot-notation keys on the parent's procedures map (e.g., `wardrobeRequests.listRequests` as a flat key). Rewrote the script to check for the flat dot-notation keys directly; second run printed all 7 expected procedures cleanly. Script deleted post-verification per plan instructions.
- **Pre-existing `three` types error noise**: `npx tsc --noEmit` surfaces a `TS7016: Could not find a declaration file for module 'three'` on `IceParticles.tsx`. This is the documented pre-existing blocker per STATE.md and unrelated to Phase 17 work — no action taken.

## User Setup Required

None — no external service configuration required. All work is internal TRPC + Prisma.

## Next Phase Readiness

**Ready for downstream plans:**
- **17-02 (Admin Requests Queue UI):** can call `api.admin.wardrobeRequests.listRequests` immediately. Output shape stable.
- **17-03 (Admin Respond Dialog):** can call `api.admin.wardrobeRequests.respondToRequest` with `{ requestId, decision: "APPROVE" | "DECLINE", responseMessage }`. Error codes (NOT_FOUND, BAD_REQUEST with specific messages) are caller-handleable.
- **17-04 (Admin Active Rentals UI):** can call `api.admin.wardrobeRentals.listRentals`. Default filter (`["PAID", "RETURNED"]`) lines up with the "active rentals" semantics of RENTAL-04.
- **17-05 (Admin Rental Detail Actions):** can call `markReturned`, `releaseDeposit`, `flagLateFee`, and `markPaymentReceived` — full lifecycle covered.
- **16-07 (Student MyRentalsView):** zero changes needed. The existing `wardrobe.requests.mine` and `wardrobe.requests.myRentals` queries already return the rows that this phase's writes will produce (APPROVED → "Approved" tab; PAID → "Active" tab via the Rental row).

**No blockers identified.** Confirmation that no locked files were touched: `wardrobeDressQueries.ts`, `requestQueries.ts`, `prisma/schema.prisma`, `root.ts`, and the sidebar/layout files all untouched. `git diff --name-only HEAD~2 HEAD` returns exactly `src/features/admin/api/queries/wardrobeRequestQueries.ts` and `src/features/admin/api/queries/index.ts`.

## Verification Output

```
=== Biome ===                              Checked 2 files in 15ms. No fixes applied.
=== Router topology ===                    wardrobeRequests + wardrobeRentals both present
=== State machine encoding ===             18 status-string literals (≥ 15 required)
=== Transaction count ===                  3 ctx.prisma.$transaction wrappers
=== Failed-to-notify count ===             3 console.error fallbacks
=== adminProcedure count ===               8 occurrences (7 procedure mounts + 1 import)
=== RENTAL-03 documented ===               3 inline citations (helper JSDoc + call site comments)
=== Temp script ===                        "All 7 phase-17 procedures mounted correctly"
=== Temp script deleted ===                ls returns "No such file or directory"
```

---
*Phase: 17-admin-rental-lifecycle*
*Completed: 2026-05-29*
