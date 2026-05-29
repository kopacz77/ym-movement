---
phase: 17-admin-rental-lifecycle
plan: 03
subsystem: ui
tags: [react, trpc, react-hook-form, zod, radix, sonner, tabs, date-fns]

# Dependency graph
requires:
  - phase: 17-admin-rental-lifecycle
    provides: "admin.wardrobeRequests.markPaymentReceived + admin.wardrobeRentals.{listRentals, markReturned, releaseDeposit, flagLateFee} TRPC procedures (Plan 17-01)"
  - phase: 13-foundation
    provides: "api.admin.wardrobeSettings.get with wardrobeReturnReminderDays setting (Plan 13-02)"
  - phase: 16-student-rental-flow
    provides: "RentalStatusBadge handles both RentalRequestStatus + RentalPaymentStatus unions (Plan 16-03)"
provides:
  - "RecordPaymentDialog — RHF + Zod modal converting APPROVED request -> paid Rental via markPaymentReceived"
  - "MarkReturnedDialog — RHF + Zod modal recording conditionOnReturn via markReturned"
  - "RentalsTable — two-tab (Active + Late Fee) admin view with Returns Due section + per-row state-machine action buttons"
affects:
  - 17-02-PLAN.md (RequestQueueTable imports RecordPaymentDialog for Awaiting-Payment tab)
  - 17-05-PLAN.md (admin rentals page mounts RentalsTable; pre-existing page.tsx stub already imports it)
  - 18-consigner-onboarding (consigner payout views will reuse rentalFee snapshot semantics established here)

# Tech tracking
tech-stack:
  added: []  # No new deps; reused Select + Tabs + Table primitives
  patterns:
    - "Object-form showConfirmationToast for non-destructive admin actions"
    - "Local RentalRow interface mirroring TRPC include shape (avoids importing prisma generated types)"
    - "Per-row conditional action buttons keyed off paymentStatus discriminator"
    - "Null-prop callback contract to hide row-level actions in specific tabs"

key-files:
  created:
    - src/features/wardrobe/components/admin/RecordPaymentDialog.tsx
    - src/features/wardrobe/components/admin/MarkReturnedDialog.tsx
    - src/features/wardrobe/components/admin/RentalsTable.tsx
  modified: []

key-decisions:
  - "Select primitive over RadioGroup (radio-group.tsx not exported by components/ui yet)"
  - "Object-form showConfirmationToast (matches 16-07 ADR pattern; positional showDeleteConfirmation reserved for delete-named operations)"
  - "Local RentalRow interface over generated Prisma client types (cleaner JSX, no transitive type imports)"
  - "Default fallback wardrobeReturnReminderDays = 1 day when settings query unresolved"
  - "Null prop contract for onFlagLateFee in LATE_FEE_OWED tab (visual elision of already-flagged action)"
  - "Per-row bg-rose-50 background on LATE_FEE_OWED rows (visual flag without status badge competition)"

patterns-established:
  - "Admin lifecycle dialogs use RHF + zodResolver + double-invalidate pattern (listRequests + listRentals when crossing the request->rental boundary)"
  - "Tabbed admin views combine TabsContent + co-located Section sub-component for editorial sub-grouping within a single tab"
  - "Confirmation toast for low-friction state transitions (release deposit, flag late fee); modal dialog for transitions requiring user input (record payment, mark returned)"

# Metrics
duration: 4min
completed: 2026-05-29
---

# Phase 17 Plan 03: Rental Lifecycle UI Summary

**Three admin components landing the UI face of rental lifecycle: RecordPaymentDialog (paymentMethod selection), MarkReturnedDialog (conditionOnReturn capture), and RentalsTable (tabbed Active + Late Fee view with Returns Due section keyed off wardrobeReturnReminderDays setting)**

## Performance

- **Duration:** 4min
- **Started:** 2026-05-29T18:18:39Z
- **Completed:** 2026-05-29T18:23:07Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments

- **RecordPaymentDialog**: RHF + `z.nativeEnum(PaymentMethod)` schema. Single Select field (Venmo / Zelle / Cash, default Venmo). Calls `admin.wardrobeRequests.markPaymentReceived` and double-invalidates `listRequests` + `listRentals` so the awaiting-payment tab clears AND the new rental appears in `RentalsTable`. Emerald submit; navy `#1a3a5c` title.
- **MarkReturnedDialog**: RHF + `z.string().min(1).max(2000)` `conditionOnReturn` textarea. Calls `admin.wardrobeRentals.markReturned` and single-invalidates `listRentals`. Cyan submit. Toast guides admin to "release deposit when ready" (Pitfall 8: dress stays RENTED until release).
- **RentalsTable**: Two-tab top-level shell — **Active** (paymentStatus IN [PAID, RETURNED]) and **Late Fee** (paymentStatus = LATE_FEE_OWED). The Active tab splits internally into a **Returns Due** section (cyan-700 header, `endDate` within `wardrobeReturnReminderDays` of now from `wardrobeSettings.get`) and an **All Active Rentals** section. Per-row actions wired exactly per the state machine matrix in research Pitfall 8.

## Task Commits

Each task was committed atomically:

1. **Task 1: RecordPaymentDialog** — `b5f7cc0` (feat)
2. **Task 2: MarkReturnedDialog** — `f8f2e08` (feat)
3. **Task 3: RentalsTable** — `8b41e73` (feat)

## Files Created/Modified

### Created
- `src/features/wardrobe/components/admin/RecordPaymentDialog.tsx` (151 lines) — Mark-as-paid dialog
- `src/features/wardrobe/components/admin/MarkReturnedDialog.tsx` (143 lines) — Return-recording dialog
- `src/features/wardrobe/components/admin/RentalsTable.tsx` (411 lines) — Tabbed rentals admin view + co-located Section/RentalRows/LoadingState/EmptyState sub-components

## Final Component Contracts

### `RecordPaymentDialogProps`
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  dressTitle: string;
  studentName: string;
}
```
Submits `{ requestId, paymentMethod: PaymentMethod }` to `markPaymentReceived`. Default `PaymentMethod.VENMO`. UI primitive: **Select** (radio-group not exported by `components/ui`). Toast on success: `"${studentName}'s rental for "${dressTitle}" is now active."`

### `MarkReturnedDialogProps`
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentalId: string;
  dressTitle: string;
  studentName: string;
}
```
Submits `{ rentalId, conditionOnReturn: string }` to `markReturned`. Min length 1; placeholder copy demonstrates damage-noting convention. Toast on success: `"${dressTitle} returned by ${studentName}. Inspect and release deposit when ready."`

### `RentalsTable` (no props)
Self-contained surface. Owns:
- 3 useQuery calls: `wardrobeSettings.get`, `listRentals({ paymentStatus: ["PAID","RETURNED"] })`, `listRentals({ paymentStatus: ["LATE_FEE_OWED"] })`
- 2 useMutation calls: `releaseDeposit`, `flagLateFee` (both single-invalidate `listRentals`)
- DialogState for the MarkReturnedDialog mount; opens via `setDialog({ kind: "return", ... })` per-row callback

## Returns-Due Derivation Formula

```typescript
const returnReminderDays = settingsQuery.data?.wardrobeReturnReminderDays ?? 1;
const dueByThreshold = addDays(new Date(), returnReminderDays);
const returnsDue = allActive.filter(
  (r) => r.paymentStatus === "PAID" && isBefore(new Date(r.endDate), dueByThreshold),
);
```

**Fallback when settings query unresolved:** `1` day (matches the Phase 13 default for `wardrobeReturnReminderDays`). RETURNED rentals are intentionally excluded from the Returns Due bucket — they've already been received; admin's next move is release deposit, not chase for return.

## Confirmation Helper Decision

**`showConfirmationToast` (object form) — NOT `showDeleteConfirmation`**

Investigated `src/lib/toast-confirmations.ts`:
- `showDeleteConfirmation(itemType: string, onConfirm: () => void, onCancel?)` — positional, hard-coded "Delete {itemType}?" title and "This action cannot be undone." description
- `showConfirmationToast({ title, description, confirmLabel, cancelLabel, onConfirm, onCancel, duration })` — object form, fully customizable

Neither **release deposit** nor **flag late fee** is destructive in the delete sense (no row removal). `showConfirmationToast` lets us write semantic titles ("Release deposit", "Flag late fee") with explanatory descriptions that name the dollar amount + student. This was a small but load-bearing departure from the plan body which suggested `showDeleteConfirmation` — the helper's signature didn't match the plan's object-form usage example, and the title text "Delete" would have been wrong copy for both actions.

## Brand Color Usage Map

| Element | Color | Rationale |
|---|---|---|
| RecordPaymentDialog submit | `bg-emerald-600 hover:bg-emerald-700` | Payment received = closed/successful action |
| MarkReturnedDialog submit | `bg-cyan-600 hover:bg-cyan-700` | In-flight transition; mirrors primary brand cyan |
| RentalsTable "Mark Returned" button | `bg-cyan-600 hover:bg-cyan-700` | Same semantic as MarkReturnedDialog submit |
| RentalsTable "Release Deposit" button | `bg-emerald-600 hover:bg-emerald-700` | Final-state successful completion |
| RentalsTable "Flag Late Fee" button | `border-rose-200 text-rose-600 hover:bg-rose-50` | Rose outline (not solid) — flagging is attention-getting but reversible |
| Returns Due section header | `text-cyan-700` (vs slate-500 elsewhere) | Urgency emphasis without alarm |
| LATE_FEE_OWED row background | `bg-rose-50` | Visual flag matching rose brand convention |
| Dialog titles | `text-[#1a3a5c]` | Navy editorial header per CLAUDE.md brand sweep |

## Decisions Made

- **Select over RadioGroup** for paymentMethod in RecordPaymentDialog: `radio-group.tsx` is not yet exported by `src/components/ui/`. The plan body explicitly named Select as the fallback. Single-cell footprint of Select is actually cleaner for a three-option enum than three stacked RadioGroupItems.
- **Object-form `showConfirmationToast` over positional `showDeleteConfirmation`**: see above. Plan body assumed the object form on `showDeleteConfirmation`; actual helper signature is positional. The semantic intent of the plan ("two-step confirmation with custom copy") maps cleanly to `showConfirmationToast`.
- **Local `RentalRow` interface**: instead of importing the listRentals output type via `Awaited<ReturnType<...>>` or `RouterOutputs`, declared a local interface mirroring the include block at `wardrobeRequestQueries.ts:407`. Cheap to keep in sync (5 fields) and avoids transitive Prisma type imports in this client component.
- **Default `wardrobeReturnReminderDays = 1` fallback** in client: matches Phase 13's `.default(1)` Zod default exactly. Prevents an empty Returns Due bucket between SSR hydration and the settings query resolving.
- **Null prop contract for `onFlagLateFee`** (`((r: RentalRow) => void) | null`): the LATE_FEE_OWED tab passes `null` because the rentals there are already flagged. `RentalRows` checks `{onFlagLateFee && ... && <Button ... />}` and omits the button entirely. Cleaner than rendering a disabled button with explanatory tooltip; the absence of the button IS the explanation.
- **`bg-rose-50` row background on LATE_FEE_OWED rows** (vs adding a second status badge): the row already shows the badge via `RentalStatusBadge`. Background tint adds a passive at-a-glance scan affordance without competing for primary visual attention.
- **No date sorting client-side**: server already sorts `endDate ASC` per Plan 17-01 (`orderBy: [{ endDate: "asc" }, { createdAt: "asc" }]`). Re-sorting client-side would risk drift between the server's "active" definition and the UI's rendering order.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan-spec confirmation helper signature did not match actual helper**
- **Found during:** Task 3 (RentalsTable confirmation handlers)
- **Issue:** Plan body specified `showDeleteConfirmation({ title, description, confirmLabel, onConfirm })` object-form usage; actual signature in `src/lib/toast-confirmations.ts:89` is positional `showDeleteConfirmation(itemType: string, onConfirm: () => void, onCancel?: () => void)` with hard-coded "Delete X?" / "This action cannot be undone." copy. Using `showDeleteConfirmation` would have rendered semantically wrong copy ("Delete X?" for release-deposit and flag-late-fee, which are NOT deletes).
- **Fix:** Used the underlying `showConfirmationToast({ title, description, confirmLabel, onConfirm })` helper directly. The plan explicitly noted "Verify exact signature of the confirmation helper. If the API differs, adapt to match. The contract is: two-step confirmation, brand-consistent, single onConfirm callback that calls the mutation." Did exactly that.
- **Files modified:** `src/features/wardrobe/components/admin/RentalsTable.tsx` (lines 134-155)
- **Verification:** `grep -c "showConfirmationToast"` returns 5 (1 import + 2 helper invocations + 2 inline references in comments)
- **Committed in:** `8b41e73` (Task 3 commit)

**2. [Rule 1 - Biome] Auto-format reflowed long-line ternaries in RentalsTable**
- **Found during:** Task 3 (`npx biome check --write`)
- **Issue:** Hand-formatted multi-line ternary for `RentalsTable` empty/loading states ran wider than Biome's preferred collapse threshold for the tab content branches.
- **Fix:** Ran `npx biome check --write`; auto-collapse applied. Logic unchanged.
- **Files modified:** `src/features/wardrobe/components/admin/RentalsTable.tsx` (multiple ternary expressions)
- **Verification:** `npx biome check` clean (no warnings, no errors).
- **Committed in:** `8b41e73` (Task 3 commit)

**3. [Rule 1 - Biome] Auto-format on dialog files (both)**
- **Found during:** Tasks 1, 2 (`npx biome check --write`)
- **Issue:** Multi-line `<DialogDescription>` body and toast description templates broke onto multiple lines; Biome prefers single-line when fits.
- **Fix:** Ran `npx biome check --write` after each task. Auto-collapse applied. Same family of deviation as 16-01/16-04/16-05/16-07 ADRs — project formatter is canonical.
- **Files modified:** `src/features/wardrobe/components/admin/RecordPaymentDialog.tsx`, `src/features/wardrobe/components/admin/MarkReturnedDialog.tsx`
- **Verification:** Both files pass `npx biome check` clean.
- **Committed in:** `b5f7cc0` (Task 1), `f8f2e08` (Task 2)

---

**Total deviations:** 3 auto-fixed (1 plan-spec helper signature, 2 Biome format)
**Impact on plan:** No semantic change. Plan body anticipated the confirmation helper signature variance; Biome formatting is the project's canonical style. No scope creep.

## Issues Encountered

- **Plan verify-step expectation mismatch**: Step 3 of the plan's `<verification>` block stated "Neither RentalsTable nor either dialog is imported by any page yet... `grep -r "RentalsTable\|RecordPaymentDialog\|MarkReturnedDialog" src/app/` returns no hits." Actual state: `src/app/(protected)/admin/wardrobe/rentals/page.tsx` already exists from prior scaffolding and imports `RentalsTable`. This is harmless — the export I created satisfies the import and removes a pre-existing TypeScript error. Plan likely written before the page stub was in place; my landing of `RentalsTable` is the unblock, not a verification failure.

## RadioGroup vs Select Decision

**Result: Select primitive used.**

Investigated `src/components/ui/`:
- `radio-group.tsx` — **does not exist**
- `select.tsx` — exists, Radix-based, supports `value` + `onValueChange` Controller wiring identically

The plan body explicitly anticipated this ("If RadioGroup primitive doesn't exist, fall back to `<Select>` with the same three options — same Controller wiring, different render prop body.") and the fallback was clean. Three SelectItem children for VENMO / ZELLE / CASH; Controller wires `field.value` + `field.onChange` to the Radix Select.

## User Setup Required

None — no new external service config or env vars introduced.

## Next Phase Readiness

- **Plan 17-04 (admin requests page)** can now mount `RequestQueueTable` (built by Plan 17-02) which will import `RecordPaymentDialog` for the Awaiting-Payment tab. Wiring contract: `<RecordPaymentDialog open={...} onOpenChange={...} requestId={req.id} dressTitle={req.Dress.title} studentName={req.Student.User.name ?? req.Student.User.email} />`.
- **Plan 17-05 (admin rentals page)** already has its page.tsx scaffold in place at `/admin/wardrobe/rentals` importing `RentalsTable`. The plan just needs to verify the page renders + add any role-gate chrome.
- **Plan 17-02 (admin requests queue)** still needed to build `RequestQueueTable` and `RespondDialog`. Phase 17 currently 2/5 plans shipped (17-01 backend, 17-03 UI components).
- **Phase 17 backend (Plan 17-01) procedures all have UI consumers after this plan ships**: `markPaymentReceived` (RecordPaymentDialog), `listRentals` (RentalsTable x2), `markReturned` (MarkReturnedDialog), `releaseDeposit` (RentalsTable handler), `flagLateFee` (RentalsTable handler). Only `listRequests` + `respondToRequest` still await UI — those land in Plan 17-02.
- **Pre-existing blockers** (not introduced here): `src/components/landing/IceParticles.tsx` missing `three` types declaration; out of scope for Phase 17.

---
*Phase: 17-admin-rental-lifecycle*
*Completed: 2026-05-29*
