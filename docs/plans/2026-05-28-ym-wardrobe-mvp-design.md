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

- **Marketplace-style catalog** with structured filters: category, color, size, length, price, theme, and a "fits my measurements" toggle
- **Student body measurements** stored on Student profile, drive a "best fit" sort and "fits me" filter
- Dress detail page with image carousel, description, three pricing tiers, structured fit/size info, request CTA
- "Request to Rent" flow with rental type, dates, competition info, free-text message to owner
- Admin inventory management (create/edit/archive dresses, upload up to 8 images per dress)
- **Self-serve consignment**: any User can create dresses they own from `/wardrobe/consigned/new`; new consigner dresses go through an admin approval queue before going public
- Admin request queue with approve/decline + response message
- Active rentals view with return tracking and deposit release
- Global default consignment commission % via Settings (per-dress override allowed)
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
  themeTags                 String[]      // free-form, e.g. ["Spanish", "Tango", "Carmen"] — drives theme search
  color                     String        // primary color label, e.g. "Red", "Black"
  secondaryColors           String[]      // ["gold", "rhinestones"]
  condition                 DressCondition
  yearMade                  Int?

  // Structured sizing — drives "fits me" filter and "best fit" sort
  sizeLabel                 String        // human label: "Adult S", "Youth 12"
  chestMinCm                Int?
  chestMaxCm                Int?
  waistMinCm                Int?
  waistMaxCm                Int?
  hipsMinCm                 Int?
  hipsMaxCm                 Int?
  torsoMinCm                Int?
  torsoMaxCm                Int?
  lengthCm                  Int?          // skirt length / hem drop, useful for height matching
  alterableSmaller          Boolean       @default(false)  // can be taken in (extends min range by ~2cm)
  alterableLarger           Boolean       @default(false)  // can be let out

  // Pricing
  competitionPrice          Int           @default(5000)   // cents, $50 default
  seasonalPrice             Int           @default(37500)  // cents, $375 midpoint of $350-400
  purchasePrice             Int?          // nullable — not all dresses are for sale
  securityDeposit           Int           @default(20000)  // cents, $200 default
  cleaningFee               Int           @default(3000)   // cents, $30 default

  // Consignment + lifecycle
  consignmentCommissionPct  Int           @default(0)      // 0 if Yura-owned; otherwise auto-filled from Settings, admin can override
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

enum DressCondition {
  NEW
  LIKE_NEW
  GENTLY_USED
  USED
}

enum DressStatus {
  PENDING_APPROVAL  // consigner just uploaded; admin must approve before public
  AVAILABLE
  PENDING           // request approved, awaiting payment / pickup
  RENTED            // currently with a renter
  MAINTENANCE       // returned, being cleaned/repaired (v2.1 surfaces this)
  ARCHIVED          // no longer offered
  REJECTED          // admin rejected a consigner submission
}
```

### `Student` — measurement additions

Add a measurements block to the existing `Student` model. All fields nullable so existing students aren't affected by the migration.

```
// Add to Student model:
heightCm              Int?
chestCm               Int?
waistCm               Int?
hipsCm                Int?
torsoCm               Int?       // shoulder-to-waist length (skating-relevant)
inseamCm              Int?
sleeveLengthCm        Int?
preferredFitNotes     String?    // free text: "prefer slightly loose", "open back OK"
measurementsUpdatedAt DateTime?
```

Measurements live on `Student`, not `User`, since they're skating-profile data. Students set/edit at `/wardrobe/measurements` or as a section in their profile settings.

### `Settings` — global wardrobe defaults

Add fields to the existing `Settings` row:

```
defaultConsignmentCommissionPct  Int     @default(15)
wardrobeRentalRequestExpiryDays  Int     @default(7)   // auto-cancel pending requests after N days
wardrobeReturnReminderDays       Int     @default(1)   // send reminder T-N before endDate
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

- `GET /wardrobe` — catalog grid with marketplace filters
- `GET /wardrobe/[id]` — dress detail + request CTA + fit comparison vs caller's measurements
- `GET /wardrobe/my-rentals` — student's own request history and active/past rentals
- `GET /wardrobe/measurements` — view/edit body measurements (driving "fits me" filter)

### Owner/consigner (any User with at least one `Dress` they own)

- `GET /wardrobe/consigned` — list of dresses they own + status (incl. PENDING_APPROVAL) + earned commission + payout status
- `GET /wardrobe/consigned/new` — self-serve dress upload form (creates with status `PENDING_APPROVAL`)
- `GET /wardrobe/consigned/[id]/edit` — edit own dress (limited fields — can't change consignment % or pricing once approved)

### Admin (role: ADMIN, SUPER_ADMIN)

- `GET /admin/wardrobe` — inventory grid (all statuses, filterable)
- `GET /admin/wardrobe/new` — create dress form with image uploader
- `GET /admin/wardrobe/[id]/edit` — edit any dress (full field access)
- `GET /admin/wardrobe/pending-approval` — queue of consigner-submitted dresses awaiting review
- `GET /admin/wardrobe/requests` — rental request queue
- `GET /admin/wardrobe/rentals` — active rentals + returns due
- `GET /admin/wardrobe/settings` — configure defaults (commission %, expiry days, reminder days)

All routes follow the existing `(protected)` layout group with `AppLayout`.

## TRPC API

New router at `src/server/api/routers/wardrobe.ts`, mounted at `wardrobe.*`. Admin router at `src/server/api/routers/admin/wardrobe.ts`, mounted at `admin.wardrobe.*`.

**Public-ish (any authenticated user):**
- `wardrobe.list({ category?, sizeLabel?, color?, theme?, minPrice?, maxPrice?, lengthCmMin?, lengthCmMax?, availableBetween?, fitsMe?, sort? })` — returns paginated dresses (status AVAILABLE or PENDING only, excludes PENDING_APPROVAL/REJECTED), omitting `internalNotes`. `fitsMe=true` uses caller's stored measurements. `sort` ∈ `{newest, priceAsc, priceDesc, bestFit}` — `bestFit` only valid when measurements are set.
- `wardrobe.byId(id)` — full dress + images + non-internal availability info + fit comparison block for caller
- `wardrobe.checkAvailability({ dressId, startDate, endDate })` — true/false based on existing `Rental` and approved `RentalRequest` rows
- `wardrobe.createRequest({ dressId, rentalType, startDate, endDate, competitionName?, competitionDate?, message })`
- `wardrobe.cancelRequest(requestId)` — student can cancel their own PENDING request
- `wardrobe.myRequests()` — student's own requests
- `wardrobe.myRentals()` — student's own rentals
- `wardrobe.measurements.get()` — caller's own measurements
- `wardrobe.measurements.update(input)` — caller updates own measurements

**Consigner (any User as owner of the dress in question):**
- `wardrobe.consigner.myDresses()` — dresses where caller is `ownerId`, including PENDING_APPROVAL and REJECTED
- `wardrobe.consigner.create(input)` — create dress, status forced to PENDING_APPROVAL, `consignmentCommissionPct` auto-set from `Settings.defaultConsignmentCommissionPct` (consigner cannot set this themselves)
- `wardrobe.consigner.update({ id, ... })` — limited fields: title, description, themeTags, color, images. Cannot change pricing, size structure, or commission % once status moved past PENDING_APPROVAL
- `wardrobe.consigner.archive(id)` — soft-archive own dress (only allowed when status is AVAILABLE — can't pull during a pending rental)
- `wardrobe.consigner.uploadImageUrl({ dressId })` / `attachImage` / `deleteImage` — only on own dresses

**Admin:**
- `admin.wardrobe.create(input)` — create dress (without images; admin can directly create AVAILABLE, bypassing the queue)
- `admin.wardrobe.update(id, input)` — full field access on any dress
- `admin.wardrobe.archive(id)` — soft-archive (status = ARCHIVED, archivedAt set)
- `admin.wardrobe.uploadImageUrl({ dressId })` / `attachImage({ dressId, url, sortOrder, isPrimary })` / `reorderImages({ dressId, ordering })` / `deleteImage(imageId)`
- `admin.wardrobe.listPendingApproval()` — consigner submissions awaiting review
- `admin.wardrobe.approveDress({ dressId, consignmentCommissionPct?, internalNotes? })` — flips PENDING_APPROVAL → AVAILABLE; can override commission % at this step
- `admin.wardrobe.rejectDress({ dressId, reason })` — flips PENDING_APPROVAL → REJECTED with reason emailed to consigner
- `admin.wardrobe.listRequests({ status? })`
- `admin.wardrobe.respondToRequest({ requestId, decision: 'APPROVE' | 'DECLINE', responseMessage })`
- `admin.wardrobe.markPaymentReceived({ requestId, paymentMethod })` — flips APPROVED → CONVERTED, creates `Rental`, sets dress to RENTED
- `admin.wardrobe.markReturned({ rentalId, conditionOnReturn })` — sets `returnedAt`, status RETURNED
- `admin.wardrobe.releaseDeposit({ rentalId })` — sets DEPOSIT_RELEASED, releases dress back to AVAILABLE
- `admin.wardrobe.markConsignmentPaidOut({ rentalId })`
- `admin.wardrobe.updateSettings({ defaultConsignmentCommissionPct?, wardrobeRentalRequestExpiryDays?, wardrobeReturnReminderDays? })`

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

## Marketplace Browse & Fit Matching

### Filter bar on `/wardrobe`

Sticky on scroll. Fields:
- **Category** — multi-select chips (Classical, Dramatic, Themed, Ice Dance Single, Ice Dance Partner, Competition, Test)
- **Color** — multi-select chips, includes primary + secondary colors
- **Size label** — multi-select chips (auto-populated from distinct `sizeLabel` values in catalog)
- **Theme search** — text input, matches against `themeTags` array
- **Length** — range slider in cm (or "any length")
- **Price** — range slider per night / per season tab
- **Availability dates** — date range picker (filters out dresses with overlapping confirmed rentals)
- **Fits me** — toggle. Disabled with tooltip "Set your measurements first" if measurements not stored. When on, applies measurement-based filtering (see scoring below).
- **Sort** — Newest / Price ↑ / Price ↓ / Best fit (only when measurements set)

Filter state lives in URL params (shareable links). Default sort: Newest.

### "Fits me" filter logic

A dress is included in `fitsMe=true` results when ALL stored caller measurements satisfy:

```
dress.chestMinCm - alterableSlack ≤ student.chestCm ≤ dress.chestMaxCm + alterableSlack
   AND same for waistCm and hipsCm
   AND (dress.lengthCm is null OR student.heightCm is null OR
        abs(dress.lengthCm - expectedLengthForHeight(student.heightCm)) ≤ 8cm)
```

Where `alterableSlack = 2 cm` for the relevant direction if the dress is `alterableSmaller` (lower bound) or `alterableLarger` (upper bound), else 0.

Null student measurements are treated as "match" — we don't exclude a dress because a student hasn't entered their hips. Null dress dimensions are treated as "match" too (the consigner didn't fill it in; don't penalize the listing).

### "Best fit" sort

Computed score per dress (higher is better):

```
score = sum over [chest, waist, hips] of:
    let center = (min + max) / 2 in
    1 - min(1, |studentMeasurement - center| / ((max - min) / 2 + 1))
```

Dresses with more null dimensions get a small penalty (`-0.1` per missing structured field) so fully-described dresses surface first. Score in [0, 3], displayed on the dress card as a 0–100% fit badge when `fitsMe` is active or sort is `bestFit`.

### Detail page fit comparison

`/wardrobe/[id]` shows a "Fit check" card for authenticated students with measurements set. Three rows (chest, waist, hips) with a horizontal bar showing the dress's min-max range and a marker for the student's measurement. Green if inside range, amber if within `alterableSlack`, red if outside. Includes a "Edit my measurements" link.

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

### D. Consigner uploads a dress (self-serve)

1. Consigner (any User with a Student or Coach account) opens `/wardrobe/consigned`
2. Clicks "List a dress" → routed to `/wardrobe/consigned/new`
3. Form mirrors admin create flow but:
   - `consignmentCommissionPct` field is hidden (auto-filled from `Settings.defaultConsignmentCommissionPct`); shown as read-only "YM commission: 15%" with tooltip
   - `securityDeposit`, `cleaningFee` are read-only (set by admin policy, not consigner)
   - `internalNotes` is hidden
   - Pricing tiers and structured sizing are required fields
4. Upload images (same Vercel Blob flow). At least 1 image required to submit.
5. Submit → status `PENDING_APPROVAL`, notification to admin: "New consigned dress: \<title\> from \<name\>"
6. Consigner sees the dress in `/wardrobe/consigned` with a "Pending review" pill; not visible to students browsing the catalog
7. Admin opens `/admin/wardrobe/pending-approval`, sees thumbnail + all fields + consigner identity
8. Admin reviews: can `approveDress` (optionally overriding commission %), or `rejectDress` with a reason
9. On approve: status → AVAILABLE, dress is live; consigner notified
10. On reject: status → REJECTED, reason emailed to consigner; consigner can edit and resubmit (status flips back to PENDING_APPROVAL on resubmit)

### E. Consignment payout

1. Owner of a non-Yura dress sees their dresses + rental history at `/wardrobe/consigned`
2. Each completed rental shows `consignmentPayoutAmount` and `consignmentPaidOut` flag
3. Yura pays them via Venmo/Zelle out-of-band, then opens admin view, clicks "Mark paid out"
4. `markConsignmentPaidOut` sets `consignmentPaidOut = true`, `consignmentPaidOutAt = now()`

## Notifications

Reuses existing `Notification` model + `pendingEmailNotifications` queue and Resend templates (`src/lib/email.ts`). New template functions:

- `sendConsignerDressSubmittedEmail(admin, dress, consigner)` — to admin, on new consigner submission
- `sendConsignerDressApprovedEmail(consigner, dress)` — dress is live
- `sendConsignerDressRejectedEmail(consigner, dress, reason)` — with reason and edit link
- `sendRentalRequestReceivedEmail(ownerUser, request)` — to dress owner (Yura or consigner — owner of record gets the notification)
- `sendRentalDecisionEmail(student, request, decision)` — APPROVED includes payment instructions; DECLINED includes response message
- `sendRentalConfirmedEmail(student, rental)` — payment marked received
- `sendReturnReminderEmail(student, rental)` — T-N day before endDate (cron via existing notification scheduler; N from `Settings.wardrobeReturnReminderDays`)
- `sendDepositReleasedEmail(student, rental)`
- `sendConsignmentPayoutDueEmail(admin, rental)` — internal reminder
- `sendConsignmentPayoutSentEmail(consigner, rental)` — admin marked paid out

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
| View/edit own measurements | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create rental request | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cancel own pending request | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own requests/rentals | ✓ | ✓ | ✓ | ✓ | ✓ |
| Self-serve list a consigned dress | ✓ | ✓ | — | — | — |
| Edit/archive own consigned dress (limited fields) | — | — | — | — | ✓ |
| Add/edit ANY dress (full fields, bypass approval) | — | — | ✓ | ✓ | — |
| Approve/reject pending consigner submissions | — | — | ✓ | ✓ | — |
| Set/override consignment commission % | — | — | ✓ | ✓ | — |
| Approve/decline rental requests | — | — | ✓ | ✓ | — |
| Mark payment received | — | — | ✓ | ✓ | — |
| Mark returned, release deposit | — | — | ✓ | ✓ | — |
| View consigned dress earnings | — | — | ✓ | ✓ | ✓ (own dresses only) |
| Mark consignment paid out | — | — | ✓ | ✓ | — |
| Edit global wardrobe settings | — | — | ✓ | ✓ | — |

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

### New Wardrobe coverage
- E2E (Playwright CLI) — new spec `tests/e2e/wardrobe.spec.ts` covering the full happy path: student sets measurements → browses with "fits me" filter → opens dress detail → submits request → admin approves → student pays via Venmo → admin marks paid → student sees confirmed rental → admin marks returned → deposit released. Plus consigner path: consigner uploads dress → goes to PENDING_APPROVAL → admin approves → goes live. Plus rejection path. Run via `pnpm test:e2e tests/e2e/wardrobe.spec.ts`.
- Unit tests for `consignmentPayoutAmount` calculation and fit scoring algorithm
- New Storybook stories: `DressCard`, `DressDetailHero`, `FitCheckCard`, `MeasurementEditor`, `RequestRentalDialog`, `RentalStatusBadge`, `ConsignmentEarningsTable`, `WardrobeFilterBar`, `PendingApprovalQueue`
- VRT snapshots added to `tests/storybook-vrt.spec.ts` covering all new stories + `/wardrobe` empty/populated states

### Project-wide Storybook coverage audit (Phase 10)
Once Wardrobe ships, sweep the entire project to verify Storybook coverage is correctly mapped:
- Inventory every component under `src/components/`, `src/features/*/components/`, and `src/app/(protected)/**/page.tsx` rendered components
- Cross-reference against existing `.stories.tsx` files (current count: 18 story files)
- Identify gaps — components with no Storybook representation, broken or stale stories, missing variants
- Backfill stories for high-traffic components and add VRT snapshots
- Update `pnpm storybook` script reference in CLAUDE.md if needed
- Goal: every reusable UI primitive and feature surface is browsable + visually regression-tested in Storybook

## Resolved Questions

1. **Consigner self-serve**: ✅ Enabled in MVP. Consigners upload from `/wardrobe/consigned/new`, dresses go to admin approval queue before going public.
2. **Marketplace browsing**: ✅ Structured size filters + student measurements + "fits me" toggle + "best fit" sort.
3. **Default consignment %**: ✅ Global default in `Settings.defaultConsignmentCommissionPct` (starts at 15%), admin can override per dress at approval time.
4. **Sidebar icon**: ✅ `Shirt` from lucide-react.

## Open Questions (defer to implementation)

1. **`/wardrobe/consigned` visibility for non-owners**: Always show the route, or hide until the user has at least one dress? Recommend: always show — empty state has a "List your first dress" CTA, doubles as the discovery surface.
2. **Measurement units**: Spec uses cm throughout. Add an inches toggle in the measurement editor for US users, store internally as cm? Recommend yes — answered during implementation, low-risk.

## Rollout Plan

Phase 0 (this spec) → Phase 1 (schema + migrations + Settings extensions + Vercel Blob wiring) → Phase 2 (admin inventory CRUD + image upload) → Phase 3 (student measurements + catalog browse with marketplace filters and fit scoring) → Phase 4 (dress detail page with fit comparison + request flow) → Phase 5 (admin rental queue + payment marking + return flow + deposit release) → Phase 6 (self-serve consigner upload + admin approval queue) → Phase 7 (consignment payout tracking + earnings view) → Phase 8 (notifications + all email templates) → Phase 9 (Wardrobe E2E via Playwright CLI + new Storybook stories + VRT snapshots + seed data + health check extension) → Phase 10 (project-wide Storybook audit + backfill) → Ship.

Each phase becomes a GSD phase under the v2.0 milestone. We are not gating behind a feature flag — internal-only audience is small enough that staged rollout via the GSD phase cadence (each phase shippable in isolation) gives us the same safety without flag complexity. Phases 6–7 (consigner work) can be deferred to a fast-follow if Phase 5 ships and we want immediate dogfooding.
