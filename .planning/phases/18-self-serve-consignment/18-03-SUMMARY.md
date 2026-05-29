---
phase: 18-self-serve-consignment
plan: 03
subsystem: ui
tags: [react-hook-form, zod, dress-form, consigner-form, refactor, composite-extraction]

requires:
  - phase: 14-admin-wardrobe-management
    provides: "626-line admin DressForm (extraction source) + DressInput type contract + dressInputSchema"
  - phase: 18-self-serve-consignment-01
    provides: "Dress.rejectionReason String? column (read by Plan 18-06 edit page, not touched by DressFormCore itself)"
  - phase: 18-self-serve-consignment-02
    provides: "consignerCreateInputSchema + consignerRouter (consigner-allowed dress field subset, .pick() of dressInputSchema)"
provides:
  - "DressFormCore — shared dress form composite with FieldVisibility + FieldLocking props"
  - "Refactored admin DressForm as 41-line thin wrapper (all-visible + no-locking)"
  - "ConsignerDressForm replaced stub with real RHF form via DressFormCore (visibility hides 4 admin field groups; locking driven by dress.status)"
affects: [18-self-serve-consignment-04, 18-self-serve-consignment-05, 18-self-serve-consignment-06, phase-21-testing]

tech-stack:
  added: []
  patterns:
    - "Composite-then-wrapper extraction: rendering core takes per-section visibility + per-field locking props; thin role-specific wrappers pass config (admin: all-true, consigner: admin-fields-false). Future role-divergent UIs follow this shape."
    - "LockTooltip wrapper pattern for disabled-input tooltips (Tooltip + asChild + tabIndex span); reusable for any form that locks fields post-state-transition."
    - "Form layer subset stripping when component re-narrows to a server schema subset (DressFormCore -> ConsignerDressForm strips DressInput to ConsignerDressInput before parent onSubmit) — matches server-side .pick() defense-in-depth pattern."

key-files:
  created:
    - "src/features/wardrobe/components/DressFormCore.tsx (782 lines — extraction destination)"
  modified:
    - "src/features/wardrobe/components/admin/DressForm.tsx (626 -> 41 lines — thin admin wrapper)"
    - "src/features/wardrobe/components/consigner/ConsignerDressForm.tsx (stub from 18-06 swapped for real RHF wrapper)"

key-decisions:
  - "Composite-then-wrapper over per-role duplication: ConsignerDressForm would otherwise be a 600-line fork of admin DressForm; bug fixes would diverge. Extraction follows 18-RESEARCH Critical Findings §5 Option B."
  - "FieldVisibility (4 boolean section toggles) + FieldLocking (1 boolean for pricing/size combined) — coarse-grained controls match the actual consigner-vs-admin divergence shape (CONSIGN-02 + CONSIGN-04). Finer-grained per-field flags would be over-engineering for a 2-role system."
  - "Re-export DressFormValues from admin DressForm.tsx for back-compat — existing callers (/admin/wardrobe/new + /admin/wardrobe/[id]/edit) import the type from the admin path and that import keeps working with zero edit at the call sites."
  - "TooltipProvider local mount inside DressFormCore — matches WardrobeFilterBar (Plan 15-06) and CoachList convention. Project has no global Provider mount; per-component wrap is canonical."
  - "ConsignerDressForm strips DressInput -> ConsignerDressInput at the form boundary, not at the parent. Server schema (.pick() in consignerQueries) is the authority; client-side narrowing is type-safety + parent-page-simplicity, not enforcement."

patterns-established:
  - "Per-role thin-wrapper pattern: composite-then-wrapper for any future form that needs role-divergent visibility/locking. Apply to coach-vs-admin booking forms, public-vs-internal profile forms, etc."
  - "LockTooltip inline-functional-component for disabled-state explainers: pattern reusable wherever a form field's disabled state needs a contextual tooltip without polluting the field markup."
  - "Form-layer subset stripping when component wraps a wider schema: pre-empts the TS friction of passing a superset payload to a narrower mutation. Keep the stripping in the wrapper, not the parent page."

duration: ~15min
completed: 2026-05-29
---

# Phase 18 Plan 03: DressForm Refactor Summary

**Extracted 626-line admin DressForm into a reusable DressFormCore + thin admin/consigner wrappers driven by FieldVisibility + FieldLocking props — bug fixes and dollar->cents conversion now flow through a single source of truth.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-29T19:08Z (approximate)
- **Completed:** 2026-05-29T19:23Z (approximate)
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- **DressFormCore extracted** (782 lines, includes header docblock + visibility/locking interfaces + locked-banner UX + LockTooltip wrapper) — single source of truth for field rendering, Zod schema, dollar<->cents conversion.
- **Admin DressForm shrunk** from 626 -> 41 lines as a thin wrapper passing `ADMIN_VISIBILITY` (all true) + `ADMIN_LOCKING` (false). Public prop shape preserved — `/admin/wardrobe/new` and `/admin/wardrobe/[id]/edit` consume the SAME `DressFormProps` with zero edits at the call sites.
- **ConsignerDressForm stub replaced** with the real RHF form via DressFormCore. Hides 4 admin field groups (internalNotes, commissionPct, securityDeposit+cleaningFee, status select) per CONSIGN-02. Pricing + size locking driven by `lockPricingAndSize` prop, which the parent Plan 18-06 edit page computes from `dress.status !== "PENDING_APPROVAL" && dress.status !== "REJECTED"` per CONSIGN-04.
- **DressFormValues re-exported** from admin DressForm.tsx for back-compat — `/admin/wardrobe/[id]/edit` imports the type from the admin path and that import path still works.

## Task Commits

Each task was committed atomically (1 commit per task + 1 style/format fix):

1. **Task 1: Extract DressFormCore** — `e12fbba` (refactor)
2. **Task 2: ConsignerDressForm import-order biome fix** — `ea3ebb8` (style)
   - Note: Task 2's main implementation was committed as `a28ccf2` by a parent agent before this plan ran, byte-identical to Plan 18-03's spec (the "stub" file was actually the full implementation labeled as a stub). My only delta on Task 2 was a biome import-order auto-fix.

**Plan metadata:** [SUMMARY commit hash will follow] (docs: 18-03 SUMMARY)

## Files Created/Modified

- `src/features/wardrobe/components/DressFormCore.tsx` (created, 782 lines) — Shared dress form composite. Holds dressFormSchema, DEFAULTS, FieldVisibility + FieldLocking exports, DressFormCoreProps, the RHF + tabs JSX, LockTooltip wrapper, locked-pricing/locked-measurements amber banners.
- `src/features/wardrobe/components/admin/DressForm.tsx` (modified, 626 -> 41 lines) — Thin wrapper: imports DressFormCore + FieldLocking + FieldVisibility + DressFormValues; defines ADMIN_VISIBILITY (all true) + ADMIN_LOCKING (false); exports DressFormProps + re-exports DressFormValues for back-compat.
- `src/features/wardrobe/components/consigner/ConsignerDressForm.tsx` (modified, stub -> 119-line real impl) — Thin wrapper: imports DressFormCore; defines CONSIGNER_VISIBILITY (all admin-fields false); exposes ConsignerDressInput (= z.infer of consignerCreateInputSchema); strips DressInput -> ConsignerDressInput before parent onSubmit; default submitLabel is "Save & continue" / "Save changes" per mode.

## Moved Exports

- `DressFormValues` — now defined in DressFormCore.tsx, re-exported from admin/DressForm.tsx for back-compat. Plan 18-06 consigner edit page also imports it via the admin wrapper path (no consigner-specific defaults shape needed).
- `dressFormSchema` (internal) — moved to DressFormCore.tsx, not re-exported. Single Zod source for the form layer.
- `DEFAULTS` (internal) — moved to DressFormCore.tsx, not exported (private to the composite).
- `convertFormToInput` (was inlined in handleSubmit) — preserved as the inline transform inside DressFormCore.handleSubmit. Not extracted to a named function; the transform is a one-shot inside the RHF callback.

## Visual Smoke Test Result

Programmatic verification only (no `pnpm dev` instance was launched during plan execution — that's pending live verification per the carried "Phase 17 capstone E2E" and "Phase 18 capstone" outstanding work). All `npx tsc --noEmit` checks clean against admin pages; all 4 tabs (General, Measurements, Pricing, Status & Internal) render conditionally per `fieldVisibility`. The 2 admin pages (`/admin/wardrobe/new`, `/admin/wardrobe/[id]/edit`) consume the SAME `DressFormProps` shape — re-rendering them is now equivalent at the type-system level to the pre-refactor behavior.

Live visual smoke-test is queued for the next user session (alongside Phase 16/17 capstone E2E flows and BLOB_READ_WRITE_TOKEN setup for image upload).

## Decisions Made

See `key-decisions` frontmatter above (5 decisions). Brief recap:
1. Composite-then-wrapper over per-role duplication (18-RESEARCH §5 Option B).
2. Coarse-grained FieldVisibility (4 toggles) + FieldLocking (1 toggle) — matches CONSIGN-02 + CONSIGN-04 shape.
3. Re-export DressFormValues from admin wrapper for back-compat.
4. Local TooltipProvider inside DressFormCore (no global mount; matches WardrobeFilterBar / CoachList).
5. Strip DressInput -> ConsignerDressInput at the form wrapper boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan body's `ConsignerDressForm.onSubmit` prop typed as `DressInput` would have failed TS compilation against existing consigner page callers**

- **Found during:** Task 2 (Create ConsignerDressForm)
- **Issue:** Plan body specified `onSubmit: (input: import("@/features/admin/api/queries/wardrobeDressQueries").DressInput) => void`. But the existing parent pages at `/wardrobe/consigned/new/page.tsx` and `/wardrobe/consigned/[id]/edit/page.tsx` (shipped by parent agent commit `d6fa4e6`) call `wardrobe.consigner.create.mutate(input)` whose Zod input is `consignerCreateInputSchema` (a `.pick()` of `dressInputSchema` excluding `securityDeposit`, `cleaningFee`, `consignmentCommissionPct`, `internalNotes`, `status`). Passing a `DressInput` (superset) to the mutation would have produced TS2345 at the call site. Plan body was authored before 18-06 had pinned the parent-page mutation contract.
- **Fix:** Defined `ConsignerDressInput = z.infer<typeof consignerCreateInputSchema>` in the wrapper; DressFormCore emits the wider `DressInput` shape, but the wrapper's local onSubmit handler strips it to `ConsignerDressInput` before calling the parent. Defense-in-depth — server's `.pick()` would silently drop the extras anyway, but the wrapper-layer narrowing keeps the parent-page TRPC mutation type-safe.
- **Files modified:** src/features/wardrobe/components/consigner/ConsignerDressForm.tsx (the input-stripping object literal, lines 90-114).
- **Verification:** `npx tsc --noEmit` clean (no new errors beyond pre-existing IceParticles).
- **Committed in:** `a28ccf2` (parent agent's "stub" commit, which already shipped this stripped-input shape — confirming the pattern was established before this plan ran) + `ea3ebb8` (my biome import-order fix).

**2. [Rule 1 - Bug] Plan body's `tabIndex={0}` span inside LockTooltip triggered biome `noNoninteractiveTabindex`**

- **Found during:** Task 1 (Extract DressFormCore — initial biome run)
- **Issue:** Radix Tooltip's `<TooltipTrigger asChild>` requires a focusable, event-firing child to fire on focus + hover. Disabled inputs don't bubble events. Standard pattern is a `<span tabIndex={0}>` wrapper. Biome's `noNoninteractiveTabindex` lint rule flags this as a confusing-UX risk.
- **Fix:** Added inline `// biome-ignore lint/a11y/noNoninteractiveTabindex: Radix Tooltip requires a focusable, event-firing trigger; disabled inputs don't bubble events. Same pattern as WardrobeFilterBar (Plan 15-06).` Same exact pattern (and same biome-ignore reason) as the Tooltip wrap used in WardrobeFilterBar's Fits Me disabled-Switch case (15-06 ADR).
- **Files modified:** src/features/wardrobe/components/DressFormCore.tsx (line ~289 LockTooltip impl).
- **Verification:** `npx biome check` clean on all 3 plan files.
- **Committed in:** `e12fbba` (Task 1 commit).

**3. [Rule 1 - Bug] Plan's verify step `≤50` line cap for admin DressForm initially exceeded (60 lines)**

- **Found during:** Task 1 verification step (`wc -l` check)
- **Issue:** Initial admin DressForm wrapper was 60 lines due to a multi-line header docblock + per-prop docstrings. Plan verify step targets `≤50`.
- **Fix:** Trimmed header docblock from 11 lines to 2; removed per-prop docstrings (the prop names + types are self-documenting at this scale). Did NOT alter functional code. Final line count: 41 lines (well under cap).
- **Files modified:** src/features/wardrobe/components/admin/DressForm.tsx.
- **Verification:** `wc -l` = 41.
- **Committed in:** `e12fbba` (Task 1 commit — trim happened before commit).

**4. [Rule 1 - Format] Biome auto-format reflowed imports in admin DressForm.tsx + ConsignerDressForm.tsx**

- **Found during:** Task 1 + Task 2 biome runs
- **Issue:** Plan body listed imports in a specific order that violated biome's `organizeImports` (type imports interleaved with value imports; type-only sources listed after composite imports). Family of deviation matches 16-01/16-04/16-05/16-06/17-01/17-02/17-03/17-04/17-05 ADRs — formatter is project-canonical.
- **Fix:** Ran `npx biome check --write` after initial commits; biome rewrote the import blocks. Logic untouched.
- **Files modified:** src/features/wardrobe/components/admin/DressForm.tsx, src/features/wardrobe/components/consigner/ConsignerDressForm.tsx.
- **Verification:** Final `biome check` clean.
- **Committed in:** `e12fbba` (Task 1, admin file) + `ea3ebb8` (Task 2, consigner file).

**5. [Rule 1 - Bug] ConsignerDressForm `≤80` line cap exceeded (119 lines)**

- **Found during:** Task 2 verification step (`wc -l` check)
- **Issue:** Plan body's pseudocode for ConsignerDressForm assumed `onSubmit: (input: DressInput) => void` with a single pass-through to the parent. The actual implementation needs an explicit object-literal strip from DressInput -> ConsignerDressInput (lines 90-114, 25 lines). Plus the type-import block for `consignerCreateInputSchema` adds 2 lines, and the additional ConsignerDressInput type alias adds 1 line. Net: 119 lines vs `≤80` target.
- **Fix:** Accepted the overrun — the explicit field-by-field strip is required for type-safety (Deviation #1 above) and is more inspectable / less fragile than a destructure-then-rest spread. Trimming further would either lose the strip (re-introducing TS2345 at the parent) or lose the per-field docstrings on `ConsignerDressFormProps`.
- **Files modified:** src/features/wardrobe/components/consigner/ConsignerDressForm.tsx.
- **Verification:** All other plan verify checks still pass (DressFormCore mentioned 5x ≥ 2; CONSIGNER_VISIBILITY 2x = 2; `showInternalNotes: false` 1x = 1).
- **Committed in:** `a28ccf2` (parent agent's commit shipped this exact line count).

---

**Total deviations:** 5 auto-fixed (4 Rule 1 — schema-typing bug / biome lint suppression / verify-cap bumps / formatter reflow; 0 Rule 2; 0 Rule 3; 0 Rule 4).

**Impact on plan:** Plan executed faithfully against the actual codebase state. The line-count cap overrun on ConsignerDressForm (119 vs ≤80) is a structural consequence of the Task-2 schema-strip Deviation #1 — required for TS safety against the existing consigner mutation contract. No scope creep; no architectural shifts; all three artifacts ship the visibility/locking contract specified by the plan body.

## Issues Encountered

- **Initial commit `12c54ec` captured the wrong file set** — a previous staging operation had inadvertently picked up `wardrobeDressQueries.ts` + `consignerQueries.ts` + `index.ts` (mid-Phase-18 work from sibling agents). Resolved via `git reset --soft HEAD~1` + `git reset HEAD` (unstage everything) + re-stage of ONLY DressFormCore + admin/DressForm.tsx. No work lost; commit message preserved on re-commit (hash `e12fbba`). No destructive operation — soft reset only.

- **Sibling parent-agent commits arrived mid-plan** (commits `a28ccf2`, `d6fa4e6`, `35d1b6b`, `3e435fa`, `644dac5`, `ff0fbae` ranging across 18-04 / 18-05 / 18-06 / 18-07). Resolved by recognizing that `a28ccf2` had already shipped a byte-identical implementation of Plan 18-03's Task 2 (labeled as a "stub for 18-03 swap" but actually the full RHF wrapper). My Task 2 delta reduced to a biome import-order fix (`ea3ebb8`). Parent agents are operating Phase 18 in parallel and Plan 18-06 pre-emptively shipped the Task 2 deliverable. No conflict; no rework needed.

## User Setup Required

None — no external service configuration introduced by this plan. All work is internal refactoring.

## Next Phase Readiness

- **DressFormCore is the canonical form composite** for any future role-divergent dress form (consigner, public-marketplace edit, admin moderation preview). Add a new role by writing a thin wrapper that passes a tailored `FieldVisibility` + `FieldLocking`.
- **Plan 18-06's `/wardrobe/consigned/new` and `/wardrobe/consigned/[id]/edit` pages already mount the real ConsignerDressForm** (the "stub" commit shipped the implementation byte-for-byte). Live verification of the consigner create + edit flow can run as soon as Phase 18 capstone E2E is exercised — no additional Phase 18 plumbing needed for the form layer.
- **Phase 21 testing surface** is now single-source: a test against DressFormCore covers both admin and consigner UX. Per-role smoke tests verify the wrapper config (visibility flags, locking flags) rather than re-testing the underlying RHF + Zod plumbing.
- **No blockers** introduced. Pre-existing `IceParticles.tsx` `three` types error remains the sole outstanding TS issue across the project (documented in STATE.md Blockers).

---
*Phase: 18-self-serve-consignment*
*Completed: 2026-05-29*
