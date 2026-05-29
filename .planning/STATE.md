# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-28)

**Core value:** Students can discover, browse, and book lessons from multiple coaches AND browse, fit-match, and rent competition dresses. The super admin manages both coaching operations and the wardrobe marketplace end-to-end.
**Current focus:** v2.0 YM Wardrobe — defining requirements

## Current Position

Phase: 14 of 22 (Admin Inventory CRUD) — In progress
Plan: 2/7 complete
Status: 14-02 shipped — DressStatusBadge / CategoryBadge / StatusFilterChips presentational primitives live, Wave 2 form + inventory grid unblocked
Last activity: 2026-05-29 — Completed 14-02-PLAN.md (3 tasks, 2m 28s)

Progress: █░░░░░░░░░ ~10% of v2.0 milestone (1 of 10 phases shipped + 2/7 plans into Phase 14)

## Performance Metrics

**v1.0 Multi-Coach (completed):**
- Total plans completed: 25
- Average duration: 3.8min

**v1.1 Test & Stabilize (completed):**
- Total plans completed: 11
- Average duration: 10.5min

**v2.0 Wardrobe (in progress):**
- Total plans completed: 5 (13-01, 13-02, 13-03, 14-01, 14-02)
- Phase 14 plans shipped: 2/7

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

### Pending Todos

(None)

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
Stopped at: Completed 14-02-PLAN.md — DressStatusBadge + CategoryBadge + StatusFilterChips presentational primitives shipped in `src/features/wardrobe/components/`. Brand palette locked. Pure presentational (no TRPC, type-only Prisma imports). Biome + tsc clean on new files; 2 pre-existing repo TS errors (IceParticles `three` types, sidebar `@radix-ui/react-visually-hidden`) unchanged.
Resume file: None
Next step: Execute 14-03-PLAN.md — Admin DressForm (RHF + zod dressInputSchema from 14-01). Will consume DressStatusBadge + CategoryBadge for the form preview. **User-setup blocker for Phase 14 end-to-end image upload testing:** `BLOB_READ_WRITE_TOKEN` must be added to local `.env` from Vercel Dashboard → ym-movement project → Storage → wardrobe-images store → `.env.local` tab.
