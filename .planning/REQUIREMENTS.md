# Requirements: YM Movement v2.0 YM Wardrobe

**Defined:** 2026-05-28
**Core Value:** Students can discover, browse, and book lessons from multiple coaches AND browse, fit-match, and rent competition dresses. The super admin manages both coaching operations and the wardrobe marketplace end-to-end.
**Design spec:** [docs/plans/2026-05-28-ym-wardrobe-mvp-design.md](../docs/plans/2026-05-28-ym-wardrobe-mvp-design.md)

## v1 Requirements

Requirements for v2.0 milestone (current). Each maps to one or more roadmap phases.

### Schema

- [ ] **SCHEMA-01**: `Dress` model exists with structured sizing (chest/waist/hips/torso min-max), `lengthCm`, `alterableSmaller`/`alterableLarger` flags, all three pricing tiers, security deposit, cleaning fee, owner relation, consignment commission %, status, internal notes, and category/condition enums
- [ ] **SCHEMA-02**: `DressImage` model exists with `sortOrder` and `isPrimary` flag, cascading delete from `Dress`
- [ ] **SCHEMA-03**: `RentalRequest` model exists with rental type, date range, optional competition info, free-text message, status enum (PENDING/APPROVED/DECLINED/CONVERTED/CANCELED), owner response, and expiry timestamp
- [ ] **SCHEMA-04**: `Rental` model exists with snapshot of fees at approval time, payment method, payment status enum, deposit collected/released timestamps, return tracking, condition on return, and consignment payout fields
- [ ] **SCHEMA-05**: `Student` model extended with optional body measurement fields (height, chest, waist, hips, torso, inseam, sleeve, preferred fit notes, measurements-updated timestamp) — all nullable so existing students aren't affected
- [ ] **SCHEMA-06**: `Settings` model extended with `defaultConsignmentCommissionPct` (default 15), `wardrobeRentalRequestExpiryDays` (default 7), `wardrobeReturnReminderDays` (default 1)
- [ ] **SCHEMA-07**: Prisma migration applied via `prisma migrate deploy` without affecting any existing production data

### Image Storage

- [ ] **STORAGE-01**: Vercel Blob signed PUT URL generation per dress via TRPC mutation
- [ ] **STORAGE-02**: Client-side image compression (max 1600px wide, 80% quality, ~200-400KB target) before upload
- [ ] **STORAGE-03**: 8 image cap per dress enforced server-side; 5MB pre-compression max per file
- [ ] **STORAGE-04**: First uploaded image auto-marked primary; admin and consigner can reorder and re-designate primary
- [ ] **STORAGE-05**: Image deletion removes Vercel Blob object and DB row in single mutation

### Catalog & Browse

- [ ] **CAT-01**: `/wardrobe` route renders responsive grid (1/2/3/4 cols at sm/md/lg/xl) of dresses with status AVAILABLE or PENDING
- [ ] **CAT-02**: Sticky filter bar supports category (multi-select), color (multi-select), size label (multi-select), theme text search, length range slider, and price range slider
- [ ] **CAT-03**: Availability date-range filter excludes dresses with overlapping confirmed rentals or approved requests
- [ ] **CAT-04**: "Fits me" toggle filters by measurement compatibility using stored Student measurements; disabled with tooltip when measurements unset
- [ ] **CAT-05**: Sort options: Newest, Price ascending, Price descending, Best Fit (Best Fit only valid when measurements set)
- [ ] **CAT-06**: Filter state encoded in URL query params so links are shareable
- [ ] **CAT-07**: Best Fit score calculation accounts for `alterableSmaller`/`alterableLarger` slack (2cm) and penalizes null structured fields
- [ ] **CAT-08**: Internal admin notes never exposed in `/wardrobe.list` or `/wardrobe.byId` responses

### Student Measurements

- [ ] **MEASURE-01**: `/wardrobe/measurements` route lets caller view/edit own measurements; supports cm with optional inches input
- [ ] **MEASURE-02**: Measurements persist on `Student` model and surface on dress detail fit comparison
- [ ] **MEASURE-03**: Measurement-updated timestamp recorded on each save

### Dress Detail

- [ ] **DETAIL-01**: `/wardrobe/[id]` shows image carousel, description, category badge, three pricing tiers (competition / seasonal / purchase), and structured size summary
- [ ] **DETAIL-02**: Fit-check card shows green/amber/red horizontal bars per measurement (chest/waist/hips) when caller has measurements set
- [ ] **DETAIL-03**: "Request to Rent" CTA visible to students; replaced with "Sign in" prompt if unauthenticated

### Rental Request Flow (Student)

- [ ] **REQUEST-01**: "Request to Rent" modal collects rental type radio (Competition/Seasonal/Purchase), date range, optional competition name and date, and required message
- [ ] **REQUEST-02**: Inline availability check warns student when chosen dates conflict with existing rentals
- [ ] **REQUEST-03**: Submit creates `RentalRequest` with status PENDING and fires notifications to dress owner
- [ ] **REQUEST-04**: Student can cancel own PENDING request (status → CANCELED, dress returns to AVAILABLE)
- [ ] **REQUEST-05**: `/wardrobe/my-rentals` shows student's request history (all statuses) and active/past rentals

### Admin Inventory & Queues

- [ ] **ADMIN-01**: `/admin/wardrobe` shows inventory grid filterable by status (all statuses including PENDING_APPROVAL/REJECTED/ARCHIVED)
- [ ] **ADMIN-02**: `/admin/wardrobe/new` admin creates dress directly, status AVAILABLE (bypasses approval queue)
- [ ] **ADMIN-03**: `/admin/wardrobe/[id]/edit` admin has full field access on any dress including internal notes and commission %
- [ ] **ADMIN-04**: `/admin/wardrobe/requests` shows PENDING rental request queue sorted by competition date with approve/decline + response message UI
- [ ] **ADMIN-05**: Approve request flips status PENDING → APPROVED, dress goes to PENDING, payment instructions emailed to student
- [ ] **ADMIN-06**: Decline request flips status PENDING → DECLINED with owner response, dress returns to AVAILABLE
- [ ] **ADMIN-07**: `/admin/wardrobe/settings` lets admin edit `defaultConsignmentCommissionPct`, expiry days, return reminder days

### Self-Serve Consignment

- [ ] **CONSIGN-01**: `/wardrobe/consigned/new` form lets any User self-list a dress; status forced to PENDING_APPROVAL on submit
- [ ] **CONSIGN-02**: Consigner-facing form hides `consignmentCommissionPct` (auto-filled from Settings, displayed read-only), `securityDeposit`, `cleaningFee`, and `internalNotes`
- [ ] **CONSIGN-03**: Consigner-facing form requires at least 1 image before submit
- [ ] **CONSIGN-04**: `/wardrobe/consigned/[id]/edit` lets consigner edit only title, description, themeTags, color, and images; pricing and size locked after first approval
- [ ] **CONSIGN-05**: Consigner can archive own dress only when status is AVAILABLE (cannot pull during pending rental)
- [ ] **CONSIGN-06**: `/admin/wardrobe/pending-approval` shows queue of consigner-submitted dresses awaiting review
- [ ] **CONSIGN-07**: Admin approve action flips PENDING_APPROVAL → AVAILABLE with optional commission % override
- [ ] **CONSIGN-08**: Admin reject action flips PENDING_APPROVAL → REJECTED with required reason; reason emailed to consigner
- [ ] **CONSIGN-09**: Rejected dress can be edited and resubmitted by consigner (REJECTED → PENDING_APPROVAL)
- [ ] **CONSIGN-10**: `/wardrobe/consigned` shows owner's dresses across all statuses + per-rental earnings + payout status

### Active Rentals Lifecycle

- [ ] **RENTAL-01**: Mark payment received converts APPROVED RentalRequest → CONVERTED, creates `Rental` row, sets dress to RENTED
- [ ] **RENTAL-02**: `Rental` snapshots `rentalFee`, `cleaningFee`, `securityDeposit` from Dress at creation time; later Dress price changes do not affect existing Rentals
- [ ] **RENTAL-03**: Consignment payout amount calculated at Rental creation: `rentalFee - round(rentalFee * consignmentCommissionPct / 100)` for non-Yura-owned dresses; null for Yura-owned
- [ ] **RENTAL-04**: `/admin/wardrobe/rentals` shows active rentals (status PAID/RETURNED) sortable by end date with returns-due section
- [ ] **RENTAL-05**: Mark returned action sets `returnedAt`, stores `conditionOnReturn` text, status → RETURNED
- [ ] **RENTAL-06**: Release deposit action sets `depositReleasedAt`, status → DEPOSIT_RELEASED, dress → AVAILABLE
- [ ] **RENTAL-07**: Mark late-fee-owed flags rental for manual resolution and surfaces in admin view
- [ ] **RENTAL-08**: Admin can mark consignment paid out (sets `consignmentPaidOut`, `consignmentPaidOutAt`)

### Notifications

- [ ] **NOTIFY-01**: `sendConsignerDressSubmittedEmail` template fires to admin on new consigner submission
- [ ] **NOTIFY-02**: `sendConsignerDressApprovedEmail` template fires to consigner on admin approval
- [ ] **NOTIFY-03**: `sendConsignerDressRejectedEmail` template fires to consigner on admin rejection with reason
- [ ] **NOTIFY-04**: `sendRentalRequestReceivedEmail` template fires to dress owner on new rental request
- [ ] **NOTIFY-05**: `sendRentalDecisionEmail` template fires to student on approve (with payment instructions) or decline (with response message)
- [ ] **NOTIFY-06**: `sendRentalConfirmedEmail` template fires to student when payment marked received
- [ ] **NOTIFY-07**: `sendReturnReminderEmail` template fires T-`wardrobeReturnReminderDays` before `endDate` via existing notification scheduler
- [ ] **NOTIFY-08**: `sendDepositReleasedEmail` template fires to student when deposit released
- [ ] **NOTIFY-09**: `sendConsignmentPayoutSentEmail` template fires to consigner when admin marks payout sent
- [ ] **NOTIFY-10**: All templates follow cyan `#0891b2` + navy `#1a3a5c` palette matching 2026-04-26 brand sweep

### Navigation

- [ ] **NAV-01**: Sidebar entry with lucide-react `Shirt` icon routes students to `/wardrobe`, admin to `/admin/wardrobe`; placed above existing Settings entry
- [ ] **NAV-02**: "Consigned" sub-link visible to any user with at least one owned dress

### Permissions

- [ ] **PERM-01**: TRPC middleware enforces consigner-can-only-edit-own-dress on all `wardrobe.consigner.*` procedures
- [ ] **PERM-02**: TRPC middleware enforces admin-or-super-admin on all `admin.wardrobe.*` procedures
- [ ] **PERM-03**: TRPC middleware enforces caller-owns-the-request on `wardrobe.cancelRequest` and `wardrobe.myRequests`
- [ ] **PERM-04**: Permissions matrix from design spec implemented and verified by E2E negative-path tests

### Testing & Operational

- [ ] **TEST-01**: Playwright E2E spec covers full rental happy path: student sets measurements → browses with "fits me" → opens detail → submits request → admin approves → admin marks paid → student sees confirmed → admin marks returned → deposit released
- [ ] **TEST-02**: Playwright E2E spec covers consigner happy path: consigner uploads dress → PENDING_APPROVAL → admin approves → dress is live in `/wardrobe`
- [ ] **TEST-03**: Playwright E2E spec covers consigner rejection + resubmit path
- [ ] **TEST-04**: Playwright E2E spec covers permission negative paths (student can't approve, consigner can't see other dresses, etc.)
- [ ] **TEST-05**: Unit tests verify `consignmentPayoutAmount` calculation and fit scoring algorithm
- [ ] **TEST-06**: Seed script `scripts/seed-wardrobe.ts` creates 6+ sample dresses across categories with placeholder images
- [ ] **TEST-07**: `/api/health/data` endpoint extended to include dress, rental request, and rental row counts
- [ ] **TEST-08**: All E2E tests runnable via `pnpm test:e2e tests/e2e/wardrobe.spec.ts` from Playwright CLI

### Storybook & VRT

- [ ] **STORY-01**: New Storybook stories created for `DressCard`, `DressDetailHero`, `FitCheckCard`, `MeasurementEditor`, `RequestRentalDialog`, `RentalStatusBadge`, `ConsignmentEarningsTable`, `WardrobeFilterBar`, `PendingApprovalQueue`
- [ ] **STORY-02**: VRT snapshots added to `tests/storybook-vrt.spec.ts` for all new wardrobe stories
- [ ] **STORY-03**: VRT snapshots include `/wardrobe` empty state and populated state
- [ ] **STORY-04**: Project-wide Storybook audit inventories every component under `src/components/`, `src/features/*/components/`, and `src/app/(protected)/**/page.tsx` rendered components; cross-references against existing `.stories.tsx` files
- [ ] **STORY-05**: Storybook coverage gaps identified in audit are backfilled with stories for high-traffic and reusable components
- [ ] **STORY-06**: VRT snapshots added for newly-backfilled stories to lock visual regression coverage

## v2 Requirements

Deferred from v2.0 to later milestones. Tracked but not in current roadmap.

### Cleaning & Lifecycle (v2.1)

- **CLEAN-01**: Returned dress enters MAINTENANCE status with required inspection step
- **CLEAN-02**: Cleaning stage state machine (returned → inspect → clean → re-list)
- **CLEAN-03**: Damage tracking with photo evidence
- **CLEAN-04**: Cleaning fee auto-charged to renter as part of rental total

### Shipping (v2.2)

- **SHIP-01**: Out-of-state rental flow with carrier selection and tracking number capture
- **SHIP-02**: Shipping insurance for high-value dresses
- **SHIP-03**: Return window timing and late-shipment penalties
- **SHIP-04**: Renter pays both ways; surfaced at checkout

### Style Packages & Accessories (v2.3)

- **STYLE-01**: Accessories SKU model (gloves and other items) with separate inventory
- **STYLE-02**: Mesh glove product line with color/size variants
- **STYLE-03**: Bundle/discount logic for dress + accessory combinations
- **STYLE-04**: Hosted makeup tutorial video library
- **STYLE-05**: Hair tutorial video library (buns, ice dance styles, singles styles)
- **STYLE-06**: Costume inspiration gallery (per-dress: past wearers, music/theme suggestions)

### Alterations (v2.4)

- **ALTER-01**: Track temporary alteration jobs (taking in, removable skirts, attachable skirts)
- **ALTER-02**: Alteration fees added to rental total
- **ALTER-03**: Workflow handoff to seamstress

### Payments Modernization (v2.4)

- **PAY-01**: Stripe integration for real card holds on security deposits
- **PAY-02**: Automated deposit release on return
- **PAY-03**: Stripe-driven refund flow for damage disputes
- **PAY-04**: Stripe Connect for consigner direct payouts

### External Marketplace (v3.0)

- **EXT-01**: Standalone brand identity separate from YM Movement
- **EXT-02**: Multi-organization tenancy (other coaching schools onboard their own wardrobes)
- **EXT-03**: Cross-skater discovery (skaters from outside YM Movement can browse and rent)
- **EXT-04**: Public-facing marketing surface

## Out of Scope

Explicitly excluded for v2.0. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Cleaning state machine | Deferred to v2.1 — admin tracks via internal notes for now |
| Shipping for out-of-state rentals | Deferred to v2.2 — all rentals are in-person pickup for v2.0 |
| Accessories catalog (gloves) | Deferred to v2.3 — focus on dresses first |
| Style packages (video tutorials, costume inspiration) | Deferred to v2.3 — content production is separate work stream |
| Alteration services tracking | Deferred to v2.4 — alterations handled out-of-band for v2.0 |
| Stripe card holds for security deposits | Deferred to v2.4 — manual Venmo/Zelle pattern continues to work |
| Feature flag gating | Small internal audience makes flag complexity unnecessary; GSD phase cadence provides safety |
| External marketplace / standalone brand | Deferred to v3.0 — v2.0 lives inside YM Movement |
| Mobile native app | Permanent exclusion — web-first responsive design sufficient |
| Real-time chat between owner and renter | Permanent exclusion — free-text message on RentalRequest serves the contact need |
| Automated payroll/payout processing | Permanent exclusion — manual Venmo/Zelle continues across both lessons and rentals |
| Multi-location/franchise support | Permanent exclusion — single organization (YM Movement) |

## Traceability

Phase mappings populated by `/gsd:create-roadmap` on 2026-05-28. Each v1 requirement maps to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | Phase 13 | Complete |
| SCHEMA-02 | Phase 13 | Complete |
| SCHEMA-03 | Phase 13 | Complete |
| SCHEMA-04 | Phase 13 | Complete |
| SCHEMA-05 | Phase 13 | Complete |
| SCHEMA-06 | Phase 13 | Complete |
| SCHEMA-07 | Phase 13 | Complete |
| STORAGE-01 | Phase 13 | Complete |
| STORAGE-02 | Phase 13 | Complete |
| STORAGE-03 | Phase 13 | Complete |
| STORAGE-04 | Phase 13 | Complete |
| STORAGE-05 | Phase 13 | Complete |
| CAT-01 | Phase 15 | Complete |
| CAT-02 | Phase 15 | Complete |
| CAT-03 | Phase 15 | Complete |
| CAT-04 | Phase 15 | Complete |
| CAT-05 | Phase 15 | Complete |
| CAT-06 | Phase 15 | Complete |
| CAT-07 | Phase 15 | Complete |
| CAT-08 | Phase 15 | Complete |
| MEASURE-01 | Phase 15 | Complete |
| MEASURE-02 | Phase 15 | Complete |
| MEASURE-03 | Phase 15 | Complete |
| DETAIL-01 | Phase 16 | Complete |
| DETAIL-02 | Phase 16 | Complete |
| DETAIL-03 | Phase 16 | Complete |
| REQUEST-01 | Phase 16 | Complete |
| REQUEST-02 | Phase 16 | Complete |
| REQUEST-03 | Phase 16 | Complete |
| REQUEST-04 | Phase 16 | Complete |
| REQUEST-05 | Phase 16 | Complete |
| ADMIN-01 | Phase 14 | Complete |
| ADMIN-02 | Phase 14 | Complete |
| ADMIN-03 | Phase 14 | Complete |
| ADMIN-04 | Phase 17 | Complete |
| ADMIN-05 | Phase 17 | Complete |
| ADMIN-06 | Phase 17 | Complete |
| ADMIN-07 | Phase 14 | Complete |
| CONSIGN-01 | Phase 18 | Complete |
| CONSIGN-02 | Phase 18 | Complete |
| CONSIGN-03 | Phase 18 | Complete |
| CONSIGN-04 | Phase 18 | Complete |
| CONSIGN-05 | Phase 18 | Complete |
| CONSIGN-06 | Phase 18 | Complete |
| CONSIGN-07 | Phase 18 | Complete |
| CONSIGN-08 | Phase 18 | Complete |
| CONSIGN-09 | Phase 18 | Complete |
| CONSIGN-10 | Phase 19 | Complete |
| RENTAL-01 | Phase 17 | Complete |
| RENTAL-02 | Phase 17 | Complete |
| RENTAL-03 | Phase 17 | Complete |
| RENTAL-04 | Phase 17 | Complete |
| RENTAL-05 | Phase 17 | Complete |
| RENTAL-06 | Phase 17 | Complete |
| RENTAL-07 | Phase 17 | Complete |
| RENTAL-08 | Phase 19 | Complete |
| NOTIFY-01 | Phase 20 | Pending |
| NOTIFY-02 | Phase 20 | Pending |
| NOTIFY-03 | Phase 20 | Pending |
| NOTIFY-04 | Phase 20 | Pending |
| NOTIFY-05 | Phase 20 | Pending |
| NOTIFY-06 | Phase 20 | Pending |
| NOTIFY-07 | Phase 20 | Pending |
| NOTIFY-08 | Phase 20 | Pending |
| NOTIFY-09 | Phase 20 | Pending |
| NOTIFY-10 | Phase 20 | Pending |
| NAV-01 | Phase 14 | Complete |
| NAV-02 | Phase 18 | Complete |
| PERM-01 | Phase 18 | Complete |
| PERM-02 | Phase 14 | Complete |
| PERM-03 | Phase 16 | Complete |
| PERM-04 | Phase 21 | Pending |
| TEST-01 | Phase 21 | Pending |
| TEST-02 | Phase 21 | Pending |
| TEST-03 | Phase 21 | Pending |
| TEST-04 | Phase 21 | Pending |
| TEST-05 | Phase 21 | Pending |
| TEST-06 | Phase 21 | Pending |
| TEST-07 | Phase 21 | Pending |
| TEST-08 | Phase 21 | Pending |
| STORY-01 | Phase 21 | Pending |
| STORY-02 | Phase 21 | Pending |
| STORY-03 | Phase 21 | Pending |
| STORY-04 | Phase 22 | Pending |
| STORY-05 | Phase 22 | Pending |
| STORY-06 | Phase 22 | Pending |

**Coverage:**
- v1 requirements: 86 total (corrected from earlier miscount of 82)
- Mapped to phases: 86
- Unmapped: 0 ✓

**Per-phase distribution:**
- Phase 13 Schema Foundation: 12 (SCHEMA-01..07, STORAGE-01..05)
- Phase 14 Admin Inventory CRUD: 6 (ADMIN-01/02/03/07, NAV-01, PERM-02)
- Phase 15 Catalog Browse & Measurements: 11 (CAT-01..08, MEASURE-01..03)
- Phase 16 Dress Detail & Rental Request: 9 (DETAIL-01..03, REQUEST-01..05, PERM-03)
- Phase 17 Admin Rental Lifecycle: 10 (ADMIN-04/05/06, RENTAL-01..07)
- Phase 18 Self-Serve Consignment: 11 (CONSIGN-01..09, NAV-02, PERM-01)
- Phase 19 Consignment Payout Tracking: 2 (CONSIGN-10, RENTAL-08)
- Phase 20 Wardrobe Notifications: 10 (NOTIFY-01..10)
- Phase 21 Testing, Seeding & Health Checks: 12 (PERM-04, TEST-01..08, STORY-01..03)
- Phase 22 Project-Wide Storybook Audit: 3 (STORY-04..06)

---
*Requirements defined: 2026-05-28 from design spec*
*Last updated: 2026-05-28 — traceability populated by /gsd:create-roadmap*
