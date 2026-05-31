# YM Movement Multi-Coach Platform

## What This Is

YM Movement is a multi-coach ice dance lesson scheduling platform for coach Yura Min, paired with a competition-dress rental and lightweight consignment marketplace. It supports SUPER_ADMIN, COACH, and STUDENT roles. Students book lessons by coach and browse a wardrobe of competition dresses with marketplace-style filters sized to their body measurements. Skaters can self-list dresses for consignment with admin approval. Yura manages coaching operations, dress inventory, rental requests, returns, and consigner payouts — all in one platform.

## Current State

**Shipped:** v2.0 YM Wardrobe (2026-05-30)
**Previous:** v1.1 Test & Stabilize (2026-03-17), v1.0 Multi-Coach (2026-03-16)
**Active:** Planning next milestone

The lesson-scheduling platform and the wardrobe marketplace are both fully functional and in production at ym-movement.com. v2.0 shipped a 10-phase, 47-plan, 86-requirement marketplace surface in 3 days of intensive autonomous execution.

**Codebase:** ~95,000+ lines TypeScript (was ~80k pre-v2.0; +13,140 LOC wardrobe code + assorted shared infra)
**Test suite:** 128 v1.x E2E tests + 10 v2.0 wardrobe E2E describes (56 tests across 7 browser projects) + 42 vitest unit tests
**Storybook:** 48 stories with VRT snapshots (was 18 + 20 snapshots pre-v2.0; +23 stories + +28 baselines from v2.0)

## Core Value

Students can discover, browse, and book lessons from multiple coaches across different disciplines AND browse, fit-match, and rent competition dresses from a curated wardrobe. The super admin maintains full visibility and control over both coaching operations (revenue splits, payouts) and the wardrobe marketplace (inventory, rental approvals, consigner payouts).

## Requirements

### Validated

#### v1.0 Multi-Coach (shipped 2026-03-16)

- ✓ SUPER_ADMIN/COACH/STUDENT role hierarchy with route guards and TRPC middleware — v1.0
- ✓ Coach self-registration with admin approval queue — v1.0
- ✓ Coach profile system (bio, skills, rates, certifications) — v1.0
- ✓ Coach dashboard (schedule, students, earnings, proposals) — v1.0
- ✓ Per-coach time slot ownership and conflict detection — v1.0
- ✓ Student browse-by-coach booking flow — v1.0
- ✓ Per-coach Google Calendar OAuth integration — v1.0
- ✓ Configurable revenue splits with payout reports — v1.0
- ✓ Super admin cross-coach visibility and management — v1.0
- ✓ Dual-role navigation (super admin + coach) — v1.0
- ✓ Per-coach data isolation (179+ queries scoped) — v1.0

#### v1.1 Test & Stabilize (shipped 2026-03-17)

- ✓ E2E test coverage for all multi-coach features (128 tests, zero failures) — v1.1
- ✓ Next.js 16 proxy.ts migration for middleware compatibility — v1.1

#### v2.0 YM Wardrobe (shipped 2026-05-30)

- ✓ Prisma schema: Dress, DressImage, RentalRequest, Rental models + Student measurement fields + Settings extensions — v2.0
- ✓ Vercel Blob image upload pipeline (signed PUT URLs, client compression, 8 images/dress max, 4-layer defense-in-depth) — v2.0
- ✓ Admin dress inventory CRUD with full field access — v2.0
- ✓ Marketplace catalog browse with structured filters + URL-shareable state — v2.0
- ✓ Student measurement profile + "fits me" filter + "best fit" sort with alterable-slack-aware scoring — v2.0
- ✓ Dress detail page with image carousel, pricing tiers, FitCheckCard — v2.0
- ✓ Rental request flow with rental type, dates, competition info, message — v2.0
- ✓ Admin rental request queue with approve/decline + response messaging — v2.0
- ✓ Active rentals view: mark paid (Venmo/Zelle/Cash), mark returned, release deposit — v2.0
- ✓ Self-serve consigner upload with PENDING_APPROVAL → AVAILABLE state machine — v2.0
- ✓ Admin pending-approval queue with approve (commission % override) / reject (with reason) — v2.0
- ✓ Consignment earnings view + manual payout tracking — v2.0
- ✓ Global wardrobe settings (default commission %, expiry days, return reminder days) — v2.0
- ✓ 9 lifecycle notifications (email + in-app) covering rental + consignment flows — v2.0
- ✓ Sidebar entries (Shirt + Tag icons) — v2.0
- ✓ Permissions matrix enforced via TRPC middleware (PERM-01..04) — v2.0
- ✓ Wardrobe E2E spec (10 describes, 56 tests) — v2.0
- ✓ Storybook stories + VRT snapshots for wardrobe + 12 cross-project backfill — v2.0
- ✓ Seed script populating 6 sample dresses with picsum placeholder images — v2.0
- ✓ Health-check endpoint extended with dress/request/rental row counts — v2.0
- ✓ Project-wide Storybook audit (237 components inventoried at docs/storybook-audit.md) — v2.0
- ✓ Vercel cron infra for return reminders (`/api/cron/wardrobe-return-reminders`) — v2.0

### Active

*To be defined for next milestone via `/gsd:discuss-milestone` → `/gsd:new-milestone`.*

Carryover signals from v2.0 audit + deferred items:

- Architectural server-only split (`.schema.ts` siblings + `import "server-only"` directive) to replace viteFinal alias workaround in `.storybook/main.ts`
- `scripts/audit-stories.ts` to generate `docs/storybook-audit.md` programmatically (instead of hand-maintaining)
- Continued Storybook backfill from current ~17% project-wide coverage
- NotificationsPopover open-state Storybook coverage (current stories snapshot closed bell trigger only)
- Resolve pre-existing `IceParticles` `three` types declaration error (unrelated to v2.0)
- Resolve pre-existing `pnpm` `ERR_PNPM_IGNORED_BUILDS` wrapper quirk affecting `pnpm vitest run` / `pnpm prisma:migrate` (currently sidestepped via `npx` direct invocation)

Plus the v2.x roadmap deferrals (CLEAN-01..04, SHIP-01..04, STYLE-01..06, ALTER-01..03, PAY-01..04) and v3.0 external marketplace items, all archived in `milestones/v2.0-REQUIREMENTS.md`.

### Out of Scope (Permanent Exclusions)

- Mobile native app — web-first, responsive design sufficient
- Real-time chat between coaches and students — use existing notification system
- Automated payout processing (Stripe/PayPal) for lessons — track amounts owed, pay outside app
- Coach-to-coach messaging — communicate outside the platform
- Student reviews/ratings of coaches — defer to future version
- Multi-location/franchise support — single organization (YM Movement)

## Context

- **Existing codebase**: Next.js 16 + React 19 + TypeScript + TRPC v11 + Prisma + PostgreSQL (Neon)
- **Auth**: NextAuth v5 beta with SUPER_ADMIN, COACH, and STUDENT roles
- **Database**: Prisma ORM with User, Student, Lesson, Payment, Rink, RinkTimeSlot, Coach, CoachStudent, Dress, DressImage, RentalRequest, Rental, Notification, Settings, ProposedTimeSlot, and more (~20 models)
- **Calendar**: Per-coach Google Calendar OAuth with AES-256-GCM encrypted token storage
- **UI**: Tailwind CSS + Radix UI + shadcn/ui components, fixed sidebar layout architecture (LOCKED per CLAUDE.md)
- **Email**: Resend, `info@ym-movement.com` sender, cyan #0891b2 + navy #1a3a5c brand palette (2026-04-26 sweep)
- **Storage**: Vercel Blob for dress images (signed PUT URL flow via handleUpload route)
- **Cron**: Vercel cron declared in `vercel.json` — `send-batch-emails` + `wardrobe-return-reminders` both at `0 4 * * *` UTC
- **Deployment**: Production on Vercel with Neon PostgreSQL (manual CLI deploys, not GitHub-connected)
- **The admin (Yura) is also the product owner** — she coaches while managing other coaches AND runs the wardrobe inventory

## Constraints

- **Tech stack**: Must extend existing Next.js/TRPC/Prisma stack — no rewrites
- **Backward compatibility**: All existing student/admin/coach functionality must continue working
- **Layout architecture**: Sidebar (`AppSidebar.tsx`) and layout (`AppLayout.tsx`) are LOCKED per CLAUDE.md — new features add entries via `navigation-config.ts` only
- **Database safety**: NEVER `prisma migrate reset` / `migrate dev` / `db push --force-reset` — only `pnpm prisma:migrate` (= `migrate deploy`); migrations must be hand-authored, wrapped in BEGIN;...COMMIT;
- **Biome**: All code must pass Biome linting (not ESLint)
- **Prisma relations**: Must use PascalCase relation names per project convention
- **Money**: All financial values stored as `Int` cents, formatted via `formatCurrencyFromCents` at display layer only — no Float drift
- **Notifications**: All email sends wrapped in non-blocking try/catch — Resend outage never breaks parent mutation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Add COACH and SUPER_ADMIN roles (not reuse ADMIN) | Clean separation of concerns | ✓ v1.0 |
| Coaches self-manage availability with super admin override | Balances coach autonomy with platform control | ✓ v1.0 |
| Students browse by coach (not by discipline/unified calendar) | Simpler UX, coach-centric relationship model | ✓ v1.0 |
| Per-coach negotiated revenue splits | Flexibility for different coach arrangements | ✓ v1.0 |
| Per-coach Google Calendar (not master calendar) | Each coach owns their schedule, simpler OAuth | ✓ v1.0 |
| Yura is both super admin and coach | Preserves existing coaching relationship | ✓ v1.0 |
| Playwright E2E for test coverage (not unit tests) | E2E tests verify real user flows | ✓ v1.1 |
| Next.js 16 proxy.ts (not middleware.ts) | Next.js 16 deprecated middleware in favor of proxy | ✓ v1.1 |
| YM Wardrobe stays inside YM Movement (not standalone brand) | Tight integration with existing auth + roles; external brand revisited in v3.0 | ✓ v2.0 |
| Marketplace-style filters + body measurements drive discovery | Skaters care about fit and style; "fits me" is the differentiating UX | ✓ v2.0 |
| Self-serve consigner upload with admin approval | Skaters drive supply; admin gates quality + brand consistency | ✓ v2.0 |
| Global default commission % via Settings (admin override at approval) | Avoids per-dress data entry friction | ✓ v2.0 |
| Venmo/Zelle/Cash with manual verification (no Stripe in MVP) | Mirrors existing lesson payment flow | ✓ v2.0 |
| Vercel Blob for dress images (not S3/Cloudinary) | Already on Vercel, signed PUT URL flow simplest | ✓ v2.0 |
| New Rental table (not extending lesson Payment) | Different lifecycle, different fields | ✓ v2.0 |
| All wardrobe money stored as Int cents | No Float drift; formatCurrencyFromCents at display only | ✓ v2.0 |
| consignmentPayoutAmount snapshotted at Rental creation (not computed on read) | Future Dress price changes don't retroactively affect Rentals | ✓ v2.0 |
| Hand-authored Prisma migrations wrapped in BEGIN;...COMMIT; | Production data wipe protection (2026-04-05 incident) | ✓ v2.0 |
| Email helpers append to src/lib/email.ts (no templating library) | Mirrors existing brand-styled HTML pattern | ✓ v2.0 |
| viteFinal alias for @/lib/security in Storybook (tactical fix) | Unblocks `pnpm storybook:build`; architectural server-only split deferred to v2.1 | ⚠️ Revisit v2.1 |
| Picsum.photos placeholder URLs for seed images | No repo bloat; network-dependent for CI | ⚠️ Revisit if CI blocks outbound HTTPS |
| Storybook backfill capped at 12 components for v2.0 (12% → 17% coverage) | Honest scope; full ~200-component coverage deferred to v2.1 | ⚠️ Continue in v2.1 |
| Stub-then-swap formalized for parallel-wave plans | Unblocks Wave N+1 without serializing on Wave N type-correctness | ✓ v2.0 |
| E2E verifies in-app Notification rows as proxy for "email fired" | No Resend mock needed; real delivery checked in live UAT | ✓ v2.0 |

---
*Last updated: 2026-05-30 after v2.0 YM Wardrobe milestone*
