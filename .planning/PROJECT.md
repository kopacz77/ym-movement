# YM Movement Multi-Coach Platform

## What This Is

YM Movement is a multi-coach ice dance lesson scheduling platform for coach Yura Min, expanding in v2.0 into a competition-dress rental and lightweight consignment marketplace. It supports SUPER_ADMIN, COACH, and STUDENT roles. Students book lessons by coach, browse a wardrobe of competition dresses with marketplace-style filters (sized to their body measurements), and request rentals. Skaters and coaches can self-list dresses for consignment, with admin approval. Yura manages coaching operations, dress inventory, rental requests, and consigner payouts — all in one platform.

## Current State

**Shipped:** v1.1 Test & Stabilize (2026-03-17)
**Previous:** v1.0 Multi-Coach (2026-03-16)
**Active:** v2.0 YM Wardrobe (started 2026-05-28)

The lesson-scheduling platform is fully functional, tested (128 E2E tests, zero failures), and in production at ym-movement.com. The v1.x luxury athletic redesign sweep is also complete (cyan #0891b2 + navy #1a3a5c brand, Storybook + VRT infra at 18 stories / 20 snapshots). v2.0 adds the YM Wardrobe surface on top of this foundation.

**Codebase:** ~80,000+ lines TypeScript
**Test suite:** 128 E2E tests across 12 spec files (zero failures)
**Storybook:** 18 stories, 20 VRT snapshots (project-wide audit + backfill planned in v2.0 Phase 10)

## Core Value

Students can discover, browse, and book lessons from multiple coaches across different disciplines AND browse, fit-match, and rent competition dresses from a curated wardrobe. The super admin maintains full visibility and control over both coaching operations (revenue splits, payouts) and the wardrobe marketplace (inventory, rental approvals, consigner payouts).

## Current Milestone: v2.0 YM Wardrobe

**Goal:** Add a competition-dress rental + lightweight consignment marketplace inside YM Movement. Students of YM browse a catalog of dresses owned by Yura or consigned by other skaters, request a rental for a specific competition or season, and pay via the existing Venmo/Zelle workflow. Admin manages inventory, approves consigner submissions, approves rental requests, tracks deposits, and pays out consigners.

**Design spec:** [docs/plans/2026-05-28-ym-wardrobe-mvp-design.md](../docs/plans/2026-05-28-ym-wardrobe-mvp-design.md)

**Target features:**
- Marketplace-style dress catalog with structured filters (category, color, size, theme, price, length, availability) and a "fits me" toggle
- Student body measurements stored on profile, driving "fits me" filter and "best fit" sort
- Dress detail page with image carousel, three pricing tiers, and fit comparison vs caller's measurements
- Admin inventory CRUD with Vercel Blob image upload (up to 8 per dress)
- Self-serve consigner upload with admin approval queue (PENDING_APPROVAL / REJECTED statuses)
- Rental request flow + admin queue with approve/decline + response message
- Active rentals view with manual Venmo/Zelle/Cash verification, return tracking, deposit release
- Consignment payout tracking with global default commission % override
- Notification templates covering the full rental and consignment lifecycle
- Playwright E2E coverage of all new wardrobe flows
- Storybook stories + VRT snapshots for new wardrobe components
- Project-wide Storybook audit + backfill (Phase 10)

## Requirements

### Validated

- ✓ Student signup with email/password and admin approval — existing
- ✓ Role-based dashboards (admin/student) — existing
- ✓ Time slot management with conflict detection — existing
- ✓ Lesson booking with automatic payment creation — existing
- ✓ Lesson type management (Private, Choreography, Group, Competition Prep) — existing
- ✓ Payment tracking with Venmo/Zelle/Cash and manual verification — existing
- ✓ Google Calendar sync for lesson events — existing
- ✓ Student self-service lesson cancellation with 24-hour policy — existing
- ✓ Notification system (in-app + email) — existing
- ✓ Revenue and attendance reports — existing
- ✓ Blocked dates management (travel, competitions) — existing
- ✓ Rink/venue management — existing
- ✓ Student guide and admin guide pages — existing
- ✓ Lesson policies (public + student-facing) — existing
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
- ✓ Data migration (existing data associated with Yura as coach) — v1.0
- ✓ Per-coach data isolation (179+ queries scoped) — v1.0
- ✓ Coach notifications (booking, cancellation, payment, revenue split changes) — v1.0
- ✓ Coach account lifecycle (create, approve, suspend, activate, deactivate) — v1.0
- ✓ E2E test coverage for all multi-coach features (128 tests, zero failures) — v1.1
- ✓ Next.js 16 proxy.ts migration for middleware compatibility — v1.1

### Active

#### v2.0 YM Wardrobe

- [ ] Prisma schema: Dress, DressImage, RentalRequest, Rental models + Student measurement fields + Settings extensions
- [ ] Vercel Blob image upload pipeline (signed PUT URLs, client compression, 8 images/dress max)
- [ ] Admin dress inventory CRUD with full field access
- [ ] Marketplace catalog browse with category/color/size/theme/length/price/availability filters
- [ ] Student measurement profile + "fits me" filter + "best fit" sort
- [ ] Dress detail page with image carousel, pricing tiers, fit comparison card
- [ ] Rental request flow with rental type, dates, competition info, message to owner
- [ ] Admin rental request queue with approve/decline + response messaging
- [ ] Active rentals view: mark paid (Venmo/Zelle/Cash), mark returned, release deposit
- [ ] Self-serve consigner upload with PENDING_APPROVAL → AVAILABLE state machine
- [ ] Admin pending-approval queue with approve (commission % override) / reject (with reason)
- [ ] Consignment earnings view + manual payout tracking
- [ ] Global wardrobe settings (default commission %, expiry days, return reminder days)
- [ ] Notifications: 9 new email/in-app templates covering rental + consignment lifecycle
- [ ] Sidebar entry (`Shirt` icon) routing students to `/wardrobe`, admin to `/admin/wardrobe`
- [ ] Permissions matrix enforced via TRPC middleware
- [ ] Wardrobe E2E spec (Playwright CLI): full rental happy path + consigner happy path + rejection path
- [ ] Storybook stories + VRT snapshots for all new wardrobe components
- [ ] Seed script populating sample dresses across categories for fresh deploys
- [ ] Health-check endpoint extended with dress/request/rental row counts
- [ ] Project-wide Storybook audit: inventory all components, identify gaps, backfill missing stories

### Out of Scope

#### v2.0 explicit deferrals (revisit in later wardrobe milestones)

- Cleaning state machine (inspect → clean → re-list workflow) — deferred to v2.1
- Shipping for out-of-state rentals (tracking, insurance, return windows) — deferred to v2.2
- Accessories catalog (gloves, other SKUs) — deferred to v2.3
- Style packages (makeup/hair video tutorials, costume inspiration content) — deferred to v2.3
- Alteration services tracking — deferred to v2.4
- Stripe integration for real card holds on security deposits — deferred to v2.4 (MVP uses manual tracking)
- External marketplace / standalone brand separate from YM Movement — deferred to v3.0
- Feature flag gating — small internal audience, GSD phase cadence provides safety without flag complexity

#### Permanent exclusions (carried from v1.x)

- Mobile native app — web-first, responsive design sufficient
- Real-time chat between coaches and students — use existing notification system
- Automated payout processing (Stripe/PayPal) for lessons — track amounts owed, pay outside app
- Coach-to-coach messaging — communicate outside the platform
- Student reviews/ratings of coaches — defer to future version
- Multi-location/franchise support — single organization (YM Movement)

## Context

- **Existing codebase**: Next.js 15 + React 19 + TypeScript + TRPC v11 + Prisma + PostgreSQL (Neon)
- **Auth**: NextAuth.js with SUPER_ADMIN, COACH, and STUDENT roles
- **Database**: Prisma ORM with User, Student, Lesson, Payment, Rink, RinkTimeSlot, Coach, CoachStudent, ProposedTimeSlot, and more
- **Calendar**: Per-coach Google Calendar OAuth with AES-256-GCM encrypted token storage
- **UI**: Tailwind CSS + Radix UI + shadcn/ui components, fixed sidebar layout architecture
- **Deployment**: Production on Vercel with Neon PostgreSQL
- **The admin (Yura) is also the product owner** — she coaches while managing other coaches

## Constraints

- **Tech stack**: Must extend existing Next.js/TRPC/Prisma stack — no rewrites
- **Backward compatibility**: All existing student and admin functionality must continue working
- **Layout architecture**: Sidebar and layout system is locked per CLAUDE.md — new features must follow same patterns
- **Biome**: All code must pass Biome linting (not ESLint)
- **Prisma relations**: Must use PascalCase relation names per project convention

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Add COACH and SUPER_ADMIN roles (not reuse ADMIN) | Clean separation of concerns, existing ADMIN behavior preserved during migration | ✓ Shipped v1.0 |
| Coaches self-manage availability with super admin override | Balances coach autonomy with platform control | ✓ Shipped v1.0 |
| Students browse by coach (not by discipline/unified calendar) | Simpler UX, coach-centric relationship model | ✓ Shipped v1.0 |
| Per-coach negotiated revenue splits | Flexibility for different coach arrangements | ✓ Shipped v1.0 |
| Per-coach Google Calendar (not master calendar) | Each coach owns their schedule, simpler OAuth | ✓ Shipped v1.0 |
| Shared rink pool managed by super admin | Centralized venue management, coaches pick from existing rinks | ✓ Shipped v1.0 |
| Yura is both super admin and coach | Preserves existing coaching relationship, dog-foods the coach experience | ✓ Shipped v1.0 |
| Playwright E2E for test coverage (not unit tests) | E2E tests verify real user flows, existing infra is mature | ✓ Shipped v1.1 |
| Extend existing test helpers (not rewrite) | test-utils.ts has proven patterns for auth, booking, etc. | ✓ Shipped v1.1 |
| Next.js 16 proxy.ts (not middleware.ts) | Next.js 16 deprecated middleware in favor of proxy convention | ✓ Shipped v1.1 |
| YM Wardrobe stays inside YM Movement (not standalone brand) | Tight integration with existing student/admin/coach roles + auth; external brand revisited in v3.0 | — Pending (v2.0) |
| Marketplace-style filters + body measurements drive discovery (not browse-by-owner) | Skaters care about fit and style, not who owns the dress; "fits me" toggle is the differentiating UX | — Pending (v2.0) |
| Self-serve consigner upload with admin approval (not admin-only entry) | Skaters drive supply; admin approval guards quality + brand consistency | — Pending (v2.0) |
| Global default commission % via Settings (admin override at approval) | Avoids per-dress data entry friction while preserving flexibility for special cases | — Pending (v2.0) |
| Venmo/Zelle/Cash with manual verification (no Stripe in MVP) | Mirrors existing lesson payment flow; Stripe deferred to v2.4 when card holds become valuable | — Pending (v2.0) |
| Vercel Blob for dress images (not S3/Cloudinary) | Already on Vercel, signed PUT URL flow is simplest integration | — Pending (v2.0) |
| New Rental table (not extending lesson Payment) | Different lifecycle (deposit, return, condition), different fields; cleaner separation | — Pending (v2.0) |
| Phase 10 project-wide Storybook audit | v2.0 expands components — opportune moment to ensure full project coverage and VRT safety net | — Pending (v2.0) |

---
*Last updated: 2026-05-28 at start of v2.0 YM Wardrobe milestone*
