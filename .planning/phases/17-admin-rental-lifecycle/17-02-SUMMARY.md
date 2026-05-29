---
phase: 17-admin-rental-lifecycle
plan: 02
subsystem: ui
tags: [react-hook-form, zod, sonner, dialog, trpc-mutation, admin, wardrobe, rental-request, tabs]

# Dependency graph
requires:
  - phase: 17-admin-rental-lifecycle
    provides: admin.wardrobeRequests.{listRequests, respondToRequest} TRPC procedures (Plan 17-01)
  - phase: 17-admin-rental-lifecycle
    provides: RecordPaymentDialog component (Plan 17-03 — shipped in parallel; landed mid-execution)
  - phase: 16-detail-and-request
    provides: RentalStatusBadge exhaustive-Record component (Plan 16-03)
  - phase: 16-detail-and-request
    provides: Controlled-modal open/onOpenChange seam (Plan 16-05 RequestRentalDialog)
provides:
  - "RequestResponseDialog: RHF + Zod admin approve/decline dialog, posts respondToRequest, invalidates listRequests, resets on close"
  - "RequestQueueTable: tabbed admin queue (PENDING + Awaiting-Payment) with per-row Approve/Decline/Mark-Paid CTAs"
  - "Discriminated `dialog` union pattern for multi-modal controlled state in a single composite"
affects:
  - "Plan 17-04 already shipped /admin/wardrobe/requests/page.tsx mounting RequestQueueTable — now compiles and renders end-to-end"
  - "Phase 16-07's My Rentals 'Approved' tab will populate the moment an admin runs APPROVE through this dialog"
  - "Phase 16-07's 'Active' tab will populate the moment an admin runs Mark Paid → RecordPaymentDialog (Plan 17-03)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated `dialog` state union ({kind: 'none' | 'respond' | 'payment'}) for multi-modal composites — extends 16-05's single-modal controlled pattern"
    - "Two co-located, non-exported row tables (PendingTable + AwaitingPaymentTable) within one composite — same private-co-location convention as 16-04 FitBarRow / 16-07 RequestRow+RentalRow"
    - "Mode-discriminated unified dialog (single component, two visual modes via `decision` prop) — replaces two-dialog duplication for shared validation/mutation/lifecycle flows"

key-files:
  created:
    - "src/features/wardrobe/components/admin/RequestResponseDialog.tsx"
    - "src/features/wardrobe/components/admin/RequestQueueTable.tsx"
  modified: []

key-decisions:
  - "Single RequestResponseDialog discriminated by `decision: APPROVE | DECLINE` prop — shared schema/mutation/onSuccess/onClose; only copy + submit color diverge"
  - "Module-level Zod schema (responseSchema) — stable zodResolver reference across renders; required min(1).max(1000) per Plan 17-01 server contract"
  - "Reset-on-close in BOTH dialog onOpenChange handler AND mutation onSuccess — stale message between opens fully eliminated (Pitfall 8 family)"
  - "QueueRequestRow narrowed structural subset of admin.wardrobeRequests.listRequests per-item output — interface declares only fields the rows consume; same narrowing-by-usage as 16-07 RequestRowProps / 15-05 DressCardProps"
  - "Two co-located PendingTable + AwaitingPaymentTable sub-components (NOT a parameterized table) — they diverge on actions AND on which query backs them; private to the file, not exported"
  - "Separate React Query keys per tab (status: PENDING + status: APPROVED) — each tab caches independently; no tab-switching loading flash"
  - "Mark Paid → RecordPaymentDialog import direct (no lazy / dynamic) — plan body specified the seam; works because Plan 17-03 shipped its interface with the exact open/onOpenChange/requestId/dressTitle/studentName prop shape the queue passes"
  - "Server-side count (pendingQuery.data.total) drives tab pill counts — never computed client-side from .requests.length"
  - "No pagination controls in this plan (limit: 50 covers MVP) — polish-pass concern"
  - "No column sorting client-side — server orderBy from Plan 17-01 (competitionDate ASC NULLS LAST, createdAt ASC) is the source of truth"

patterns-established:
  - "Multi-dialog composite pattern: `dialog: {kind: 'none' | A | B | ...}` discriminated union + `<Component kind=A />` JSX gated by `dialog.kind === 'A'` — extends single-modal controlled-state from 16-05 to N modals in one composite"
  - "Mode-discriminated dialog: when two dialog modes share validation/mutation/lifecycle, ship ONE component with a `mode: 'A' | 'B'` prop; only copy + visual deltas diverge in JSX. Applies whenever the form schema + mutation + onSuccess invalidation are identical"

# Metrics
metrics:
  duration: ~25min
  files-created: 2
  files-modified: 0
  commits: 3
  completed: 2026-05-29

deviations:
  - rule: "Rule 3 (then resolved)"
    description: "Plan body required direct `import { RecordPaymentDialog } from './RecordPaymentDialog'` but at Task 2 start the file was not on disk (Plan 17-03 still in flight). Initial commit shipped a co-located PaymentPlaceholderDialog stub with the same prop shape to keep tsc green; immediately after, 17-03's RecordPaymentDialog landed on disk (commit b5f7cc0). A third refactor commit (3fe3b69) swapped the placeholder for the real import in a 4-insert / 57-delete diff — exactly the 'trivial swap' the docblock promised. Final file matches the plan's prescribed JSX shape."
  - rule: "Rule 1 (Biome auto-fix)"
    description: "Plan-spec ternaries used `!x ? loadingOrEmpty : table` form; Biome's `useNegatedCondition` (or similar) flipped them to `x ? table : loadingOrEmpty`. Logic identical. Same family as 16-01/16-04/16-05 ADRs — project formatter is canonical."
  - rule: "Rule 1 (CategoryBadge removal)"
    description: "Plan body's `<CategoryBadge category={'COMPETITION_DRESS' as never} />` JSX would have been invalid — DressCategory enum has no `COMPETITION_DRESS` variant (actual values: CLASSICAL/DRAMATIC/THEMED/ICE_DANCE_PARTNER/ICE_DANCE_SINGLE/COMPETITION/TEST), and the listRequests server select does NOT include `category`. Removed the CategoryBadge usage entirely from PendingTable's Title cell. Plan's column list (Image / Dress title+size+color / Student / Rental Type / Dates / Message / Status / Actions) is preserved exactly without it."
  - rule: "Concurrent-execution coupling"
    description: "Phase 17 ran in parallel with multiple agents. Plans 17-03, 17-04, and 17-05 shipped during this plan's execution. Task 2's commit (53d34f6) also incorporated already-staged STATE.md updates and a 17-04-SUMMARY.md from the parallel work — not a deviation per se but worth surfacing for audit traceability."

confirmation:
  - "No page-level files touched in this plan. The /admin/wardrobe/requests/page.tsx route shell was shipped separately by Plan 17-04 (commit 8cb00c6) and already imports RequestQueueTable from the path this plan created."
  - "Both files biome-clean. `npx tsc --noEmit` produces only the pre-existing IceParticles three-types blocker; zero diagnostics in this plan's surface."
---

# Phase 17 Plan 02: Admin Request Queue UI Summary

**One-liner:** Two components shipped — a unified RequestResponseDialog (RHF + Zod, mode-discriminated APPROVE/DECLINE) and a tabbed RequestQueueTable (PENDING + Awaiting-Payment queries) — closing ADMIN-04/05/06 and wiring the page that Plan 17-04 already mounted at `/admin/wardrobe/requests`.

## Final prop shapes

**RequestResponseDialog**
```ts
export interface RequestResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  decision: "APPROVE" | "DECLINE";
  dressTitle: string;
  studentName: string;
}
```

**RequestQueueTable** — zero props (self-contained composite; queries + dialog state live inside).

## Tab structure

| Tab               | Backing query                                                      | Empty state                       | Row CTAs                            |
| ----------------- | ------------------------------------------------------------------ | --------------------------------- | ----------------------------------- |
| Pending           | `admin.wardrobeRequests.listRequests({ status: PENDING, ... })`    | "No pending requests"             | Approve (emerald) + Decline (rose)  |
| Awaiting Payment  | `admin.wardrobeRequests.listRequests({ status: APPROVED, ... })`   | "No requests awaiting payment"    | Mark Paid (cyan) → RecordPaymentDialog |

Each tab pill shows the server-side count (`pendingQuery.data.total` / `approvedQuery.data.total`).

## Brand color usage

| Surface                              | Color                          |
| ------------------------------------ | ------------------------------ |
| Dialog title text                    | navy `#1a3a5c`                 |
| Dress title in row                   | navy `#1a3a5c`                 |
| Approve button (filled)              | `bg-emerald-600 hover:bg-emerald-700 text-white` |
| Decline button (outline)             | `border-rose-200 text-rose-700 hover:bg-rose-50` |
| Decline submit (dialog)              | `bg-rose-600 hover:bg-rose-700 text-white` |
| Mark Paid button                     | `bg-cyan-600 hover:bg-cyan-700 text-white` |
| Card shell (both tables)             | `rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]` |
| Rental-type pill (neutral)           | `bg-slate-50 text-slate-700`   |
| Status pill                          | via `RentalStatusBadge` (emerald/cyan/amber/violet/rose/slate per 16-03) |

## Confirmation

- `RequestQueueTable.tsx` mounted at `src/app/(protected)/admin/wardrobe/requests/page.tsx` (Plan 17-04 shipped the page in parallel).
- `RequestResponseDialog.tsx` consumed only by `RequestQueueTable`.
- `RecordPaymentDialog.tsx` (Plan 17-03) consumed by `RequestQueueTable` for the Mark Paid surface.
- No page-level files touched by this plan.
- All grep verify counts pass:
  - `respondToRequest.useMutation` in RequestResponseDialog = 1
  - `utils.admin.wardrobeRequests.listRequests.invalidate` = 1
  - `form.reset` ≥ 2 (4)
  - `wardrobeRequests.listRequests.useQuery` in RequestQueueTable = 2
  - `RentalStatusBadge` ≥ 2 (3)
  - `setDialog` ≥ 4 (5)

## Commits

- `177b616` — feat(17-02): add RequestResponseDialog for admin approve/decline flow
- `53d34f6` — feat(17-02): add RequestQueueTable with PENDING + Awaiting-Payment tabs (initial — with PaymentPlaceholderDialog stub)
- `3fe3b69` — refactor(17-02): swap PaymentPlaceholderDialog for shipped RecordPaymentDialog

## Next steps

- Plan 17-05 already shipped (active rentals UI commits: f8f2e08, 8b41e73, 96a1279).
- Phase 17 status: all 5 plans now have shipped artifacts (17-01 backend, 17-02 request queue UI, 17-03 payment + return dialogs, 17-04 requests route, 17-05 rentals route).
- Outstanding: live verification of the full lifecycle on a running `pnpm dev` instance — PENDING → APPROVE → Mark Paid → RETURNED → DEPOSIT_RELEASED.
