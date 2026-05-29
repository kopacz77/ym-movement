# YM Wardrobe — MVP Design

**Status**: Draft for review
**Date**: 2026-05-28
**Author**: Yura + Claude
**Target milestone**: v2.0 (YM Movement)

## Purpose

Add a competition dress rental and resale service inside YM Movement. Students of YM browse a catalog of dresses (owned by Yura or consigned by other skaters), request a rental for a specific competition or season, and pay via the existing Venmo/Zelle workflow. Admin manages inventory, approves requests, tracks deposits, and pays out consigners. This MVP keeps the surface area tight on purpose — the long-term marketplace vision (external brand, shipping, video tutorials, accessories catalog, Stripe card holds) is explicitly out of scope and deferred to later milestones.

## Naming

**YM Wardrobe** — fits the luxury athletic brand, lives naturally as a section of YM Movement at `/wardrobe`. Other candidates considered: "YM Closet" (too casual), "The Dress Exchange" (sounds like a swap, not a rental), "Rent the Sparkle" (off-brand for the cyan/navy luxury aesthetic).

## In Scope (v2.0 MVP)

- Catalog browse with category, size, color, and date-availability filters
- Dress detail page with image carousel, description, three pricing tiers, request CTA
- "Request to Rent" flow with rental type, dates, competition info, free-text message to owner
- Admin inventory management (create/edit/archive dresses, upload up to 8 images per dress)
- Admin request queue with approve/decline + response message
- Active rentals view with return tracking and deposit release
- Lightweight consignment: any User can be a dress `owner`; commission auto-calculated; payouts tracked manually
- Notifications (in-app + Resend email) on every state transition
- Money handling reuses existing Venmo/Zelle/Cash pattern with manual admin verification

## Out of Scope (deferred)

| Feature | Deferred to |
|---|---|
| Cleaning state machine (inspect → clean → re-list) | v2.1 |
| Shipping for out-of-state rentals (tracking, insurance, return windows) | v2.2 |
| Accessories catalog (gloves, other SKUs) | v2.3 |
| Style packages (makeup/hair video tutorials, costume inspiration content) | v2.3 |
| Alteration services tracking | v2.4 |
| Stripe integration for real card holds on security deposits | v2.4 |
| External marketplace / standalone brand | v3.0 |

## Data Model

All new models added to `prisma/schema.prisma`. PascalCase relation names per project convention.

### `Dress`

```
model Dress {
  id                        String        @id @default(cuid())
  ownerId                   String        // User who owns the dress (Yura or a consigner)
  Owner                     User          @relation("DressOwner", fields: [ownerId], references: [id])
  title                     String
  description               String
  category                  DressCategory
  size                      String        // free text: "Adult S", "Youth 12", "Adult M (alterable to S)"
  color                     String
  condition                 String        // "Like new", "Gently used", etc.
  yearMade                  Int?
  competitionPrice          Int           @default(5000)   // cents, $50 default
  seasonalPrice             Int           @default(37500)  // cents, $375 midpoint of $350-400
  purchasePrice             Int?          // nullable — not all dresses are for sale
  securityDeposit           Int           @default(20000)  // cents, $200 default
  cleaningFee               Int           @default(3000)   // cents, $30 default
  consignmentCommissionPct  Int           @default(0)      // 0 if Yura-owned; 10-25 for consigners
  status                    DressStatus   @default(AVAILABLE)
  internalNotes             String?       // admin-only
  Images                    DressImage[]
  Requests                  RentalRequest[]
  Rentals                   Rental[]
  createdAt                 DateTime      @default(now())
  updatedAt                 DateTime      @updatedAt
  archivedAt                DateTime?

  @@index([status])
  @@index([category])
  @@index([ownerId])
}

enum DressCategory {
  CLASSICAL
  DRAMATIC
  THEMED
  ICE_DANCE_PARTNER
  ICE_DANCE_SINGLE
  COMPETITION
  TEST
}

enum DressStatus {
  AVAILABLE
  PENDING       // request approved, awaiting payment / pickup
  RENTED        // currently with a renter
  MAINTENANCE   // returned, being cleaned/repaired (future v2.1 surfaces this)
  ARCHIVED      // no longer offered
}
```

### `DressImage`

```
model DressImage {
  id        String   @id @default(cuid())
  dressId   String
  Dress     Dress    @relation(fields: [dressId], references: [id], onDelete: Cascade)
  url       String   // Vercel Blob URL
  sortOrder Int      @default(0)
  isPrimary Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([dressId])
}
```

### `RentalRequest`

```
model RentalRequest {
  id              String              @id @default(cuid())
  dressId         String
  Dress           Dress               @relation(fields: [dressId], references: [id])
  studentId       String
  Student         Student             @relation(fields: [studentId], references: [id])
  rentalType      RentalType
  startDate       DateTime
  endDate         DateTime
  competitionName String?
  competitionDate DateTime?
  message         String              // student's note to owner — also handles "ask a question" use case
  status          RentalRequestStatus @default(PENDING)
  ownerResponse   String?             // admin's reply on approve/decline
  createdAt       DateTime            @default(now())
  respondedAt     DateTime?
  expiresAt       DateTime?           // auto-close if not actioned in N days (admin-configurable, default 7)
  Rental          Rental?

  @@index([dressId])
  @@index([studentId])
  @@index([status])
}

enum RentalType {
  COMPETITION   // ~3 days
  SEASONAL      // ~5 months
  PURCHASE
}

enum RentalRequestStatus {
  PENDING       // submitted, awaiting admin review
  APPROVED      // admin approved, awaiting payment from student
  DECLINED      // admin declined (terminal)
  CONVERTED     // payment received, Rental row created (terminal, look up Rental via requestId)
  CANCELED      // student withdrew OR expired without action (terminal)
}
```

### `Rental`

```
model Rental {
  id                      String         @id @default(cuid())
  dressId                 String
  Dress                   Dress          @relation(fields: [dressId], references: [id])
  studentId               String
  Student                 Student        @relation(fields: [studentId], references: [id])
  requestId               String         @unique
  Request                 RentalRequest  @relation(fields: [requestId], references: [id])
  rentalType              RentalType
  startDate               DateTime
  endDate                 DateTime
  rentalFee               Int            // cents — locked from Dress at approval time
  cleaningFee             Int
  securityDeposit         Int
  totalCharged            Int            // rentalFee + cleaningFee + securityDeposit
  paymentMethod           PaymentMethod  // reuses existing enum
  paymentStatus           RentalPaymentStatus @default(AWAITING_PAYMENT)
  depositCollectedAt      DateTime?
  depositReleasedAt       DateTime?
  returnedAt              DateTime?
  conditionOnReturn       String?
  consignmentPayoutAmount Int?           // null if Yura-owned; calculated at payment-received time
  consignmentPaidOut      Boolean        @default(false)
  consignmentPaidOutAt    DateTime?
  notes                   String?
  createdAt               DateTime       @default(now())
  updatedAt               DateTime       @updatedAt

  @@index([dressId])
  @@index([studentId])
  @@index([paymentStatus])
}

enum RentalPaymentStatus {
  AWAITING_PAYMENT
  PAID
  RETURNED
  DEPOSIT_RELEASED
  LATE_FEE_OWED
}
```

### Relations to add on existing models

- `User`: add `OwnedDresses Dress[] @relation("DressOwner")`
- `Student`: add `RentalRequests RentalRequest[]` and `Rentals Rental[]`

No changes to `Payment` (lessons) or any other existing model. Rental money is tracked entirely in `Rental` — separate lifecycle, separate fields.

## Routes

### Student-facing (role: STUDENT, COACH, ADMIN, SUPER_ADMIN)

- `GET /wardrobe` — catalog grid with filters
- `GET /wardrobe/[id]` — dress detail + request CTA
- `GET /wardrobe/my-rentals` — student's own request history and active/past rentals

### Owner/consigner (any User with at least one `Dress` they own)

- `GET /wardrobe/consigned` — list of dresses they own + earned commission + payout status

### Admin (role: ADMIN, SUPER_ADMIN)

- `GET /admin/wardrobe` — inventory grid (all statuses, filterable)
- `GET /admin/wardrobe/new` — create dress form with image uploader
- `GET /admin/wardrobe/[id]/edit` — edit dress
- `GET /admin/wardrobe/requests` — request queue
- `GET /admin/wardrobe/rentals` — active rentals + returns due

All routes follow the existing `(protected)` layout group with `AppLayout`.

## TRPC API

New router at `src/server/api/routers/wardrobe.ts`, mounted at `wardrobe.*`. Admin router at `src/server/api/routers/admin/wardrobe.ts`, mounted at `admin.wardrobe.*`.

**Public-ish (any authenticated user):**
- `wardrobe.list({ category?, size?, availableBetween?, ownerId? })` — returns paginated dresses, omitting `internalNotes`
- `wardrobe.byId(id)` — full dress + images + non-internal availability info
- `wardrobe.checkAvailability({ dressId, startDate, endDate })` — true/false based on existing `Rental` and approved `RentalRequest` rows
- `wardrobe.createRequest({ dressId, rentalType, startDate, endDate, competitionName?, competitionDate?, message })`
- `wardrobe.cancelRequest(requestId)` — student can cancel their own PENDING request
- `wardrobe.myRequests()` — student's own requests
- `wardrobe.myRentals()` — student's own rentals
- `wardrobe.myConsignedDresses()` — dresses where caller is owner

**Admin:**
- `admin.wardrobe.create(input)` — create dress (without images; images uploaded separately)
- `admin.wardrobe.update(id, input)`
- `admin.wardrobe.archive(id)` — soft-archive (status = ARCHIVED, archivedAt set)
- `admin.wardrobe.uploadImageUrl({ dressId })` — returns signed Vercel Blob upload URL + token
- `admin.wardrobe.attachImage({ dressId, url, sortOrder, isPrimary })` — record image after upload completes
- `admin.wardrobe.reorderImages({ dressId, ordering })`
- `admin.wardrobe.deleteImage(imageId)` — also deletes Blob object
- `admin.wardrobe.listRequests({ status? })`
- `admin.wardrobe.respondToRequest({ requestId, decision: 'APPROVE' | 'DECLINE', responseMessage })`
- `admin.wardrobe.markPaymentReceived({ requestId, paymentMethod })` — flips PENDING → CONVERTED, creates `Rental`, sets dress to RENTED
- `admin.wardrobe.markReturned({ rentalId, conditionOnReturn })` — sets `returnedAt`, status RETURNED
- `admin.wardrobe.releaseDeposit({ rentalId })` — sets DEPOSIT_RELEASED, releases dress back to AVAILABLE
- `admin.wardrobe.markConsignmentPaidOut({ rentalId })`

## Image Upload Approach

**Storage**: Vercel Blob (`@vercel/blob`) — already inside the Vercel ecosystem, no new vendor.

**Flow**:
1. Admin selects up to 8 images on `/admin/wardrobe/new` or `[id]/edit`
2. Client-side compression with `browser-image-compression` (max 1600px wide, 80% quality, ~200-400KB target)
3. For each file: TRPC `admin.wardrobe.uploadImageUrl({ dressId })` returns a signed PUT URL
4. Client `fetch(uploadUrl, { method: 'PUT', body: file })`
5. On success, client calls `admin.wardrobe.attachImage` with the final URL and sort order
6. First image uploaded auto-marked `isPrimary = true` (admin can override via drag-reorder)

**Constraints**: 5MB pre-compression max per file, JPEG/PNG/WebP only, 8 images per dress max. Server validates content-type after upload by HEAD request on Blob URL.

**Deletion**: `admin.wardrobe.deleteImage` removes Blob via `del()` from `@vercel/blob` and then deletes the row. Cascade delete on dress archive does NOT delete Blobs (cheap, and might be useful for audit).

## Workflows

### A. Student requests a rental

1. Student browses `/wardrobe`, filters by category and dates
2. Opens dress detail, sees three pricing tiers
3. Clicks "Request to Rent" → modal with rental type radio, date range picker, optional competition fields, message textarea
4. Client calls `wardrobe.checkAvailability` on date change to show inline conflict warning
5. Submit → `wardrobe.createRequest` → `RentalRequest` row with status PENDING
6. Notifications fired: in-app + email to dress owner (Yura for her dresses, consigner for theirs)
7. Confirmation toast + redirect to `/wardrobe/my-rentals` with the new pending request highlighted

### B. Admin reviews request

1. Admin opens `/admin/wardrobe/requests` — table of PENDING requests sorted by competition date
2. Each row: dress thumbnail, student name, dates, message, "Approve" and "Decline" buttons
3. Click Approve → modal with response message → `admin.wardrobe.respondToRequest` → status APPROVED, dress status PENDING
4. Student notified with payment instructions (Venmo handle, Zelle email — pulled from `Settings`)
5. Admin manually verifies payment received (Venmo/Zelle), clicks "Mark payment received" → `admin.wardrobe.markPaymentReceived`
   - Creates `Rental` row, snapshotting `rentalFee`, `cleaningFee`, and `securityDeposit` from the current `Dress` row. Later Dress price changes do not retroactively affect this Rental.
   - Computes consigner payout: `consignmentPayoutAmount = rentalFee - round(rentalFee * consignmentCommissionPct / 100)`. This is what the *consigner* receives. YM keeps `rentalFee * consignmentCommissionPct / 100` plus the full `cleaningFee` (cleaning is always YM's labor).
   - For Yura-owned dresses (`consignmentCommissionPct = 0`), `consignmentPayoutAmount` is null — no payout owed.
   - Sets dress status RENTED. Notification to student: "Rental confirmed".
6. If admin clicks Decline: status DECLINED, owner response shown to student, dress returns to AVAILABLE

### C. Return + deposit release

1. T-1 day before `endDate`: system sends "Return reminder" email to student
2. Student returns dress in person → admin opens `/admin/wardrobe/rentals`, finds row, clicks "Mark returned"
3. Modal asks for `conditionOnReturn` text + checkbox "deposit OK to release"
4. If deposit released: `releaseDeposit` mutation → status DEPOSIT_RELEASED, dress AVAILABLE, notification to student
5. If damage/late: admin sets `paymentStatus = LATE_FEE_OWED`, manually contacts student (no automated billing in MVP)

### D. Consignment payout

1. Owner of a non-Yura dress sees their dresses + rental history at `/wardrobe/consigned`
2. Each completed rental shows `consignmentPayoutAmount` and `consignmentPaidOut` flag
3. Yura pays them via Venmo/Zelle out-of-band, then opens admin view, clicks "Mark paid out"
4. `markConsignmentPaidOut` sets `consignmentPaidOut = true`, `consignmentPaidOutAt = now()`

## Notifications

Reuses existing `Notification` model + `pendingEmailNotifications` queue and Resend templates (`src/lib/email.ts`). New template functions:

- `sendRentalRequestReceivedEmail(ownerUser, request)` — to dress owner
- `sendRentalDecisionEmail(student, request, decision)` — APPROVED includes payment instructions; DECLINED includes response message
- `sendRentalConfirmedEmail(student, rental)` — payment marked received
- `sendReturnReminderEmail(student, rental)` — T-1 day before endDate (cron via existing notification scheduler)
- `sendDepositReleasedEmail(student, rental)`
- `sendConsignmentPayoutDueEmail(admin, rental)` — internal reminder

All templates follow the cyan `#0891b2` + navy `#1a3a5c` palette per the 2026-04-26 brand sweep.

## UI / Brand

- Reuse `Card`, `Badge`, `Button`, `Dialog` primitives from `src/components/ui`
- Catalog: responsive grid (1/2/3/4 cols at sm/md/lg/xl), each card shows primary image, title, category badge, "from $50/comp" price, status pill
- Category badges follow existing pattern: Classical=cyan, Dramatic=rose, Themed=violet, IceDance=emerald, Competition=amber
- Section headers: `text-xs font-bold uppercase tracking-[0.15em] text-slate-500` (matches luxury redesign)
- Hero pattern on `/wardrobe`: small intro section with section header + 1-line subtitle, then filter bar, then grid
- All cards use the standardized `shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]`

## Sidebar Integration

Add a new sidebar item to `AppSidebar.tsx` ABOVE "Settings":

- Students: "Wardrobe" with `Shirt` icon (lucide-react) → `/wardrobe`
- Admin: "Wardrobe" → `/admin/wardrobe`
- Anyone with at least one consigned dress: a "Consigned" sub-link (or shown only on `/wardrobe/consigned`)

Sidebar architecture rules in CLAUDE.md remain untouched — only adding a nav entry, not restructuring layout.

## Permissions Matrix

| Action | STUDENT | COACH | ADMIN | SUPER_ADMIN | Dress Owner (any role) |
|---|---|---|---|---|---|
| Browse catalog | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create rental request | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cancel own pending request | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own requests/rentals | ✓ | ✓ | ✓ | ✓ | ✓ |
| Add/edit dresses | — | — | ✓ | ✓ | — (MVP: admin-only adds even consigner dresses) |
| Approve/decline requests | — | — | ✓ | ✓ | — |
| Mark payment received | — | — | ✓ | ✓ | — |
| Mark returned, release deposit | — | — | ✓ | ✓ | — |
| View consigned dress earnings | — | — | ✓ | ✓ | ✓ (own dresses only) |
| Mark consignment paid out | — | — | ✓ | ✓ | — |

MVP intentionally has admin do all data entry — consigners drop off dresses physically and Yura adds them. Self-serve consigner upload comes in v2.2.

## Money Handling (MVP)

- Total charged at rental approval = `rentalFee + cleaningFee + securityDeposit`
- Pricing tiers locked into `Rental` at payment-received time (snapshot; later Dress price changes don't affect existing rentals)
- All payment verification is manual via existing Venmo/Zelle/Cash pattern (mirrors how `Payment` works for lessons)
- Security deposit is tracked as a number on `Rental`, NOT a real card hold. Admin uses `depositCollectedAt` / `depositReleasedAt` timestamps to track lifecycle
- Late fees and damage charges: MVP just sets `paymentStatus = LATE_FEE_OWED` and adds a note; resolution is out-of-band

**Migration to Stripe (deferred to v2.4)** — when ready: replace `paymentMethod` with `stripePaymentIntentId`, use card-on-file for real holds, automate deposit release. Schema is designed to absorb this with minimal churn (`paymentMethod` becomes optional, add a `stripePaymentIntentId` column).

## Health & Safety Checks

- Pre-launch seed script (`scripts/seed-wardrobe.ts`) creates 6 sample dresses across categories with placeholder images so `/wardrobe` isn't empty on first deploy
- DB-check endpoint (`/api/health/data`) extended to include `dresses`, `rentalRequests`, `rentals` row counts
- All new mutations wrapped in TRPC middleware that asserts the caller's role against the permissions matrix

## Testing Strategy

- E2E (Playwright) — new spec `tests/e2e/wardrobe.spec.ts` covering: student browse → request → admin approve → mark paid → student sees confirmed rental → admin marks returned → deposit released
- Unit tests for `consignmentPayoutAmount` calculation
- Storybook stories for `DressCard`, `RequestRentalDialog`, `RentalStatusBadge`, `ConsignmentEarningsTable`
- VRT snapshot of `/wardrobe` (empty + populated states)

## Open Questions for User Review

1. **Consigner self-serve**: MVP keeps it admin-only (Yura adds the dress on consigner's behalf). Confirm that's OK for v2.0, or should consigners be able to upload from `/wardrobe/consigned` from day 1?
2. **Default consignment commission %**: spec assumes admin sets per-dress. Want a global default (e.g., 15%) we can change later?
3. **Sidebar icon**: `Shirt` from lucide-react is the obvious pick. Acceptable, or want something more specific?
4. **`/wardrobe/consigned` visibility**: shown to anyone who has at least one owned dress, or hidden behind a feature flag until consignment is actively used?

## Rollout Plan

Phase 0 (this spec) → Phase 1 (schema + migrations + Vercel Blob wiring) → Phase 2 (admin inventory CRUD + image upload) → Phase 3 (student catalog browse + detail) → Phase 4 (request flow + admin queue) → Phase 5 (rentals + payment marking + return flow) → Phase 6 (consignment view + payout tracking) → Phase 7 (notifications + email templates) → Phase 8 (E2E tests + Storybook + seed data) → Ship.

Each phase becomes a GSD phase under the v2.0 milestone. We are not gating behind a feature flag — internal-only audience is small enough that staged rollout via the GSD phase cadence (each phase shippable in isolation) gives us the same safety without flag complexity.
