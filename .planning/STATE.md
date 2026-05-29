# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-28)

**Core value:** Students can discover, browse, and book lessons from multiple coaches AND browse, fit-match, and rent competition dresses. The super admin manages both coaching operations and the wardrobe marketplace end-to-end.
**Current focus:** v2.0 YM Wardrobe — defining requirements

## Current Position

Phase: 13 of 22 (Wardrobe Schema Foundation) — all 3 plans complete
Plan: 02 of N (Wardrobe Global Settings) — completed (parallel Wave 2 with 13-03)
Status: Phase 13 complete
Last activity: 2026-05-29 — Completed 13-02-PLAN.md (admin.wardrobeSettings.{get,update} TRPC procedures backed by JSON blob under Settings.key="wardrobe")

Progress: ██░░░░░░░░ ~22% of v2.0 milestone

## Performance Metrics

**v1.0 Multi-Coach (completed):**
- Total plans completed: 25
- Average duration: 3.8min

**v1.1 Test & Stabilize (completed):**
- Total plans completed: 11
- Average duration: 10.5min

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

Last session: 2026-05-29T04:44:56Z
Stopped at: Completed 13-02-PLAN.md (wardrobe global settings via existing Settings key/value JSON pattern, admin.wardrobeSettings.{get,update} TRPC procedures, smoke-tested round-trip against live Neon with clean lazy-upsert cleanup).
Resume file: None
Next step: Phase 13 foundation is fully complete (01 schema, 02 settings, 03 upload pipeline). Proceed to `/gsd:plan-phase 14` to wire React components to the new wardrobe TRPC namespace and to consume `admin.wardrobeSettings.get` in the admin settings UI. **User-setup blocker for Phase 14 end-to-end testing:** `BLOB_READ_WRITE_TOKEN` must be added to local `.env` from Vercel Dashboard → ym-movement project → Storage → wardrobe-images store → `.env.local` tab.
