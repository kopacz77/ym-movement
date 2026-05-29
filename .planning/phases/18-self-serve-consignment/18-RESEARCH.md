# Phase 18: Self-Serve Consignment for YM Wardrobe — Research

**Researched:** 2026-05-29
**Domain:** Consigner self-serve listing + admin approval queue, TRPC namespace extension, single Prisma migration (rejectionReason), reuse of Phase 13–17 image pipeline / DressForm / approval-flow patterns
**Confidence:** HIGH on every pattern (every required shape has a direct precedent in the repo); MEDIUM only on the UX choice of "two-form-fields hidden vs. tab-hidden" for ConsignerDressForm (recommendation below).

---

## Summary

Phase 18 ships a parallel consignment surface on top of the Phase 13–17 wardrobe machinery: a new TRPC namespace `wardrobe.consigner.*` (5 procedures), three extensions to `admin.wardrobe.*` (listPendingApproval, approveDress, rejectDress), four new routes under `/wardrobe/consigned/*` and `/admin/wardrobe/pending-approval`, three new client components (ConsignerDressForm, MyConsignedDressesList, PendingApprovalQueue + two dialogs), and a single Prisma migration that adds `Dress.rejectionReason String?`. The sidebar gets one new entry per role, shown unconditionally (rationale in Critical Findings §6).

**The single load-bearing decision** is whether ConsignerDressForm should be a stripped fork of the admin DressForm or a thin wrapper that hides forbidden tabs/fields. **Recommendation: extract a shared `DressFormCore` component, then have `DressForm` (admin) and `ConsignerDressForm` (consigner) be two thin wrappers** that pass `mode="admin" | "consigner"` + `lockPricing: boolean` props. This avoids duplicating 600 lines of measurement+pricing field plumbing and centralizes the dollar↔cents conversion. Concrete code shape below in Architecture Patterns §3.

**The create flow MUST mirror Phase 14-06's create-then-redirect pattern** (`/admin/wardrobe/new` → `createDress` → `router.push('/admin/wardrobe/[id]/edit')`). The image pipeline requires a real `dressId` at token-mint time (route handler at `src/app/api/wardrobe/upload/route.ts:39-58` calls `prisma.dress.findUnique` before authorizing the blob upload), so a single "fill form + upload images + click submit" page is structurally impossible without inventing a DRAFT status. The consigner version is the same: `/wardrobe/consigned/new` saves metadata → server creates row with `status: PENDING_APPROVAL` → redirect to `/wardrobe/consigned/[id]/edit` where DressImageGallery is live. CONSIGN-03's "≥1 image required" is enforced server-side on a `submitForApproval` step OR by simply blocking the submit until a primary image exists — see Critical Findings §3.

**Primary recommendation:** Mirror three existing artifacts exactly — (1) `src/features/wardrobe/api/queries/requestQueries.ts` cancel mutation (lines 258-302) for the PERM-01 caller-owns-dress inline guard pattern, (2) `src/features/admin/api/queries/wardrobeRequestQueries.ts` respondToRequest (lines 177-264) for the approve/reject dialog mutation + $transaction + post-commit notification placeholder, and (3) `src/features/wardrobe/components/admin/DressImageGallery.tsx` unchanged — it already authorizes both admin AND owner via `assertCanModifyDress` in `imageQueries.ts:26-42`. **No middleware extension needed for PERM-01: use the inline-guard pattern from Phase 16 cancel + Phase 13 assertCanModifyDress.**

---

## Critical Findings (read first)

### 1. `Dress.rejectionReason` does NOT exist — migration required

Verified via `grep -rn "rejectionReason" /home/kopacz/projects/ym-movement/prisma /home/kopacz/projects/ym-movement/src` (zero hits) and direct read of `prisma/schema.prisma:514-559`. The Dress model has `internalNotes String?` but no `rejectionReason`. CONSIGN-08 requires a "rejection reason" surfaced back to the consigner (Phase 20 email + the resubmit flow), so we **cannot** reuse `internalNotes` — it's admin-only and explicitly hidden from consigners (CONSIGN-02 hides it on the form, and the consigner-side TRPC procedures must not return it on `mine()` either).

**Migration required** (`prisma/migrations/2026MMDDHHMMSS_add_dress_rejection_reason/migration.sql`):
```sql
ALTER TABLE "Dress" ADD COLUMN "rejectionReason" TEXT;
```

Schema change:
```prisma
model Dress {
  // ... existing fields ...
  internalNotes    String?
  rejectionReason  String?  // ← NEW. Set by admin.wardrobe.rejectDress; cleared by wardrobe.consigner.resubmit
  // ... rest ...
}
```

Migration is additive + nullable → zero data risk. Run via `pnpm prisma:migrate` (which maps to `prisma migrate deploy` per CLAUDE.md — NEVER `migrate dev`).

### 2. PERM-01 should use the inline-guard pattern, NOT a new TRPC middleware

The phase brief mentions a `consignerProcedure` extension as one option. The repo has a strong precedent for the alternative: **inline caller-owns guards inside the procedure body**. Two examples:

- `src/features/wardrobe/api/queries/requestQueries.ts:258-302` — `cancel` uses `protectedProcedure` + inline `request.studentId !== student.id` check, throws `FORBIDDEN`. Documented in the file header: "PERM-03 enforced via inline check (research Pattern 3 — no new middleware)."
- `src/features/wardrobe/api/queries/imageQueries.ts:26-42` — `assertCanModifyDress` is a standalone async function that throws `UNAUTHORIZED` / `NOT_FOUND` / `FORBIDDEN`. Called at the top of each mutation. Allows admin OR owner.

**Recommendation: extract a shared helper `assertCanModifyOwnDress(ctx, dressId)` in `consignerQueries.ts`** that mirrors `assertCanModifyDress` BUT does NOT bypass for admins (the admin namespace has its own admin.wardrobe.* procedures for admin-side edits). Call at the top of `update`, `archive`, `resubmit`. The shape:

```ts
async function assertOwnsDress(
  ctx: { prisma: PrismaClient; session: { user: { id: string } } },
  dressId: string,
): Promise<{ ownerId: string; status: DressStatus }> {
  const dress = await ctx.prisma.dress.findUnique({
    where: { id: dressId },
    select: { ownerId: true, status: true },
  });
  if (!dress) throw new TRPCError({ code: "NOT_FOUND", message: "Dress not found" });
  if (dress.ownerId !== ctx.session.user.id) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return dress; // status returned so caller can do additional gates without a re-query
}
```

This is **simpler** than a new middleware (middlewares can't easily pass per-procedure data into the procedure body) and matches the existing repo idiom.

### 3. CONSIGN-03 "at least 1 image required" — TWO viable enforcement points, pick BOTH

The create flow puts the consigner in this sequence:
1. Fill metadata, click "Save & continue" → `wardrobe.consigner.create` returns `{ id }`
2. Redirect to `/wardrobe/consigned/[id]/edit` — dress exists with status PENDING_APPROVAL, zero images
3. Consigner uploads images via DressImageGallery (already works — see Critical Findings §4)
4. Consigner clicks "Submit for approval" — **OR** the dress is already in PENDING_APPROVAL and admin can see it in the queue, but the queue should hide image-less dresses

There are two enforcement choices for CONSIGN-03:

| Option | Mechanic | Verdict |
|---|---|---|
| **A. Block the queue (recommended)** | `admin.wardrobe.listPendingApproval` filters out dresses with zero images. The consigner sees their dress as "Pending — add at least one image to be reviewed" until they upload. | Lowest-friction. No new status. No new mutation. The admin's queue is always actionable. |
| B. Add a `submitForApproval` mutation | Dress.status defaults to a hypothetical DRAFT until consigner clicks submit. | Requires another DressStatus enum value + a status transition. Adds review surface. **Reject — out of scope; phase brief explicitly avoids new enum values.** |
| C. Server-validate on create | Refuse to create until images attached. | Impossible — images can't be attached before the dress row exists. Chicken-and-egg. |

**Recommendation: Option A.** Implementation:
- `wardrobe.consigner.create` always sets `status: PENDING_APPROVAL`.
- `admin.wardrobe.listPendingApproval` filters `WHERE status = 'PENDING_APPROVAL' AND Images.some()` (Prisma relational filter — see Phase 17 patterns).
- Consigner edit page surfaces a yellow banner: "Add at least one image — your dress will appear in the approval queue once it has a primary image."
- On the consigner-side `MyConsignedDressesList`, show a separate "Not yet submitted" sub-state for image-less PENDING_APPROVAL dresses with a single CTA "Add image to submit for review."

This keeps the state machine simple and matches CONSIGN-03 behaviorally (admins never see image-less dresses; consigners always know what to do).

### 4. The image pipeline ALREADY supports consigners — no changes needed

Verified in `src/features/wardrobe/api/queries/imageQueries.ts:26-42` (`assertCanModifyDress`) and `src/app/api/wardrobe/upload/route.ts:45-58` (route handler `onBeforeGenerateToken`). Both check `isOwner = dress.ownerId === session.user.id` OR `isAdmin = isAdminRole(session.user.role)`. Phase 13's research locked this as a "ADR" (research line 309): "Don't put image upload behind adminProcedure only. Consigners must also upload — gate via the runtime ownerId-or-admin check."

**Action required: ZERO changes to imageQueries.ts, upload/route.ts, or DressImageGallery.tsx.** The consigner edit page just embeds `<DressImageGallery dressId={dress.id} images={dress.Images} onMutated={...} />` and it works. **Verify in the verification step** that a STUDENT-role user can attach an image to their own PENDING_APPROVAL dress.

### 5. The admin DressForm is NOT directly reusable — extract DressFormCore

`src/features/wardrobe/components/admin/DressForm.tsx` (lines 246-624) renders a 4-tab form (General / Measurements / Pricing / Status & Internal) that includes:
- `consignmentCommissionPct` input (CONSIGN-02 says HIDE for consigners)
- `securityDepositUsd` + `cleaningFeeUsd` inputs (CONSIGN-02 says HIDE)
- `internalNotes` textarea (CONSIGN-02 says HIDE)
- `status` select (CONSIGN-02 implies hide — consigner has no business setting status)

Three options for ConsignerDressForm:

| Option | Mechanic | Verdict |
|---|---|---|
| A. Fork the file | Copy DressForm.tsx → ConsignerDressForm.tsx, delete forbidden fields | 600 lines duplicated. Bug fixes diverge. Reject. |
| **B. Extract DressFormCore (recommended)** | Pull the field rendering into a `DressFormCore` component with a `visibleFields` or `mode` prop. `DressForm` and `ConsignerDressForm` become thin 30-line wrappers. | Single source of truth. Both forms get future fixes (e.g. dollar→cents preprocessor changes). |
| C. Add conditional props to DressForm | Add `hideForbiddenFields?: boolean` + `lockPricingFields?: boolean` to DressForm | Couples admin form to consigner concerns. Form file already 626 lines. Reject. |

**Recommendation: Option B.** Concrete shape:

```ts
// src/features/wardrobe/components/DressFormCore.tsx (NEW)
type FieldVisibility = {
  showInternalNotes: boolean;          // false for consigner
  showCommissionPct: boolean;          // false for consigner
  showSecurityDepositAndCleaning: boolean; // false for consigner
  showStatusSelect: boolean;           // false for consigner; admin edit mode true
};
type FieldLocking = {
  lockPricingAndSize: boolean;         // CONSIGN-04: true when consigner is editing a post-approval dress
};
interface DressFormCoreProps {
  mode: "create" | "edit";
  fieldVisibility: FieldVisibility;
  fieldLocking: FieldLocking;
  defaultValues?: Partial<DressFormValues>;
  onSubmit: (input: DressInput & { status?: DressStatus }) => void;
  isSubmitting: boolean;
  submitLabel?: string;
}
```

`DressForm.tsx` becomes a 30-line wrapper that passes all-true visibility + all-false locking. `ConsignerDressForm.tsx` is a 30-line wrapper that passes all-false visibility + dynamic locking based on `dress.status`. **Estimated effort: 1 task for the extraction, 1 task for ConsignerDressForm wrapper.**

If the planner pushes back on this refactor (scope creep concerns), the fallback is **Option C** with a tightly-scoped PR — but Option B pays dividends in Phase 21 (testing) because the consigner test surface becomes covered by the admin test surface.

### 6. NAV-02 — show "Consigned" sub-link unconditionally; gate at the page

The brief floats two options for "Consigned" sidebar visibility:
- (a) Show unconditionally to all users; the route is its own empty-state gate
- (b) Server-side check in the sidebar that hides when user has zero owned dresses

The existing sidebar at `src/components/layout/AppSidebar.tsx` and config at `src/lib/navigation-config.ts` are **purely role-driven**, **statically defined**, and **rendered client-side**. Adding a data-conditional hide would require:
- Server component refactor of AppSidebar (currently `"use client"`)
- OR a session-time TRPC query at every page load (`api.wardrobe.consigner.hasAnyDresses.useQuery()`) flickering the sidebar on mount
- OR a server-side prefetch hydrated into the sidebar (large architectural touch)

**None of these is worth the gain.** The "show only if has dresses" rule is a polish concern that adds significant architectural complexity. The empty-state at `/wardrobe/consigned` does the same job at zero cost: users who've never consigned see a clean "Consign your first dress" CTA.

**Recommendation: Option A (show unconditionally).** Implementation:
- Add `{ name: "Consigned", href: "/wardrobe/consigned", icon: Shirt }` to all three nav arrays in `src/lib/navigation-config.ts` (`adminNavigation`, `studentNavigation`, `coachNavigation`). Use a different icon if possible (e.g. `Hanger` or `Tag` from lucide-react) to disambiguate from the existing "Wardrobe" entry.
- `/wardrobe/consigned/page.tsx` renders `MyConsignedDressesList` which queries `wardrobe.consigner.mine`. Empty state: a hero with "Consign your first dress" → `/wardrobe/consigned/new` button.

This matches CLAUDE.md's "sidebar architecture is LOCKED — only mutate the config data, not the rendering primitive" rule.

### 7. The admin namespace structure — extend `admin.wardrobe` (the existing dress router)

Verified via `src/features/admin/api/queries/index.ts:23` — `admin.wardrobe` IS `wardrobeDressRouter` (mounted flat, not nested). So:

```ts
api.admin.wardrobe.list           // existing
api.admin.wardrobe.byId           // existing
api.admin.wardrobe.create         // existing
api.admin.wardrobe.update         // existing
api.admin.wardrobe.archive        // existing
api.admin.wardrobe.listPendingApproval  // NEW Phase 18
api.admin.wardrobe.approveDress          // NEW Phase 18
api.admin.wardrobe.rejectDress           // NEW Phase 18
```

These three new procedures should be added to `wardrobeDressRouter` in `src/features/admin/api/queries/wardrobeDressQueries.ts` (same file as `list`/`byId`/`create`/`update`/`archive`). No new sub-router needed. **Do NOT create a separate `wardrobeApprovalRouter`** — that adds a namespace boundary that doesn't pay rent.

### 8. The wardrobe consigner namespace — new file, mounted into existing wardrobeRouter

Mirror the Phase 16 pattern (`requestQueries.ts` → mounted at `wardrobeRouter.requests`):

```ts
// src/features/wardrobe/api/queries/consignerQueries.ts (NEW)
export const consignerRouter = createTRPCRouter({
  create: protectedProcedure.input(...).mutation(...),    // CONSIGN-01
  update: protectedProcedure.input(...).mutation(...),    // CONSIGN-04 + PERM-01
  archive: protectedProcedure.input(...).mutation(...),   // CONSIGN-05
  mine: protectedProcedure.query(...),                    // for /wardrobe/consigned list
  resubmit: protectedProcedure.input(...).mutation(...),  // CONSIGN-09
});
```

```ts
// src/features/wardrobe/api/queries/index.ts (MODIFY)
import { consignerRouter } from "./consignerQueries";

export const wardrobeRouter = createTRPCRouter({
  list: catalogRouter.list,
  byId: catalogRouter.byId,
  facets: catalogRouter.facets,
  images: imageRouter,
  measurements: measurementRouter,
  requests: requestsRouter,
  consigner: consignerRouter,  // NEW
});
```

Client usage: `api.wardrobe.consigner.create.useMutation(...)`, `api.wardrobe.consigner.mine.useQuery(...)`, etc.

---

## Standard Stack

All packages already installed via Phases 13–17. Phase 18 adds **no new runtime dependencies**.

| Package | Version | Use in this phase |
|---|---|---|
| `react-hook-form` + `@hookform/resolvers` | already installed | ConsignerDressForm (or wrapper around DressFormCore) |
| `zod` | 3.25.76 | All new TRPC input schemas — reuse `dressInputSchema` from `wardrobeDressQueries.ts` as the base, pick only the fields the consigner is allowed to set |
| `sonner` | already installed | Toast on create/approve/reject (mirror Phase 17 `RequestResponseDialog.tsx`) |
| `lucide-react` | already installed | New sidebar icon for "Consigned" — recommend `Tag` or `Hanger`; both are present in the lucide library |
| `@vercel/blob` | 2.4.0 | Unchanged — DressImageGallery already works for consigners |
| `date-fns` | already installed | Format `createdAt` on the queue and on MyConsignedDressesList |
| `@radix-ui/react-dialog` (via `Dialog`) | already installed | ApproveDressDialog + RejectDressDialog — mirror `RequestResponseDialog.tsx` shape |

**No alternatives considered** — every choice has direct repo precedent.

---

## Architecture Patterns

### Recommended file layout

```
src/
├── features/
│   └── wardrobe/
│       ├── api/queries/
│       │   ├── consignerQueries.ts        # NEW — 5 procedures + assertOwnsDress helper
│       │   ├── index.ts                   # MODIFY — mount consignerRouter
│       │   └── (... existing files unchanged)
│       └── components/
│           ├── DressFormCore.tsx          # NEW — shared field rendering
│           ├── admin/
│           │   ├── DressForm.tsx          # MODIFY — becomes thin wrapper around DressFormCore
│           │   ├── PendingApprovalQueue.tsx     # NEW — admin queue
│           │   ├── ApproveDressDialog.tsx       # NEW — commission % override
│           │   └── RejectDressDialog.tsx        # NEW — required reason
│           └── consigner/
│               ├── ConsignerDressForm.tsx       # NEW — thin wrapper around DressFormCore
│               └── MyConsignedDressesList.tsx   # NEW — caller's owned dresses
├── features/admin/api/queries/
│   └── wardrobeDressQueries.ts            # MODIFY — add 3 procedures (listPendingApproval, approveDress, rejectDress)
├── lib/
│   └── navigation-config.ts               # MODIFY — add "Consigned" to all 3 role arrays
├── app/(protected)/
│   ├── wardrobe/
│   │   ├── consigned/
│   │   │   ├── page.tsx                   # NEW — /wardrobe/consigned (MyConsignedDressesList)
│   │   │   ├── new/page.tsx               # NEW — /wardrobe/consigned/new (ConsignerDressForm create)
│   │   │   └── [id]/edit/page.tsx         # NEW — /wardrobe/consigned/[id]/edit (gallery + ConsignerDressForm)
│   │   └── (... existing routes unchanged)
│   └── admin/wardrobe/
│       ├── pending-approval/page.tsx      # NEW — /admin/wardrobe/pending-approval (PendingApprovalQueue)
│       └── (... existing routes unchanged)
└── prisma/
    ├── schema.prisma                      # MODIFY — add Dress.rejectionReason
    └── migrations/
        └── 2026MMDDHHMMSS_add_dress_rejection_reason/
            └── migration.sql              # NEW
```

### Pattern 1: TRPC namespace structure

**Mirror Phase 16-04 (`requestQueries.ts`).** All consigner procedures use `protectedProcedure`. PERM-01 enforced by the inline `assertOwnsDress` helper — NOT by a new middleware. Source: `src/features/wardrobe/api/queries/requestQueries.ts:258-302` (cancel) and `src/features/wardrobe/api/queries/imageQueries.ts:26-42` (assertCanModifyDress).

### Pattern 2: Admin queue procedure

**Mirror Phase 17 `listRequests` (`wardrobeRequestQueries.ts:103-162`).** Adminprocedure + page/limit input + Prisma include of `Owner.User.name` + Owner + primary image. Order by `createdAt asc` (oldest pending first → fair queue). Filter `WHERE status = 'PENDING_APPROVAL' AND Images: { some: {} }` per Critical Findings §3.

### Pattern 3: Approve/reject mutations

**Mirror Phase 17 `respondToRequest` (`wardrobeRequestQueries.ts:177-264`).** Atomic flip + post-commit notification (the notification call is a try/catch wrapped stub for Phase 18 — Phase 20 owns the actual email). On approve: `status: 'AVAILABLE'` + optional `consignmentCommissionPct` override. On reject: `status: 'REJECTED'` + `rejectionReason: input.reason`.

```ts
approveDress: adminProcedure
  .input(z.object({
    id: z.string().cuid(),
    consignmentCommissionPctOverride: z.number().int().min(0).max(100).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const dress = await ctx.prisma.dress.findUnique({
      where: { id: input.id },
      select: { id: true, status: true, ownerId: true, title: true },
    });
    if (!dress) throw new TRPCError({ code: "NOT_FOUND" });
    if (dress.status !== "PENDING_APPROVAL") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Only PENDING_APPROVAL dresses can be approved" });
    }

    const updated = await ctx.prisma.dress.update({
      where: { id: dress.id },
      data: {
        status: "AVAILABLE",
        rejectionReason: null, // clear any leftover from a previous rejection cycle
        ...(input.consignmentCommissionPctOverride !== undefined
          ? { consignmentCommissionPct: input.consignmentCommissionPctOverride }
          : {}),
      },
    });

    // Post-commit notification stub — Phase 20 wires the actual email
    try {
      await createNotification({
        userId: dress.ownerId,
        title: "Your dress was approved",
        message: `${dress.title} is now live on the YM Wardrobe catalog.`,
        type: "SUCCESS",
        link: `/wardrobe/consigned/${dress.id}/edit`,
      });
    } catch (err) {
      console.error("[WARDROBE] Failed to notify consigner of approval:", err);
    }

    return updated;
  }),
```

### Pattern 4: Consigner create mutation

**Source pricing/deposit defaults from Settings.** Use `getWardrobeSettings(ctx.prisma)` (already exported from `src/features/admin/api/queries/wardrobeSettingsQueries.ts:36-47`) to read `defaultConsignmentCommissionPct`. The function is callable from any procedure (it's a plain async function over prisma, not a TRPC procedure). `securityDeposit` and `cleaningFee` default to the schema defaults (20000c / 3000c) — these are NOT in Settings yet, so the create mutation should just `prisma.dress.create(...)` and rely on the schema defaults (Phase 13 set `Int @default(20000)` and `Int @default(3000)`).

```ts
create: protectedProcedure
  .input(consignerCreateInputSchema)  // subset of dressInputSchema — see Pattern 5
  .mutation(async ({ ctx, input }) => {
    const settings = await getWardrobeSettings(ctx.prisma);
    return ctx.prisma.dress.create({
      data: {
        ...input,
        ownerId: ctx.session.user.id,                          // consigner owns it
        status: "PENDING_APPROVAL",                            // forced — never trust client
        consignmentCommissionPct: settings.defaultConsignmentCommissionPct, // from Settings
        // securityDeposit + cleaningFee fall back to schema defaults
      },
    });
  }),
```

### Pattern 5: Consigner input schema — subset of `dressInputSchema`

The phase brief lists the fields consigners can set on create: `title, description, category, themeTags, color, secondaryColors, condition, yearMade, sizeLabel, [structured size fields], lengthCm, alterableSmaller, alterableLarger, competitionPrice, seasonalPrice, purchasePrice?`.

Use Zod's `.pick()` on the existing exported `dressInputSchema`:

```ts
import { dressInputSchema } from "@/features/admin/api/queries/wardrobeDressQueries";

export const consignerCreateInputSchema = dressInputSchema.pick({
  title: true,
  description: true,
  category: true,
  themeTags: true,
  color: true,
  secondaryColors: true,
  condition: true,
  yearMade: true,
  sizeLabel: true,
  chestMinCm: true,
  chestMaxCm: true,
  waistMinCm: true,
  waistMaxCm: true,
  hipsMinCm: true,
  hipsMaxCm: true,
  torsoMinCm: true,
  torsoMaxCm: true,
  lengthCm: true,
  alterableSmaller: true,
  alterableLarger: true,
  competitionPrice: true,
  seasonalPrice: true,
  purchasePrice: true,
});
// note: consignmentCommissionPct, securityDeposit, cleaningFee, internalNotes deliberately excluded.
```

The update input is similar but `.pick()` only the consigner-editable fields per CONSIGN-04: `title`, `description`, `themeTags`, `color`, `secondaryColors`. Pricing/size locked after first approval — the inline guard in `update` checks `dress.status NOT IN (PENDING_APPROVAL, REJECTED)` and rejects pricing/size keys:

```ts
update: protectedProcedure
  .input(consignerUpdateInputSchema)  // .pick(title, description, themeTags, color, secondaryColors)
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const dress = await assertOwnsDress(ctx, id);

    // The input schema already excludes pricing/size, so this guard is defense-in-depth
    // for any future schema-extension that adds them back conditionally:
    if (dress.status !== "PENDING_APPROVAL" && dress.status !== "REJECTED") {
      // Caller is editing a post-approval dress — only the allow-listed fields can change
      // (already enforced by schema, but log for diagnostics)
    }

    return ctx.prisma.dress.update({ where: { id }, data });
  }),
```

### Pattern 6: Pre-approval pricing/size edits (PENDING_APPROVAL + REJECTED states)

Re-read CONSIGN-04 carefully: "Consigner edits only title/description/themeTags/color/images; pricing+size locked **after first approval**." This means: **before** first approval (status ∈ {PENDING_APPROVAL, REJECTED}), the consigner CAN edit pricing+size. **After** first approval (status ∈ {AVAILABLE, PENDING, RENTED, MAINTENANCE}), they CANNOT.

So the update mutation needs TWO schemas conditional on status:
- `consignerPreApprovalUpdateSchema` — all consigner-allowed fields including pricing+size (used when status ∈ {PENDING_APPROVAL, REJECTED})
- `consignerPostApprovalUpdateSchema` — only title/description/themeTags/color/secondaryColors

Implementation: ONE TRPC procedure that accepts the union, validates against the appropriate schema based on the fetched `dress.status`, throws BAD_REQUEST if the input contains locked fields. Or split into two procedures `updatePreApproval` + `updatePostApproval`. **Recommendation: one procedure with a single input schema that's the union of both, with a server-side gate.**

```ts
const consignerUpdateInputSchema = z.object({
  id: z.string().cuid(),
  // Always allowed
  title: z.string().min(1).max(120).optional(),
  description: z.string().min(1).optional(),
  themeTags: z.array(z.string()).optional(),
  color: z.string().min(1).optional(),
  secondaryColors: z.array(z.string()).optional(),
  // Locked after first approval
  sizeLabel: z.string().min(1).optional(),
  chestMinCm: z.number().int().nonnegative().optional(),
  // ... other size fields
  competitionPrice: z.number().int().nonnegative().optional(),
  seasonalPrice: z.number().int().nonnegative().optional(),
  purchasePrice: z.number().int().nonnegative().optional(),
});

update: protectedProcedure.input(consignerUpdateInputSchema).mutation(async ({ ctx, input }) => {
  const { id, ...data } = input;
  const dress = await assertOwnsDress(ctx, id);

  const isPreApproval = dress.status === "PENDING_APPROVAL" || dress.status === "REJECTED";
  if (!isPreApproval) {
    // Strip any locked fields from data BEFORE attempting update
    const lockedKeys = [
      "sizeLabel", "chestMinCm", "chestMaxCm", "waistMinCm", "waistMaxCm",
      "hipsMinCm", "hipsMaxCm", "torsoMinCm", "torsoMaxCm", "lengthCm",
      "competitionPrice", "seasonalPrice", "purchasePrice",
    ] as const;
    for (const key of lockedKeys) {
      if (data[key] !== undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${key} is locked after first approval`,
        });
      }
    }
  }

  return ctx.prisma.dress.update({ where: { id }, data });
}),
```

ConsignerDressForm should mirror this on the client by disabling the pricing/size inputs when `dress.status` is post-approval (visual cue + UX), but the server is the authority.

### Pattern 7: Resubmit (CONSIGN-09)

Simple status flip with reason-clearing:

```ts
resubmit: protectedProcedure
  .input(z.object({ id: z.string().cuid() }))
  .mutation(async ({ ctx, input }) => {
    const dress = await assertOwnsDress(ctx, input.id);

    if (dress.status !== "REJECTED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only rejected dresses can be resubmitted",
      });
    }

    return ctx.prisma.dress.update({
      where: { id: input.id },
      data: {
        status: "PENDING_APPROVAL",
        rejectionReason: null,
      },
    });
  }),
```

### Pattern 8: Archive (CONSIGN-05)

Mirrors the admin `archive` mutation but with the ownership guard + the AVAILABLE-status gate:

```ts
archive: protectedProcedure
  .input(z.object({ id: z.string().cuid() }))
  .mutation(async ({ ctx, input }) => {
    const dress = await assertOwnsDress(ctx, input.id);

    if (dress.status !== "AVAILABLE") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only available dresses can be archived",
      });
    }

    return ctx.prisma.dress.update({
      where: { id: input.id },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
  }),
```

### Anti-Patterns to Avoid

- **Don't add a `consignerProcedure` middleware** — adds a middleware tier with one consumer. Use inline guards (Pattern 1).
- **Don't reuse `internalNotes` for `rejectionReason`** — `internalNotes` is admin-only by CONSIGN-02. Add a new `rejectionReason` column.
- **Don't expose `internalNotes` on `wardrobe.consigner.mine()`** — explicitly `select` only consigner-safe fields.
- **Don't auto-flip status on update** — status transitions are admin/server-only. `wardrobe.consigner.update` MUST NOT change status (even if the consigner edits a REJECTED dress, status stays REJECTED until they call `resubmit` explicitly).
- **Don't put the approval logic in `wardrobe.consigner.*`** — admin gates publication. Approve/reject live in `admin.wardrobe.*`.
- **Don't filter the admin queue by ownerId** — the admin sees ALL pending dresses across all consigners.
- **Don't gate sidebar visibility by owned-dress count** — see Critical Findings §6.
- **Don't allow consigner to set commissionPct on create** — CONSIGN-02 explicitly hides it; server pulls from Settings.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Image upload + reorder + set-primary + delete | A new gallery component | `DressImageGallery` (`src/features/wardrobe/components/admin/DressImageGallery.tsx`) — already authorizes both admin AND owner | Already works for consigners (Critical Findings §4) |
| Per-procedure role check | New `consignerProcedure` middleware | Inline `assertOwnsDress` helper (Pattern 1) | Matches Phase 16 cancel + Phase 13 assertCanModifyDress idiom |
| Dress form field rendering | Fork of DressForm.tsx | Extract DressFormCore, write thin wrappers (Pattern 5, Critical Findings §5) | 600 lines of duplicated plumbing otherwise |
| Settings access | Direct prisma query for default commission % | `getWardrobeSettings(ctx.prisma)` from `src/features/admin/api/queries/wardrobeSettingsQueries.ts:36` | Already typed + memoized + parses settings JSON safely with fallback |
| Status badge | New component | `DressStatusBadge` (`src/features/wardrobe/components/DressStatusBadge.tsx`) — already styles PENDING_APPROVAL (amber + pulse) and REJECTED (rose) | Phase 13 deliverable, already used everywhere |
| Cents↔dollar conversion | Manual `* 100` / `/ 100` | DressForm already has the dollar↔cents conversion on submit (lines 226-235) — preserve in DressFormCore | Single source of truth for the conversion |
| Toast confirmations | New dialog | `showDeleteConfirmation` from `src/lib/toast-confirmations.ts` | Used by DressImageGallery and Phase 17 dialogs |
| Notification stubs | Email layer | `createNotification` from `src/features/notifications/utils/notificationHelpers.ts` — Phase 20 wires actual emails | Phase 18 brief explicitly defers email |

**Key insight:** Every consigner-side surface has a direct admin-side analog from Phases 14, 16, or 17. Don't reinvent.

---

## Common Pitfalls

### Pitfall 1: Forgetting to clear `rejectionReason` on approve and on resubmit

**What goes wrong:** Admin rejects → reason set. Consigner resubmits → admin approves → reason still stale. Future Phase 20 email rendering pulls stale reason. Or worse: consigner sees the old rejection reason on the edit page after their dress is live.

**Why it happens:** `prisma.dress.update({ data: { status: 'AVAILABLE' } })` only touches `status`. `rejectionReason` retained.

**How to avoid:** Both `wardrobe.consigner.resubmit` (Pattern 7) AND `admin.wardrobe.approveDress` (Pattern 3) MUST set `rejectionReason: null` in their update data.

**Verification:** After approving a previously-rejected dress, query the DB and confirm `rejectionReason IS NULL`.

### Pitfall 2: `MyConsignedDressesList` returning `internalNotes` accidentally

**What goes wrong:** Consigner's "My consigned dresses" page leaks admin notes via the wire protocol (TRPC returns full object by default).

**Why it happens:** `prisma.dress.findMany({ where: { ownerId: ctx.session.user.id } })` with no `select` returns every column including `internalNotes`.

**How to avoid:** `wardrobe.consigner.mine` MUST use an explicit `select` that omits `internalNotes`:
```ts
mine: protectedProcedure.query(({ ctx }) =>
  ctx.prisma.dress.findMany({
    where: { ownerId: ctx.session.user.id },
    select: {
      id: true, title: true, description: true, category: true, status: true,
      color: true, sizeLabel: true, themeTags: true, rejectionReason: true,
      competitionPrice: true, seasonalPrice: true, purchasePrice: true,
      consignmentCommissionPct: true, // visible because it's THEIR own commission rate
      createdAt: true, updatedAt: true,
      Images: { select: { id: true, url: true, isPrimary: true, sortOrder: true } },
      // internalNotes deliberately omitted
    },
    orderBy: { updatedAt: "desc" },
  })
);
```

**Verification:** TRPC response on `wardrobe.consigner.mine` MUST NOT contain `internalNotes`. Open DevTools network tab and confirm.

### Pitfall 3: Race condition — consigner edits while admin is reviewing

**What goes wrong:** Consigner has the edit page open. Admin opens the approve dialog. Consigner clicks "Save" mid-review. Admin approves a different version than what they reviewed.

**Why it happens:** PENDING_APPROVAL is editable by consigner (Pattern 6) AND by admin (existing admin update procedure can touch any field). No optimistic concurrency.

**How to avoid:** Accept it. The admin re-reads the dress before approving (the approve dialog should fetch fresh data on open via `api.admin.wardrobe.byId`), and the approve mutation is atomic — whatever fields are in the DB at approve-time become AVAILABLE. The consigner cannot change status, so the worst case is the admin sees fresher edits than expected.

**Mitigation (optional polish):** Admin can re-check the dress in the queue refresh after approval. Don't over-engineer for a non-issue.

### Pitfall 4: Forgetting CONSIGN-02 server-side enforcement

**What goes wrong:** Consigner crafts a TRPC mutation with `consignmentCommissionPct: 0` and the server accepts it. Free dresses for the platform.

**Why it happens:** Trusting the client form to hide the field. The Zod input schema must also reject these keys.

**How to avoid:** Use `dressInputSchema.pick(...)` (Pattern 5) — Zod silently strips keys not in the picked schema, so `consignmentCommissionPct` from a malicious client is simply ignored on parse. Then the server explicitly sets it from Settings:
```ts
data: {
  ...input,                  // consignmentCommissionPct NOT in input
  ownerId: ctx.session.user.id,
  status: "PENDING_APPROVAL",
  consignmentCommissionPct: settings.defaultConsignmentCommissionPct,
}
```

**Verification:** Add a unit test (Phase 21 or quick smoke): send `wardrobe.consigner.create({ ..., consignmentCommissionPct: 0 })` and confirm the created row has `consignmentCommissionPct === settings.defaultConsignmentCommissionPct`.

### Pitfall 5: Two "Wardrobe"-ish sidebar entries confuse users

**What goes wrong:** Sidebar has "Wardrobe" (→ /wardrobe catalog) AND "Consigned" (→ /wardrobe/consigned). Users mistake "Wardrobe" for "my listings."

**Why it happens:** Same icon, similar names.

**How to avoid:** Use a DIFFERENT lucide icon for "Consigned" (e.g. `Tag`, `Hanger`, `PackagePlus`, or `Store`). Label more specifically — consider "My Listings" instead of "Consigned" if the planner approves. Verify both icons render clearly side-by-side.

### Pitfall 6: Forgetting to filter image-less dresses from the admin queue

**What goes wrong:** Admin queue shows a PENDING_APPROVAL dress with zero images. Admin can approve it. A live catalog listing with no images is broken UX (catalog grid shows blank).

**Why it happens:** CONSIGN-03 enforcement isn't built into approve — it relies on `listPendingApproval` filtering.

**How to avoid:** Per Critical Findings §3: `listPendingApproval` filters `Images: { some: {} }`. The approve mutation should ALSO defense-in-depth check `_count.Images > 0`:
```ts
if (dress._count.Images === 0) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Cannot approve a dress with zero images",
  });
}
```

**Verification:** Create a consigned dress with no images. Confirm it does NOT appear in `/admin/wardrobe/pending-approval`. Confirm `approveDress` rejects it even if called directly.

### Pitfall 7: The image upload route handler will silently authorize cross-consigner uploads via clientPayload manipulation

**What goes wrong:** Malicious user A POSTs to `/api/wardrobe/upload` with `clientPayload: { dressId: <user B's dress id> }`. Route handler authorizes because… let me check.

**Re-read of `src/app/api/wardrobe/upload/route.ts:45-58`:**
```ts
const dress = await prisma.dress.findUnique({ where: { id: dressId }, select: { ownerId: true } });
if (!dress) throw new Error("Dress not found");
const isOwner = dress.ownerId === session.user.id;
const isAdmin = isAdminRole(role);
if (!isOwner && !isAdmin) throw new Error("Forbidden");
```

OK, this is safe. The handler ALREADY enforces `dress.ownerId === session.user.id`. No fix needed. **This pitfall is a false alarm — verified by direct read of the source.** Including this here for the planner's confidence: PERM-01 boundary is intact end-to-end.

### Pitfall 8: ConsignerDressForm "create" tab order and unmount problem

**What goes wrong:** Consigner fills the form, switches to a different tab (e.g. Measurements), comes back to General — form state is preserved by RHF, BUT if they navigate away mid-create, all unsaved work is lost.

**Why it happens:** Standard SPA — no auto-save, no draft persistence.

**How to avoid:** Match Phase 14's UX. The "Save & continue" button on /wardrobe/consigned/new submits metadata only and immediately redirects to the edit page. Lock the consigner into that flow rather than allowing them to defer save. No autosave needed for MVP.

---

## Code Examples

### Example 1: assertOwnsDress helper

```ts
// src/features/wardrobe/api/queries/consignerQueries.ts
import type { DressStatus, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

type OwnGuardCtx = {
  prisma: PrismaClient;
  session: { user: { id: string } } | null;
};

async function assertOwnsDress(
  ctx: OwnGuardCtx,
  dressId: string,
): Promise<{ ownerId: string; status: DressStatus }> {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const dress = await ctx.prisma.dress.findUnique({
    where: { id: dressId },
    select: { ownerId: true, status: true },
  });
  if (!dress) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Dress not found" });
  }
  if (dress.ownerId !== ctx.session.user.id) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return dress;
}
```

### Example 2: Approve dialog (mirror RequestResponseDialog)

Source pattern: `src/features/wardrobe/components/admin/RequestResponseDialog.tsx` — Radix Dialog + sonner toasts + RHF + mutation.

```tsx
// src/features/wardrobe/components/admin/ApproveDressDialog.tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface ApproveDressDialogProps {
  dressId: string;
  dressTitle: string;
  currentCommissionPct: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ApproveDressDialog({ dressId, dressTitle, currentCommissionPct, open, onOpenChange, onSuccess }: ApproveDressDialogProps) {
  const [override, setOverride] = useState<string>("");

  const approve = api.admin.wardrobe.approveDress.useMutation({
    onSuccess: () => {
      toast.success("Dress approved", { description: `${dressTitle} is now AVAILABLE.` });
      onSuccess();
      onOpenChange(false);
    },
    onError: (e) => toast.error("Approve failed", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve {dressTitle}</DialogTitle>
          <DialogDescription>
            Optionally override the commission % for this dress (default: {currentCommissionPct}%).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="commission">Commission % override (optional)</Label>
          <Input id="commission" type="number" min={0} max={100} value={override} onChange={(e) => setOverride(e.target.value)} placeholder={`${currentCommissionPct}`} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={approve.isPending}
            onClick={() => approve.mutate({
              id: dressId,
              ...(override !== "" ? { consignmentCommissionPctOverride: Number(override) } : {}),
            })}
            className="bg-[#0891b2] hover:bg-[#06748f] text-white"
          >
            {approve.isPending ? "Approving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Example 3: Pending approval queue route page

```tsx
// src/app/(protected)/admin/wardrobe/pending-approval/page.tsx
"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PendingApprovalQueue } from "@/features/wardrobe/components/admin/PendingApprovalQueue";

export default function AdminPendingApprovalPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/wardrobe" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0891b2] mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to inventory
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Pending Approval</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review consigned dresses awaiting publication. Approve to list on the public catalog or reject with a reason.
        </p>
      </div>
      <PendingApprovalQueue />
    </div>
  );
}
```

### Example 4: Consigner edit page with status-aware locking

```tsx
// src/app/(protected)/wardrobe/consigned/[id]/edit/page.tsx
"use client";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ConsignerDressForm } from "@/features/wardrobe/components/consigner/ConsignerDressForm";
import { DressImageGallery } from "@/features/wardrobe/components/admin/DressImageGallery";
import { DressStatusBadge } from "@/features/wardrobe/components/DressStatusBadge";
import { api } from "@/lib/api";

export default function ConsignerEditDressPage() {
  const { id } = useParams<{ id: string }>();
  const utils = api.useUtils();

  // mine() returns a list; for a single dress, add a byIdFromMine() or filter on the client.
  // Simplest: use a dedicated wardrobe.consigner.byId query that wraps assertOwnsDress.
  const { data: dress, isLoading } = api.wardrobe.consigner.byId.useQuery({ id });

  const update = api.wardrobe.consigner.update.useMutation({
    onSuccess: () => {
      utils.wardrobe.consigner.byId.invalidate({ id });
      utils.wardrobe.consigner.mine.invalidate();
      toast.success("Saved");
    },
    onError: (e) => toast.error("Save failed", { description: e.message }),
  });

  const resubmit = api.wardrobe.consigner.resubmit.useMutation({
    onSuccess: () => {
      utils.wardrobe.consigner.byId.invalidate({ id });
      toast.success("Resubmitted for approval");
    },
    onError: (e) => toast.error("Resubmit failed", { description: e.message }),
  });

  if (isLoading) return <div className="animate-pulse h-96 bg-slate-100 rounded-xl" />;
  if (!dress) return <p>Dress not found.</p>;

  const lockPricingAndSize = dress.status !== "PENDING_APPROVAL" && dress.status !== "REJECTED";

  return (
    <div className="space-y-8">
      {/* header omitted */}
      {dress.status === "REJECTED" && dress.rejectionReason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">Rejected</p>
          <p className="mt-1 text-sm text-rose-700">{dress.rejectionReason}</p>
          <button onClick={() => resubmit.mutate({ id })} className="mt-3 text-sm text-rose-800 underline">
            Edit and resubmit
          </button>
        </div>
      )}

      <DressImageGallery
        dressId={dress.id}
        images={dress.Images}
        onMutated={() => utils.wardrobe.consigner.byId.invalidate({ id })}
      />

      <ConsignerDressForm
        mode="edit"
        defaultValues={/* map dress to form values, same shape as admin EditDressPage */}
        lockPricingAndSize={lockPricingAndSize}
        onSubmit={(input) => update.mutate({ id, ...input })}
        isSubmitting={update.isPending}
      />
    </div>
  );
}
```

Note: this introduces a `wardrobe.consigner.byId` query not listed in the brief. It's needed by the edit page; otherwise the consigner edit page would have to filter `mine()` client-side, which is wasteful and loses single-dress react-query keying. **Add `byId` as a sixth consigner procedure** — it's a one-liner over `assertOwnsDress`.

---

## State of the Art / Repo-Specific Patterns

| Old / Hypothetical Approach | Current / Recommended Approach | Source |
|---|---|---|
| Per-role middleware (e.g. `consignerProcedure`) | Inline `assertOwnsDress` helper inside the procedure | Phase 16 `cancel`, Phase 13 `assertCanModifyDress` |
| Separate gallery components for admin vs. consigner | One `DressImageGallery` shared (already authorizes both via runtime check) | Phase 13 ADR (`14-RESEARCH.md:309`) |
| Fork DressForm.tsx for consigner | Extract DressFormCore, write thin wrappers | This research §5 |
| Add DRAFT status for incomplete listings | Use existing PENDING_APPROVAL + filter image-less from queue | This research §3 |
| Use `internalNotes` for rejection reason | Add new `Dress.rejectionReason` column via migration | This research §1 |
| Show "Consigned" sidebar conditionally on owned-dress count | Show unconditionally; empty state on the page | This research §6 |
| `superAdminProcedure` for wardrobe admin actions | `adminProcedure` (accepts ADMIN + SUPER_ADMIN) | Phase 14 RESEARCH critical finding |

---

## Open Questions

### Q1. Should the "Consigned" sidebar entry be labeled "Consigned" or "My Listings"?

**What we know:** NAV-02 requirement says "Consigned." The phase brief reuses that label.
**What's unclear:** Whether the user prefers "My Listings" for clarity.
**Recommendation:** Use "Consigned" as the requirement says. If user feedback in Phase 22 audit asks for clarity, rename then. One-line config change.

### Q2. Should `wardrobe.consigner.mine` include archived dresses?

**What we know:** Brief says "list caller's owned dresses." Doesn't specify status filter.
**What's unclear:** Whether archived dresses should appear in MyConsignedDressesList by default.
**Recommendation:** `mine()` returns ALL statuses but the UI groups them into tabs (Pending / Live / Rejected / Archived). Matches the admin inventory pattern at `/admin/wardrobe`. If pagination becomes an issue, add a `status?` filter param later.

### Q3. Should non-STUDENT, non-ADMIN roles (i.e. COACH) be allowed to consign?

**What we know:** Phase brief says "Any user can create a dress" — implies all authenticated roles.
**What's unclear:** Coaches consigning might be unusual but not blocked.
**Recommendation:** Don't role-gate the consigner namespace. `protectedProcedure` is enough — any authenticated user can own a Dress. Sidebar "Consigned" entry visible to all three roles per Critical Findings §6.

### Q4. Should rejection trigger immediate UI feedback to a logged-in consigner?

**What we know:** Phase 20 owns email notifications. Phase 18 is in-app only.
**What's unclear:** Does Phase 18 need to fire an in-app `createNotification` on reject (so the bell icon in the header surfaces it)?
**Recommendation:** YES — fire an in-app notification on both approve AND reject. The post-commit notification pattern from Phase 17 (`wardrobeRequestQueries.ts:248-262`) is the template. Email is Phase 20; the in-app bell notification is free here and gives the consigner a path to the edit page. Pattern 3 sketch already includes this.

### Q5. How does `DressForm`'s existing `status` select interact after Phase 18 lands?

**What we know:** Admin DressForm currently shows a status dropdown that includes PENDING_APPROVAL and REJECTED options. Admins can manually flip a dress to REJECTED via that select.
**What's unclear:** Should the admin's manual status-flip also write a `rejectionReason`? Or do admins always use the dedicated reject dialog?
**Recommendation:** Two flows coexist for now:
- Dedicated `admin.wardrobe.rejectDress` — used by the queue (REQUIRES reason).
- Generic `admin.wardrobe.update` — admins flipping status freely (no reason required, `rejectionReason` stays null).
The queue dialog is the recommended UX for rejecting. Allowing the manual flip is a power-user escape hatch. Document this in the rejectDress mutation header.

---

## Sources

### Primary (HIGH confidence — direct file reads)

- `prisma/schema.prisma:514-559` — Dress model definition, confirmed `rejectionReason` does NOT exist
- `prisma/schema.prisma:482-490` — DressStatus enum, confirmed PENDING_APPROVAL + REJECTED + AVAILABLE + ARCHIVED present
- `src/features/admin/api/queries/wardrobeDressQueries.ts` — full file (244 lines) — admin CRUD pattern + `dressInputSchema` for `.pick()` reuse
- `src/features/admin/api/queries/wardrobeSettingsQueries.ts` — full file — `getWardrobeSettings` async helper available to any procedure
- `src/features/admin/api/queries/wardrobeRequestQueries.ts:103-264` — Phase 17 approval pattern (listRequests + respondToRequest)
- `src/features/wardrobe/api/queries/imageQueries.ts:26-42` — `assertCanModifyDress` ALREADY authorizes owner
- `src/features/wardrobe/api/queries/requestQueries.ts:258-302` — `cancel` mutation: inline caller-owns guard pattern
- `src/features/wardrobe/api/queries/index.ts` — wardrobe router composition (where consignerRouter mounts)
- `src/features/admin/api/queries/index.ts:16-30` — admin router composition (admin.wardrobe = dress CRUD)
- `src/lib/root.ts` — root AppRouter
- `src/lib/trpc.ts:84-191` — middleware definitions; confirms `protectedProcedure` + `adminProcedure` shape
- `src/lib/roles.ts:17-19` — `isAdminRole` accepts ADMIN + SUPER_ADMIN
- `src/app/api/wardrobe/upload/route.ts:45-58` — upload route handler authorizes owner OR admin
- `src/app/(protected)/admin/wardrobe/new/page.tsx` — create-then-redirect pattern (template for /wardrobe/consigned/new)
- `src/app/(protected)/admin/wardrobe/[id]/edit/page.tsx` — admin edit page composition (template for consigner edit)
- `src/features/wardrobe/components/admin/DressForm.tsx` — admin form, full file (626 lines) — basis for DressFormCore extraction
- `src/features/wardrobe/components/admin/DressImageGallery.tsx:1-100` — gallery component reusable as-is
- `src/features/wardrobe/components/DressStatusBadge.tsx` — already styles PENDING_APPROVAL + REJECTED
- `src/lib/navigation-config.ts` — full file — confirms sidebar is purely role-driven static config
- `src/components/layout/AppSidebar.tsx` — full file — confirms `"use client"`, no data-conditional rendering
- `src/app/(protected)/wardrobe/layout.tsx` — confirms wardrobe routes use `AppLayout role="student"`
- `prisma/migrations/` — confirmed migration list; no existing rejectionReason migration

### Phase research context (HIGH confidence)

- `.planning/phases/14-admin-inventory-crud/14-RESEARCH.md:285-340` — DressFormCore extraction precedent, image gallery pattern
- `.planning/phases/14-admin-inventory-crud/14-RESEARCH.md:309` — "Don't put image upload behind adminProcedure only" ADR
- `.planning/phases/14-admin-inventory-crud/14-RESEARCH.md:47` — Phase 14 hardcodes status AVAILABLE; "Phase 18 will use a different mutation that sets PENDING_APPROVAL"

### Sources NOT used

- Context7: No external library questions for this phase — everything is repo-internal pattern reuse.
- WebSearch: Not used — domain is repo-specific consigner workflow.
- Official docs: Not relevant; all dependencies already vetted in prior phases.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency already proven in Phases 13–17
- Architecture patterns: HIGH — every pattern has a direct file-read precedent
- TRPC namespace design: HIGH — mirrors Phase 16 cancel + Phase 17 respondToRequest exactly
- Schema migration: HIGH — verified `rejectionReason` does not exist via grep across prisma + src
- Image pipeline reuse: HIGH — verified route handler + assertCanModifyDress already authorize owners
- DressFormCore extraction: MEDIUM — recommended approach is sound but adds 1 task of refactor; fallback (Option C conditional props) is acceptable if planner prefers minimal scope
- ConsignerDressForm field locking UX: MEDIUM — server enforces lock (HIGH); client UX of disabling pricing inputs vs. hiding them is the UX-design choice the planner makes
- NAV-02 always-visible decision: HIGH — verified sidebar is statically rendered and data-conditional would require non-trivial refactor

**Research date:** 2026-05-29
**Valid until:** Stable patterns valid 30+ days. Re-verify only if:
- DressForm.tsx is refactored before Phase 18 ships (low likelihood)
- New DressStatus enum values added (none planned per phase 18 scope)
- Image upload route handler changes ownership semantics (no planned changes)
