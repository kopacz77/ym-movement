---
phase: 14-admin-inventory-crud
plan: 03
subsystem: ui
tags: [react-hook-form, zod, tabs, vercel-blob, image-upload, admin, wardrobe, dress, gallery]

# Dependency graph
requires:
  - phase: 13-wardrobe-schema-foundation
    plan: 03
    provides: wardrobe.images.{attachImage,reorderImages,setPrimary,deleteImage} TRPC procedures, compressForUpload helper, /api/wardrobe/upload route handler
  - phase: 14-admin-inventory-crud
    plan: 01
    provides: dressInputSchema + DressInput type for shared client validation, admin.wardrobe.* TRPC CRUD spine
provides:
  - DressForm shared admin create/edit form component (tabbed, RHF + Zod, dollars-to-cents at boundary, edit-mode rehydration)
  - DressImageGallery image management component composing all four Phase 13 wardrobe.images.* mutations + the @vercel/blob/client upload pipeline
  - DressFormValues + DressFormProps + GalleryImage types for parent page wiring
affects: [14-04-admin-new-dress-page, 14-05-admin-edit-dress-page, 14-06-admin-inventory-grid, 14-07-admin-sidebar-nav]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React Hook Form + zodResolver with z.preprocess for empty-string -> undefined optional numerics: HTMLInputElement returns '' on clear, not undefined; preprocess normalizes before .optional() validation"
    - "Dollars-at-UI / cents-on-wire conversion sealed inside the form's handleSubmit: dressInputSchema (cents) stays the canonical contract, dressFormSchema (dollars) is a UI-only intermediate, no business code outside the form sees dollars"
    - "Edit-mode rehydration via useEffect form.reset on defaultValues change: RHF only consumes defaultValues on first render; without reset, the form would render empty while the byId query is in-flight"
    - "Mutation-agnostic shared form: parent owns the create/update mutation and post-success behavior; DressForm just emits typed DressInput via onSubmit + reports isSubmitting"
    - "Mode-aware UI: create hides image management entirely (no dressId yet for the blob uploader's clientPayload), edit lets the parent slot DressImageGallery above the form"
    - "Sequential awaited attachImage inside a for-of loop after each upload() resolves: serialized so Phase 13's first-image-auto-primary server logic sees images attach in upload order"
    - "Single onMutated() emitted after the whole upload batch (NOT per-attach): minimizes byId refetches; per-mutation onSuccess on the three single-shot mutations (reorder/setPrimary/deleteImage)"
    - "Defense-in-depth 8-image cap: UI counter '(N/8)' + disabled button at cap (this component) + attachImage BAD_REQUEST at the 9th attach (Phase 13 TRPC) + /api/wardrobe/upload route handler refusing the 9th token mint"
    - "Up/down arrow reorder rebuilds FULL ordered id list before calling reorderImages: Phase 13 contract validates orderedIds.length === existingCount; partial reorder = BAD_REQUEST"
    - "showDeleteConfirmation toast pattern (NOT window.confirm) for destructive image delete: matches project-wide convention from toast-confirmations.ts"
    - "Plain <img> with biome lint-ignore for blob URLs: blob.vercel-storage.com domain is not in next.config.js images.remotePatterns; switching to next/image would require config change out of scope for this plan"

key-files:
  created:
    - src/features/wardrobe/components/admin/DressForm.tsx
    - src/features/wardrobe/components/admin/DressImageGallery.tsx
    - .planning/phases/14-admin-inventory-crud/14-03-SUMMARY.md
  modified: []

key-decisions:
  - "Internal dressFormSchema (dollars) separate from the canonical dressInputSchema (cents): the UI layer needs dollar inputs, empty-string preprocessing, and comma-separated raw tag strings — none of which belong on the wire. handleSubmit transforms DressFormValues -> DressInput at the form boundary."
  - "Mode prop with two literal values 'create' | 'edit' (NOT a boolean): the create-vs-edit divergence is structural (image gallery placement, status field visibility, submit copy, default labels) — a boolean would obscure the intent at call sites."
  - "Image gallery is NEVER rendered inside DressForm itself: in create mode the dressId doesn't exist yet (the blob uploader's clientPayload needs it); in edit mode the parent page slots <DressImageGallery /> above <DressForm /> as a sibling. Keeps DressForm a pure form."
  - "'Save to add images. Images can be added on the next screen.' copy near the submit button in create mode: explicit user expectation-setting per ADMIN-04 — no surprise that image upload is a post-save action."
  - "Up/down arrow buttons over drag-and-drop reorder for v1: the underlying TRPC contract is identical (full ordered id list) — drag-and-drop is a polish pass that can land without any backend change. Arrows are accessible by default; DnD would need keyboard fallback work."
  - "Sequential await inside the for-of upload loop (NOT Promise.all over the file array): Phase 13's attachImage sets isPrimary=true on the first image based on the current row count at the time of insert. Parallel attaches would race for the primary flag. Serial is the correct correctness/UX tradeoff."
  - "Single bulk onMutated() at the end of the upload batch + per-mutation onSuccess on the three single-shot mutations: reduces N round-trips to one refetch for an N-file upload, but keeps reorder/setPrimary/delete responsive (one refetch each because each is a single user action)."
  - "Defense-in-depth 8-image cap at FOUR layers: UI counter + UI button disabled + attachImage BAD_REQUEST + route-handler token mint refusal. Each layer fails independently; the UI cap is the cheapest signal but never authoritative."
  - "Plain <img> tag for blob URLs (with biome lint-ignore): next/image would require adding blob.vercel-storage.com to next.config.js images.remotePatterns, which is out of scope for this UI plan. Revisit when other wardrobe surfaces (public browse, fit-match) need image optimization."
  - "showDeleteConfirmation 'image' literal as the itemType: matches the project-wide showConfirmationToast pattern. Renders 'Delete image?' header — admins recognize the standard delete toast and trust the destructive button."

patterns-established:
  - "Two-tier Zod schema pattern for forms that need UI-layer coercion: internal *FormSchema (with preprocess + dollars + raw-string tags) lives in the component file, canonical *InputSchema (the wire contract) is imported from the queries file. handleSubmit bridges them."
  - "Per-component mutation hooks at the top of the component body, then handler functions, then JSX: makes the mutation set visible at-a-glance and keeps handlers small (one mutate call each)."
  - "onMutated() emit prop pattern for child components that mutate parent-owned data: gallery doesn't know about parent's query cache, parent doesn't know about gallery's mutation timing — onMutated() bridges them with zero coupling."

# Metrics
duration: 6m
completed: 2026-05-29
---

# Phase 14 Plan 03: Admin Dress Form + Image Gallery Components Summary

**Two heaviest Wave 2 components shipped — tabbed RHF dress form (create/edit) and image gallery wiring the full Phase 13 blob upload pipeline. Both mutation-agnostic, composable into the upcoming new/edit dress pages.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-29T05:23:36Z
- **Completed:** 2026-05-29T05:29:25Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments

- `DressForm` exports `DressForm` + `DressFormProps` + `DressFormValues` from `src/features/wardrobe/components/admin/DressForm.tsx` (625 lines)
- Tabbed UI (General / Measurements / Pricing / Status & Internal) with 28+ fields covering every column on the `Dress` model that the admin form needs to write
- Dollars-at-UI to cents-on-wire conversion sealed inside `handleSubmit` via `Math.round(dollars * 100)` for every money field
- Edit-mode rehydration via `useEffect(() => form.reset(...), [defaultValues])` — handles the byId query resolving after first render
- Empty-string-to-undefined preprocessing on every optional numeric input via `z.preprocess` — HTMLInputElement returns `""` not `undefined` on clear
- "Save to add images. Images can be added on the next screen." copy in create mode, near the submit button
- `DressImageGallery` exports `DressImageGallery` from `src/features/wardrobe/components/admin/DressImageGallery.tsx` (303 lines)
- Full upload pipeline: `compressForUpload` (~400KB target) → `upload(name, blob, { handleUploadUrl, clientPayload })` → `attachImage({ dressId, url })` — sequentially awaited per file
- 8-image UI cap (button disabled at cap, counter "Add image (N/8)"), reinforcing Phase 13's TRPC + route-handler enforcement
- Up/down arrow reorder rebuilding the full ordered id list before calling `reorderImages` (per Phase 13's all-or-nothing contract)
- "Make primary" action on every non-primary image; primary badge on the primary image (server already sets `isPrimary=true` on the first attach)
- Delete via `showDeleteConfirmation("image", () => deleteImg.mutate(...))` — never `window.confirm`
- All four mutations surface errors via `toast.error(...)`; single `onMutated()` emit after a multi-file upload batch (vs per-mutation success on the three single-shot mutations)
- Zero new TypeScript errors; biome check clean on both files

## Task Commits

1. **Task 1: Author DressForm.tsx (tabbed RHF + Zod form, mode-aware)** — `be7aa92` (feat)
2. **Task 2: Author DressImageGallery.tsx (upload + reorder + set-primary + delete)** — `618096d` (feat)

**Plan metadata commit:** to be made after this summary is written.

## Files Created/Modified

- `src/features/wardrobe/components/admin/DressForm.tsx` (created, 625 lines) — `"use client"` component, two-tier Zod schema (form-layer dollars + preprocessing vs canonical cents `dressInputSchema`), `useForm<DressFormValues>` with `zodResolver`, `useEffect` rehydration on `defaultValues`, `Controller` for Radix Select / Switch, 4-tab UI, dollars-to-cents at submit boundary, mode-aware status field + submit copy
- `src/features/wardrobe/components/admin/DressImageGallery.tsx` (created, 303 lines) — `"use client"` component, all four `api.wardrobe.images.*` mutation hooks, sequential awaited upload loop with `compressForUpload` + `upload from @vercel/blob/client` (handleUploadUrl `/api/wardrobe/upload`, clientPayload `{ dressId }`), 8-image UI cap with counter, up/down arrow reorder, make-primary action, primary badge, `showDeleteConfirmation` for destructive delete

## Decisions Made

- **Internal `dressFormSchema` (dollars) separate from the canonical `dressInputSchema` (cents)** — the UI needs dollar inputs (humans don't think in cents), empty-string preprocessing for optional numerics (HTMLInputElement returns `""` on clear), and comma-separated raw tag strings (parsed into arrays on submit). None of these belong on the wire. `handleSubmit` is the single conversion site.
- **Mode prop `"create" | "edit"` not boolean** — the create-vs-edit divergence is structural (image gallery placement, status field visibility, submit copy, default labels). Literal-type prop is self-documenting at call sites.
- **Image gallery never rendered inside `DressForm`** — in create mode the `dressId` doesn't exist yet (the blob uploader's `clientPayload` needs it for ownership + cap validation at the route handler). In edit mode the parent page slots `<DressImageGallery />` above `<DressForm />` as a sibling. `DressForm` stays a pure form.
- **"Save to add images" copy in create mode** — per ADMIN-04 explicit expectation-setting; no surprise that image upload is a post-save action. Aligns with the create-then-redirect-to-edit pattern.
- **Up/down arrow buttons over drag-and-drop for v1** — the Phase 13 TRPC contract is identical either way (full ordered id list). Arrows are accessible by default; DnD would need keyboard fallback engineering for parity. Polish pass can land without backend changes.
- **Sequential await inside the upload for-of loop (NOT `Promise.all`)** — Phase 13's `attachImage` sets `isPrimary=true` on the first image based on the row count at insert time. Parallel attaches would race for the primary flag. Serial is the correctness/UX-tradeoff winner: a 4-image upload feels marginally slower but never produces a wrong primary.
- **Single bulk `onMutated()` after the upload batch + per-mutation `onSuccess` on the three single-shot mutations** — reduces N round-trips to one refetch for an N-file upload, but keeps reorder/setPrimary/delete responsive (one refetch each because each is a single user action).
- **Defense-in-depth 8-image cap at four layers** — UI counter + UI button disabled + `attachImage` BAD_REQUEST + route-handler token mint refusal. Each layer fails independently; the UI cap is the cheapest UX signal but never the authoritative gate.
- **Plain `<img>` tag with biome lint-ignore (NOT `next/image`)** — blob URLs need `blob.vercel-storage.com` added to `next.config.js images.remotePatterns`. Out of scope for a UI plan. Revisit when public browse / fit-match surfaces need image optimization.
- **`zodResolver(dressFormSchema) as never`** — RHF's generic typing doesn't perfectly intersect with Zod's `preprocess` output. Cast is local to the `useForm` call site only.

## Deviations from Plan

### Rule 1 — Bug: Plan's TRPC mutation signatures were stale

**Found during:** Task 2 (DressImageGallery)
**Issue:** The plan body specified `setPrimary({ dressId, imageId })` and `deleteImage({ dressId, imageId })` and `reorderImages({ orderedImageIds })`. The actual Phase 13 TRPC contracts (verified by reading `src/features/wardrobe/api/queries/imageQueries.ts`) are:
- `setPrimary({ imageId })` — server looks up dressId via the row's `dressId` column
- `deleteImage({ imageId })` — same
- `reorderImages({ dressId, orderedIds })` — note: `orderedIds`, not `orderedImageIds`
**Fix:** Used the actual signatures in the gallery. The server-side authorization (`assertCanModifyDress`) still works because it derives `dressId` from the image lookup inside `setPrimary` / `deleteImage`.
**Files modified:** `src/features/wardrobe/components/admin/DressImageGallery.tsx`
**Commit:** `618096d`

### Rule 1 — Bug: Plan referenced `formatCurrencyFromCents` from `@/lib/utils` for display

**Found during:** Task 1 design phase (before writing code)
**Issue:** The plan implied the parent (edit page, in 14-04/14-05) would convert cents to dollars before passing `defaultValues` to `DressForm`. No direct import was made in the form file itself. This is correct as written; no change needed — noted for parent-page implementers.
**Files modified:** none
**Commit:** n/a

### Auto-fix: Biome `useBlockStatements` lint preference

**Found during:** Task 2 verification
**Issue:** Biome flagged three single-line `if (...) return;` and `if (...) value = "";` patterns as `lint/style/useBlockStatements` errors.
**Fix:** Converted to `if (...) { return; }` block form. Pure style adjustment, no behavior change.
**Files modified:** `src/features/wardrobe/components/admin/DressImageGallery.tsx`
**Commit:** `618096d` (rolled into the Task 2 commit)

### Auto-fix: Biome `useExhaustiveDependencies` suppression placement

**Found during:** Task 1 verification
**Issue:** First draft placed the `biome-ignore` comment on the closing line of `useEffect`'s deps array; Biome requires it on the line immediately above the `useEffect(` call.
**Fix:** Moved the suppression directly above `useEffect(`. Also replaced an unused `lint/suspicious/noExplicitAny` suppression on a `zodResolver as any` with `as never` (which Biome accepts without suppression).
**Files modified:** `src/features/wardrobe/components/admin/DressForm.tsx`
**Commit:** `be7aa92` (rolled into the Task 1 commit)

## Issues Encountered

- **`pnpm` script wrappers still blocked by `ERR_PNPM_IGNORED_BUILDS`** — same pre-existing issue documented across STATE.md Blockers/Concerns. Used `npx tsc --noEmit` and `npx biome check` directly. Both clean.
- **No new issues introduced by this plan.**

## User Setup Required

- **`BLOB_READ_WRITE_TOKEN` in local `.env`** (carry-over from Phase 13 Plan 03) — required for the gallery's `upload()` to authenticate against Vercel Blob in local dev. Add from Vercel Dashboard → ym-movement project → Storage → wardrobe-images store → `.env.local` tab. This plan's code does not exercise the upload path at build/type-check time, but end-to-end manual smoke testing in 14-05 will need the token.

## Next Phase Readiness

- `DressForm` is ready to be slotted into `/admin/wardrobe/new/page.tsx` (Plan 14-04) and `/admin/wardrobe/[id]/edit/page.tsx` (Plan 14-05). Parent pages own the mutation call (`api.admin.wardrobe.create.useMutation` or `update.useMutation`) and pass `onSubmit` + `isSubmitting`.
- `DressImageGallery` is ready to slot above `DressForm` in the edit page only. Parent needs to pass `dressId`, the byId query's `Images` array (already sorted), and an `onMutated` callback that invalidates `api.admin.wardrobe.byId` for that dressId.
- For edit mode: parent must transform the byId result's cents-based money fields to dollars before passing as `defaultValues`. A `formValuesFromDress` helper exists implicitly as inline code in 14-05; consider extracting if a second consumer appears.
- The `admin.wardrobe.*` (Phase 14-01) and `wardrobe.images.*` (Phase 13-03) TRPC surfaces are unchanged — no regression risk in this plan.
- No blockers for Wave 3.

---
*Phase: 14-admin-inventory-crud*
*Completed: 2026-05-29*
