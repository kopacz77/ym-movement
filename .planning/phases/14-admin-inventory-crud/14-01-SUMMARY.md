---
phase: 14-admin-inventory-crud
plan: 01
subsystem: api
tags: [trpc, zod, prisma, wardrobe, dress, crud, admin]

# Dependency graph
requires:
  - phase: 13-wardrobe-schema-foundation
    plan: 01
    provides: Dress, DressImage, RentalRequest, Rental Prisma models + enums (DressCategory, DressCondition, DressStatus)
  - phase: 13-wardrobe-schema-foundation
    plan: 02
    provides: wardrobeSettingsRouter sibling pattern under admin namespace; adminProcedure usage convention
provides:
  - wardrobeDressRouter mounted at admin.wardrobe.* with list/byId/create/update/archive procedures
  - dressInputSchema Zod object for shared client/server validation (Wave 2 form reuse)
  - DressInput TypeScript type inferred from dressInputSchema
  - formatCurrencyFromCents(cents) helper in @/lib/utils for dress price display
affects: [14-admin-form-ui, 14-admin-inventory-grid, 14-sidebar-nav, 15-public-browse, 16-fit-match, 17-rental-flow, 18-consigner-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "adminProcedure (NOT superAdminProcedure) for admin.wardrobe.* CRUD: matches the Phase 13 wardrobeSettings sibling — admin-or-super-admin per PERM-02"
    - "Server-side hardcoded status=AVAILABLE on create: admins bypass the consigner approval queue (ADMIN-02), regardless of client input"
    - "Auto-injection of ownerId from ctx.session.user.id on create: removes client trust boundary; admin is always the owner of their own create"
    - "Shared Zod input schema exported from the queries file: dressInputSchema is the SINGLE source of truth for create + update + client form validation (Wave 2 RHF reuse)"
    - "Soft-archive semantics: no hard delete exposed in MVP; archive flips status=ARCHIVED + stamps archivedAt=now()"
    - "All money fields are Int cents at the DB and API boundary; only formatted as dollars at the display layer (formatCurrencyFromCents)"
    - "Prisma.DressWhereInput typed conditional where-clause assembly for the list procedure (statuses filter + free-text OR search)"

key-files:
  created:
    - src/features/admin/api/queries/wardrobeDressQueries.ts
    - .planning/phases/14-admin-inventory-crud/14-01-SUMMARY.md
  modified:
    - src/features/admin/api/queries/index.ts
    - src/lib/utils.ts

key-decisions:
  - "Use adminProcedure (NOT superAdminProcedure) on every wardrobe procedure: PERM-02 reads 'admin-or-super-admin', and adminProcedure already gates on isAdminRole which accepts both. Matches the Phase 13 wardrobeSettings sibling — one consistent gate across admin.wardrobe.* and admin.wardrobeSettings.*"
  - "Hardcode status='AVAILABLE' on create server-side: admins bypass the consigner PENDING_APPROVAL queue (ADMIN-02). Status passed by the client (if any) is ignored. Consigners use a separate flow in Phase 18."
  - "Auto-inject ownerId = ctx.session.user.id on create: the admin creating the dress is the owner. Client cannot spoof ownership at create time. Re-assignment is allowed via update (admins can flip ownerId there)."
  - "Soft-archive only (status=ARCHIVED + archivedAt=now()): no hard-delete TRPC procedure exposed in MVP. Audit history (rentals, requests, images) is always preserved. Hard-delete is a future ops-only operation."
  - "dressInputSchema excludes id, createdAt, updatedAt, archivedAt, ownerId, and status: those are system-managed. Exporting the schema lets the Wave 2 admin form RHF-validate against the exact same shape the server enforces."
  - "Use Prisma.DressWhereInput for the list where-clause assembly: cleaner than untyped object literals, gives full IntelliSense, catches typos at compile time."
  - "list returns ALL statuses by default (when statuses input is omitted or empty): admins see everything including PENDING_APPROVAL/REJECTED/ARCHIVED per ADMIN-01. Status filter is opt-in, not opt-out."
  - "Try/catch wrapper per procedure with TRPCError INTERNAL_SERVER_ERROR cause-chain: mirrors wardrobeSettingsQueries pattern. byId handles the null case separately (NOT_FOUND) before the try/catch wrap."

patterns-established:
  - "Admin CRUD sub-router shape: list (paginated + filter + search) + byId (full detail with relations) + create (auto-inject system fields) + update (partial + id) + archive (soft-delete with status flip). Any future admin entity CRUD (e.g. wardrobe accessories, makeup) should follow this exact shape."
  - "Money helper composition: dollar-based formatCurrency stays the base; cents-based formatCurrencyFromCents composes on top. Never inline cents/100 math in JSX or backend code."
  - "Sub-router mount adjacency: semantically related routers (wardrobe + wardrobeSettings) are placed adjacent in the parent createTRPCRouter call — readability over alphabetization."

# Metrics
duration: 3m
completed: 2026-05-29
---

# Phase 14 Plan 01: Admin Wardrobe CRUD TRPC Layer Summary

**Typed `admin.wardrobe.{list, byId, create, update, archive}` TRPC procedures shipped — five-call CRUD spine for the entire Phase 14 admin UI, backed by a shared `dressInputSchema` and a cents-to-dollars currency helper.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-29T05:16:54Z
- **Completed:** 2026-05-29T05:20:11Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 edited)

## Accomplishments

- `wardrobeDressRouter` exports five `adminProcedure`s — `list`, `byId`, `create`, `update`, `archive` — all reachable on the typed TRPC client at `api.admin.wardrobe.*`
- `dressInputSchema` (Zod) exported from the queries file; Wave 2 form will reuse via `zodResolver` for client-side validation with zero schema duplication
- `DressInput` TypeScript type inferred from the schema for downstream form prop typing
- `formatCurrencyFromCents(cents)` helper added to `@/lib/utils` — composes on `formatCurrency(dollars)`, kills any `cents / 100` inline math
- `admin.wardrobe.*` mounted adjacent to `admin.wardrobeSettings.*` (Phase 13 sibling) in the admin namespace — no regression to the Phase 13 settings endpoints
- Live smoke test against dev Neon: create (status=AVAILABLE) → byId (Owner + Images includes) → update (competitionPrice + internalNotes) → list (status=AVAILABLE filter + count) → archive (status=ARCHIVED + archivedAt) → cleanup (hard delete). Zero leftover rows.
- Zero new TypeScript errors — only pre-existing `IceParticles.tsx` (three types) and `sidebar.tsx` (`@radix-ui/react-visually-hidden`) errors carried over per STATE.md

## Task Commits

1. **Task 1: Author wardrobeDressQueries.ts with five admin procedures + shared dressInputSchema** — `d8c9483` (feat)
2. **Task 2: Mount wardrobeDressRouter at admin.wardrobe + add formatCurrencyFromCents helper** — `fd9565d` (feat)
3. **Task 3: Smoke-test all 5 procedures against the live dev Neon database** — (no commit — verification + cleanup task, leaves no on-disk artifacts; script deleted after a successful run)

**Plan metadata commit:** to be made after this summary is written.

## Files Created/Modified

- `src/features/admin/api/queries/wardrobeDressQueries.ts` (created, ~230 lines) — Zod input schema, five `adminProcedure` CRUD procedures, typed `Prisma.DressWhereInput` filter assembly, PascalCase relation access on all Prisma calls (`Owner`, `Images`, `_count`), try/catch wrapper per procedure with cause-chained `TRPCError` mirroring the wardrobeSettings pattern
- `src/features/admin/api/queries/index.ts` (modified, +2 lines) — imports `wardrobeDressRouter` and mounts it under `admin.wardrobe`, placed adjacent to `wardrobeSettings: wardrobeSettingsRouter` for semantic grouping
- `src/lib/utils.ts` (modified, +11 lines) — exports `formatCurrencyFromCents(cents: number): string`, composing on the existing `formatCurrency(dollars)` helper

## Decisions Made

- **`adminProcedure` not `superAdminProcedure`** — PERM-02 reads "admin-or-super-admin"; `adminProcedure` already gates on `isAdminRole(role)` which accepts both. Matches the Phase 13 wardrobeSettings sibling. One consistent admin gate across the admin.wardrobe.* and admin.wardrobeSettings.* namespaces.
- **Hardcode `status: 'AVAILABLE'` on create** — ADMIN-02. Admins bypass the consigner PENDING_APPROVAL queue. Status passed by the client (if any) is silently overridden. Consigners reach the same Dress table through a different code path in Phase 18.
- **Auto-inject `ownerId = ctx.session.user.id` on create** — the admin doing the create owns the dress. Client cannot spoof ownership. Re-assignment is permitted via update (admins can flip `ownerId` there — useful when transferring a consignment to a new owner).
- **Soft-archive only** — `archive` flips `status: 'ARCHIVED'` + sets `archivedAt: new Date()`. No hard-delete TRPC procedure exposed in MVP. Rentals, requests, and image rows are preserved for audit. Hard-delete becomes a future ops-only operation if ever needed.
- **`dressInputSchema` excludes system-managed fields** — id, createdAt, updatedAt, archivedAt, ownerId, and status are NOT in the input schema. They are set by the server (ownerId from session, status on create, archivedAt on archive). The schema is the contract a Wave 2 admin form RHF-validates against — exactly what the server expects.
- **`Prisma.DressWhereInput` typed assembly** — the list procedure builds the where-clause with the generated Prisma type instead of an untyped object. Catches typos at compile time. Future statuses/filter fields will be type-checked when added.
- **list defaults to ALL statuses** — when `statuses` input is omitted or empty array, admins see PENDING_APPROVAL, REJECTED, and ARCHIVED rows in addition to AVAILABLE (ADMIN-01). Status filter is opt-in, not opt-out — admins must explicitly narrow.
- **byId returns Owner summary + Images sorted by sortOrder** — the admin edit page needs both the owner's email (to display "Owned by: ...") and the images in display order to render the gallery. No extra fetches.
- **update accepts partial input + id + optional status + optional ownerId** — admins can edit any subset of fields, plus the two system fields they're explicitly allowed to flip (status, ownerId). Partial input means the form can send only changed fields if it wants to.
- **try/catch wrapper per procedure with INTERNAL_SERVER_ERROR cause-chain** — mirrors the Phase 13 wardrobeSettingsQueries pattern. `byId` is the one exception: the null branch is handled explicitly as NOT_FOUND before the catch wrap, since `findUnique` returning null is not an error.

## Deviations from Plan

None — plan executed exactly as written.

The one minor inline adjustment was the initial `where` clause typing: the first draft used a complex inferred conditional type to derive the Prisma where-shape from `findMany` parameters. Biome formatted it cleanly but the inference was unnecessarily clever. Replaced with `Prisma.DressWhereInput` (the generated type from `@prisma/client`) which is the idiomatic shape. This is not a deviation — it's a refinement that happened before any commit.

## Issues Encountered

- **`pnpm` script wrappers still blocked by `ERR_PNPM_IGNORED_BUILDS`** — same pre-existing issue documented in STATE.md Blockers/Concerns from Phase 13 Plan 02. Worked around as before: `npx tsc --noEmit` for type-check, `npx biome check` for lint, `npx tsx scripts/smoke-wardrobe-admin.ts` for the smoke test. All three worked cleanly.
- **No new issues introduced by this plan.**

## User Setup Required

None — no external service configuration required for this plan. The Vercel `BLOB_READ_WRITE_TOKEN` setup (carried over from Phase 13 Plan 03 user-setup) is still needed for end-to-end image uploads in later Phase 14 plans, but is not exercised by this Plan 01 (no image code).

## Next Phase Readiness

- `admin.wardrobe.list`, `byId`, `create`, `update`, `archive` are reachable on the typed TRPC client — Wave 2 (admin form UI + inventory grid UI) is unblocked.
- `dressInputSchema` is the single Zod source the Wave 2 form will validate against — zero schema duplication required.
- `formatCurrencyFromCents` is available in `@/lib/utils` for every wardrobe component that displays a price.
- `admin.wardrobeSettings.get/update` (Phase 13) still works — regression check confirmed.
- No blockers for Wave 2.

---
*Phase: 14-admin-inventory-crud*
*Completed: 2026-05-29*
