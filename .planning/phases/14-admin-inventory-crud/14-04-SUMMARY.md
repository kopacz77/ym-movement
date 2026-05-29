---
phase: 14-admin-inventory-crud
plan: 04
subsystem: ui
tags: [react-hook-form, zod, trpc, wardrobe, admin-form, sonner]

# Dependency graph
requires:
  - phase: 13-wardrobe-schema-foundation
    provides: "wardrobeSettingsSchema + WardrobeSettings type + admin.wardrobeSettings.{get,update} TRPC procedures"
provides:
  - "WardrobeSettingsForm client component: three-field RHF + Zod form wired to admin.wardrobeSettings.{get,update}"
  - "Reusable pattern for `useForm<Input, unknown, Output>` when the Zod schema has `.default()` on every field"
affects: [14-06-PLAN.md (/admin/wardrobe/settings page consumer), wardrobe-defaults-consumer pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-source Zod schema reuse: client form imports the SAME wardrobeSettingsSchema the TRPC procedure validates with"
    - "form.reset(data) in useEffect to handle the 'query data arrives after first render' race"
    - "useForm<z.input, unknown, z.output> generics to reconcile RHF's TFieldValues (input) with submit handler (output) when the Zod schema uses .default()"

key-files:
  created:
    - src/features/wardrobe/components/admin/WardrobeSettingsForm.tsx
  modified: []

key-decisions:
  - "Import wardrobeSettingsSchema from Phase 13 queries file -- never redeclare. Schema drift made structurally impossible."
  - "Use `z.input` and `z.output` (not `z.infer`) because every field has `.default()`. RHF's TFieldValues needs the input shape; submit handler receives the output shape."
  - "Hydrate via useQuery + form.reset(data) in useEffect (not via skipping render until data loads). The form is mounted immediately with Zod defaults so RHF state and refs exist; reset() patches in fetched values when they arrive."
  - "valueAsNumber: true on every register() so HTML number inputs coerce string -> number before Zod sees them. Sidesteps the 'input element value is always a string' pitfall."
  - "Brand-aligned cyan #0891b2 submit button with hover #06748f, matching the 2026-04-26 brand-consistency sweep."

patterns-established:
  - "When a Zod schema has .default() on all fields, parameterize useForm as `useForm<z.input<S>, unknown, z.output<S>>` so the resolver and submit handler both type-check without `as any`."
  - "Loading state renders pulsing skeleton matching field count (one h-10 div per numeric input), preserving max-w-xl container width to prevent layout shift on data arrival."

# Metrics
duration: 2m 15s
completed: 2026-05-29
---

# Phase 14 Plan 04: Wardrobe Settings Form Summary

**Standalone admin form for global wardrobe defaults -- three numeric inputs, single-source Zod validation, one TRPC mutation, zero schema duplication.**

## Performance

- **Duration:** 2m 15s
- **Started:** 2026-05-29T05:23:47Z
- **Completed:** 2026-05-29T05:26:02Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments

- `WardrobeSettingsForm.tsx` client component exporting a single `WardrobeSettingsForm` that consumes Phase 13's `admin.wardrobeSettings.{get,update}` TRPC surface
- Three numeric fields (`defaultConsignmentCommissionPct`, `wardrobeRentalRequestExpiryDays`, `wardrobeReturnReminderDays`) wired with `register({ valueAsNumber: true })`, helper text, and per-field error display
- Zero schema duplication: the SAME `wardrobeSettingsSchema` validates client-side and server-side
- Loading skeleton, disabled-spinner submit state, success/error sonner toasts, brand cyan CTA
- Phase 14 success criterion 4 ("Admin can edit global wardrobe defaults at /admin/wardrobe/settings") is now structurally ready -- only the page wrapper in Plan 14-06 remains

## Task Commits

Each task was committed atomically:

1. **Task 1: Author WardrobeSettingsForm.tsx -- three inputs, RHF + Zod, get + update wired** -- `34cd8ee` (feat)

## Files Created/Modified

- `src/features/wardrobe/components/admin/WardrobeSettingsForm.tsx` -- 150-line client component: imports `wardrobeSettingsSchema` and `WardrobeSettings` type from Phase 13's queries file, hydrates from `api.admin.wardrobeSettings.get.useQuery()`, submits via `api.admin.wardrobeSettings.update.useMutation()`, toasts on success/error, and re-syncs the form when fetched data arrives.

## Decisions Made

- **Use `z.input` and `z.output` generics on `useForm`, not `z.infer`** -- When every field in a Zod schema has `.default()`, `z.infer` (which equals `z.output`) yields all-required fields, but the form's editable state has all-optional fields. Wrong generic = TS2322 on the resolver and TS2345 on the submit handler. The fix: `useForm<FormInput, unknown, FormOutput>` with `FormInput = z.input<S>` and `FormOutput = z.output<S>`. The submit handler then receives the Zod-coerced output type.
- **Mount the form immediately with `wardrobeSettingsSchema.parse({})` defaults; rehydrate via `form.reset(data)` in useEffect** -- Avoids the "render flicker / lose user keystrokes" pattern of remounting on data arrival. Selected over the alternative (skip render until `data` is defined) because the form needs to be in the DOM for RHF's refs and state machine to initialize.
- **Show pulsing skeleton during `isLoading`** -- Three `h-10` divs matching the field count, contained in the same `max-w-xl` wrapper as the form, so the layout doesn't shift when the form swaps in.
- **`valueAsNumber: true` on every register** -- HTML number inputs report their value as a string. Without this option, the Zod resolver receives `"15"` and rejects it as a non-number. With it, RHF coerces before validation.

## Deviations from Plan

None -- plan executed exactly as written.

The plan included a complete code block; the implementation matches it verbatim except for two adjustments captured below as "Issues Encountered" (not deviations, because they were resolved within the planned task before commit):

1. `useForm<FormValues>` (planned) -> `useForm<FormInput, unknown, FormOutput>` (shipped) -- TS error TS2322/TS2345 forced the generic update. Schema design (`.default()` on every field) made the dual-type-flow generics necessary.
2. Multi-line `<Label>` elements (planned, biome-formatted into single-line `<Label>...</Label>` by `biome check --write`) -- pure formatting fix, no semantic change.

Neither rises to the "deviation rule" bar -- both were resolved within Task 1 verification before the atomic commit.

## Issues Encountered

- **TS2322 / TS2345 on `useForm<FormValues>` with `zodResolver`** -- The schema's `.default()` on every field makes `z.infer` = `z.output` = required fields, but RHF's `TFieldValues` wants the input shape (optionals). Resolved by switching to `useForm<z.input<S>, unknown, z.output<S>>` and letting the submit handler infer the output type. Documented as a reusable pattern in this summary's `patterns-established`.
- **Biome flagged multi-line `<Label>` and multi-line helper paragraphs** -- Auto-fixable; `npx biome check --write` collapsed them. No semantic impact.
- **Two pre-existing TS errors in `IceParticles.tsx` and `sidebar.tsx`** -- Already documented as STATE.md blockers from Phase 13-01. Not introduced by this plan and not in scope.

## User Setup Required

None -- no external service configuration required for this plan. The form will only exercise the network path once Plan 14-06 mounts it on `/admin/wardrobe/settings`.

## Next Phase Readiness

- **Ready:** Plan 14-06 (wardrobe settings page) can now `import { WardrobeSettingsForm } from "@/features/wardrobe/components/admin/WardrobeSettingsForm"` and drop it into a server-component page wrapper with appropriate page chrome (heading, breadcrumbs, role guard).
- **Ready:** Any future consumer of the wardrobe defaults (consigner approval flow, rental request expiry cron) can call `getWardrobeSettings(prisma)` server-side; admins now have a UI to tune the values.
- **No blockers introduced** -- Plan executed in 2m 15s with one atomic commit and clean type-check / biome gates.

---
*Phase: 14-admin-inventory-crud*
*Completed: 2026-05-29*
