---
phase: 18-self-serve-consignment
plan: 04
subsystem: ui
tags: [react, trpc, radix, tailwind, brand-sweep, admin-moderation, discriminated-union, stub-then-swap]

# Dependency graph
requires:
  - phase: 18-self-serve-consignment
    provides: "Plan 18-02 — admin.wardrobe.{listPendingApproval, approveDress, rejectDress} TRPC procedures (stub-then-swap until they land)"
  - phase: 14-admin-wardrobe-management
    provides: "CategoryBadge component, navy/cyan/rose brand convention, Phase 14-05 plain-img + biome-ignore precedent"
  - phase: 17-admin-rental-lifecycle
    provides: "Discriminated dialog state union pattern (RequestQueueTable.tsx — dialog.kind: 'none' | A | B)"
provides:
  - "PendingApprovalQueue — CONSIGN-06 admin moderation table (query + table + dialog state + empty/loading states)"
  - "ApproveDressDialog — CONSIGN-07 approval modal with optional commission % override"
  - "RejectDressDialog — CONSIGN-08 rejection modal with required reason textarea"
  - "Stub-then-swap pattern formalized for cross-wave parallel execution against missing TRPC procedures"
affects:
  - "18-02 — once landed, the three `(api.admin.wardrobe as any).X` casts in these files swap to direct property access"
  - "18-07 — mounts <PendingApprovalQueue /> on /admin/wardrobe/pending-approval/page.tsx"
  - "21-storybook — three new components are standalone testable in isolation"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stub-then-swap (cross-wave): when a sibling-plan TRPC procedure isn't on disk at type-check time, cast the api/utils paths to `(... as any)` and add a docblock NOTE naming the upstream plan and the swap target. Same family as Plan 17-02's PaymentPlaceholderDialog stub → 17-03 RecordPaymentDialog real-import swap."
    - "Discriminated dialog state union extended to a third composite (PendingApprovalQueue) — `dialog.kind: 'none' | 'approve' | 'reject'` with row-typed payload; same shape as 17-02 RequestQueueTable's `dialog.kind: 'none' | 'respond' | 'payment'`."
    - "Row interface declared adjacent to the table component (mirrors 17-03 RentalsTable) instead of pulling RouterOutputs<...>; explicit comment-reference to the upstream include block keeps sync surface obvious for future drift checks."
    - "Per-row Button Reject (rose-outline) + Approve (cyan-solid) ordering = destructive-left / confirm-right. Reusable for any list with binary moderation actions."

key-files:
  created:
    - "src/features/wardrobe/components/admin/ApproveDressDialog.tsx"
    - "src/features/wardrobe/components/admin/RejectDressDialog.tsx"
  modified:
    - "src/features/wardrobe/components/admin/PendingApprovalQueue.tsx (overwrote Plan 18-07 stub with real implementation)"

key-decisions:
  - "Stub-then-swap with `(api.admin.wardrobe as any).{approveDress,rejectDress,listPendingApproval}` casts — Plan 18-02 procedures not yet on disk at type-check time; same family as 17-02→17-03 PaymentPlaceholderDialog precedent"
  - "Plain comment over biome-ignore for `as any` — Biome 2.x does NOT flag `(x as any)` as noExplicitAny, so the suppression triggers `suppressions/unused`; replaced with a plain docblock comment naming the stub-then-swap rationale"
  - "Row interface (QueueRow) declared adjacent to PendingApprovalQueue (not RouterOutputs<typeof appRouter>) — same 17-03 RentalsTable convention; sync target is the Plan 18-02 listPendingApproval include block"
  - "createdAt typed as `Date | string` to absorb both serialized (TRPC over HTTP) and Date (direct invocation) shapes — `new Date(row.createdAt)` is the one normalization site"
  - "Loading skeleton + empty state both render the same luxury card chrome (rounded-xl + slate-200 border + luxury double-shadow) — table + skeleton + empty all share the same outer wrapper so layout doesn't jolt between states"
  - "Empty state copy is `All caught up` + `No dresses pending approval.` + explanatory subtext — celebratory framing for a queue that's literally empty by virtue of admin work; matches the 16-04 CTA-in-card-shell empty-state convention"
  - "ApproveDressDialog override input is a controlled-string `overrideRaw` with derived `overrideNum`/`overrideValid`, NOT RHF — single optional integer doesn't justify zod-resolver overhead; mirrors 14-04's `valueAsNumber` pattern but inverted (manual parse instead of RHF coercion) for the optional case"
  - "RejectDressDialog reason is a controlled-string `reason` with trim-then-validate (min 1, max 2000) — matches Plan 18-02's expected server contract; live counter shows `reason.length`/MAX with raw length (not trimmed) for honest UX"
  - "ApproveDressDialog invalidates BOTH `listPendingApproval` AND `wardrobe.list` (full inventory) — approved dress flips from PENDING_APPROVAL to AVAILABLE, so the inventory grid view must refetch too; RejectDressDialog mirrors (rejected dress stays PENDING_APPROVAL with rejectionReason set, but the queue surface and inventory grid both lose/gain it depending on tab filter)"
  - "Discriminated dialog payload carries the full QueueRow (not just id+title) — currentCommissionPct is the third required field for ApproveDressDialog's `Leave blank to keep ({pct}%)` UX; passing the whole row avoids prop-drilling discipline drift if future fields are added"

patterns-established:
  - "Stub-then-swap (cross-wave) — sibling-plan-procedures-not-yet-on-disk: cast api/utils paths to `(... as any)` + docblock NOTE naming upstream plan + swap target. Reusable for any wave-N component depending on wave-M (M<=N) backend deliverables."
  - "Plain comment over biome-ignore for `as any` — Biome 2.x doesn't trigger noExplicitAny on `as any` casts, so the suppression is unused and itself becomes a lint warning. When marking an intentional `as any`, use a plain `//` comment instead of `// biome-ignore`."
  - "Triple-state shared chrome — loading skeleton, empty state, and populated table all render inside identical outer wrappers (luxury card with shadow). Reusable for any data-driven surface where state transitions shouldn't cause layout reflow."
  - "Discriminated dialog state extended to N modals — `dialog.kind: 'none' | A | B | ...` with row-typed payloads. Pattern from 17-02 RequestQueueTable now battle-tested across 2 admin composites."

# Metrics
duration: 4m
completed: 2026-05-29
---

# Phase 18 Plan 04: Admin Pending-Approval Queue UI Summary

**Three-component admin moderation surface (PendingApprovalQueue table + ApproveDressDialog with optional commission override + RejectDressDialog with required reason) using discriminated dialog state union and stub-then-swap against Plan 18-02's not-yet-landed TRPC procedures**

## Performance

- **Duration:** 4 min 17 sec
- **Started:** 2026-05-29T19:07:42Z
- **Completed:** 2026-05-29T19:12:00Z
- **Tasks:** 2
- **Files created:** 2 (ApproveDressDialog.tsx, RejectDressDialog.tsx)
- **Files modified:** 1 (PendingApprovalQueue.tsx — overwrote Plan 18-07 stub)

## Accomplishments

- **CONSIGN-06 surface live**: PendingApprovalQueue mounts `api.admin.wardrobe.listPendingApproval` and renders a 7-column table (Image / Title / Owner / Category / Submitted / Commission % / Actions) sorted createdAt ASC server-side. Per-row Reject (rose outline) + Approve (cyan solid) buttons open the correct dialog with the full QueueRow payload via discriminated state.
- **CONSIGN-07 surface live**: ApproveDressDialog accepts an optional commission % override (0–100 integer with live `aria-invalid` validation), defaults to the current pct shown as placeholder, calls `approveDress` on submit, double-invalidates `listPendingApproval` + `wardrobe.list`, toasts success with "now live on the YM Wardrobe catalog" copy.
- **CONSIGN-08 surface live**: RejectDressDialog requires a non-empty trimmed reason (max 2000 chars with live `reason.length`/MAX counter), submits via `rejectDress`, double-invalidates the same two queries, toasts success with "returned to the consigner with your reason" copy. Reason flows into Plan 18-01's `Dress.rejectionReason` column (server-side, Plan 18-02 deliverable).
- **Stub-then-swap protocol formalized**: Three TRPC paths (`approveDress`, `rejectDress`, `listPendingApproval`) cast to `(api.admin.wardrobe as any)` with docblock NOTEs naming Plan 18-02 as the upstream and the trivial swap once it lands. Same family as 17-02→17-03 PaymentPlaceholderDialog stub→real-import precedent.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ApproveDressDialog + RejectDressDialog** — `a929327` (feat)
2. **Task 2: Create PendingApprovalQueue** — `35d1b6b` (feat)

_Note: `35d1b6b` accidentally swept in `MyConsignedDressesList.tsx` from Plan 18-05's parallel-wave staging; documented as Deviation 1 below. Plan 18-05's `644dac5` followed up with the canonical landing._

## Files Created/Modified

- `src/features/wardrobe/components/admin/ApproveDressDialog.tsx` — Approval modal (controlled `overrideRaw` string + derived `overrideNum`/`overrideValid`, reset-on-close, navy title, cyan submit, dual-query invalidation)
- `src/features/wardrobe/components/admin/RejectDressDialog.tsx` — Rejection modal (controlled `reason` string with trim-then-validate, live counter, reset-on-close, navy title, rose-600 submit, dual-query invalidation)
- `src/features/wardrobe/components/admin/PendingApprovalQueue.tsx` — Overwrote Plan 18-07's import-resolution stub with real moderation table (query + 7-column table + per-row actions + discriminated dialog state + loading skeleton + empty state, all under shared luxury-card chrome)

## Decisions Made

See `key-decisions` in frontmatter. The two most consequential:

1. **Stub-then-swap with `(api.admin.wardrobe as any)` casts** — Plan 18-02's TRPC procedures (`approveDress`, `rejectDress`, `listPendingApproval`) weren't on disk at type-check time. Casting the api/utils paths to `any` keeps this plan's files type-correct; the trivial swap once 18-02 lands is a 6-line refactor across the three files. Same family as 17-02→17-03 PaymentPlaceholderDialog precedent.
2. **Plain comment over `biome-ignore` for the `as any` casts** — Biome 2.x does NOT flag `(x as any)` as `noExplicitAny`, so the suppression comment itself triggered `suppressions/unused` warnings. Replaced four `// biome-ignore lint/suspicious/noExplicitAny: ...` comments with plain `// Stub-then-swap (Plan 18-02 sibling): ...` docblock comments. Same family as Plan 15-03's precautionary-suppression removal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 18-07 had already created a stub `PendingApprovalQueue.tsx` to keep its route shell import-resolvable**

- **Found during:** Task 2 (Create PendingApprovalQueue)
- **Issue:** The file already existed as a 21-line stub with the docblock `// STUB — placeholder until Plan 18-04 ships the real implementation. ... When Plan 18-04 lands, this file is overwritten with the real PendingApprovalQueue ...`. `Write` initially failed because Read hadn't been called on the existing file first.
- **Fix:** Read the stub, confirmed the docblock literally instructed overwrite, then Wrote the real implementation. The stub's docblock exactly anticipated this scenario.
- **Files modified:** `src/features/wardrobe/components/admin/PendingApprovalQueue.tsx`
- **Verification:** Final file contains the real 192-line implementation; the stub's exit signature is preserved (still default-exports `PendingApprovalQueue`).
- **Committed in:** `35d1b6b` (Task 2 commit)

**2. [Rule 1 - Bug] Unused `biome-ignore lint/suspicious/noExplicitAny` suppression comments triggered `suppressions/unused` warnings**

- **Found during:** Task 1 (Create ApproveDressDialog + RejectDressDialog), exposed by `npx biome check`
- **Issue:** Biome 2.x does NOT flag `(api.admin.wardrobe as any).x.y` as `noExplicitAny`, so the suppression comments themselves became unused-suppression diagnostics (1 in ApproveDressDialog, 2 in RejectDressDialog after auto-format, 2 in PendingApprovalQueue at write time).
- **Fix:** Replaced all 4 `// biome-ignore lint/suspicious/noExplicitAny: ...` comments with plain `// Stub-then-swap (Plan 18-02 sibling): ...` docblock comments. The stub-then-swap rationale is preserved in human-readable form; lint passes cleanly.
- **Files modified:** `ApproveDressDialog.tsx`, `RejectDressDialog.tsx`, `PendingApprovalQueue.tsx`
- **Verification:** `npx biome check src/features/wardrobe/components/admin/{ApproveDressDialog,RejectDressDialog,PendingApprovalQueue}.tsx` → "Checked 3 files. No fixes applied." with zero warnings.
- **Committed in:** `a929327` (dialogs) and `35d1b6b` (queue)

**3. [Rule 1 - Sequence Bug] Biome auto-formatted RejectDressDialog's DialogFooter Cancel button onto a single line**

- **Found during:** Task 1 (after `biome check`)
- **Issue:** Plan body's multi-line `<Button variant="outline" onClick={...} disabled={...}>` (4 lines) was collapsed by Biome to a single-line invocation. Same family of formatter reflow as 16-01/16-04/16-05/17-01/17-02/17-03 ADR deviations.
- **Fix:** Accepted Biome's collapse via `biome check --write`. Logic untouched; formatter is project-canonical.
- **Files modified:** `RejectDressDialog.tsx`
- **Verification:** Final file lint-clean; component renders identically.
- **Committed in:** `a929327` (Task 1 commit)

**4. [Rule 1 - Bug] Task 2 commit (`35d1b6b`) accidentally bundled `MyConsignedDressesList.tsx` from Plan 18-05's parallel wave**

- **Found during:** Task 2 post-commit `git show --stat HEAD` inspection
- **Issue:** Despite calling `git add src/features/wardrobe/components/admin/PendingApprovalQueue.tsx` with a specific file path, the resulting commit included `src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx` (274 insertions). This appears to be a parallel-wave staging race — Plan 18-05's child agent was finalizing the same file in another shell when my Task 2 commit ran.
- **Fix:** None applied (no rewrite). Plan 18-05's follow-up commit `644dac5` ("feat(18-05): add MyConsignedDressesList consigner landing surface") effectively re-landed the file as the canonical commit, and the file remains in the working tree at its final shape. Plan 18-05 owns the file functionally regardless of which commit hash technically introduced it. Documented here so future bisect against Phase 18 references the right commit hash for ownership semantics.
- **Files modified:** `src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx` (accidentally co-committed; later canonically landed)
- **Verification:** `git log --oneline -5` shows `644dac5` as the authoritative 18-05 landing; my plan's `35d1b6b` carries the accidental snapshot.
- **Committed in:** `35d1b6b` (incidental); canonical owner is `644dac5`

---

**Total deviations:** 4 auto-fixed (1 Rule 3 blocking [stub overwrite], 3 Rule 1 bugs [unused suppressions, Biome reflow, accidental sibling-plan file bundle])
**Impact on plan:** All 4 deviations resolved automatically. The three planned components ship at correct shape; the cross-wave file-bundle deviation (#4) is a workflow-coordination artifact that does not affect functional correctness. No scope creep.

## Issues Encountered

- **Parallel-wave staging race**: Plans 18-02, 18-03, 18-05, 18-07 all ship in Wave 2 alongside 18-04. During Task 2's commit, another plan's agent was mid-finalize on `MyConsignedDressesList.tsx`, and the file landed in `35d1b6b` despite explicit single-file `git add`. Documented as Deviation 4 above; functionally inert since 18-05's canonical commit `644dac5` followed shortly after.
- **`Write` on existing stub file required Read first**: First `Write` attempt on `PendingApprovalQueue.tsx` errored because Plan 18-07 had already created the stub. Read+overwrite resolved cleanly; the stub's docblock literally instructed this exact action ("When Plan 18-04 lands, this file is overwritten with the real PendingApprovalQueue").

## User Setup Required

None — no external service configuration required. All three components are pure client-side React + Radix primitives; no env vars, no API keys, no third-party services.

## Next Phase Readiness

**Plan 18-04 surface is complete and ready for Plan 18-07's mount.** Once Plan 18-02's `admin.wardrobe.{listPendingApproval, approveDress, rejectDress}` TRPC procedures land, the three `(api.admin.wardrobe as any)` casts in these files trivially swap to direct property access (4-token diff per cast × 4 casts = ~16 tokens of cleanup across the 3 files). Plan 18-07's `/admin/wardrobe/pending-approval/page.tsx` thin-client-shell route can now `<PendingApprovalQueue />` and the full CONSIGN-06/07/08 user flow becomes verifiable end-to-end.

**Blockers/concerns carried forward:**
- Plan 18-02 TRPC procedures must land for the `as any` swap. Their absence does NOT block runtime — the queries will return HTTP errors with no procedure handler, surfacing as TRPC error toasts in the UI. Stub-then-swap protocol explicitly accepts this transient state.
- `MyConsignedDressesList.tsx` accidentally lives in 18-04's `35d1b6b` AND 18-05's `644dac5`; git blame should treat `644dac5` as the canonical author for any future archaeology.
- 4-line plan-body grep verification spec named `"approveDress.useMutation"` (not `"approveDress\\.useMutation"`); both forms grep the same content, no functional impact. Future grep specs should escape periods consistently.

---
*Phase: 18-self-serve-consignment*
*Completed: 2026-05-29*
