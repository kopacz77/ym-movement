# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-28)

**Core value:** Students can discover, browse, and book lessons from multiple coaches AND browse, fit-match, and rent competition dresses. The super admin manages both coaching operations and the wardrobe marketplace end-to-end.
**Current focus:** v2.0 YM Wardrobe — defining requirements

## Current Position

Phase: 15 of 22 (Catalog Browse & Measurements) — IN PROGRESS
Plan: 1/? complete (15-01 shipped)
Status: Phase 15 Wave 1 began. Plan 15-01 (catalog + measurement TRPC procedures) executed and committed; smoke tests pass against dev Neon; type-check clean. Next: continue with subsequent Phase 15 plans (Slider primitive + image domain, fit-score module, measurement form, filter bar, catalog grid).
Last activity: 2026-05-29 — Plan 15-01 complete: wardrobe.list/byId/facets + wardrobe.measurements.get/update mounted on wardrobeRouter. PUBLIC_DRESS_SELECT enforces CAT-08 at the SQL level; availability anti-join enforces CAT-03; server BAD_REQUEST gates enforce CAT-05 for sort=bestFit and fitsMe=true.

Progress: ██░░░░░░░░ ~22% of v2.0 milestone (Phase 14 shipped, Phase 15 Wave 1 underway)

## Performance Metrics

**v1.0 Multi-Coach (completed):**
- Total plans completed: 25
- Average duration: 3.8min

**v1.1 Test & Stabilize (completed):**
- Total plans completed: 11
- Average duration: 10.5min

**v2.0 Wardrobe (in progress):**
- Total plans completed: 11 (13-01, 13-02, 13-03, 14-01, 14-02, 14-03, 14-04, 14-05, 14-06, 14-07, 15-01)
- Phase 14 plans shipped: 7/7 — PHASE 14 COMPLETE
- Phase 15 plans shipped: 1/? (15-01 — catalog + measurement TRPC procedures)

## Accumulated Context

### Decisions

- Playwright E2E for test coverage (not unit tests) — E2E tests verify real user flows
- Extend existing test helpers (not rewrite) — test-utils.ts has proven patterns
- Google Calendar OAuth tests excluded — cannot test real OAuth in automated tests
- Use project dependencies pattern (not globalSetup) for Playwright setup ordering
- Default storageState is super-admin.json; tests override with test.use() for other roles
- proxy.ts replaces middleware.ts for Next.js 16 (function renamed from middleware to proxy)
- Sign Out button text must be exactly "Sign Out" to match test selector
- Use 2 workers for local dev server testing (prevents compilation overload)
- Use domcontentloaded instead of networkidle to avoid cold-compilation timeouts
- **(13-01) Author Prisma migration.sql by hand**: CLAUDE.md + .claude/settings.local.json forbid every migrate dev variant; `prisma migrate deploy` (= `pnpm prisma:migrate`) is the only allowed apply command
- **(13-01) Wrap migrations in `BEGIN;...COMMIT;`**: forces clean rollback on partial failure
- **(13-01) Restrict cascades on Dress.Owner, RentalRequest.*, Rental.*; Cascade only on DressImage.Dress**: protect audit history, allow orphan-image cleanup
- **(13-01) All wardrobe money fields stored as Int cents** (no Float, to avoid drift)
- **(13-01) Settings extension deferred to Plan 02**: existing Settings is key/value JSON, not typed singleton; wardrobe defaults will be a `key: "wardrobe"` row
- **(13-01) Named `@relation("DressOwner")` on User<->Dress**: pre-empt ambiguity if a `lastEditedById` link is added later
- **(13-03) handleUpload() route handler (NOT a TRPC signed-URL mutation)**: Vercel SDK owns the auth callback, content-type whitelist, and byte cap — keeps enforcement single-sourced
- **(13-03) Client-driven attachImage persistence (NOT webhook-driven onUploadCompleted)**: Vercel cannot reach localhost without ngrok; the client calling `wardrobe.images.attachImage` after `upload()` resolves is debuggable and tunnel-free
- **(13-03) Defense-in-depth caps**: 8-image and 5MB caps enforced at BOTH the route handler AND the TRPC mutation / client compression helper
- **(13-03) Delete order: `del(url)` first, then `prisma.dressImage.delete`**: orphan row → loud 404 in UI; orphan blob → silent storage cost (avoided)
- **(13-03) `del()` from `@vercel/blob` (server SDK) NOT `@vercel/blob/client`**: separate runtime targets, different exports
- **(13-03) `protectedProcedure` + per-call `assertCanModifyDress` (admin OR owner)**: not `adminProcedure`, because owners must legitimately manage their own dress photos
- **(13-03) `setPrimary` included even though not in plan deliverables**: STORAGE-04 implies it and Phase 14 gallery UI needs it — avoids a forced second touch of `imageQueries.ts`
- **(13-02) Wardrobe defaults implemented as JSON blob under `Settings.key="wardrobe"`, NOT new typed columns**: actual `Settings` model is a key/value JSON store, not a typed singleton (13-RESEARCH.md Critical Finding #1)
- **(13-02) Defaults encoded once in Zod `.default()` and parsed at module load**: single source of truth for both runtime fallback and `parse({})` schema-defaults
- **(13-02) Single `WARDROBE_SETTINGS_KEY = "wardrobe"` constant exported and imported everywhere**: prevents the typo-key drift failure mode (writer A uses "wardrobe", writer B uses "Wardrobe", neither finds the other's row)
- **(13-02) Fail-soft read on corrupt JSON**: `getWardrobeSettings` wraps `JSON.parse` + Zod parse in try/catch; falls back to defaults rather than throwing — bad data must not brick the wardrobe
- **(13-02) Lazy upsert (no seed row)**: matches existing `operational`/`payment`/`rinkAreas` pattern; row appears only on first real `update`
- **(13-02) Both procedures use `adminProcedure`; non-admin consumers call helpers directly from server code**: avoids exposing settings to public TRPC clients while keeping server-only pre-fill (e.g. consigner form commission %) ergonomic
- **(14-01) `adminProcedure` (NOT `superAdminProcedure`) on every admin.wardrobe.* procedure**: PERM-02 reads admin-or-super-admin; `adminProcedure` already gates on `isAdminRole(role)` which accepts both. Matches Phase 13 wardrobeSettings sibling.
- **(14-01) Server-side hardcoded `status: "AVAILABLE"` on create**: admins bypass the consigner PENDING_APPROVAL queue (ADMIN-02). Client-passed status is silently overridden. Consigners use a separate Phase 18 flow into the same Dress table.
- **(14-01) Auto-inject `ownerId = ctx.session.user.id` on create**: admin doing the create owns the dress. Re-assignment is permitted via update (admins can flip ownerId there).
- **(14-01) Soft-archive only — no hard-delete TRPC procedure exposed in MVP**: `archive` flips status=ARCHIVED + stamps archivedAt=now(). Rentals/requests/images preserved for audit.
- **(14-01) `dressInputSchema` excludes system-managed fields (id, createdAt, updatedAt, archivedAt, ownerId, status)**: schema is the single contract the Wave 2 admin RHF form validates against. Zero schema duplication.
- **(14-01) `formatCurrencyFromCents` helper composes on top of existing `formatCurrency(dollars)`**: kills inlined `cents/100` math. All wardrobe money fields are Int cents at DB and API; dollar formatting only at display.
- **(14-01) Sub-router mounted at `admin.wardrobe`, adjacent to `admin.wardrobeSettings`**: semantic grouping (readability over alphabetization) — both wardrobe-namespace siblings live next to each other in the parent createTRPCRouter call.
- **(14-02) Wardrobe status palette one-to-one to brand sweep**: AVAILABLE=emerald, PENDING_APPROVAL=amber+pulse, PENDING(rental)=cyan, RENTED=violet, MAINTENANCE/ARCHIVED=slate, REJECTED=rose. Matches CLAUDE.md 2026-04-26 sweep (green→emerald, orange→amber, red→rose) and reuses lesson-type violet for active "in use" state.
- **(14-02) CategoryBadge stays neutral slate**: category is metadata not state. Coloring it would compete with the status badge inside grid cards. Status owns semantic color; category is descriptive.
- **(14-02) StatusFilterChips imposes NO default selection**: parent (`DressInventoryGrid` in 14-05) owns the initial `["AVAILABLE"]` so the URL-sync layer is single-sourced. This component is a dumb controlled toggle array.
- **(14-02) Exhaustive `Record<Enum, …>` for status + category mappings**: Prisma adding a new variant forces a compile error in DressStatusBadge / CategoryBadge / StatusFilterChips until the maps are extended. Schema is the contract.
- **(14-02) Type-only Prisma imports in all three primitives**: `import type { DressStatus }` keeps zero Prisma client runtime in the component bundle and lets them render in Server OR Client Components without re-export friction.
- **(14-02) Directory split: `wardrobe/components/` for cross-role primitives, `wardrobe/components/admin/` for admin-only chrome**: Phase 15 (student catalog) reuses DressStatusBadge + CategoryBadge from the root path without importing admin code.
- **(14-04) Single-source Zod reuse — import `wardrobeSettingsSchema` from Phase 13 queries file, never redeclare**: client form validates against the SAME schema the TRPC procedure parses with. Schema drift made structurally impossible.
- **(14-04) `useForm<z.input<S>, unknown, z.output<S>>` generics when the Zod schema has `.default()` on every field**: RHF's TFieldValues needs the input shape (optionals) while the submit handler receives the output shape (required). Using `z.infer` (== `z.output`) for both causes TS2322 on the resolver and TS2345 on handleSubmit.
- **(14-04) Mount form immediately with `wardrobeSettingsSchema.parse({})` defaults; rehydrate via `form.reset(data)` in useEffect**: avoids the "remount-on-data-arrival flicker / lose user keystrokes" anti-pattern. RHF refs and state machine initialize against the canonical defaults; fetched values patch in once useQuery resolves.
- **(14-04) `valueAsNumber: true` on every numeric register()**: HTML number inputs report their `.value` as a string. Without this RHF passes `"15"` to zodResolver, which fails the `z.number()` check. With it, coercion happens before validation.
- **(14-03) Two-tier Zod schema for DressForm — internal dollar-based `dressFormSchema` (UI) bridges to canonical cents-based `dressInputSchema` (wire) inside `handleSubmit`**: UI layer needs dollars (humans don't think in cents), empty-string preprocessing for optional numerics (HTMLInputElement returns `""` on clear), comma-separated raw tag strings. None belongs on the wire. `Math.round(dollars * 100)` is the single conversion site.
- **(14-03) Mode prop `"create" | "edit"` (NOT boolean) on DressForm**: structural divergence (image gallery placement, status field visibility, submit copy). Literal-type prop self-documents at call sites.
- **(14-03) DressImageGallery is a sibling of DressForm, never a child**: create mode has no dressId yet for the blob uploader's `clientPayload`; edit mode slots `<DressImageGallery />` above `<DressForm />`. Keeps the form pure.
- **(14-03) Sequential await inside the upload `for…of` loop (NOT `Promise.all`)**: Phase 13's `attachImage` sets `isPrimary=true` on the first image based on the row count at insert time. Parallel attaches would race for the primary flag. Serial is the correctness/UX-tradeoff winner.
- **(14-03) Single bulk `onMutated()` after the upload batch + per-mutation `onSuccess` on the three single-shot mutations (reorder/setPrimary/deleteImage)**: reduces N round-trips to one refetch for an N-file upload, keeps the three single-action mutations responsive.
- **(14-03) Defense-in-depth 8-image cap at FOUR layers**: UI counter + UI button disabled + `attachImage` BAD_REQUEST (Phase 13 TRPC) + route-handler token mint refusal. Each layer fails independently; UI cap is the cheapest UX signal but never authoritative.
- **(14-03) Up/down arrow reorder over drag-and-drop for v1**: Phase 13 TRPC contract is identical (full ordered id list). Arrows are accessible by default; DnD would need keyboard fallback engineering. Polish pass can land without backend changes.
- **(14-03) Plan's `setPrimary({ dressId, imageId })` / `deleteImage({ dressId, imageId })` / `reorderImages({ orderedImageIds })` signatures were stale**: actual Phase 13 contracts are `setPrimary({ imageId })`, `deleteImage({ imageId })`, `reorderImages({ dressId, orderedIds })`. Used the actual signatures; server-side `assertCanModifyDress` still authorizes correctly via the row's `dressId` lookup.
- **(14-03) Plain `<img>` with biome lint-ignore (NOT `next/image`) for blob URLs**: `blob.vercel-storage.com` would need to be added to `next.config.js images.remotePatterns`. Out of scope for a UI plan. Revisit when public browse / fit-match surfaces need image optimization.
- **(14-05) URL-state for statuses + search + page (NOT React state, NOT a Zustand store)**: refresh-survivability and shareable deep-links are first-class UX features for an inventory admins reach via bookmarks and Slack pastes. The URL IS the state; React state is derived (parsed on every searchParams change). Local search input is the only piece of UI state NOT immediately mirrored — flushed to URL on form submit to avoid history-entry churn.
- **(14-05) Default-value elision policy**: when a filter equals its default (statuses=['AVAILABLE'], q='', page=1), delete the param from the URL instead of writing it explicitly. Canonical first-load URL stays clean (`/admin/wardrobe`); only deviating selections produce visible URL noise.
- **(14-05) All-statuses-selected optimization**: when every DressStatus variant is checked, send `statuses: undefined` to the server, NOT the full 7-element array. listInputSchema already treats undefined as "no filter" which skips the WHERE IN clause. Matches semantic intent ("show everything") AND saves the index lookup.
- **(14-05) Archive UX reuses `showDeleteConfirmation` (Delete button copy) but mutation calls `admin.wardrobe.archive` + toast says "Dress archived"**: MVP has no hard-delete (per 14-01 ADR). Reusing the established admin destructive-action pattern keeps muscle memory intact while being honest about the actual operation in the success toast.
- **(14-05) `router.replace()` + `{ scroll: false }` on every URL update**: filter changes don't deserve their own back-button entry, and default Next.js scroll-to-top on URL change is catastrophic for filter UX (chip click → page jumps). Both suppressions are universal across every URL-state mutation in this component.
- **(14-05) Page reset on every filter change centralized in `updateParams()` helper**: page=N is meaningless across different result sets, so any statuses/q delta deletes the page param. Centralized so it can't drift; the only call that DOESN'T delete page is Prev/Next itself.
- **(14-05) Total-defensive `parseStatusesParam`**: always returns `DressStatus[]` with at least one element. Garbage input → AVAILABLE default. Unknown variants filtered. Consumer never sees null, empty array, or invalid enum values. Reusable pattern for any URL-state-driven enum filter.
- **(14-07) Server-component placeholder, no AppLayout wrap**: top-level `(protected)` route group has no `layout.tsx`, so the stub renders raw. Acceptable for a static page with zero sensitive data; Phase 15 decides whether student routes get a consistent `AppLayout role="student"` shell.
- **(14-07) Brand fidelity on throwaway code**: navy `#1a3a5c` header + cyan `#0891b2` Shirt icon accent + standard luxury card shadow even though the entire file gets deleted in Phase 15. No half-styled stubs shipped to users.
- **(14-07) Copy explicitly names "Phase 15"**: gives the next planner a literal grep target. Replacing `Coming soon` is a one-search-one-edit operation when the catalog ships.
- **(14-06) Page = thin client shell pattern**: all four `/admin/wardrobe` pages are `"use client"` with `space-y-8` + editorial header + a single Wave 2 component. No per-page `auth()` call (AdminLayout already gates via `<AppLayout role="admin">`); no business logic. The page exists ONLY to compose the route shape and the brand chrome. Future admin features should mirror this; routing/auth/business logic split is the single most important page-layer contract.
- **(14-06) Cents↔dollars conversion at the edit page boundary, NOT inside DressForm**: server schema is cents, form schema is dollars. The mapping happens exactly twice: (a) when packing `defaultValues` from `dress.competitionPrice / 100`, and (b) inside `DressForm.handleSubmit` via `Math.round(dollars * 100)`. The page owns the (a) seam because it's where the wire shape arrives; the form owns (b) because it's where the user-typed shape exits. Neither layer leaks into the other.
- **(14-06) DressImageGallery ABOVE DressForm on the edit page (not side-by-side)**: an admin coming from `/admin/wardrobe/new` lands at the top of the page looking directly at the uploader. The "create then add images" UX is one continuous vertical scroll. Side-by-side would have buried the uploader on narrow viewports and broken the create-then-redirect flow's pedagogical lead-in.
- **(14-06) Create-then-redirect for new-dress**: `api.admin.wardrobe.create.useMutation` → toast → `router.push('/admin/wardrobe/${dress.id}/edit')`. Forced by Phase 13's `/api/wardrobe/upload` route, which calls `prisma.dress.findUnique` on the `clientPayload.dressId` before minting a Vercel Blob token. No dressId means no token means no upload — so the new-dress page MUST be metadata-only. Toast description ("Add images on the next screen") sets user expectation before the redirect.
- **(14-06) `useParams<{id: string}>()` on the edit page, not server-component `params: Promise<{id}>`**: the page is `"use client"` because both children (DressForm, DressImageGallery) consume TRPC hooks. A server-component shell would buy nothing. `useParams` is the canonical client-side dynamic-route accessor in Next.js 16 App Router.
- **(14-06) Sidebar entries via navigation-config.ts ONLY, no AppSidebar/AppLayout edits**: AppSidebar consumes `getNavigationForRole(role)`; new entries flow through automatically. Both files are LOCKED per CLAUDE.md. The lucide `Shirt` icon was added to the existing import block (alphabetical, after Settings), and a single `{ name: "Wardrobe", href, icon: Shirt }` line inserted into BOTH adminNavigation (`/admin/wardrobe`) and studentNavigation (`/wardrobe`), positioned above the Settings entry. coachNavigation intentionally untouched.
- **(14-06) TRPC procedures that include relations MUST type the local variable with the explicit findUnique generic**, NOT `Awaited<ReturnType<typeof ctx.prisma.dress.findUnique>>`. The latter collapses to the base model with no relations; the TRPC client then loses sight of Owner / Images on the return type. Caught in 14-06 Task 4 as a bug in 14-01's `byId`; fixed by replacing the annotation with `Awaited<ReturnType<typeof ctx.prisma.dress.findUnique<{ where: {...}; include: { Owner: ...; Images: ... } }>>>`.
- **(15-01) `protectedProcedure` over a new `studentProcedure` middleware**: two procedures don't justify a new middleware; coaches/admins viewing `/wardrobe` see the same catalog by design (research Open Question 4). The two procedures that need "current student" derive it via inline `ctx.prisma.student.findUnique({ where: { userId: ctx.session.user.id } })` — same pattern as `bookingQueries.ts:49`.
- **(15-01) PUBLIC_DRESS_SELECT typed via `satisfies Prisma.DressSelect` (not annotated)**: the `satisfies` operator anchors the type without widening, so adding a sensitive column to the Dress model wouldn't auto-leak. New safe columns must be added to PUBLIC_DRESS_SELECT explicitly. Single SQL-level enforcement point for CAT-08 (internalNotes + consignmentCommissionPct never returned).
- **(15-01) `themeQuery` filter uses `hasSome` exact-tag match for MVP**: substring ILIKE via raw SQL (research Pattern 4 option c) is the documented fallback. The facets endpoint will eventually drive autocomplete, making exact-match the right UX too. Decision: ship simple, escalate to raw SQL only if user feedback warrants.
- **(15-01) In-memory pagination via `.slice()` over Prisma skip/take**: result set is bounded by AVAILABLE+PENDING + filter WHERE clauses; Plan 15-02's bestFit sort requires the full set anyway. Mixing skip/take with in-memory sort for one branch would complicate the dispatch.
- **(15-01) `list`/`byId`/`facets` mounted flat on `wardrobeRouter` root** (matches design-doc spec L298-299); only `images.*` and `measurements.*` are nested sub-routers. TRPC client paths read as `api.wardrobe.list.useQuery({})`, `api.wardrobe.measurements.get.useQuery()` — semantic over structural.
- **(15-01) BAD_REQUEST gate for `sort=bestFit` AND `fitsMe=true` fires before any expensive query**: matches the disabled-toggle client UX guarantee. `callerHasMeasurements = (chest ?? waist ?? hips) != null` — any one suffices (research Open Question 5).
- **(15-01) `measurementsUpdatedAt` stamped unconditionally on every successful `wardrobe.measurements.update` call**: timestamp tracks "last reviewed", not "last mutated" (MEASURE-03). Empowers the UI to show an honest recency indicator even when the user saved without changing anything.
- **(15-01) `wardrobe.byId` returns NOT_FOUND for any status outside AVAILABLE/PENDING**: identical 404 response to a truly missing row — does not leak the existence of ARCHIVED/REJECTED/PENDING_APPROVAL dresses to public catalog callers.
- **(15-01) Wave 1 stubs `sort=bestFit` and `fitsMe=true` as no-op pass-throughs with TODO(15-02) markers**: procedure is deployable before Plan 15-02 lands `fitScore.ts`. BAD_REQUEST gates remain authoritative regardless of whether 15-02 has shipped.

### Pending Todos

- **(Phase 14 live-UX checklist for user wake-up)**: (1) confirm sidebar Wardrobe entry visible above Settings for admin AND student roles, (2) `/admin/wardrobe/new` create flow redirects to /[id]/edit after save, (3) image upload works locally once `BLOB_READ_WRITE_TOKEN` is added to `.env`, (4) ARCHIVED rows visually de-emphasized in inventory grid, (5) non-admin caller gets UNAUTHORIZED on `admin.wardrobe.*` procedures. All programmatic checks already passed in 14-VERIFICATION.md.

### Completed Todos

- ~~Set up Google OAuth credentials for production~~ — Configured in GCP project `yuras-app` with redirect URI `https://ym-movement.com/api/auth/google-calendar/callback`, env vars added to Netlify
- ~~Run `pnpm migrate:coach-data` before production deployment~~ — Verified applied (5 coaches, 0 null coachIds, 67 CoachStudent links)
- ~~Pre-existing `pnpm build` failure: Next.js post-build 404 copy error~~ — Resolved by Next.js 16.1.1 → 16.1.6 upgrade

### Blockers/Concerns

- **(13-01) Pre-existing TypeScript errors uncovered after node_modules re-install**: `src/components/landing/IceParticles.tsx` (missing `three` types) and `src/components/ui/sidebar.tsx` (missing `@radix-ui/react-visually-hidden`). Confirmed pre-existing via git stash; out of scope for Plan 13-01 but should be triaged separately.
- **(13-01) pnpm 11.2.2 ignores legacy `pnpm.overrides` key in package.json** — caused a node_modules wipe + reinstall mid-session. Lockfile was regenerated via `pnpm install --no-frozen-lockfile`. Future invocations of `pnpm db:check` should be stable, but if pnpm tries to "Recreate node_modules" again, the root cause is the same — the `pnpm.overrides` block in package.json should eventually be removed or migrated to pnpm-workspace.yaml.
- **(13-02) `pnpm` script wrappers blocked by `ERR_PNPM_IGNORED_BUILDS`**: any `pnpm <script>` invocation (including `pnpm type-check`, `pnpm tsx ...`) errors before the underlying command can run because pnpm 11's deps-status check sees ignored build scripts and aborts. Workaround used during 13-02: invoke `npx tsc --noEmit` and `npx tsx scripts/<file>.ts` directly. Same root cause as the 13-01 `pnpm.overrides` issue.
- **(13-02) `npx tsx -e` inline-script mode hangs in this sandbox shell**: likely a shell-escaping / stdin-buffering issue specific to how multi-line `-e` payloads round-trip through the harness. Workaround: write the script to a temp file in `scripts/`, run via `npx tsx scripts/<file>.ts`, delete after.

## Session Continuity

Last session: 2026-05-29
Stopped at: Completed Plan 15-01 (catalog + measurement TRPC procedures). 4 atomic task commits + 1 metadata commit. SUMMARY.md written. Phase 14 live-UX checklist still pending user wake-up confirmation.
Resume file: None
Next step: Continue Phase 15. Subsequent plans (per the Phase 15 design): Slider primitive + Vercel Blob image domain config, fit-score module replacing the TODO(15-02) markers in `catalogQueries.list`, measurement form at `/wardrobe/measurements`, filter bar component, catalog grid replacing the Coming Soon stub at `src/app/(protected)/wardrobe/page.tsx`. **Carried user-setup blocker for end-to-end image upload testing:** `BLOB_READ_WRITE_TOKEN` must be added to local `.env` from Vercel Dashboard → ym-movement project → Storage → wardrobe-images store → `.env.local` tab.
