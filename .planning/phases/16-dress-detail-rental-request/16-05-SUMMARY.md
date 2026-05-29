---
phase: 16-dress-detail-rental-request
plan: 05
subsystem: ui
tags: [wardrobe, react-hook-form, zod, dialog, debounce, trpc, react-day-picker, brand-cyan]

# Dependency graph
requires:
  - phase: 16-dress-detail-rental-request
    provides: "createRequestSchema (zod) + wardrobe.requests.checkAvailability + wardrobe.requests.create (Plan 16-01)"
  - phase: 15
    provides: "Calendar mode='range' + Popover pattern from WardrobeFilterBar (Plan 15-06); useDebouncedState hook usage; MeasurementForm RHF + input/output generics pattern (15-04)"
  - phase: 14
    provides: "RHF + input/output generics for nullable-optional schemas (14-04 ADR); cyan #0891b2 / navy #1a3a5c brand palette (2026-04-26 sweep)"
provides:
  - "RequestRentalDialog component — controlled modal for student RentalRequest submission"
  - "Reusable pattern: schema reuse from TRPC layer for client form validation (createRequestSchema imported directly)"
  - "Debounced availability gating pattern: useDebouncedState + useQuery(enabled) + inline amber warning panel"
  - "Reset-on-close lifecycle pattern (Pitfall 8) for controlled modal forms with date state"
affects: ["16-04 (DressDetail page — mounts this dialog)", "Phase 17 (admin approval flow — consumes the RentalRequest rows this writes)", "Future modal forms with debounced server-side validation"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Schema reuse from TRPC layer for client RHF validation (createRequestSchema directly imported)"
    - "Debounced server-side availability gating with inline amber conflict warning panel"
    - "Reset-on-close useEffect cleanup pattern for controlled modal forms"
    - "Conditional radio option suppression based on data shape (Purchase hidden when purchasePrice == null)"

key-files:
  created:
    - "src/features/wardrobe/components/request/RequestRentalDialog.tsx (455 lines)"
  modified: []

key-decisions:
  - "useDebouncedState destructured as [, debounced, setValue] — plan's spec assumed [value, setValue]; actual signature returns [immediate, debounced, setValue]"
  - "Form reset uses explicit defaultValues object in BOTH defaultValues prop AND useEffect cleanup — guarantees same initial shape on every open, no drift from form.reset() with no args"
  - "Cancel button has its own onClick={() => onOpenChange(false)} (not relying on DialogClose) — disables during mutation pending state for symmetry with Submit"
  - "Submit button gating combines four conditions: !isValid || isPending || conflictDetected || isFetching — last one prevents racing the debounced query that has not landed yet"

patterns-established:
  - "Schema-as-contract: client form imports the SAME Zod object the server parses — drift structurally impossible (extends 14-04 wardrobeSettingsSchema + 15-04 measurementUpdateSchema)"
  - "Debounced server validation with inline warning UX: useDebouncedState + useQuery(enabled) feeds an amber-50/amber-800 panel that gates submission"
  - "Controlled modal lifecycle: useEffect on `open` resets form state on close, preventing stale data leak between opens (Pitfall 8)"
  - "useDebouncedState consumer pattern: destructure as [, debounced, setValue] when only debounced value is needed for query inputs"

# Metrics
duration: 3min
completed: 2026-05-29
---

# Phase 16 Plan 05: RequestRentalDialog Summary

**Controlled modal converting student intent into a RentalRequest row — schema reused from Plan 16-01's TRPC layer, debounced availability gating with inline conflict warning, reset-on-close lifecycle.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-29T17:25:37Z
- **Completed:** 2026-05-29T17:28:23Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments

- Shipped `RequestRentalDialog` — the conversion-critical surface of Phase 16. Three procedural concerns intersected and were resolved in one component: Zod schema reuse, debounced server-side validation, RHF state lifecycle across modal open/close.
- Reused `createRequestSchema` directly from Plan 16-01's `requestQueries.ts` — the form RHF resolver validates against the EXACT same schema the TRPC procedure parses. Drift impossible by construction.
- Wired `wardrobe.requests.checkAvailability` via `useDebouncedState` (500ms) → inline amber warning panel with the conflicting window's startDate/endDate formatted human-readable (REQUEST-02).
- Submit-button gating combines four guard conditions: form invalid OR createMutation pending OR conflictDetected OR availabilityQuery fetching. The fourth guard catches the race where the debounce timer fires but the query has not landed yet, preventing a fast clicker from submitting before the server-side advisory check resolves.
- Purchase rental type radio option dynamically suppressed when `dress.purchasePrice == null` — UX half of the gate; server enforces the same in Phase 17.
- Reset-on-close useEffect prevents stale dates between modal opens (Pitfall 8) — explicit defaultValues object passed to `form.reset()` in BOTH initial mount AND the close-effect, guaranteeing same initial shape regardless of how the modal was opened.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build RequestRentalDialog with schema reuse + RHF + debounced availability** — `ff67e5b` (feat)

**Plan metadata:** pending (final docs commit below)

## Files Created/Modified

- `src/features/wardrobe/components/request/RequestRentalDialog.tsx` — Controlled modal form (455 lines) for submitting a RentalRequest. Exports `RequestRentalDialog` + `RequestRentalDialogProps`. Imports `createRequestSchema` from Plan 16-01's queries file. Uses `useDebouncedState` from `@/lib/context-utils`. Mounts `Dialog`, `Calendar (mode='range')`, `Calendar (mode='single')`, `Popover`, `Input`, `Textarea`, `Label`, `Button` UI primitives. Brand: cyan `#0891b2` selected radio + submit button; navy `#1a3a5c` title; amber-50/amber-800 warning panel; rose-600 inline error text.

## Decisions Made

- **`useDebouncedState` destructured as `[, debounced, setValue]`** — the plan body assumed a `[value, setValue]` two-tuple return shape, but the actual signature in `src/lib/context-utils.tsx:157` returns `[immediateValue, debouncedValue, setValue]`. Since we only need the debounced value to feed the query (we do not display an immediate preview), the first slot is elided with a leading comma. The plan explicitly instructed verification against the source file before using it; this was the deviation.
- **Form reset on close uses explicit defaultValues object, NOT bare `form.reset()`** — calling `form.reset()` with no args resets to whatever was passed as `defaultValues` on first mount, which technically would be correct, but explicit values in BOTH the initial mount AND the cleanup effect document the exact shape and make the cleanup self-contained. The Pitfall 8 contract is "no stale dates between opens"; making the close shape explicit is defense against future drift if `defaultValues` ever becomes dynamic (e.g., persisted draft).
- **Cancel button explicitly disabled during mutation pending state** — matches Submit button gating symmetry. A user clicking Cancel mid-submit could otherwise close the modal and lose the in-flight feedback. Both buttons are disabled together; the toast resolves on whichever side finishes.
- **Conditional Purchase radio filter via `.filter()` over `ALL_RENTAL_TYPE_OPTIONS`** — cleaner than inline `{condition && <Option />}` JSX because the selected option could otherwise stay at COMPETITION (default) without further logic. The filter operates on the data layer; the Controller renders whatever options array remains.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's `useDebouncedState` signature spec was wrong**

- **Found during:** Task 1 (writing the debounce wiring)
- **Issue:** Plan body specified `const [debouncedDates, setDebouncedDates] = useDebouncedState<...>(...)` — a two-tuple destructure. The actual source signature (verified per plan's instruction: "Verify the actual signature of `useDebouncedState` against the source file before using it") is `function useDebouncedState<T>(...): [T, T, (value: T) => void]` — a three-tuple of `[immediateValue, debouncedValue, setValue]`.
- **Fix:** Destructured as `const [, debouncedDates, setDebouncedDates] = useDebouncedState<...>(...)` — leading comma elides the unused immediate value; `debouncedDates` correctly receives the debounced value for the query input.
- **Files modified:** `src/features/wardrobe/components/request/RequestRentalDialog.tsx`
- **Verification:** `npx tsc --noEmit` passes (no type errors in our file); the query receives properly debounced date inputs.
- **Committed in:** `ff67e5b` (Task 1 commit)

**2. [Rule 1 - Bug] Biome auto-format reflowed long-line expressions**

- **Found during:** Task 1 verification (`npx biome check`)
- **Issue:** Three expressions wrapped across multiple lines that Biome's printer wanted on single lines (1: `availabilityEnabled` ternary chain, 2: `range` ternary, 3: message length ternary className). Biome refused to lint-pass without the format pass applied. Same pattern as Plan 16-01's auto-format reflow.
- **Fix:** Ran `npx biome check --write` — Biome reflowed the three expressions in-place. Logic untouched.
- **Files modified:** `src/features/wardrobe/components/request/RequestRentalDialog.tsx`
- **Verification:** `npx biome check src/features/wardrobe/components/request/RequestRentalDialog.tsx` — exit 0.
- **Committed in:** `ff67e5b` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 plan spec bug, 1 formatter reflow)
**Impact on plan:** Both deviations mechanical. The plan explicitly anticipated the first (instructing verification against the source); the second is a known consequence of Biome being the canonical project formatter. No scope creep, no contract changes, no behavior delta.

## Issues Encountered

- ERR_PNPM_IGNORED_BUILDS workaround applied per project convention — invoked `npx tsc --noEmit` and `npx biome check` directly instead of `pnpm type-check` / `pnpm lint`. Documented blocker (STATE.md `Blockers/Concerns`); workaround stable across phases.
- No runtime smoke test was performed against the dev server. Plan's verify-step included an optional dev-server mount-and-verify, but the file-level verification (type-check + lint + line count + frontmatter consistency) was sufficient to gate the commit. Real-world verification will happen organically when Plan 16-04's DressDetail page mounts the dialog.

## User Setup Required

None — no external service configuration required for this plan. The dialog consumes already-shipped TRPC procedures (Plan 16-01) and already-installed UI primitives. The carried `BLOB_READ_WRITE_TOKEN` env requirement from earlier Phase 14 plans is unrelated.

## Next Phase Readiness

- **Wave-2 component ready to mount.** Plan 16-04 (DressDetail page at `/wardrobe/[id]`) is the immediate consumer; it imports `RequestRentalDialog` and wires `open` state + the `dress` prop from `wardrobe.byId`.
- **Phase 17 (admin approval flow) consumes the rows this writes.** The `wardrobe.requests.create` mutation creates `RentalRequest` rows with `status=PENDING`; Phase 17's approval queue UI lists these for the dress owner to approve/reject.
- **Reusable pattern available:** Future modal forms with server-side validation should mirror the schema-reuse + debounced-availability + reset-on-close triad established here. See `key-decisions` in this summary's frontmatter.
- **Carried user-setup items (1 remaining):** `BLOB_READ_WRITE_TOKEN` env still needed in local `.env` for image upload testing on `/admin/wardrobe/new` (unrelated to this plan, carried from Phase 14).

---
*Phase: 16-dress-detail-rental-request*
*Completed: 2026-05-29*
