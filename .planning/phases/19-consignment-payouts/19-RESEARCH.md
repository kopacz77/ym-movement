# Phase 19: Consignment Payout Tracking — Research

**Researched:** 2026-05-29
**Domain:** Consigner earnings surface + admin payout marking (TRPC + thin UI extensions on top of Phase 17 rental machinery and Phase 18 consigner surface)
**Confidence:** HIGH (entire phase is in-codebase patterns — every primitive, schema column, helper, page shell, and brand token already exists; no external library research required)

---

## Executive Summary

Phase 19 is the smallest wardrobe phase to date: **zero schema changes, zero new routes, zero new sidebar entries**. The DB columns `Rental.consignmentPaidOut Boolean @default(false)` and `Rental.consignmentPaidOutAt DateTime?` already shipped in the original wardrobe migration (`20260529042222_add_wardrobe/migration.sql` lines 123-124, verified). The work is two new TRPC procedures (one consigner-side read, one admin-side mutation) plus two component touches: an "Earnings" tab appended to the existing `MyConsignedDressesList` 4-tab UI, and a "Mark Payout Sent" action wired into the existing `RentalsTable` (Phase 17). Phase 20 wires the consigner-facing email; Phase 19 stays in-app and stops at the in-app `createNotification` row.

The single load-bearing decision is **whether to add a 5th tab to `MyConsignedDressesList` ("Earnings") or split out a separate `/wardrobe/consigned/earnings` route**. Recommendation: **add a 5th tab** to the existing 4-tab surface. The consigner mental model is "everything about my dresses lives here" — earnings are a status dimension of the dress, not a separate domain. URL state still uses `?tab=earnings`. This also keeps the navigation surface unchanged (Phase 18-07 sidebar entry already says "Consigned" and points to `/wardrobe/consigned`).

**Primary recommendation:** Ship a new `wardrobe.consigner.myEarnings` TRPC procedure returning rentals grouped by dress with the payout-state derivations the UI needs; ship a new `admin.wardrobeRentals.markConsignmentPaidOut` mutation with idempotency + null-payout-amount guards; render earnings as a 5th tab in `MyConsignedDressesList` (table form, not the existing card grid — rentals are tabular data); add a "Mark Payout Sent" button to `RentalsTable` rows where `consignmentPayoutAmount != null && !consignmentPaidOut`. No migration. No new pages. No sidebar changes.

---

## Schema Audit

### Current Rental model (verified at `prisma/schema.prisma:598-629`)

```prisma
model Rental {
  id                      String              @id @default(cuid())
  dressId                 String
  Dress                   Dress               @relation(fields: [dressId], references: [id], onDelete: Restrict)
  studentId               String
  Student                 Student             @relation(fields: [studentId], references: [id], onDelete: Restrict)
  requestId               String              @unique
  Request                 RentalRequest       @relation(fields: [requestId], references: [id], onDelete: Restrict)
  rentalType              RentalType
  startDate               DateTime
  endDate                 DateTime
  rentalFee               Int
  cleaningFee             Int
  securityDeposit         Int
  totalCharged            Int
  paymentMethod           PaymentMethod
  paymentStatus           RentalPaymentStatus @default(AWAITING_PAYMENT)
  depositCollectedAt      DateTime?
  depositReleasedAt       DateTime?
  returnedAt              DateTime?
  conditionOnReturn       String?
  consignmentPayoutAmount Int?                // Phase 17 — snapshotted at rental create (RENTAL-03)
  consignmentPaidOut      Boolean             @default(false)  // Phase 19 target
  consignmentPaidOutAt    DateTime?                            // Phase 19 target
  notes                   String?
  createdAt               DateTime            @default(now())
  updatedAt               DateTime            @updatedAt

  @@index([dressId])
  @@index([studentId])
  @@index([paymentStatus])
}
```

### Verification of pre-existing payout columns

`grep -n "consignmentPaidOut" prisma/migrations/20260529042222_add_wardrobe/migration.sql` returns:
```
123:    "consignmentPaidOut" BOOLEAN NOT NULL DEFAULT false,
124:    "consignmentPaidOutAt" TIMESTAMP(3),
```

**Conclusion:** Both columns shipped in the initial wardrobe migration (Phase 13 hand-authored migration). **NO MIGRATION REQUIRED in Phase 19.** Schema is ready. The only Phase 19 schema-adjacent action is to **verify these columns survived intact** with `grep` at planning time — already done here.

### Related model context

- `Dress.ownerId` (PascalCase relation: `Dress.Owner` of type `User`) — pre-existing FK; consigners join their User.id → Dress.ownerId.
- `Dress.Rentals: Rental[]` (line 552) — reverse relation; can be used in `select` shapes for `mine` and `myEarnings`.
- `Dress.consignmentCommissionPct` (line 546) — already snapshot consumed at Rental-create time; not read again in Phase 19.
- No new indexes required. `Rental.@@index([dressId])` and the implicit cover of `dressId` are sufficient for "list rentals for my dresses" queries via the implicit nested where clause.

### Optional defensive index (LOW priority)

A composite `@@index([dressId, consignmentPaidOut])` would marginally speed up the admin "outstanding payouts" view if we add one. **Recommendation: skip** — Rental row counts will be in the dozens-to-hundreds range for years; PG can table-scan painlessly. Add only if the admin payouts view is later moved to a dedicated `/admin/wardrobe/payouts` page with filtering.

---

## TRPC Procedures Needed

### 1. `wardrobe.consigner.myEarnings` (NEW — consigner-facing read)

**File:** `src/features/wardrobe/api/queries/consignerQueries.ts` (extend existing router)
**Permission:** `protectedProcedure` (per Phase 18 pattern — no admin or coach scoping; just "authenticated"). Caller-owns guard is implicit via the WHERE clause: `Dress.ownerId = ctx.session.user.id`.
**Input:** none (or optional `paidOutFilter: "all" | "unpaid" | "paid"` if the UI wants client-side filter support; default to returning all).

**Return shape (recommended composite-by-dress structure):**

```typescript
{
  rentalsByDress: Array<{
    dress: {
      id: string;
      title: string;
      sizeLabel: string;
      Images: { url: string }[]; // primary only
    };
    rentals: Array<{
      id: string;
      startDate: Date;
      endDate: Date;
      rentalType: RentalType;
      rentalFee: number;             // cents
      consignmentPayoutAmount: number | null; // cents — null = Yura-owned (won't happen here, since this query filters to consigned)
      consignmentPaidOut: boolean;
      consignmentPaidOutAt: Date | null;
      paymentStatus: RentalPaymentStatus;
      Student: { User: { name: string | null } }; // who rented it — consigner has a right to know
    }>;
  }>;
  totals: {
    earnedToDate: number;       // sum of consignmentPayoutAmount where consignmentPaidOut = true
    pendingPayout: number;      // sum of consignmentPayoutAmount where consignmentPaidOut = false
    rentalCount: number;        // total rentals across all owned dresses
  };
}
```

**Why composite-by-dress over flat:** The UI primary affordance is "which of MY dresses generated income". A flat rental list forces the UI to re-group client-side. Composite shape mirrors the existing `mine` procedure's mental model (dresses are the primary entity; rentals are children) and is one query (single `Dress.findMany` with `Rentals` nested include).

**Why include unpaid rentals AND paid rentals in same query:** Consigner needs to see lifetime earnings + outstanding. Single round-trip beats two queries; UI can filter client-side via the totals + per-rental `consignmentPaidOut` flag.

**Critical filtering decisions:**
- Filter to `Dress.ownerId === ctx.session.user.id` (caller-owns gate)
- Filter to `Rental.consignmentPayoutAmount IS NOT NULL` — Yura-owned dresses have `consignmentCommissionPct = 0` → null payout → they shouldn't appear on the consigner earnings surface even if the consigner had previously consigned, then commission was zeroed out (defensive).
- Filter to `Rental.paymentStatus IN [PAID, RETURNED, DEPOSIT_RELEASED, LATE_FEE_OWED]` — exclude `AWAITING_PAYMENT` (no money has changed hands yet, so there's no earnings to display). DEPOSIT_RELEASED and LATE_FEE_OWED both can still be payout-eligible because consignment payout is orthogonal to deposit lifecycle.
- Include dresses with zero rentals? **NO** — `mine` already shows that surface. `myEarnings` is by definition "I have earned money on these." Empty state is meaningful: "No rentals yet. We'll show your earnings here once your dresses start renting."

**Implementation skeleton:**

```typescript
myEarnings: protectedProcedure.query(async ({ ctx }) => {
  const dresses = await ctx.prisma.dress.findMany({
    where: {
      ownerId: ctx.session.user.id,
      Rentals: {
        some: {
          consignmentPayoutAmount: { not: null },
          paymentStatus: { in: ["PAID", "RETURNED", "DEPOSIT_RELEASED", "LATE_FEE_OWED"] },
        },
      },
    },
    select: {
      id: true,
      title: true,
      sizeLabel: true,
      Images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
      Rentals: {
        where: {
          consignmentPayoutAmount: { not: null },
          paymentStatus: { in: ["PAID", "RETURNED", "DEPOSIT_RELEASED", "LATE_FEE_OWED"] },
        },
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          rentalType: true,
          rentalFee: true,
          consignmentPayoutAmount: true,
          consignmentPaidOut: true,
          consignmentPaidOutAt: true,
          paymentStatus: true,
          Student: { select: { User: { select: { name: true } } } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Compute totals server-side so client never has to know the math.
  let earnedToDate = 0;
  let pendingPayout = 0;
  let rentalCount = 0;
  const rentalsByDress = dresses.map((d) => {
    for (const r of d.Rentals) {
      rentalCount++;
      const amt = r.consignmentPayoutAmount ?? 0;
      if (r.consignmentPaidOut) earnedToDate += amt;
      else pendingPayout += amt;
    }
    return { dress: { id: d.id, title: d.title, sizeLabel: d.sizeLabel, Images: d.Images }, rentals: d.Rentals };
  });

  return { rentalsByDress, totals: { earnedToDate, pendingPayout, rentalCount } };
}),
```

### 2. `admin.wardrobeRentals.markConsignmentPaidOut` (NEW — admin mutation)

**File:** `src/features/admin/api/queries/wardrobeRequestQueries.ts` (extend existing `wardrobeRentalRouter`)
**Permission:** `adminProcedure` (matches all sibling procedures in `wardrobeRentalRouter` — `listRentals`, `markReturned`, `releaseDeposit`, `flagLateFee`).
**Input:** `{ rentalId: z.string().cuid() }`

**Defensive checks (4-layer defense-in-depth, mirroring Phase 17 patterns):**

1. **NOT_FOUND** if rental id doesn't exist.
2. **BAD_REQUEST** if `rental.consignmentPayoutAmount == null` — refuses to mark a Yura-owned rental as "paid out to consigner" (there's no consigner). Message: `"This rental has no consignment payout (Yura-owned dress)"`.
3. **BAD_REQUEST** if `rental.consignmentPaidOut === true` — idempotency guard prevents double-toggle bugs. Message: `"Payout already marked as sent"`. (Alternative: silent no-op. Recommendation: hard reject, matches Phase 17 `markReturned` and `releaseDeposit` state-machine strictness — both reject re-application.)
4. Single-row write: not in a transaction (no co-related row updates required — payout is orthogonal to dress.status and to rental.paymentStatus per state-machine analysis in Open Questions §5 below).

**Notification:** **NONE in Phase 19.** Per phase brief: "Notifications wiring is Phase 20 (NOTIFY-09 = sendConsignmentPayoutSentEmail). Do NOT add notification work here." However, do add an in-app `createNotification` row (this is the same pattern Phase 17's `releaseDeposit` uses — in-app stub now, email layered on later). The in-app notification target user is `dress.Owner.id` (the consigner, NOT the student).

**Implementation skeleton:**

```typescript
const markConsignmentPaidOutInputSchema = z.object({ rentalId: z.string().cuid() });

markConsignmentPaidOut: adminProcedure
  .input(markConsignmentPaidOutInputSchema)
  .mutation(async ({ ctx, input }) => {
    const rental = await ctx.prisma.rental.findUnique({
      where: { id: input.rentalId },
      select: {
        id: true,
        consignmentPayoutAmount: true,
        consignmentPaidOut: true,
        Dress: {
          select: {
            title: true,
            Owner: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!rental) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Rental not found" });
    }
    if (rental.consignmentPayoutAmount == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This rental has no consignment payout (Yura-owned dress)",
      });
    }
    if (rental.consignmentPaidOut) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Payout already marked as sent",
      });
    }

    const updated = await ctx.prisma.rental.update({
      where: { id: rental.id },
      data: {
        consignmentPaidOut: true,
        consignmentPaidOutAt: new Date(),
      },
    });

    // In-app notification (Phase 17 pattern — try/catch, non-blocking).
    // Phase 20 will add the Resend email side-by-side with this.
    try {
      await createNotification({
        userId: rental.Dress.Owner.id,
        title: "Consignment payout sent",
        message: `Your payout for "${rental.Dress.title}" has been sent.`,
        type: "SUCCESS",
        link: "/wardrobe/consigned?tab=earnings",
      });
    } catch (err) {
      console.error("[WARDROBE] Failed to notify consigner of payout:", err);
    }

    return { id: updated.id };
  }),
```

### 3. (OPTIONAL) `admin.wardrobeRentals.listOutstandingPayouts`

A separate query to fetch ONLY rentals with `consignmentPayoutAmount != null AND consignmentPaidOut = false`, for a dedicated admin "Outstanding Payouts" view.

**Recommendation: SKIP for Phase 19.** Augment the existing `listRentals` response with a new client-side "Outstanding Payouts" tab in `RentalsTable` — it already filters by `paymentStatus` and the same data shape works. If admins later complain that they want a dedicated cross-status payouts page, Phase 21+ can carve it out. **YAGNI for now.**

---

## UI Surfaces

### Consigner-side: extend `MyConsignedDressesList` (single tab addition)

**File:** `src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx`

Current tabs (4): `Live | Pending Review | Needs Attention | Archived` (URL-synced via `?tab=`).

**Add 5th tab: `Earnings`.**

Tab count remains visually balanced (5 fits comfortably; tested in `RentalsTable` 2-tab and `MyRentalsView` 3-tab — `TabsList` is a flex row with auto-fit). URL state extends naturally: `?tab=earnings`. Update `TAB_KEYS` array and `parseTab` function.

**Earnings tab body — table layout, NOT the card grid used by the other 4 tabs**, because rentals are tabular financial data:

```
+--------+----------------+-----------+--------+----------+-----------+----------+
| Image  | Dress          | Renter    | Dates  | Fee      | Payout    | Status   |
+--------+----------------+-----------+--------+----------+-----------+----------+
|  [img] | Velvet Cocoon  | Jane D.   | 4/1-3  | $90.00   | $76.50    | Paid 5/2 |
|        | Size XS        |           |        |          |           |          |
+--------+----------------+-----------+--------+----------+-----------+----------+
|  [img] | Velvet Cocoon  | Sam K.    | 5/4-7  | $90.00   | $76.50    | Pending  |
|        | Size XS        |           |        |          |           |          |
+--------+----------------+-----------+--------+----------+-----------+----------+
```

Above the table, render a 3-card summary strip:

```
[Earned to date: $612.00]  [Pending payout: $153.00]  [Total rentals: 9]
```

Use existing `formatCurrencyFromCents` helper. Brand: emerald = paid, amber = pending (matches Phase 17 colors + Phase 18 attention bucket palette).

**Extract or inline?** Recommendation: **extract a new `ConsignerEarningsTable` component** in `src/features/wardrobe/components/consigner/ConsignerEarningsTable.tsx`. Reasons:
- `MyConsignedDressesList.tsx` is already 275 lines; adding a table component inline pushes it over the readability cliff.
- Earnings table has totals computation + nested rental rendering that's independent of the card-grid logic.
- Storybook coverage (Phase 21) needs an isolated component to story.

`MyConsignedDressesList` becomes a thin router across the 5 tabs:
- 4 original tabs → render `DressRowGrid`
- New `earnings` tab → render `<ConsignerEarningsTable />` (component fetches its own data via `api.wardrobe.consigner.myEarnings.useQuery`).

### Admin-side: extend `RentalsTable` (button addition + outstanding-payouts tab)

**File:** `src/features/wardrobe/components/admin/RentalsTable.tsx`

Current sub-tabs: `Active | Late Fee`. Each row has conditional action buttons (Mark Returned, Release Deposit, Flag Late Fee).

**Two changes:**

1. **Add a "Mark Payout Sent" button** to each row where `consignmentPayoutAmount != null && !consignmentPaidOut`. Color: cyan-600 (matches "Mark Returned" — both are forward-state-machine actions). Hover: cyan-700.

2. **Add a third top-level tab: `Outstanding Payouts`**. Filter shows ALL rentals (any paymentStatus) where `consignmentPayoutAmount != null && consignmentPaidOut = false`. This gives admins a single-pane view of "who do I still owe money?" without scrolling through Active and Late Fee tabs.

**Decision: NO new `/admin/wardrobe/payouts` page.** The cross-cutting concern is "view + act on payout status", and that already belongs on RentalsTable (rentals are the row primitive). A dedicated payouts page would duplicate the same data with a different filter — not worth a new route.

**Where to fetch the outstanding-payouts data:** Either (a) reuse `listRentals` with an expanded `paymentStatus` filter, then client-side filter to `consignmentPayoutAmount != null && !consignmentPaidOut`, or (b) extend `listRentals` input schema with an optional `outstandingPayoutsOnly: boolean` flag and let the server filter. **Recommendation: (b)** — server filter avoids over-fetching once production has thousands of historical rentals.

Optional schema extension to `listRentalsInputSchema`:
```typescript
const listRentalsInputSchema = z.object({
  paymentStatus: z.array(z.nativeEnum(RentalPaymentStatus)).optional(),
  outstandingPayoutsOnly: z.boolean().optional(), // NEW
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});
```

Server logic adds `consignmentPayoutAmount: { not: null }, consignmentPaidOut: false` to the `where` clause when `outstandingPayoutsOnly` is true. **This is the minimal admin-side change.**

**Confirmation dialog:** Use existing `showConfirmationToast` from `src/lib/toast-confirmations.ts` (object form), mirroring `RentalsTable`'s `handleReleaseDeposit`:

```typescript
const handleMarkPayoutSent = (r: RentalRow) => {
  showConfirmationToast({
    title: "Mark payout sent",
    description: `Confirm that you have sent $${formatCurrencyFromCents(r.consignmentPayoutAmount!)} payout to ${r.Dress.Owner.name ?? "the consigner"} for "${r.Dress.title}"? This action cannot be undone.`,
    confirmLabel: "Mark Sent",
    onConfirm: () => markPayoutSent.mutate({ rentalId: r.id }),
  });
};
```

**Add to RentalRow type:** `consignmentPayoutAmount: number | null`, `consignmentPaidOut: boolean`, and `Dress.Owner: { name: string | null }` need to be in the `listRentals` `include` shape (currently only `Dress.id/title/sizeLabel/color/Images`). Add `Dress.Owner: { select: { name: true } }` to the Phase 17 query.

---

## Open Questions (answered)

### Q1. Are `consignmentPaidOut` + `consignmentPaidOutAt` columns already in the Rental model?

**ANSWERED: YES.** Both shipped in the initial wardrobe migration (`20260529042222_add_wardrobe/migration.sql` lines 123-124). Verified via direct schema read at `prisma/schema.prisma:620-621` and migration grep. **No migration required.** Plans that reference "add columns" should be removed.

### Q2. Separate `/wardrobe/consigned/earnings` page, or tab on existing `/wardrobe/consigned`?

**ANSWERED: Tab on existing page.** Rationale:
- Phase 18-07 added "Consigned" to all 3 role sidebar nav arrays pointing to `/wardrobe/consigned`. Adding a second route forces a sidebar decision (don't add, surface in-page).
- The 4-tab URL-synced state in `MyConsignedDressesList` makes 5 tabs the natural next step (TabsList is a flex row that scales).
- Consigner mental model: "all my dress stuff lives in one spot."
- Storybook + VRT effort: 1 new component story vs. 1 new component story + 1 new page wrapper story.

URL: `/wardrobe/consigned?tab=earnings`. No new page file.

### Q3. Composite-by-dress vs. flat-rental return shape for `myEarnings`?

**ANSWERED: Composite-by-dress (single query).** Rationale:
- UI primary affordance is "which of my dresses earned money" — grouping client-side wastes the network.
- Mirrors the existing `mine` procedure's mental model (Dress is primary entity).
- Single Prisma findMany with nested Rentals include = one round-trip.
- Totals computed server-side, returned as a third top-level field — client never has to know payout math (separation of concerns + idempotent reload behavior).

Do NOT split into two procedures (`mine` + `myEarnings`). They have different filtering (mine returns ALL statuses; myEarnings filters to rented-money-eligible) and different selects.

### Q4. Where does the admin "mark consignment paid" action live?

**ANSWERED: Existing `/admin/wardrobe/rentals` page, via `RentalsTable`.** Reasons:
- The data primitive (Rental row) is the same. No new route, no new sidebar entry.
- Add a third sub-tab "Outstanding Payouts" alongside existing "Active" and "Late Fee" sub-tabs for a focused payouts view.
- Per-row button "Mark Payout Sent" appears wherever the row is eligible (consigned + not yet paid out), regardless of which sub-tab it's on. Lets admins act from any view.

A net-new `/admin/wardrobe/payouts` page is rejected as YAGNI scope creep.

### Q5. Does paymentStatus (PAID / RETURNED / DEPOSIT_RELEASED) block payout marking?

**ANSWERED: NO — orthogonal.** Consignment payout is independent of the rental's deposit lifecycle. Reasons:
- Admin might Venmo a consigner $76.50 as soon as the rental is PAID (cash has cleared); waiting for DEPOSIT_RELEASED conflates two unrelated workflows.
- The student's deposit return is a guarantee owed by Yura to the student; the consigner payout is a separate ledger owed by Yura to the consigner.
- Defensively, however, refuse to mark payout if `paymentStatus === "AWAITING_PAYMENT"` — student has not paid yet, so paying out the consigner would be a credit-the-platform-eats event. **Add this 5th defensive check** if AWAITING_PAYMENT rentals can have a `consignmentPayoutAmount` set (they can't currently, since `markPaymentReceived` is what creates the Rental row with `paymentStatus: PAID` from the start — but defense-in-depth says reject anyway).

State-machine matrix (the new column is fully orthogonal):

| paymentStatus       | consignmentPayoutAmount | consignmentPaidOut allowed transitions |
|---------------------|-------------------------|----------------------------------------|
| AWAITING_PAYMENT    | n/a (rental doesn't exist) | n/a                                    |
| PAID                | null (Yura)             | always false (reject mark)             |
| PAID                | int (consigned)         | false → true (allowed)                 |
| RETURNED            | null                    | always false                           |
| RETURNED            | int                     | false → true                           |
| DEPOSIT_RELEASED    | int                     | false → true                           |
| LATE_FEE_OWED       | int                     | false → true                           |

Once `consignmentPaidOut = true`, NO transitions (no undo procedure shipped). Same closed-state convention as `paymentStatus === DEPOSIT_RELEASED` and `Dress.status === ARCHIVED`.

### Q6. Permission gate on admin payout mutation?

**ANSWERED: `adminProcedure`.** Matches all 4 sibling procedures in `wardrobeRentalRouter`. SUPER_ADMIN passes through `adminProcedure` middleware (see `src/lib/trpc.ts` `adminProcedure` definition allows ADMIN || SUPER_ADMIN). Do NOT introduce `superAdminProcedure` — payout marking is operational, not destructive enough to gate behind super-admin (the consigner sees the result; if a mistake happens it's auditable in `consignmentPaidOutAt`).

### Q7. Defensive checks beyond the basics?

**ANSWERED: 4 layers (3 hard rejects + 1 implicit type guard):**

1. **NOT_FOUND** if rental id is invalid (sanity check).
2. **BAD_REQUEST** if `consignmentPayoutAmount == null` (Yura-owned dress; no consigner to pay).
3. **BAD_REQUEST** if `consignmentPaidOut === true` (idempotency / double-toggle guard).
4. **(Optional 5th) BAD_REQUEST** if `paymentStatus === "AWAITING_PAYMENT"` (student hasn't paid yet — defensive even though current state machine can't produce this combination).

UI-side guard: button is hidden when `consignmentPayoutAmount == null || consignmentPaidOut`. Server-side guards are belt-and-suspenders for malicious clients or future code paths.

### Q8 (surfaced). Should the consigner see the renter's full name?

The current `myRentals` procedure (Phase 17) returns `Student.User.name` (full name). For `myEarnings`, the consigner also has a legitimate interest in knowing who rented their dress (provenance, audit trail). **Recommendation: include `Student.User.name`** (not email). PII boundary: name only, no email or phone. Matches existing exposure level.

### Q9 (surfaced). What link does the in-app notification deep-link to?

The post-mutation `createNotification` call needs a `link`. **Recommendation: `/wardrobe/consigned?tab=earnings`** — drops the consigner directly into the earnings tab where they can see the new "Paid" status on the row in question.

### Q10 (surfaced). What happens if a consigner archives their dress AFTER a rental is paid out?

Archive is allowed only when `Dress.status === "AVAILABLE"` (Phase 18 `consigner.archive`). After ARCHIVED, the dress no longer appears in `mine`'s Live/Pending/etc tabs, but `myEarnings` should STILL surface historical rentals (the consigner has a right to see their earnings history forever).

**Confirmation:** `myEarnings` does NOT filter by `Dress.status` — it filters by ownership + rental eligibility. Archived dresses with past rentals correctly appear. The earnings view should optionally show an "Archived" badge inline on the dress row to clarify the listing is no longer live. Use `DressStatusBadge` (already exists from Phase 18-05) for consistency.

---

## Plan Breakdown Recommendation

**Total scope: 3 plans, ~9 tasks. Single wave (no parallelism needed — phase is small enough).**

### Plan 19-01: TRPC backend (consigner earnings + admin payout marking)

**Scope:**
- Extend `consignerRouter` in `src/features/wardrobe/api/queries/consignerQueries.ts` with `myEarnings` query procedure.
- Extend `wardrobeRentalRouter` in `src/features/admin/api/queries/wardrobeRequestQueries.ts` with `markConsignmentPaidOut` mutation procedure.
- Extend `listRentals` input schema with `outstandingPayoutsOnly: z.boolean().optional()` and corresponding `where` clause logic.
- Extend `listRentals` include shape to add `Dress.Owner: { select: { name: true } }` (so RentalsTable rows can display consigner name in the confirm-toast).
- Wire in-app `createNotification` post-mutation (try/catch, non-blocking) targeting `Dress.Owner.id`.
- No schema migration. No file moves.

**Task count:** 4 tasks (myEarnings procedure, markConsignmentPaidOut procedure, listRentals input/where extension, listRentals include + Owner extension). Could reasonably be 1 task if planner prefers atomic ship. **Recommendation: 1 task** ("Extend wardrobe.consigner + admin.wardrobeRentals TRPC routers for payout tracking") — all changes are interconnected and a single PR keeps types and call sites consistent.

**Depends on:** none (only on shipped Phase 17 + Phase 18 routers).

### Plan 19-02: Consigner earnings UI (Earnings tab + ConsignerEarningsTable)

**Scope:**
- Create new component `src/features/wardrobe/components/consigner/ConsignerEarningsTable.tsx` (table + totals summary cards).
- Modify `MyConsignedDressesList.tsx` to add 5th tab "Earnings" wired to the new component. Extend `TAB_KEYS` array and `parseTab` function.
- Use `formatCurrencyFromCents` for all dollar displays.
- Brand: emerald (paid) / amber (pending). Cards: `bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px...]` matching Phase 17 + Phase 18 surfaces.
- Empty state ("No rentals yet").
- URL state via `?tab=earnings`.

**Task count:** 2 tasks (new ConsignerEarningsTable component; MyConsignedDressesList 5-tab extension). **Recommendation: 1 task** — both files change together.

**Depends on:** 19-01 (needs `api.wardrobe.consigner.myEarnings` shape locked).

### Plan 19-03: Admin payout UI (Mark Payout Sent button + Outstanding Payouts tab)

**Scope:**
- Modify `src/features/wardrobe/components/admin/RentalsTable.tsx`:
  - Add `consignmentPayoutAmount`, `consignmentPaidOut`, `Dress.Owner.name` to local `RentalRow` interface.
  - Add per-row "Mark Payout Sent" button (cyan-600, hidden when not eligible).
  - Add 3rd top-level tab "Outstanding Payouts" calling `listRentals` with `outstandingPayoutsOnly: true`.
  - Add `handleMarkPayoutSent` using `showConfirmationToast` (existing helper).
  - Wire `useMutation` with `utils.admin.wardrobeRentals.listRentals.invalidate()` in `onSuccess` (mirror existing pattern).
- No new files. No new pages. No sidebar changes.

**Task count:** 1 task ("Extend RentalsTable with Outstanding Payouts tab + Mark Payout Sent action").

**Depends on:** 19-01 (needs `api.admin.wardrobeRentals.markConsignmentPaidOut` mutation + extended `listRentals` shape).

### Dependency graph

```
19-01 (backend)
  ├── 19-02 (consigner UI)
  └── 19-03 (admin UI)
```

**Wave assignment:** All 3 plans in a single wave is fine because 19-02 and 19-03 don't depend on each other — both depend on 19-01. Two viable execution patterns:
- **Serial:** 19-01 → 19-02 → 19-03 (safest, single-agent).
- **Wave 1 = 19-01; Wave 2 = 19-02 || 19-03 in parallel** (faster, if multiple agents).

**Recommendation:** Wave 1 = 19-01 alone; Wave 2 = 19-02 + 19-03 in parallel. This phase is small enough that a third "verification" wave is not needed — a single `pnpm type-check && pnpm build` at the end of Wave 2 is the gate.

---

## Risks + Mitigations

### Risk 1: Schema columns silently missing (LOW probability, HIGH impact)

**Risk:** A migration was reverted or hand-edited and `consignmentPaidOut` / `consignmentPaidOutAt` columns aren't actually in production DB.
**Mitigation:** Plan 19-01 task 1 step: run `pnpm prisma:migrate` (= `prisma migrate deploy`) at the top to apply any pending migrations. Optionally `psql` query `SELECT column_name FROM information_schema.columns WHERE table_name='Rental' AND column_name LIKE 'consignmentPaid%';` in a verify step. Verification is **NOT** "is the migration file present" (already confirmed) — it's "is the column actually live in the Neon production DB."
**Cost:** 30 seconds of verification, no risk of data loss (migrate deploy is on the safe list per CLAUDE.md).

### Risk 2: `Dress.Owner` include adds query weight (LOW)

**Risk:** Extending `listRentals` include with `Dress.Owner.name` adds a 4th JOIN. Active rentals list might already be doing 3 JOINs (Dress + Dress.Images + Student.User). On Neon scale-to-zero, the cold start matters.
**Mitigation:** This is one additional `User` lookup per rental (small table). Postgres handles it fine. If profiling shows a regression, the alternative is to fetch via composite query in `wardrobe.consigner.myEarnings` separately and let admin RentalsTable use the consigner name from the confirmation step only.
**Likely real impact:** none.

### Risk 3: `MyConsignedDressesList` getting bloated (MEDIUM)

**Risk:** The component is already 275 lines with 4 tabs. Adding a 5th tab with table rendering inline pushes past readability cliff.
**Mitigation:** **Extract `ConsignerEarningsTable` as a separate file.** Plan 19-02 task explicitly creates a new component file. `MyConsignedDressesList` only gains ~10 lines (5th `TabsTrigger` + `TabsContent` wrapping the new component). Keeps file manageable.

### Risk 4: Idempotency edge — admin double-clicks "Mark Payout Sent"

**Risk:** Network lag + impatient admin = mutation fired twice. First succeeds, second hits `BAD_REQUEST: Payout already marked as sent`. Toast shows "Failed" — confusing UX.
**Mitigation:** Set `respond.isPending` on the button (Radix `disabled` prop), matching the Phase 17 `respond.isPending` pattern in dialog buttons. UI prevents the double-click; backend rejects defensively if it ever slips through. Toast message on the BAD_REQUEST should be relatively friendly: "Payout already marked sent" (not a stack trace).

### Risk 5: Consigner can see their own past rental even if dress is archived

This is intended behavior per Q10, not a risk — but plan should explicitly document so a future reviewer doesn't "fix" it by adding a `Dress.status !== ARCHIVED` filter.

### Risk 6: Notification firing for $0 payout (LOW)

**Risk:** If `consignmentCommissionPct === 100`, the payout is exactly `rentalFee - rentalFee = 0`. An admin can still "mark sent" (the column is non-null int 0, not null), and the consigner gets notified of a $0 payout. Mildly confusing but not wrong.
**Mitigation:** Out of scope. If business decides 100% commission rentals should auto-mark paid out at creation time, that's a Phase 21+ decision. For now, ignore — the math is correct.

### Risk 7: Phase 20 redundancy

**Risk:** Phase 20 will add `sendConsignmentPayoutSentEmail` (NOTIFY-09). If Phase 19 also adds an email, we double-fire.
**Mitigation:** Phase 19 ships ONLY the in-app `createNotification`, NOT email. Documented above and in the procedure JSDoc comment ("Phase 20 owns the email layer"). Phase 20 will add the email line beside the existing `createNotification` call, not replace it.

---

## File-by-File Change List

### NEW files (1)

| Path | Purpose |
|------|---------|
| `src/features/wardrobe/components/consigner/ConsignerEarningsTable.tsx` | New consigner-facing earnings table + 3-card totals summary. Consumes `api.wardrobe.consigner.myEarnings`. Self-contained component (own loading + empty states). |

### MODIFY files (5)

| Path | Change |
|------|--------|
| `src/features/wardrobe/api/queries/consignerQueries.ts` | Add `myEarnings` protectedProcedure to `consignerRouter`. Composite-by-dress return shape with server-computed totals. No other changes to existing procedures. |
| `src/features/admin/api/queries/wardrobeRequestQueries.ts` | Add `markConsignmentPaidOut` adminProcedure to `wardrobeRentalRouter`. Add `outstandingPayoutsOnly: z.boolean().optional()` to `listRentalsInputSchema`. Extend `listRentals` `where` clause to honor the new flag. Extend `listRentals` `include` shape to add `Dress.Owner: { select: { name: true } }`. |
| `src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx` | Add 5th tab "Earnings" to `TAB_KEYS` array, `parseTab` function, `TabsList`, and `TabsContent`. Import and render `<ConsignerEarningsTable />` inside the new tab. No changes to bucketize() or existing tabs. |
| `src/features/wardrobe/components/admin/RentalsTable.tsx` | Add `consignmentPayoutAmount`, `consignmentPaidOut` to local `RentalRow` interface. Add `Dress.Owner: { name: string \| null }` to interface. Add 3rd top-level tab "Outstanding Payouts" calling `listRentals` with `outstandingPayoutsOnly: true`. Add `handleMarkPayoutSent` using `showConfirmationToast`. Add `markPayoutSent` `useMutation` with `invalidate()` in onSuccess. Add per-row "Mark Payout Sent" button (cyan-600, hidden when not eligible). |
| `prisma/schema.prisma` | **NO CHANGES.** Listed here only to explicitly confirm. Columns already exist. |

### UNCHANGED but verified

| Path | Why listed |
|------|-----------|
| `src/lib/utils.ts` | `formatCurrencyFromCents` helper used as-is. No changes. |
| `src/lib/toast-confirmations.ts` | `showConfirmationToast` used as-is. No changes. |
| `src/features/notifications/utils/notificationHelpers.ts` | `createNotification` used as-is. No changes. |
| `src/lib/navigation-config.ts` | No sidebar changes. "Consigned" entry already exists per role from Phase 18-07. |
| `src/app/(protected)/wardrobe/consigned/page.tsx` | No changes — mounts `MyConsignedDressesList`, which gains the 5th tab transparently. |
| `src/app/(protected)/admin/wardrobe/rentals/page.tsx` | No changes — mounts `RentalsTable`, which gains the 3rd tab + new button transparently. |
| `src/features/admin/api/queries/index.ts` | No changes — `wardrobeRentals` mount point already exists. |
| `src/features/wardrobe/api/queries/index.ts` | No changes — `consigner` mount point already exists. |
| `prisma/migrations/*` | No new migration. Columns from `20260529042222_add_wardrobe` are sufficient. |

---

## Sources

### Primary (HIGH confidence — verified in-codebase reads)

- `prisma/schema.prisma:598-629` — Rental model confirmed includes `consignmentPaidOut` + `consignmentPaidOutAt`
- `prisma/migrations/20260529042222_add_wardrobe/migration.sql:123-124` — payout columns shipped in initial wardrobe migration
- `src/features/admin/api/queries/wardrobeRequestQueries.ts` — Phase 17 `wardrobeRentalRouter` patterns (adminProcedure, $transaction, post-commit notification, state-machine asserts)
- `src/features/wardrobe/api/queries/consignerQueries.ts` — Phase 18 `consignerRouter` patterns (protectedProcedure, ownerId scoping, explicit select lists for PII hiding)
- `src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx` — 4-tab URL-synced surface to extend
- `src/features/wardrobe/components/admin/RentalsTable.tsx` — Phase 17 admin table with per-row conditional actions, sub-tab pattern, showConfirmationToast usage
- `src/lib/utils.ts:24-26` — `formatCurrencyFromCents(cents)` helper
- `src/lib/toast-confirmations.ts:19-27` — `showConfirmationToast` API shape
- `src/lib/navigation-config.ts` — confirmed all 3 role nav arrays already include "Consigned" entry pointing to `/wardrobe/consigned`
- `src/features/admin/api/queries/index.ts` — confirmed `wardrobeRentals` already mounted
- `src/features/wardrobe/api/queries/index.ts` — confirmed `consigner` already mounted
- `.planning/phases/17-admin-rental-lifecycle/17-RESEARCH.md` — locks RENTAL-03 rule, $transaction pattern, post-commit notification pattern
- `.planning/REQUIREMENTS.md:81,92,104` — CONSIGN-10 + RENTAL-08 + NOTIFY-09 (Phase 20) scope boundary
- `.planning/ROADMAP.md:161-168` — Phase 19 success criteria

### Secondary (MEDIUM confidence)

- None required — entire phase is in-codebase extension.

### Tertiary (LOW confidence)

- None. No external library research applied.

---

## Metadata

**Confidence breakdown:**
- Schema audit: HIGH — direct read of schema.prisma + migration SQL grep confirms columns present
- TRPC procedure shapes: HIGH — patterns lifted from Phase 17 + Phase 18 working routers
- UI surfaces: HIGH — extensions to two existing components, both Phase 17/18 patterns lockstep
- Open Questions: HIGH — every Q resolved by direct inspection of the referenced file
- Plan breakdown: HIGH — phase is small enough to fit comfortably in 3 plans / 1-2 waves
- Risks: HIGH — every risk has a known mitigation grounded in CLAUDE.md or prior-phase practice

**Research date:** 2026-05-29
**Valid until:** 30 days (2026-06-28) — stable in-codebase patterns; re-research only if Rental schema changes, RentalsTable is materially refactored, or notification infrastructure shifts before Phase 20 ships.
