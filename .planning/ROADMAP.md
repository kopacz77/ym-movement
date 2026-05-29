# Roadmap: YM Movement

## Milestones

- ✅ **v1.0 Multi-Coach** — Phases 1-7 (shipped 2026-03-16) | [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Test & Stabilize** — Phases 8-12 (shipped 2026-03-17) | [Archive](milestones/v1.1-ROADMAP.md)
- 🚧 **v2.0 YM Wardrobe** — Phases 13-22 (in progress)

## Overview

v2.0 adds a competition-dress rental and lightweight consignment marketplace inside YM Movement. Phases 13-22 build it from the schema up: data foundation and image storage first, then admin inventory CRUD, then the marketplace browse experience with body measurements driving fit matching, then the rental request flow, then the active rental lifecycle, then self-serve consignment with admin approval, then payouts, notifications, and a full testing + Storybook sweep at the end. Each phase is independently shippable.

## Phases

<details>
<summary>✅ v1.0 Multi-Coach (Phases 1-7) — SHIPPED 2026-03-16</summary>

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

Phases: 01-auth-schema-foundation, 02-coach-dashboard-profile, 03-query-scoping-super-admin, 04-per-coach-scheduling, 05-student-multi-coach-booking, 06-per-coach-google-calendar, 07-revenue-splits-polish

</details>

<details>
<summary>✅ v1.1 Test & Stabilize (Phases 8-12) — SHIPPED 2026-03-17</summary>

Full details: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

Phases: 08-test-infrastructure-legacy-updates, 09-coach-admin-flow-tests, 10-student-security-tests, 11-stabilization, 12-tech-debt-cleanup

</details>

### 🚧 v2.0 YM Wardrobe (In Progress)

**Milestone Goal:** Add a competition-dress rental and lightweight consignment marketplace where students browse, fit-match, and rent dresses from a catalog owned by Yura or consigned by other skaters, with admin governance over inventory, requests, and payouts.

**Design spec:** [docs/plans/2026-05-28-ym-wardrobe-mvp-design.md](../docs/plans/2026-05-28-ym-wardrobe-mvp-design.md)

- [x] **Phase 13: Wardrobe Schema Foundation** — Prisma models, Student measurement fields, Settings extensions, Vercel Blob image upload pipeline ✓ 2026-05-29
- [x] **Phase 14: Admin Inventory CRUD** — Admin create/edit/list dresses + global settings UI + sidebar entry + admin permission middleware ✓ 2026-05-29
- [x] **Phase 15: Catalog Browse & Measurements** — Marketplace `/wardrobe` with structured filters, student measurement profile, "fits me" toggle, best-fit sort ✓ 2026-05-29
- [x] **Phase 16: Dress Detail & Rental Request** — Detail page with fit comparison, request modal, my-rentals history, conflict warnings ✓ 2026-05-29
- [x] **Phase 17: Admin Rental Lifecycle** — Request queue, payment-received flow, returns, deposit release, consignment payout calculation ✓ 2026-05-29
- [x] **Phase 18: Self-Serve Consignment** — Consigner upload form, PENDING_APPROVAL queue, admin approve/reject with commission override ✓ 2026-05-29
- [x] **Phase 19: Consignment Payout Tracking** — Owner earnings view, admin payout marking ✓ 2026-05-29
- [ ] **Phase 20: Wardrobe Notifications** — 9 new email + in-app templates spanning rental and consignment lifecycle
- [ ] **Phase 21: Testing, Seeding & Health Checks** — Playwright E2E specs, unit tests, seed script, health-check extension, new Storybook stories + VRT
- [ ] **Phase 22: Project-Wide Storybook Audit** — Inventory project components, identify coverage gaps, backfill missing stories + VRT snapshots

## Phase Details

#### Phase 13: Wardrobe Schema Foundation
**Goal**: Prisma schema and image storage pipeline support the entire wardrobe domain so subsequent phases have a stable data layer to build on.
**Depends on**: Nothing in v2.0 (first phase of milestone)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06, SCHEMA-07, STORAGE-01, STORAGE-02, STORAGE-03, STORAGE-04, STORAGE-05
**Success Criteria** (what must be TRUE):
  1. Prisma migration deploys cleanly via `prisma migrate deploy` against production with zero data loss to existing tables
  2. Database has Dress, DressImage, RentalRequest, Rental models with all enums and Student measurement fields (all nullable)
  3. Settings row gains wardrobe defaults (`defaultConsignmentCommissionPct`, expiry days, reminder days)
  4. Admin can upload an image to a Dress via signed Vercel Blob PUT URL and see it persisted with `isPrimary` and `sortOrder`
  5. Image deletion removes both Blob object and DB row in one mutation; 8-image cap and 5MB pre-compression cap enforced
**Plans**: 3 plans — all complete (2026-05-29)
- [x] 13-01-PLAN.md — Author Prisma schema (Dress, DressImage, RentalRequest, Rental + 6 enums + Student measurements), generate transaction-wrapped migration, extend pre-migration check, update .env.example
- [x] 13-02-PLAN.md — Wardrobe global settings via existing Settings key/value pattern (defaultConsignmentCommissionPct, expiry days, reminder days)
- [x] 13-03-PLAN.md — Install @vercel/blob + browser-image-compression, create handleUpload route, image compression helper, wardrobe.images TRPC procedures (attach/reorder/setPrimary/delete)

#### Phase 14: Admin Inventory CRUD
**Goal**: Admin can create, edit, and govern the dress catalog before any consigner or rental flow exists.
**Depends on**: Phase 13
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-07, NAV-01, PERM-02
**Success Criteria** (what must be TRUE):
  1. Admin can create a dress directly from `/admin/wardrobe/new` with status AVAILABLE (bypassing the approval queue)
  2. Admin can edit every field including internal notes and commission % on any dress at `/admin/wardrobe/[id]/edit`
  3. `/admin/wardrobe` shows full inventory grid filterable by status (including PENDING_APPROVAL/REJECTED/ARCHIVED)
  4. Admin can edit global wardrobe defaults at `/admin/wardrobe/settings`
  5. Sidebar Shirt entry routes admin to `/admin/wardrobe`; TRPC middleware on `admin.wardrobe.*` blocks non-admin callers
**Plans**: 7 plans — all complete (2026-05-29)
- [x] 14-01-PLAN.md — admin.wardrobe.{list,byId,create,update,archive} TRPC procedures with shared dressInputSchema; sub-router mounted; formatCurrencyFromCents helper; smoke-tested against dev Neon
- [x] 14-02-PLAN.md — Reusable wardrobe UI primitives: DressStatusBadge, CategoryBadge, StatusFilterChips
- [x] 14-03-PLAN.md — DressForm (tabbed RHF + Zod, mode=create|edit, dollars↔cents) and DressImageGallery (wardrobe.images.* + @vercel/blob/client upload, 8-cap UI, primary badge, reorder via arrows)
- [x] 14-04-PLAN.md — WardrobeSettingsForm (3 numeric inputs, reuses Phase 13 wardrobeSettingsSchema)
- [x] 14-05-PLAN.md — DressInventoryGrid (URL-state filters, status chips, search, pagination, archive via showDeleteConfirmation, ARCHIVED rows de-emphasized)
- [x] 14-06-PLAN.md — 4 admin pages (/admin/wardrobe, /new, /[id]/edit, /settings) + Wardrobe sidebar entries in navigation-config.ts (AppSidebar.tsx untouched)
- [x] 14-07-PLAN.md — /wardrobe student-side Coming Soon placeholder (Phase 15 replaces)

#### Phase 15: Catalog Browse & Measurements
**Goal**: Students can browse the marketplace with structured filters and a measurement-driven fit toggle.
**Depends on**: Phase 13, Phase 14 (needs at least one dress to display meaningfully)
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, CAT-08, MEASURE-01, MEASURE-02, MEASURE-03
**Success Criteria** (what must be TRUE):
  1. Student can view/edit body measurements at `/wardrobe/measurements` with cm and optional inches input; saves stamp `measurementsUpdatedAt`
  2. `/wardrobe` renders responsive grid of AVAILABLE/PENDING dresses with internal notes never exposed
  3. Sticky filter bar supports category, color, size, theme, length, price, and availability dates with URL-encoded shareable state
  4. "Fits me" toggle filters by stored measurements with alterable-slack accounting; disabled with tooltip when no measurements set
  5. Sort by Newest/Price/Best Fit works; Best Fit score correctly applies alterable slack and penalizes null structured fields
**Plans**: 7 plans
- [ ] 15-01-PLAN.md — wardrobe.{list,byId,facets} + wardrobe.measurements.{get,update} TRPC procedures; PUBLIC_DRESS_SELECT enforces CAT-08 at SQL level; availability anti-join against Rental + RentalRequest
- [ ] 15-02-PLAN.md — fitScore.ts pure module (scoreDress, passesFitsMeFilter, scoreToPercent) + wire into catalogQueries.list for sort=bestFit and fitsMe
- [ ] 15-03-PLAN.md — Install @radix-ui/react-slider + src/components/ui/slider.tsx wrapper (cyan brand color)
- [ ] 15-04-PLAN.md — MeasurementForm + /wardrobe/measurements page + /wardrobe layout.tsx (AppLayout role=student wrap)
- [ ] 15-05-PLAN.md — DressCard catalog tile primitive + BestFitBadge (tiered emerald/cyan/amber)
- [ ] 15-06-PLAN.md — WardrobeFilterBar sticky controlled component (9 filter controls + sort + clear-all; Fits Me tooltip-gating)
- [ ] 15-07-PLAN.md — CatalogGrid URL-state owner + /wardrobe page replaces 14-07 Coming Soon stub

#### Phase 16: Dress Detail & Rental Request
**Goal**: Students can view a dress in detail with fit comparison and submit a rental request to the owner.
**Depends on**: Phase 15
**Requirements**: DETAIL-01, DETAIL-02, DETAIL-03, REQUEST-01, REQUEST-02, REQUEST-03, REQUEST-04, REQUEST-05, PERM-03
**Success Criteria** (what must be TRUE):
  1. `/wardrobe/[id]` shows image carousel, description, three pricing tiers, and structured size summary
  2. Fit-check card shows green/amber/red bars per measurement when caller has measurements set
  3. "Request to Rent" modal collects rental type, dates, optional competition info, and required message; conflicting dates produce inline warning
  4. Submit creates `RentalRequest` with status PENDING and fires notification to dress owner
  5. Student can cancel own PENDING request and view full history (all statuses + active/past rentals) at `/wardrobe/my-rentals`
**Plans**: 7 plans
- [ ] 16-01-PLAN.md — wardrobe.requests TRPC sub-router (checkAvailability/create/cancel/mine/myRentals) with PERM-03 + notification
- [ ] 16-02-PLAN.md — fitCheckBars.ts pure helper (green/amber/red/unknown state per dimension)
- [ ] 16-03-PLAN.md — Detail primitives: DressImageCarousel + PricingTierTable + StructuredSizeSummary + RentalStatusBadge
- [ ] 16-04-PLAN.md — FitCheckCard (DETAIL-02 — 3 horizontal bars + CTA fallback)
- [ ] 16-05-PLAN.md — RequestRentalDialog (RHF + zodResolver + debounced availability + schema reuse from 16-01)
- [ ] 16-06-PLAN.md — /wardrobe/[id] route + DressDetailView composition + DressDetailHero
- [ ] 16-07-PLAN.md — /wardrobe/my-rentals route + MyRentalsView (5 tabs + cancel)

#### Phase 17: Admin Rental Lifecycle
**Goal**: Admin can approve/decline rental requests and shepherd a rental through payment, return, and deposit release.
**Depends on**: Phase 16
**Requirements**: ADMIN-04, ADMIN-05, ADMIN-06, RENTAL-01, RENTAL-02, RENTAL-03, RENTAL-04, RENTAL-05, RENTAL-06, RENTAL-07
**Success Criteria** (what must be TRUE):
  1. `/admin/wardrobe/requests` shows PENDING request queue sorted by competition date with approve/decline + response UI
  2. Approve flips request to APPROVED and dress to PENDING; decline returns dress to AVAILABLE
  3. Mark payment received creates `Rental` row snapshotting fees, sets dress to RENTED, computes `consignmentPayoutAmount` for non-Yura-owned dresses
  4. `/admin/wardrobe/rentals` shows active rentals with returns-due section; mark returned records condition and `returnedAt`
  5. Release deposit returns dress to AVAILABLE; `LATE_FEE_OWED` flag surfaces in admin view for manual resolution
**Plans**: 5 plans
- [ ] 17-01-PLAN.md — wardrobeRequestQueries.ts with 7 admin procedures (listRequests/respondToRequest/markPaymentReceived in wardrobeRequestRouter + listRentals/markReturned/releaseDeposit/flagLateFee in wardrobeRentalRouter); state machine matrix encoded with $transaction + post-commit notifications; consignmentPayoutAmount = rentalFee - round(rentalFee * consignmentCommissionPct / 100) when pct > 0, null when == 0
- [ ] 17-02-PLAN.md — RequestQueueTable (tabbed Pending + Awaiting Payment) + RequestResponseDialog (RHF + Zod APPROVE/DECLINE discriminator)
- [ ] 17-03-PLAN.md — RecordPaymentDialog (paymentMethod radio) + RentalsTable (Active + Returns Due bucket + Late Fee tab; reads wardrobeReturnReminderDays) + MarkReturnedDialog (conditionOnReturn textarea)
- [ ] 17-04-PLAN.md — /admin/wardrobe/requests/page.tsx thin client shell composing RequestQueueTable
- [ ] 17-05-PLAN.md — /admin/wardrobe/rentals/page.tsx thin client shell composing RentalsTable

#### Phase 18: Self-Serve Consignment
**Goal**: Any user can self-list a dress; admin gates publication via approval queue.
**Depends on**: Phase 14 (admin inventory tooling), Phase 17 (consignment commission feeds into rental payout calc)
**Requirements**: CONSIGN-01, CONSIGN-02, CONSIGN-03, CONSIGN-04, CONSIGN-05, CONSIGN-06, CONSIGN-07, CONSIGN-08, CONSIGN-09, NAV-02, PERM-01
**Success Criteria** (what must be TRUE):
  1. Any User can create a dress via `/wardrobe/consigned/new`; status forced to PENDING_APPROVAL, commission % auto-filled from Settings (hidden from consigner), at least 1 image required
  2. Consigner can edit limited fields on own dress; pricing and size locked after first approval; TRPC middleware blocks edits on other consigners' dresses
  3. `/admin/wardrobe/pending-approval` queue lets admin approve (with optional commission % override) or reject (with required reason)
  4. Rejected dresses can be edited by consigner and resubmitted (REJECTED → PENDING_APPROVAL)
  5. "Consigned" sidebar sub-link visible to any user with at least one owned dress

**Plans**: 7 plans
- [ ] 18-01-PLAN.md — Add nullable Dress.rejectionReason column via transaction-wrapped Prisma migration (deploy-only)
- [ ] 18-02-PLAN.md — consignerQueries.ts TRPC router (6 procedures + assertOwnsDress inline guard) + 3 admin extensions (listPendingApproval, approveDress, rejectDress)
- [ ] 18-03-PLAN.md — Extract DressFormCore from admin DressForm; thin admin wrapper; new ConsignerDressForm wrapper with field visibility + pricing/size locking
- [ ] 18-04-PLAN.md — PendingApprovalQueue table + ApproveDressDialog (optional commission % override) + RejectDressDialog (required reason)
- [ ] 18-05-PLAN.md — MyConsignedDressesList with 4 status-bucketed tabs (Live / Pending Review / Needs Attention / Archived) + URL-synced tab state + rejection-reason callouts
- [ ] 18-06-PLAN.md — Three consigner routes (/wardrobe/consigned, /new with create-then-redirect, /[id]/edit with gallery + form + resubmit + archive)
- [ ] 18-07-PLAN.md — /admin/wardrobe/pending-approval route shell + Consigned sidebar entry (Tag icon) in all 3 role nav arrays — AppSidebar/AppLayout untouched

#### Phase 19: Consignment Payout Tracking
**Goal**: Consigners see their earnings; admin tracks which payouts have been sent.
**Depends on**: Phase 17 (Rental rows must exist), Phase 18 (consigner ownership)
**Requirements**: CONSIGN-10, RENTAL-08
**Success Criteria** (what must be TRUE):
  1. `/wardrobe/consigned` shows owner's dresses across all statuses with per-rental earnings and payout status (paid / unpaid)
  2. Admin can mark consignment paid out per rental; `consignmentPaidOut` + `consignmentPaidOutAt` recorded and surfaced back to consigner view
**Plans**: 3 plans
- [ ] 19-01-PLAN.md — Extend wardrobe.consigner with myEarnings + extend admin.wardrobeRentals with markConsignmentPaidOut + outstandingPayoutsOnly filter on listRentals (no schema migration — payout columns shipped in initial wardrobe migration)
- [ ] 19-02-PLAN.md — ConsignerEarningsTable (3-card totals + grouped table) + 5th 'Earnings' tab on MyConsignedDressesList with URL ?tab=earnings persistence
- [ ] 19-03-PLAN.md — Extend admin RentalsTable with 3rd 'Outstanding Payouts' tab + per-row Mark Payout Sent button + showConfirmationToast flow

#### Phase 20: Wardrobe Notifications
**Goal**: All 9 lifecycle notifications fire reliably with brand-consistent templates.
**Depends on**: Phase 13 (data model), Phase 17 (rental lifecycle events), Phase 18 (consigner submission events), Phase 19 (payout events)
**Requirements**: NOTIFY-01, NOTIFY-02, NOTIFY-03, NOTIFY-04, NOTIFY-05, NOTIFY-06, NOTIFY-07, NOTIFY-08, NOTIFY-09, NOTIFY-10
**Success Criteria** (what must be TRUE):
  1. All 9 templates fire on the correct lifecycle events (consigner dress submitted/approved/rejected, rental request received, decision, confirmed, return reminder, deposit released, consignment payout sent)
  2. Return reminder runs T-`wardrobeReturnReminderDays` before `endDate` via existing notification scheduler
  3. All templates use cyan `#0891b2` + navy `#1a3a5c` palette matching the 2026-04-26 brand sweep
**Plans**: 3 plans
- [ ] 20-01-PLAN.md — Append 9 new email helpers to src/lib/email.ts mirroring sendPaymentReminderEmail template (NOTIFY-01..09 — cyan #0891b2 + navy #1a3a5c brand palette, formatCurrencyFromCents for money, discriminated union on sendRentalDecisionEmail)
- [ ] 20-02-PLAN.md — Wire 8 immediate-trigger emails to existing mutation call sites in non-blocking second-try blocks (NOTIFY-01..06, 08, 09); ADDS missing in-app + email admin fan-out at consignerQueries.create + resubmit (closes Phase 18 NOTIFY-01 gap)
- [ ] 20-03-PLAN.md — NEW cron infrastructure for NOTIFY-07 return reminder: add Rental.returnReminderSentAt column via hand-authored BEGIN;...COMMIT; migration, new wardrobe-return-reminder-sender + /api/cron/wardrobe-return-reminders route + vercel.json declaring both crons (existing send-batch-emails @ 0 4 * * * + new wardrobe-return-reminders @ same schedule)

#### Phase 21: Testing, Seeding & Health Checks
**Goal**: Wardrobe paths are E2E-verified, populated with sample data, and observable via the health endpoint, with Storybook coverage for new components.
**Depends on**: Phases 13-20 (everything must be implemented to test)
**Requirements**: PERM-04, TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, STORY-01, STORY-02, STORY-03
**Success Criteria** (what must be TRUE):
  1. Playwright E2E spec at `tests/e2e/wardrobe.spec.ts` covers full rental happy path, consigner happy path, consigner rejection path, and permission negative paths; runs via Playwright CLI
  2. Unit tests verify `consignmentPayoutAmount` and fit scoring algorithms
  3. Seed script `scripts/seed-wardrobe.ts` populates 6+ sample dresses across categories with placeholder images
  4. `/api/health/data` endpoint extended with dress, rental request, and rental row counts
  5. Storybook stories + VRT snapshots created for all new wardrobe components plus `/wardrobe` empty/populated states
**Plans**: TBD

#### Phase 22: Project-Wide Storybook Audit
**Goal**: Storybook coverage is correctly mapped across the entire project, locking visual-regression safety net beyond just wardrobe components.
**Depends on**: Phase 21 (wardrobe stories established first)
**Requirements**: STORY-04, STORY-05, STORY-06
**Success Criteria** (what must be TRUE):
  1. Audit inventory identifies every component under `src/components/`, `src/features/*/components/`, and protected pages, cross-referenced against existing `.stories.tsx` files
  2. Missing stories backfilled for high-traffic and reusable components identified by audit
  3. New VRT snapshots added for backfilled stories so visual regressions are caught going forward
**Plans**: TBD

## Progress

**Execution Order:** Phases 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 (linear). Decimal phases (e.g., 14.1) may be inserted for urgent work via `/gsd:insert-phase`.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7 | v1.0 | (see archive) | Complete | 2026-03-16 |
| 8-12 | v1.1 | (see archive) | Complete | 2026-03-17 |
| 13. Wardrobe schema foundation | v2.0 | 3/3 | Complete | 2026-05-29 |
| 14. Admin inventory CRUD | v2.0 | 7/7 | Complete | 2026-05-29 |
| 15. Catalog browse measurements | v2.0 | 7/7 | Complete | 2026-05-29 |
| 16. Dress detail rental request | v2.0 | 7/7 | Complete | 2026-05-29 |
| 17. Admin rental lifecycle | v2.0 | 5/5 | Complete | 2026-05-29 |
| 18. Self-serve consignment | v2.0 | 7/7 | Complete | 2026-05-29 |
| 19. Consignment payouts | v2.0 | 3/3 | Complete | 2026-05-29 |
| 20. Wardrobe notifications | v2.0 | 0/3 | Not started | — |
| 21. Wardrobe testing seed health | v2.0 | 0/TBD | Not started | — |
| 22. Project-wide Storybook audit | v2.0 | 0/TBD | Not started | — |
