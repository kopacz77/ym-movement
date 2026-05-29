# Phase 14: Admin Inventory CRUD - Research

**Researched:** 2026-05-29
**Domain:** Admin CRUD pages over Phase 13 Dress/DressImage schema using existing Next.js App Router + TRPC + Radix patterns
**Confidence:** HIGH on existing patterns (everything Phase 14 needs has a working precedent in the repo); MEDIUM on the new-dress image flow because it requires a "save-first-then-upload" UX choice that is greenfield.

---

## Summary

Phase 14 ships five admin-only surfaces — list grid, new-dress page, edit-dress page, global settings page, and a sidebar nav entry — on top of the Phase 13 schema and image pipeline. **Every pattern needed already exists in this codebase and should be mirrored, not reinvented**: the route group is `src/app/(protected)/admin/*` wrapped in `AppLayout role="admin"`; CRUD pages are `"use client"` server-component-free files that hit `api.admin.*` TRPC procedures via `useQuery`/`useMutation`; forms are React Hook Form + Zod + Radix Input/Select/Switch; the editorial header is `text-3xl font-bold text-[#1a3a5c]`; KPI cards use the locked `shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)]` token; status filters are `<Select>` with an `"ALL"` sentinel; the existing AppSidebar is data-driven from `src/lib/navigation-config.ts` and adding the Shirt entry there is a one-line change in two arrays.

The single non-obvious decision is how `/admin/wardrobe/new` should sequence dress creation and image upload. The Phase 13 image pipeline requires a real `dressId` before `attachImage` can be called (FK constraint + token-mint authorization), so a single "fill form, upload images, click save" UX is not viable without inventing a draft-promotion mechanic. **Recommendation: a two-step server-side wizard backed by a single TRPC mutation pair** — admin clicks "Create" with metadata only, server creates the Dress row with `status: AVAILABLE` (bypassing the approval queue per ADMIN-02), client immediately redirects to `/admin/wardrobe/[id]/edit` where the image gallery is already available because the dress now exists. This piggybacks on the edit page's image UI and avoids any throwaway "DRAFT" status. PRD-level, the admin still perceives one continuous flow because the redirect happens automatically on `createDress.onSuccess`.

The second meaningful finding is the **superAdminProcedure vs adminProcedure mismatch** in `coachManagementQueries.ts`: `createCoach` and `updateCoachPricing` both use `superAdminProcedure`, even though they read as "admin-only" operations. PERM-02 for this phase says "admin-or-super-admin", which maps to **`adminProcedure`** (defined at `src/lib/trpc.ts:189`, uses `isAdminRole` which accepts `ADMIN` or `SUPER_ADMIN`). The planner should use `adminProcedure` consistently across every new `admin.wardrobe.*` procedure to match `wardrobeSettingsRouter` (already correct).

**Primary recommendation:** Mirror three existing artifacts exactly — `src/app/(protected)/admin/coaches/page.tsx` for the list shape, `src/features/admin/components/coaches/management/NewCoachDialog.tsx` for the form-with-Zod-validation pattern (adapt to a full-page route, not a dialog), and `src/features/admin/api/queries/wardrobeSettingsQueries.ts` for the settings page TRPC contract that already exists from Phase 13.

---

## Critical Findings (read first)

### 1. The wardrobe settings TRPC procedures ALREADY exist (Phase 13 deliverable)

The `/admin/wardrobe/settings` page does NOT need new TRPC procedures. Phase 13 shipped:

```ts
// src/features/admin/api/queries/wardrobeSettingsQueries.ts
api.admin.wardrobeSettings.get.useQuery()       // returns { defaultConsignmentCommissionPct, wardrobeRentalRequestExpiryDays, wardrobeReturnReminderDays }
api.admin.wardrobeSettings.update.useMutation() // accepts partial of the above
```

Both use `adminProcedure` (correct for PERM-02 scope). The Zod schema is exported as `wardrobeSettingsSchema` from the same file — the page should import and reuse it on the client for form validation. **Do not duplicate the schema.** The defaults baked into the schema (15% / 7 days / 1 day) are what the page should show as placeholders if a value is missing.

### 2. The new-dress flow needs a "create-then-redirect" pattern, not a single-form save

`prisma.dressImage` has FK `dressId → dress.id` (`onDelete: Cascade`). The `/api/wardrobe/upload` route handler reads `dressId` from `clientPayload` and looks up the dress in `onBeforeGenerateToken` (lines 39-58 of `src/app/api/wardrobe/upload/route.ts`) — meaning **a dress row must exist before any image can be uploaded**.

Three options were considered:

| Option | Mechanic | Verdict |
|---|---|---|
| **A. Create-then-redirect (recommended)** | Submit metadata → `createDress` mutation returns `{ id }` → router.push(`/admin/wardrobe/${id}/edit`) → admin uploads images on the edit page where DressImageGallery is available. | Simplest. Zero new schema. Reuses the edit page's image UI. One mutation, one redirect. |
| B. Draft status | Add `DRAFT` to DressStatus enum, create with DRAFT, allow uploads, then "Publish" to flip to AVAILABLE. | Requires schema migration (Phase 14 should not touch schema — that's Phase 13's mandate). Adds a state to govern in the lifecycle. |
| C. Client-staged images | Compress and hold image blobs in component state; on save, create dress, then loop attachImage calls. | Largest blast radius if any single upload fails mid-loop. Worst UX on a slow connection. Race conditions on FK existence. |

**Recommendation: Option A.** The "New Dress" page is just a metadata-only form; the moment it succeeds, the user is on the edit page with all fields editable AND the image gallery live. ADMIN-02's "status AVAILABLE" requirement is satisfied because `createDress` hardcodes `status: 'AVAILABLE'` (the consigner self-serve flow in Phase 18 will use a different mutation that sets PENDING_APPROVAL).

### 3. The sidebar nav entry is one-line each in two arrays

The sidebar is data-driven from `src/lib/navigation-config.ts`. Adding the Shirt entry above Settings in `adminNavigation` and adding it above Settings in `studentNavigation` are the only sidebar changes needed. The `AppSidebar.tsx` and `AppLayout.tsx` components both consume `getNavigationForRole(role)` and render whatever's in the array — **no component edits required**. This honors the CLAUDE.md "sidebar architecture is LOCKED" rule because we're only mutating the config data, not the rendering primitive.

`lucide-react.Shirt` is verified present (file `node_modules/lucide-react/dist/esm/icons/shirt.js`).

### 4. `superAdminProcedure` vs `adminProcedure` — use the latter

PERM-02 says "admin-or-super-admin on all `admin.wardrobe.*` procedures". The TRPC procedure that fits is **`adminProcedure`** (defined `src/lib/trpc.ts:102-120`), which uses `isAdminRole(role)` → accepts both `ADMIN` and `SUPER_ADMIN`. The existing `wardrobeSettingsRouter` already uses `adminProcedure`. The coach-management code uses `superAdminProcedure` for its create/update procedures — **do not mirror that choice**. Phase 14 should use `adminProcedure` uniformly.

### 5. There is no existing image gallery component to mirror

Searched: no component in `src/components/ui` or `src/features/*/components` does image-upload + reorder + set-primary + delete against the Phase 13 image TRPC. This is genuinely greenfield. The component should live at `src/features/wardrobe/components/admin/DressImageGallery.tsx` (or similar) and compose four Phase 13 TRPC mutations: `wardrobe.images.attachImage`, `reorderImages`, `setPrimary`, `deleteImage`. See "Architecture Patterns → Pattern 6" below for the full sequence.

---

## Standard Stack

All packages already installed via Phase 13. Phase 14 adds **no new runtime dependencies**.

### Already installed (used in this phase)

| Package | Version | Use in this phase |
|---|---|---|
| `@vercel/blob` | 2.4.0 | `upload()` from `@vercel/blob/client` in the gallery component for image uploads |
| `browser-image-compression` | 2.0.2 | Used via the existing `compressForUpload()` helper at `src/features/wardrobe/lib/compressImage.ts` |
| `react-hook-form` + `@hookform/resolvers` | current | Form state + Zod resolver — exact same pattern as `NewCoachDialog.tsx` |
| `zod` | 3.25.76 | Form validation schemas; reuse Phase 13's `wardrobeSettingsSchema` for the settings page |
| `lucide-react` | current | `Shirt` icon for sidebar; `Plus`, `Pencil`, `Trash2`, `Image`, `GripVertical` for gallery actions |
| `sonner` (via `toast`) | current | Notification on save/delete success/failure — use `toast.success` / `toast.error` (mirror `NewCoachDialog.tsx:67-87`) |
| `@radix-ui/react-*` (Select, Switch, Dialog, etc.) | current | Form primitives in `src/components/ui/*` |
| `date-fns` | current | Format `createdAt` / `updatedAt` in list grid (`format(date, "MMM dd, yyyy")` — see `CoachList.tsx:167-169`) |

### Alternatives considered (and rejected)

| Instead of | Could use | Why not |
|---|---|---|
| Full-page form for `/admin/wardrobe/new` | Modal dialog like `NewCoachDialog.tsx` | Dress has 20+ fields including measurements, prices, theme tags, internal notes — too tall for a modal. Full page matches inventory complexity. |
| `useQueryClient().invalidateQueries({ queryKey: [["admin", "wardrobe"]] })` | `api.useUtils().admin.wardrobe.list.invalidate()` | Both work; the `useUtils()` pattern is preferred and used in `CoachList.tsx:95-100`. |
| Cents stored as `Int`, displayed via custom helper | `formatCurrency(value/100)` using `src/lib/utils.ts:8-15` | The existing `formatCurrency` expects a dollar value, not cents. Either divide at the call site (recommended) or add a `formatCurrencyFromCents(cents)` helper. The latter is cleaner and avoids 100 division calls. **Recommend adding the helper.** |

---

## Architecture Patterns

### Recommended file layout

```
src/
  app/
    (protected)/
      admin/
        wardrobe/
          page.tsx                          # NEW — /admin/wardrobe list grid
          new/
            page.tsx                        # NEW — /admin/wardrobe/new metadata form
          [id]/
            edit/
              page.tsx                      # NEW — /admin/wardrobe/[id]/edit
          settings/
            page.tsx                        # NEW — /admin/wardrobe/settings
  features/
    admin/
      api/
        queries/
          wardrobe/                         # NEW sub-router dir (mirrors coach/)
            dressManagementQueries.ts       # NEW — admin.wardrobe.management.{list, getById, create, update, archive}
            index.ts                        # NEW — composes adminWardrobeRouter
        index.ts                            # MODIFIED — add wardrobe: adminWardrobeRouter
      components/
        wardrobe/                           # NEW dir
          DressInventoryTable.tsx           # NEW — list grid w/ status filter, mirrors CoachList.tsx structure
          DressForm.tsx                     # NEW — shared metadata form used by /new and /[id]/edit (Tabs: General, Measurements, Pricing, Status)
          DressImageGallery.tsx             # NEW — uploader + reorder + set-primary + delete, composes wardrobe.images.* TRPC
          DressStatusBadge.tsx              # NEW — colored pill, mirrors CoachList.tsx:38-89 getStatusIndicator
          WardrobeSettingsForm.tsx          # NEW — three-input form for the settings page (commission %, expiry days, return reminder days)
  lib/
    navigation-config.ts                    # MODIFIED — add Shirt entry above Settings in adminNavigation & studentNavigation
    utils.ts                                # MODIFIED — add formatCurrencyFromCents(cents: number) helper
```

### Pattern 1: Admin page boilerplate

Every admin route in this codebase follows the same shape. Verified at `src/app/(protected)/admin/coaches/page.tsx`, `payments/page.tsx`, `settings/page.tsx`, and `students/page.tsx`.

```tsx
// src/app/(protected)/admin/wardrobe/page.tsx
"use client";

import { useState } from "react";
// ...standard imports

export default function AdminWardrobePage() {
  const [statusFilter, setStatusFilter] = useState<DressStatus | "ALL">("ALL");
  const router = useRouter();

  const { data, isLoading } = api.admin.wardrobe.management.list.useQuery({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  return (
    <div className="space-y-8">
      {/* Page Header — verbatim mirror of coaches/page.tsx:46-58 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Wardrobe</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage dress inventory, pricing, and approval status.
          </p>
        </div>
        <div className="self-start sm:self-auto">
          <Button onClick={() => router.push("/admin/wardrobe/new")}>Add Dress</Button>
        </div>
      </div>

      {/* ...table card */}
    </div>
  );
}
```

**Layout note:** `src/app/(protected)/admin/layout.tsx` already wraps everything in `<AppLayout role="admin">`. The Phase 14 pages do NOT need their own layout file — the page-header/wrapper pattern above is what every existing admin route uses.

### Pattern 2: TRPC list query with status filter (admin.wardrobe.management.list)

Mirror `admin.payment.getPayments` (read at `src/app/(protected)/admin/payments/page.tsx:99-109`) which already takes an optional status filter. The wardrobe equivalent:

```ts
// src/features/admin/api/queries/wardrobe/dressManagementQueries.ts
import { DressStatus } from "@prisma/client";

list: adminProcedure
  .input(
    z.object({
      status: z.nativeEnum(DressStatus).optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    return ctx.prisma.dress.findMany({
      where: input.status ? { status: input.status } : undefined,
      include: {
        Owner: { select: { id: true, name: true, email: true } },
        Images: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1,
        },
        _count: { select: { Images: true, Requests: true, Rentals: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),
```

**Important: include ALL statuses by default** — ADMIN-01 explicitly requires showing PENDING_APPROVAL / REJECTED / ARCHIVED. The default branch (no `where`) returns everything, which is what we want.

### Pattern 3: Status filter UI

Mirror the `<Select>` filter used at `admin/payments/page.tsx:464-478`:

```tsx
import { DressStatus } from "@prisma/client";

<Select
  value={statusFilter}
  onValueChange={(value: DressStatus | "ALL") => setStatusFilter(value)}
>
  <SelectTrigger className="w-[180px] h-9 text-sm border-slate-200">
    <SelectValue placeholder="All Statuses" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ALL">All Statuses</SelectItem>
    <SelectItem value="AVAILABLE">Available</SelectItem>
    <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
    <SelectItem value="PENDING">Pending Rental</SelectItem>
    <SelectItem value="RENTED">Rented</SelectItem>
    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
    <SelectItem value="REJECTED">Rejected</SelectItem>
    <SelectItem value="ARCHIVED">Archived</SelectItem>
  </SelectContent>
</Select>
```

**Note:** `DressStatus` is imported directly from `@prisma/client`. This is the same pattern as `import type { PaymentStatus } from "@prisma/client"` at `admin/payments/page.tsx:3`.

### Pattern 4: React Hook Form + Zod for dress create/edit

Adapt `NewCoachDialog.tsx:24-122` to a full-page form. Key conventions:

```tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Server-side Zod schema lives in dressManagementQueries.ts.
// Re-export it from there for client use OR define a string-input mirror here.
// NewCoachDialog uses string inputs and parses to numbers in onSubmit (see line 89-122).
// For Phase 14, prefer typed number inputs (z.number()) because dresses have ~10 numeric fields.

const dressFormSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1),
  category: z.nativeEnum(DressCategory),
  themeTags: z.string().optional().or(z.literal("")), // comma-separated -> array, mirror NewCoachDialog:90-94
  color: z.string().min(1),
  secondaryColors: z.string().optional().or(z.literal("")),
  condition: z.nativeEnum(DressCondition),
  yearMade: z.coerce.number().int().optional(),
  sizeLabel: z.string().min(1),
  chestMinCm: z.coerce.number().int().optional(),
  // ... 9 more measurement fields, all .coerce.number().int().optional()
  competitionPrice: z.coerce.number().int().nonnegative(),   // CENTS
  seasonalPrice: z.coerce.number().int().nonnegative(),
  purchasePrice: z.coerce.number().int().optional(),
  securityDeposit: z.coerce.number().int().nonnegative(),
  cleaningFee: z.coerce.number().int().nonnegative(),
  consignmentCommissionPct: z.coerce.number().int().min(0).max(100),
  internalNotes: z.string().optional().or(z.literal("")),
  alterableSmaller: z.boolean().default(false),
  alterableLarger: z.boolean().default(false),
});

const form = useForm<z.infer<typeof dressFormSchema>>({
  resolver: zodResolver(dressFormSchema),
  defaultValues: { /* see /new and /edit branches below */ },
});

const createDress = api.admin.wardrobe.management.create.useMutation({
  onSuccess: (dress) => {
    toast.success("Dress created", { description: "Now add images to publish." });
    router.push(`/admin/wardrobe/${dress.id}/edit`);
  },
  onError: (error) => toast.error("Failed to create dress", { description: error.message }),
});
```

**UI grouping recommendation:** Use the `Tabs` component (already used at `admin/settings/page.tsx:346-368`) with four tabs: **General** (title/description/category/color/condition/themeTags/sizeLabel/yearMade), **Measurements** (10 measurement fields + alterable flags), **Pricing** (5 price fields in cents + commission %), **Status & Internal** (status select + internalNotes). The edit page adds an **Images** tab as the first tab so images can be uploaded immediately on first edit-page load.

### Pattern 5: Cents → currency display

Add this helper to `src/lib/utils.ts` (existing `formatCurrency` takes dollars):

```ts
export function formatCurrencyFromCents(cents: number): string {
  return formatCurrency(cents / 100);
}
```

The Dress schema stores all prices as `Int` cents. In the form, render input as dollars (divide by 100 on load, multiply by 100 on submit) OR render as cents and label the input clearly. **Recommendation: dollar inputs** (UX) with the helper handling display elsewhere. Document this conversion in the form component.

### Pattern 6: Image gallery component (NEW — greenfield)

Composes the four Phase 13 TRPC procedures + the upload route handler. Sketch:

```tsx
// src/features/wardrobe/components/admin/DressImageGallery.tsx
"use client";

import { upload } from "@vercel/blob/client";
import { compressForUpload } from "@/features/wardrobe/lib/compressImage";
import { api } from "@/lib/api";

interface DressImageGalleryProps {
  dressId: string;
  images: { id: string; url: string; sortOrder: number; isPrimary: boolean }[];
}

export function DressImageGallery({ dressId, images }: DressImageGalleryProps) {
  const utils = api.useUtils();
  const attachImage = api.wardrobe.images.attachImage.useMutation({
    onSuccess: () => utils.admin.wardrobe.management.getById.invalidate({ id: dressId }),
  });
  const reorderImages = api.wardrobe.images.reorderImages.useMutation({ /* ... */ });
  const setPrimary = api.wardrobe.images.setPrimary.useMutation({ /* ... */ });
  const deleteImage = api.wardrobe.images.deleteImage.useMutation({ /* ... */ });

  const handleFileSelect = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const compressed = await compressForUpload(file);
      const blob = await upload(compressed.name, compressed, {
        access: "public",
        handleUploadUrl: "/api/wardrobe/upload",
        clientPayload: JSON.stringify({ dressId }),
      });
      await attachImage.mutateAsync({ dressId, url: blob.url });
    }
  };

  // ... render grid of 8 image slots, file input button, set-primary action, delete action
}
```

**Cap UX:** The route handler and `attachImage` both enforce `MAX_IMAGES_PER_DRESS = 8`. The gallery should disable the file input when `images.length >= 8` to prevent a known-loud error.

**Reorder:** The Phase 13 `reorderImages` mutation requires the FULL list of imageIds in the desired order. Use a drag-and-drop primitive that emits the full new order — `src/components/ui/draggable.tsx` exists but is unaudited; verify it fits first. Otherwise simple "up/down arrow" buttons that swap two indices and call `reorderImages` with the rebuilt array also satisfy the contract.

### Pattern 7: Sidebar nav data-driven update

The CLAUDE.md "sidebar is LOCKED" rule applies to `AppSidebar.tsx` and `AppLayout.tsx` rendering primitives. **The navigation config file is the public extension point.** Edit:

```ts
// src/lib/navigation-config.ts
import { Shirt } from "lucide-react";  // add to existing import block

export const adminNavigation: NavItem[] = [
  // ... existing entries ...
  { name: "Reports", href: "/admin/reports", icon: BarChart2 },
  { name: "Wardrobe", href: "/admin/wardrobe", icon: Shirt },     // NEW — placed above Settings per NAV-01
  { name: "Settings", href: "/admin/settings", icon: Settings },
  { name: "Guide", href: "/admin/guide", icon: BookOpen },
];

export const studentNavigation: NavItem[] = [
  // ... existing entries ...
  { name: "Profile", href: "/student/profile", icon: User },
  { name: "Wardrobe", href: "/wardrobe", icon: Shirt },           // NEW — placed above Settings per NAV-01
  { name: "Settings", href: "/student/settings", icon: Settings },
  { name: "Guide", href: "/student/guide", icon: BookOpen },
];
```

**Note for NAV-01:** the student `/wardrobe` route is Phase 15's deliverable. Adding the nav entry now (Phase 14) is fine because a 404 on `/wardrobe` is harmless until Phase 15 lands the page. Confirm with the planner whether NAV-01 should land entirely in Phase 14 or be split (admin entry now, student entry with Phase 15).

### Pattern 8: Settings page — reuse Phase 13 schema

```tsx
// src/app/(protected)/admin/wardrobe/settings/page.tsx
"use client";

import { wardrobeSettingsSchema } from "@/features/admin/api/queries/wardrobeSettingsQueries";

const { data: settings } = api.admin.wardrobeSettings.get.useQuery();
const update = api.admin.wardrobeSettings.update.useMutation({
  onSuccess: () => toast.success("Wardrobe settings updated"),
  onError: (error) => toast.error("Failed to update settings", { description: error.message }),
});

const form = useForm<z.infer<typeof wardrobeSettingsSchema>>({
  resolver: zodResolver(wardrobeSettingsSchema),
  defaultValues: settings, // populated from useEffect once data loads
});
```

**Re-export the schema:** `wardrobeSettingsQueries.ts` already exports `wardrobeSettingsSchema` and `WardrobeSettings` type. Import them directly from that file.

### Anti-Patterns to Avoid (verified against CLAUDE.md and repo conventions)

- **Do NOT modify `AppSidebar.tsx` or `AppLayout.tsx` rendering primitives.** CLAUDE.md explicitly locks the layout. The only allowed sidebar change is adding nav entries to `navigation-config.ts`.
- **Do NOT use `superAdminProcedure`** for these routes. PERM-02 requires admin OR super-admin. Use `adminProcedure`.
- **Do NOT use `hover:` for DropdownMenuItem highlight overrides.** Use `focus:` (per CLAUDE.md: Radix manages highlight via focus). Example: `className="text-red-600 focus:text-red-700 focus:bg-red-50"`. Plain `<Button>` hover still works.
- **Do NOT touch the Prisma schema in Phase 14.** Phase 13 owns the schema; Phase 14 is application code only. If a missing field surfaces, escalate as a Phase 13 follow-up, not a Phase 14 migration.
- **Do NOT camelCase Prisma relations.** Use PascalCase: `dress.Owner.name`, `dress.Images[0].url`, `dress._count.Requests`. The camelCase access (e.g., `dress.owner`) silently returns undefined.
- **Do NOT try to upload images before the dress exists.** The `/api/wardrobe/upload` route fails on `prisma.dress.findUnique → null`. New-dress page must create then redirect.
- **Do NOT introduce a new "DRAFT" DressStatus enum value.** Phase 13 enum is locked; the create-then-redirect pattern avoids needing it.
- **Do NOT hand-roll currency formatting.** Use `formatCurrency()` (dollars) or the new `formatCurrencyFromCents()` helper. Never inline `Intl.NumberFormat`.
- **Do NOT hand-roll a confirmation dialog.** Use `showDeleteConfirmation()` from `src/lib/toast-confirmations.ts:89` (mirror `admin/settings/page.tsx:315-319`). For destructive actions like archiving a dress, use this helper.
- **Do NOT use `loading.tsx` / `error.tsx` patterns for these routes** unless mirroring an existing admin route (most use inline `isLoading` checks). The admin route group already has top-level `loading.tsx` and `error.tsx`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---|---|---|
| Currency display | `${(cents / 100).toFixed(2)}` strings | `formatCurrency()` at `src/lib/utils.ts:8` (dollars) or new `formatCurrencyFromCents()` helper |
| Status pill / badge | Bespoke `<div>` with status text | Mirror `getStatusIndicator()` in `CoachList.tsx:38-89` — emerald/amber/rose/slate palette per CLAUDE.md brand sweep |
| Delete confirmation | `window.confirm()` or custom dialog | `showDeleteConfirmation(itemType, onConfirm)` from `src/lib/toast-confirmations.ts:89` |
| Toast / notification | Custom snackbar | `toast.success` / `toast.error` from `sonner` (mirror `NewCoachDialog.tsx:67-87`) |
| Form validation | Manual error states | React Hook Form + Zod + `zodResolver` (mirror `NewCoachDialog.tsx:46-65`) |
| Cents↔dollars in forms | Inline math | Single helper next to the form schema; document the conversion direction once |
| Image upload, compression, blob writes | Custom `fetch(PUT)` to Vercel Blob | `upload()` from `@vercel/blob/client` + existing `compressForUpload()` helper |
| Image attach/reorder/delete | Custom mutations | Phase 13 `wardrobe.images.{attachImage, reorderImages, setPrimary, deleteImage}` |
| Settings get/update | New TRPC procedures | Phase 13 `admin.wardrobeSettings.{get, update}` — already shipped |
| Sidebar nav rendering | Custom `<Link>` lists | `getNavigationForRole(role)` consumed by `AppSidebar.tsx`; add entries to `navigation-config.ts` |
| Initials avatar | Custom canvas | Mirror `getInitials()` + `INITIALS_COLORS` from `CoachList.tsx:25-36` |
| Date formatting | `new Date().toLocaleDateString()` | `format(date, "MMM dd, yyyy")` from `date-fns` (mirror `CoachList.tsx:167-169`) |

**Key insight:** every primitive needed for Phase 14 already exists. The risk on this phase is not building new things — it's failing to find the existing thing and reinventing it inconsistently.

---

## Common Pitfalls

### Pitfall 1: Forgetting to handle `purchasePrice: null` in the form

**What goes wrong:** `purchasePrice` is `Int?` in Prisma (nullable). React Hook Form with `<Input type="number">` round-trips `null` as `""` and `z.coerce.number()` then crashes on the empty string.
**Why it happens:** `z.coerce.number()` treats `""` as `NaN`. The other optional numeric measurement fields (`chestMinCm`, etc.) have the same problem.
**How to avoid:** Wrap optional numeric fields as `z.preprocess((v) => v === "" ? undefined : v, z.coerce.number().int().optional())` OR convert at submit time (mirror `NewCoachDialog.tsx:103-118` which uses `data.field ? Number.parseInt(data.field, 10) : undefined`).

### Pitfall 2: Status filter not refetching on change

**What goes wrong:** Changing the `statusFilter` state doesn't trigger a refetch because the input shape didn't change in a way TRPC recognizes.
**Why it happens:** Passing `status: undefined` versus omitting the key entirely. TRPC's input serialization treats these identically, but a stale React Query cache may not invalidate.
**How to avoid:** Mirror `admin/payments/page.tsx:99-109` exactly — pass `status: statusFilter !== "ALL" ? statusFilter : undefined`. React Query keys this by serialized input, so a change in the value triggers a refetch.

### Pitfall 3: Image upload happens but Dress not in DB yet

**What goes wrong:** Admin fills new-dress form, drags an image into the gallery on the same page, server returns "Dress not found" from `/api/wardrobe/upload`.
**Why it happens:** Treating new-dress and edit-dress as one page. The image upload route lookups the dress at token-mint time.
**How to avoid:** **Create-then-redirect.** The new-dress page is metadata-only with no image gallery. Only the edit page (`/admin/wardrobe/[id]/edit`) renders `DressImageGallery`. The redirect from new → edit is instant on `createDress.onSuccess`.

### Pitfall 4: Reorder mutation rejects partial reorderings

**What goes wrong:** Calling `reorderImages` with three of five imageIds throws BAD_REQUEST.
**Why it happens:** Phase 13 `imageQueries.ts:104-109` validates `orderedIds.length === existingCount`.
**How to avoid:** The gallery must always pass the FULL ordered list. If using simple up/down buttons, rebuild the full array client-side after the swap and pass it intact.

### Pitfall 5: Initial form values stale on edit page

**What goes wrong:** Admin opens `/admin/wardrobe/[id]/edit`, form shows empty fields, then suddenly fills in 500ms later.
**Why it happens:** `useForm({ defaultValues: data })` runs before the TRPC query resolves; `defaultValues` is the literal `undefined`. RHF doesn't auto-update on prop change.
**How to avoid:** Use `useEffect(() => { if (data) form.reset(data); }, [data])` (mirror `admin/settings/page.tsx:181-194`). Or render-gate the form until `data !== undefined`.

### Pitfall 6: Settings page deserialization fallback to defaults swallows errors silently

**What goes wrong:** Admin updates settings, an invalid JSON shape gets saved, page reads back and shows the DEFAULTS — admin doesn't realize their save was lossy.
**Why it happens:** `getWardrobeSettings()` at `wardrobeSettingsQueries.ts:36-47` catches JSON parse failures and returns DEFAULTS. It's intentional resilience but UX-silent.
**How to avoid:** The Phase 14 settings page should trust the API and let Zod-on-the-mutation enforce validity. `wardrobeSettingsSchema` is `.partial()`-friendly so empty inputs are not corrupting.

### Pitfall 7: Forgetting to invalidate the list query after create/update/archive

**What goes wrong:** Admin creates a dress, returns to list, doesn't see it. Must hard-refresh.
**Why it happens:** Mutation succeeds but list query cache stays.
**How to avoid:** In each mutation `onSuccess`, call `utils.admin.wardrobe.management.list.invalidate()` (mirror `CoachList.tsx:97-101`).

---

## Code Examples

### Example 1: New-dress route — Create + redirect to edit

```tsx
// src/app/(protected)/admin/wardrobe/new/page.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "@/lib/api";
import { DressForm, dressFormSchema } from "@/features/admin/components/wardrobe/DressForm";

export default function NewDressPage() {
  const router = useRouter();
  const utils = api.useUtils();

  const createDress = api.admin.wardrobe.management.create.useMutation({
    onSuccess: (dress) => {
      utils.admin.wardrobe.management.list.invalidate();
      toast.success("Dress created", { description: "Add images to publish." });
      router.push(`/admin/wardrobe/${dress.id}/edit?tab=images`);
    },
    onError: (error) =>
      toast.error("Failed to create dress", { description: error.message }),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">New Dress</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a dress to inventory. Images can be added after the dress is created.
        </p>
      </div>
      <DressForm
        mode="create"
        onSubmit={(data) => createDress.mutate(data)}
        isSubmitting={createDress.isPending}
      />
    </div>
  );
}
```

### Example 2: Edit route — `params` is a Promise (Next.js 16)

```tsx
// src/app/(protected)/admin/wardrobe/[id]/edit/page.tsx
"use client";

import { useParams } from "next/navigation";
// Note: client components use useParams(); server components use `params: Promise<{id: string}>`
// Mirror the student/schedule/[lessonId]/page.tsx pattern only if going server-component (it does).

export default function EditDressPage() {
  const params = useParams<{ id: string }>();
  const dressId = params.id;

  const { data: dress, isLoading } = api.admin.wardrobe.management.getById.useQuery({ id: dressId });

  if (isLoading) return <LoadingSkeleton />;
  if (!dress) return notFound();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Edit Dress</h1>
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="status">Status & Internal</TabsTrigger>
        </TabsList>
        <TabsContent value="images">
          <DressImageGallery dressId={dress.id} images={dress.Images} />
        </TabsContent>
        {/* ...other tabs render DressForm slices */}
      </Tabs>
    </div>
  );
}
```

**Note:** the existing server-component dynamic route pattern (e.g. `student/schedule/[lessonId]/page.tsx:23-27`) uses `params: Promise<{ lessonId: string }>` and awaits it. The edit page above is client-only because the form is heavily interactive — `useParams()` is the correct client-side equivalent.

### Example 3: TRPC `create` mutation

```ts
// src/features/admin/api/queries/wardrobe/dressManagementQueries.ts (excerpt)
import { DressCategory, DressCondition, DressStatus } from "@prisma/client";

const createDressInput = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1),
  category: z.nativeEnum(DressCategory),
  themeTags: z.array(z.string()).default([]),
  color: z.string().min(1),
  secondaryColors: z.array(z.string()).default([]),
  condition: z.nativeEnum(DressCondition),
  yearMade: z.number().int().optional(),
  sizeLabel: z.string().min(1),
  chestMinCm: z.number().int().optional(),
  chestMaxCm: z.number().int().optional(),
  waistMinCm: z.number().int().optional(),
  waistMaxCm: z.number().int().optional(),
  hipsMinCm: z.number().int().optional(),
  hipsMaxCm: z.number().int().optional(),
  torsoMinCm: z.number().int().optional(),
  torsoMaxCm: z.number().int().optional(),
  lengthCm: z.number().int().optional(),
  alterableSmaller: z.boolean().default(false),
  alterableLarger: z.boolean().default(false),
  competitionPrice: z.number().int().nonnegative().default(5000),
  seasonalPrice: z.number().int().nonnegative().default(37500),
  purchasePrice: z.number().int().nonnegative().optional(),
  securityDeposit: z.number().int().nonnegative().default(20000),
  cleaningFee: z.number().int().nonnegative().default(3000),
  consignmentCommissionPct: z.number().int().min(0).max(100).default(0),
  internalNotes: z.string().optional(),
});

create: adminProcedure
  .input(createDressInput)
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.dress.create({
      data: {
        ...input,
        ownerId: ctx.session.user.id,    // admin owns admin-created dresses; can be reassigned
        status: "AVAILABLE",              // ADMIN-02 — bypass approval queue
      },
    });
  }),
```

**Critical:** `status: "AVAILABLE"` is the only place the bypass-approval behavior is encoded. The consigner self-serve flow in Phase 18 will use a different mutation that sets `PENDING_APPROVAL` and a different ownerId (the actual consigner).

### Example 4: TRPC `update` mutation

```ts
update: adminProcedure
  .input(
    createDressInput.partial().extend({
      id: z.string().cuid(),
      status: z.nativeEnum(DressStatus).optional(),  // admin can flip status (ADMIN-03)
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    return ctx.prisma.dress.update({ where: { id }, data });
  }),
```

### Example 5: Status badge component

```tsx
// src/features/admin/components/wardrobe/DressStatusBadge.tsx
import type { DressStatus } from "@prisma/client";

const STATUS_STYLES: Record<DressStatus, { bg: string; text: string; dot: string; label: string }> = {
  AVAILABLE:        { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500", label: "Available" },
  PENDING_APPROVAL: { bg: "bg-amber-100",   text: "text-amber-800",   dot: "bg-amber-500 animate-pulse", label: "Pending Approval" },
  PENDING:          { bg: "bg-cyan-100",    text: "text-cyan-800",    dot: "bg-cyan-500",    label: "Pending Rental" },
  RENTED:           { bg: "bg-violet-100",  text: "text-violet-800",  dot: "bg-violet-500",  label: "Rented" },
  MAINTENANCE:      { bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400",   label: "Maintenance" },
  REJECTED:         { bg: "bg-rose-100",    text: "text-rose-800",    dot: "bg-rose-500",    label: "Rejected" },
  ARCHIVED:         { bg: "bg-slate-100",   text: "text-slate-500",   dot: "bg-slate-300",   label: "Archived" },
};

export function DressStatusBadge({ status }: { status: DressStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
```

Palette adheres to CLAUDE.md brand sweep (emerald/amber/rose for green/orange/red replacements; cyan/violet for action colors).

---

## State of the Art

| Old Approach | Current Approach | When/Where |
|---|---|---|
| `getServerSession(authOptions)` | `await auth()` from `src/lib/auth.ts` | Server components; not used in Phase 14 client pages |
| `params: { id: string }` | `params: Promise<{ id: string }>` (Next 15+) | Server-component dynamic routes only; Phase 14 edit page uses client + `useParams()` |
| Direct `useQueryClient().invalidateQueries(['key'])` | `api.useUtils().admin.x.invalidate()` | All TRPC v11 mutation success handlers |
| Custom signed-URL upload via TRPC mutation | `upload()` from `@vercel/blob/client` + `/api/wardrobe/upload` handleUpload route | Phase 13 established this; Phase 14 reuses |
| `<button onClick={...}>Delete</button>` then `window.confirm` | `showDeleteConfirmation(label, onConfirm)` from `toast-confirmations.ts` | All destructive admin actions |
| Inline `bg-blue-*` / `text-blue-*` | `bg-[#0891b2]` cyan + `text-[#1a3a5c]` navy + emerald/amber/rose status pills | Per 2026-04-26 brand sweep in CLAUDE.md memory |

**Deprecated / outdated patterns to NOT use:**
- `getServerSession` (replaced by `auth()`)
- `bg-gray-50` / `bg-zinc-50` (use `bg-muted`)
- `text-blue-*` for analytics icons (use `text-[#0891b2]`)
- Sidebar collapse via `SidebarTrigger` on desktop (LOCKED: never collapsible on desktop per CLAUDE.md)

---

## Open Questions

1. **Should NAV-01 (student `/wardrobe` entry) land in Phase 14 or wait for Phase 15?**
   - What we know: NAV-01 requirement text says both admin AND student nav entries. The student page (`/wardrobe`) does not exist until Phase 15.
   - What's unclear: Whether the planner wants a 404-targeting nav link to ship early.
   - **Recommendation:** Ship both nav entries in Phase 14. A 404 link is harmless for a week, and splitting NAV-01 across phases adds task accounting overhead with no real benefit. Phase 15 then "uses" the existing entry rather than creating it.

2. **Should the admin-created dress's `ownerId` be the creating admin's User.id, or a sentinel "house inventory" User?**
   - What we know: Dress.ownerId is non-nullable FK to User. The semantic is "consigner" in Phase 18 — the person whose dress this is.
   - What's unclear: For admin-created dresses (ADMIN-02), who is the "owner"? Probably the admin's own user, but that conflates roles.
   - **Recommendation:** Use the admin's User.id (`ctx.session.user.id`) for MVP. Note in code comments that this may be replaced with a sentinel "Studio Inventory" user in a future phase. Make `ownerId` editable on the edit page (`/admin/wardrobe/[id]/edit`) so the admin can reassign ownership later if needed.

3. **Archive vs delete?**
   - What we know: Dress schema has `archivedAt DateTime?` and `DressStatus.ARCHIVED`. No hard delete in the Phase 13 design.
   - What's unclear: Whether the inventory grid needs a hard-delete action, or just an "archive" status flip.
   - **Recommendation:** Soft archive only (set `status: ARCHIVED, archivedAt: new Date()`). Hard delete is out of scope for an MVP that needs audit trail. Document this in the verification checklist.

4. **Is `setPrimary` exposed in the admin gallery UI?**
   - What we know: Phase 13 ships `wardrobe.images.setPrimary` even though it's not in the original plan deliverables — explicitly noted "Phase 14 gallery UI needs it" in 13-03-SUMMARY.md.
   - What's unclear: Whether the gallery should have an explicit "Set as primary" button or auto-treat the leftmost / first-uploaded image as primary.
   - **Recommendation:** Add an explicit "Set as primary" action (icon button) on each thumbnail. The first-uploaded image is auto-primary per Phase 13's `attachImage` (line 75), but admins should be able to reorder/swap.

---

## Sources

### Primary (HIGH confidence — read directly from repo)

- `src/lib/trpc.ts` — adminProcedure definition (lines 102-120)
- `src/lib/roles.ts` — isAdminRole helper
- `src/lib/navigation-config.ts` — sidebar config data
- `src/components/layout/AppLayout.tsx`, `AppSidebar.tsx` — layout primitives
- `src/lib/root.ts` — appRouter composition
- `src/lib/utils.ts` — formatCurrency helper
- `src/lib/toast-confirmations.ts` — showDeleteConfirmation helper
- `src/features/admin/api/queries/index.ts` — admin router composition
- `src/features/admin/api/queries/wardrobeSettingsQueries.ts` — Phase 13 settings router (already shipped, reuse)
- `src/features/admin/api/queries/coach/coachManagementQueries.ts` — createCoach reference shape (lines 122-228)
- `src/features/wardrobe/api/queries/imageQueries.ts` — Phase 13 image router (lines 44-192)
- `src/features/wardrobe/api/queries/index.ts` — wardrobe router composition
- `src/features/wardrobe/lib/compressImage.ts` — client compression helper
- `src/app/api/wardrobe/upload/route.ts` — Vercel Blob upload route
- `src/app/(protected)/admin/layout.tsx` — admin route wrapper
- `src/app/(protected)/admin/coaches/page.tsx` — list-page reference
- `src/app/(protected)/admin/payments/page.tsx` — list-page with status filter reference
- `src/app/(protected)/admin/settings/page.tsx` — settings page reference (Tabs, useEffect data hydration)
- `src/features/admin/components/coaches/management/NewCoachDialog.tsx` — RHF + Zod form reference
- `src/features/admin/components/coaches/management/CoachList.tsx` — table + status badge + KPI cards reference
- `src/features/admin/components/payments/PaymentFilter.tsx` — Select-based status filter reference
- `src/features/admin/components/management/DefaultPricingSettings.tsx` — settings card reference
- `prisma/schema.prisma` — Dress, DressImage, Settings models + DressStatus, DressCategory, DressCondition enums
- `.planning/phases/13-wardrobe-schema-foundation/13-RESEARCH.md` — Phase 13 architecture decisions
- `.planning/phases/13-wardrobe-schema-foundation/13-03-SUMMARY.md` — Phase 13 image pipeline confirmation
- `CLAUDE.md` (project) — layout, brand, Prisma relation case rules
- `~/.claude/projects/.../MEMORY.md` — 2026-04-26 brand sweep details

### Secondary (HIGH confidence — verified)

- `node_modules/lucide-react/dist/esm/icons/shirt.js` exists — `Shirt` icon is available
- `formatCurrency` at `src/lib/utils.ts:8` — single existing currency helper

### Tertiary (none — no WebSearch needed)

This phase is pure repo-internal pattern mirroring. No external sources were necessary; every architectural decision references existing files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency is already installed and used in Phase 13
- Architecture: HIGH — all five surfaces have direct existing analogs
- Settings page: HIGH — TRPC procedures already exist as a Phase 13 deliverable
- New-dress flow: MEDIUM — create-then-redirect is recommended but not yet proven in this repo; depends on planner accepting it
- Image gallery: MEDIUM — genuinely greenfield component; recommend prototyping early in the phase

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (30 days — patterns are stable since this is internal repo mirroring)
