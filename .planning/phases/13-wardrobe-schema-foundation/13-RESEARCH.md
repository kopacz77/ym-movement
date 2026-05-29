# Phase 13: Wardrobe Schema Foundation - Research

**Researched:** 2026-05-28
**Domain:** Prisma migrations on Neon Postgres + Vercel Blob image pipeline + TRPC integration
**Confidence:** HIGH on Blob SDK and Prisma migration mechanics; MEDIUM on the Settings extension because the design spec mis-states the existing Settings shape (see Critical Findings).

---

## Summary

Phase 13 introduces six new tables (Dress, DressImage, RentalRequest, Rental, plus enums), extends Student with ~9 nullable measurement columns, and wires the Vercel Blob upload pipeline. All of this is mechanically safe under `prisma migrate deploy` IF the schema is correctly authored: every new table is additive, every new column on Student is nullable, and no existing column is altered. Vercel Blob's `@vercel/blob/client` `upload()` + `handleUpload()` route handler is the canonical pattern in 2026 and replaces the older "manually generate a signed PUT URL via TRPC" idea — it is purpose-built for this exact flow, handles content-type + size enforcement server-side, and removes a class of footguns. Browser-side compression with `browser-image-compression` is the right pick (Web Worker support, mature, ~19KB).

The single most important finding is that **the design spec is wrong about the Settings model shape**: the existing `Settings` table is a key/value/JSON-blob store (`key String @unique, value String`), not a singleton row with typed columns. The planner must either (a) extend by adding a new `key: "wardrobe"` JSON blob (consistent with `operational` / `payment` / `rinkAreas` already used) OR (b) create a new typed `WardrobeSettings` model. Recommendation: option (a) for consistency with the codebase pattern; option (b) only if strong typing for these three integers is worth the divergence.

**Primary recommendation:** Use `@vercel/blob/client` `upload()` + Next.js API route with `handleUpload()` (NOT a TRPC-mediated signed URL flow). Keep migrations strictly additive. Store wardrobe defaults as a JSON blob in the existing `Settings` key/value table under `key: "wardrobe"`. Use named relations (`@relation("DressOwner")`) only where needed; default onDelete behavior (Restrict) is correct for `Dress.Owner` so deleting a User with active dresses fails loudly rather than silently orphaning rentals.

---

## Critical Findings (read first)

### 1. Settings is a key/value store, not a typed singleton

The design spec at lines 146-155 of `/home/kopacz/projects/ym-movement/docs/plans/2026-05-28-ym-wardrobe-mvp-design.md` reads:

```
// Add fields to the existing `Settings` row:
defaultConsignmentCommissionPct  Int     @default(15)
wardrobeRentalRequestExpiryDays  Int     @default(7)
wardrobeReturnReminderDays       Int     @default(1)
```

This is **not implementable as written**. The actual `Settings` model in `prisma/schema.prisma` (lines 205-211) is:

```prisma
model Settings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String         // JSON-serialized blob
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Existing usage in `src/features/admin/api/queries/settingsQueries.ts` shows three rows keyed `"operational"`, `"payment"`, `"rinkAreas"`, each holding a JSON.stringified object. The planner has two paths:

| Option | What it looks like | Pros | Cons |
|--------|---|------|------|
| **A. JSON blob (recommended)** | Add `key: "wardrobe"` row containing `{ defaultConsignmentCommissionPct, wardrobeRentalRequestExpiryDays, wardrobeReturnReminderDays }`. Validate with Zod in the TRPC layer (same pattern as `operationalSettingsSchema`). | Consistent with codebase pattern. Zero schema migration for Settings. Easy to extend later. | Loses DB-level type safety. Default values live in code, not DB. |
| **B. New typed table** | Create `model WardrobeSettings { id; defaultConsignmentCommissionPct Int @default(15); ... }` as a singleton (seed one row on first deploy). | DB-level types and defaults. Easier raw SQL queries. | Diverges from existing pattern. Requires seed step. |

**Recommendation: Option A.** Consistency wins for this MVP; if strong typing matters later, a future phase can migrate. Phase 13's "Success Criteria #3" ("Settings row gains wardrobe defaults...") is satisfied by inserting a `key: "wardrobe"` row at the application bootstrap or via a seed script, not by altering the table schema.

### 2. No existing image-upload pipeline to model after

`Coach.photoUrl` is a plain text-input URL field — there is no precedent for blob storage in the codebase. `@vercel/blob` is not installed. `BLOB_READ_WRITE_TOKEN` is not in `.env.example`. This is greenfield work, and the planner should treat it as such: add the env var to `.env.example`, add the package to deps, create the upload route fresh.

### 3. TRPC-mediated signed-URL flow vs `handleUpload`

The context proposed "TRPC mutation generates signed PUT URL, browser PUTs directly to Blob." The current Vercel SDK design has a purpose-built alternative — `@vercel/blob/client` `upload()` + a Next.js route handler with `handleUpload()`. This is **strictly better** for our case:

- Server-side content-type whitelist enforced at token-mint time (`allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp']`)
- Server-side max-bytes enforced at token-mint time (`maximumSizeInBytes: 5 * 1024 * 1024`)
- Built-in webhook `onUploadCompleted` to record the DB row — so even if the browser tab closes mid-write, the DressImage row gets written
- Auth check colocated with token mint via `onBeforeGenerateToken`
- No need to write raw `fetch(PUT)` glue or worry about CORS / pre-signed URL TTL

**The "signed PUT URL via TRPC mutation" approach described in Phase 13 STORAGE-01 should be re-interpreted as: a Next.js route handler at `/api/wardrobe/upload` doing `handleUpload()`.** TRPC's `wardrobe.uploadImageUrl` mutation is unnecessary — the SDK does that work. TRPC stays in charge of `attachImage`, `reorderImages`, and `deleteImage` (the relational bookkeeping), but the upload-token mint goes through a dedicated route handler because `handleUpload()` requires a `Request` object and writes its own JSON response shape that the `upload()` client expects.

---

## Standard Stack

### Core (new for Phase 13)

| Package | Version | Purpose | Why Standard |
|---|---|---|---|
| `@vercel/blob` | latest 1.x | Server-side blob ops (`del`, `head`, `handleUpload`) | First-party Vercel package; already on Vercel platform; supports OIDC auto-auth in production and BLOB_READ_WRITE_TOKEN locally |
| `browser-image-compression` | 2.x | Client-side resize + quality compression before upload | Web Worker support (off-main-thread), mature, ~19KB minified, exactly the API we need (maxWidthOrHeight, maxSizeMB, initialQuality, fileType, useWebWorker) |

### Already installed (relevant)

| Package | Version | Use in this phase |
|---|---|---|
| `@prisma/client` + `prisma` | 6.19.0 | Schema + `prisma migrate deploy` |
| `@trpc/server` + `@trpc/react-query` | 11.8.1 | New `wardrobe.*` router skeleton (just to expose CRUD; no upload mediation) |
| `next-auth` | 5.0.0-beta.30 | `auth()` check inside `onBeforeGenerateToken` |
| `zod` | 3.25.76 | Input validation on attach/delete/reorder mutations |

### Alternatives considered

| Instead of | Could use | Tradeoff |
|---|---|---|
| `@vercel/blob` | AWS S3 + presigned URL | More flexibility but requires AWS account, IAM setup, additional bandwidth costs. Project is already on Vercel — no win. |
| `browser-image-compression` | `compressorjs` (12KB) | Smaller bundle, but no Web Worker; main thread blocks on 1600px resize. Lower trade. |
| `browser-image-compression` | Native `CompressionStream` | Only gzip/deflate, not image-aware. Not applicable. |
| `handleUpload()` route | TRPC mutation returning signed PUT URL | Possible (`generateClientTokenFromReadWriteToken` from `@vercel/blob`), but loses the upload-completed webhook and content-type guarantees. Skip. |
| JSON blob `Settings` | New `WardrobeSettings` typed table | More typing, but diverges from existing pattern. Skip. |

**Installation:**

```bash
pnpm add @vercel/blob browser-image-compression
```

---

## Architecture Patterns

### Recommended file layout

```
prisma/
  schema.prisma                  # extended: 4 new models + 4 new enums + Student measurement cols
  migrations/
    20260528_xxx_add_wardrobe/   # single additive migration
      migration.sql

src/
  features/
    wardrobe/                    # NEW feature module — mirrors src/features/admin/, etc.
      api/
        queries/
          wardrobeQueries.ts     # public wardrobe.* router (catalog reads in phase 15)
          measurementQueries.ts  # wardrobe.measurements.get/update
          imageQueries.ts        # admin/consigner attachImage, reorderImages, deleteImage
          settingsQueries.ts     # wardrobe settings get/update (JSON-blob backed)
          index.ts               # composes wardrobeRouter
      lib/
        blob.ts                  # del() helper, validate-after-upload helper
        compressImage.ts         # client-side wrapper around browser-image-compression
        wardrobeSettings.ts      # Zod schema + read/write helpers for "wardrobe" Settings row
  app/
    api/
      wardrobe/
        upload/
          route.ts               # POST handler using handleUpload() — the actual blob upload endpoint
  lib/
    root.ts                      # add wardrobe + admin.wardrobe routers to appRouter
```

The router layout follows the existing `src/features/*/api/queries/` pattern (see `src/features/admin/api/queries/index.ts` for the composition example).

### Pattern 1: Vercel Blob `handleUpload` route

**What:** Single Next.js route handler that mints client tokens and receives upload-completed webhooks.
**When to use:** Every dress image upload.
**Source:** [Vercel docs — Client Uploads, 2026-03-27](https://vercel.com/docs/vercel-blob/client-upload), [`handleUpload` SDK reference, 2026-05-19](https://vercel.com/docs/vercel-blob/using-blob-sdk)

```ts
// src/app/api/wardrobe/upload/route.ts
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Not authenticated");

        // clientPayload carries { dressId } from the browser
        const { dressId } = JSON.parse(clientPayload ?? "{}") as { dressId?: string };
        if (!dressId) throw new Error("dressId required");

        // Authorize: caller is admin OR is the dress's ownerId
        const dress = await prisma.dress.findUnique({
          where: { id: dressId },
          select: { ownerId: true },
        });
        if (!dress) throw new Error("Dress not found");
        const role = session.user.role;
        const isOwner = dress.ownerId === session.user.id;
        const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
        if (!isOwner && !isAdmin) throw new Error("Forbidden");

        // Enforce 8-image cap server-side
        const count = await prisma.dressImage.count({ where: { dressId } });
        if (count >= 8) throw new Error("Image cap reached");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 5 * 1024 * 1024, // 5MB pre-compression cap
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            dressId,
            uploaderId: session.user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // NOTE: does NOT fire on localhost — see Local Dev Pitfalls below
        const { dressId } = JSON.parse(tokenPayload) as { dressId: string };
        const existing = await prisma.dressImage.count({ where: { dressId } });
        await prisma.dressImage.create({
          data: {
            dressId,
            url: blob.url,
            sortOrder: existing,
            isPrimary: existing === 0, // first image auto-primary
          },
        });
      },
    });

    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
```

### Pattern 2: Client-side compression + upload

```ts
// src/features/wardrobe/lib/compressImage.ts
import imageCompression from "browser-image-compression";

export async function compressForUpload(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.4,                         // ~400KB target
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.8,
    fileType: file.type === "image/png" ? "image/png" : "image/jpeg",
  });
}
```

```tsx
// in a React component
import { upload } from "@vercel/blob/client";
import { compressForUpload } from "@/features/wardrobe/lib/compressImage";

async function handleFile(file: File, dressId: string) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File exceeds 5MB pre-compression limit");
  }
  const compressed = await compressForUpload(file);
  const blob = await upload(`wardrobe/${dressId}/${file.name}`, compressed, {
    access: "public",                        // dress photos are public catalog
    handleUploadUrl: "/api/wardrobe/upload",
    clientPayload: JSON.stringify({ dressId }),
  });
  // No need to call attachImage — onUploadCompleted in the route handler writes the DressImage row
  return blob;
}
```

### Pattern 3: Image deletion (single TRPC mutation)

```ts
// src/features/wardrobe/api/queries/imageQueries.ts
import { del } from "@vercel/blob";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/lib/trpc";

export const imageRouter = createTRPCRouter({
  deleteImage: protectedProcedure
    .input(z.object({ imageId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const image = await ctx.prisma.dressImage.findUnique({
        where: { id: input.imageId },
        include: { Dress: { select: { ownerId: true } } },
      });
      if (!image) throw new TRPCError({ code: "NOT_FOUND" });

      const role = ctx.session?.user.role;
      const isOwner = image.Dress.ownerId === ctx.session?.user.id;
      const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
      if (!isOwner && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

      // Order matters: del() is idempotent (no-op on missing blob), so do it first.
      // If the DB delete fails after, we have an orphaned row — but the row references a
      // dead URL, which is loud (404 in UI), not silent (orphan blob accruing storage cost).
      await del(image.url);
      await ctx.prisma.dressImage.delete({ where: { id: input.imageId } });

      // If we deleted the primary, promote the lowest sortOrder remaining image
      if (image.isPrimary) {
        const next = await ctx.prisma.dressImage.findFirst({
          where: { dressId: image.dressId },
          orderBy: { sortOrder: "asc" },
        });
        if (next) {
          await ctx.prisma.dressImage.update({
            where: { id: next.id },
            data: { isPrimary: true },
          });
        }
      }
      return { success: true };
    }),
});
```

### Anti-patterns to avoid

- **Don't stream file bytes through TRPC.** TRPC procedures aren't designed for multipart bodies; you'd serialize to base64 and bloat memory 33%. Use the `handleUpload()` route instead.
- **Don't put image upload behind `adminProcedure` only.** Consigners (any User who owns a Dress) must also upload — gate via the runtime ownerId-or-admin check shown above, not via TRPC middleware role.
- **Don't trust client-side size/type checks alone.** Always enforce via `allowedContentTypes` and `maximumSizeInBytes` in `onBeforeGenerateToken` so a hostile client can't bypass.
- **Don't use `addRandomSuffix: false`.** Filenames collide; you'd lose images. Spec already says yes; the SDK docs reinforce this strongly.
- **Don't store the consignmentCommissionPct as a Float.** Use Int (basis points are over-engineering for an MVP; integer percentage 0-100 is enough; design spec already does this).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Signed PUT URL generation | `crypto.createSign()` + custom token mint | `handleUpload()` from `@vercel/blob/client` | Webhook on completion, content-type whitelist, size cap, auth callback — all in one. The Vercel team owns the security model. |
| Browser image resize | Canvas API + custom Promise wrapper | `browser-image-compression` | EXIF orientation handling, Web Worker offload, file-type conversion, progress callbacks — already solved. |
| Migration safety | Hand-written SQL | `prisma migrate deploy` against the schema diff | The schema diff is purely additive; Prisma generates the right SQL automatically. |
| Image sort/reorder ordering | Linked list rows | Plain `sortOrder Int` with `orderBy: { sortOrder: "asc" }` | Already in the design spec. Reorder = `prisma.$transaction` of `updateMany` calls with new sortOrder values. |
| Primary-image enforcement | DB CHECK constraint or partial unique index | Application-layer invariant in the attach/delete mutations | One row with `isPrimary = true` per dress is easier to maintain in TS than via a partial unique index (which Postgres supports but Prisma's introspection treats inconsistently). |

**Key insight:** every problem in Phase 13 has a well-trodden solution. The risk is in *integration*, not *invention*.

---

## Common Pitfalls

### Pitfall 1: `onUploadCompleted` does not fire on localhost

**What goes wrong:** During local dev (`pnpm dev` on :3100), Vercel's blob service cannot reach back to your laptop. So `prisma.dressImage.create()` never runs. The upload appears to succeed (blob exists at the URL) but no DressImage row is written.

**Why it happens:** `onUploadCompleted` is delivered via a webhook from Vercel Blob to your `VERCEL_URL` / production domain. Localhost is unreachable from outside.

**How to avoid:**
1. Document this clearly in the phase plan — tasks should know the local test loop differs.
2. For E2E or manual local testing of the upload flow, use `ngrok` and set `VERCEL_BLOB_CALLBACK_URL=https://abc123.ngrok-free.app` in `.env.local`.
3. Alternatively, provide a fallback `attachImage` TRPC mutation that the client calls after `upload()` resolves on localhost only — but this duplicates logic and risks drift. Prefer ngrok.

**Warning signs:** Empty DressImage table after a "successful" upload in local dev; image visible in Vercel Blob dashboard but not in the UI.

### Pitfall 2: Cascade delete of Dress would delete DressImage rows but NOT Blobs

**What goes wrong:** If a Dress is hard-deleted (or cascade-deleted via User deletion), Prisma's `onDelete: Cascade` on DressImage drops the DB rows. The blob objects in Vercel Blob remain forever, accruing storage cost.

**Why it happens:** Prisma cascades happen at the DB layer; Vercel Blob is external storage.

**How to avoid:**
- The design spec already says Dress.Owner relation does NOT cascade (`Dress` should not auto-delete when User is deleted). Confirm with `onDelete: Restrict` (the default for required relations).
- Dress archival is soft (status = ARCHIVED, archivedAt set) — no cascade triggered.
- If admin ever does a hard `prisma.dress.delete()`, the application code must `del()` each image's URL first. Wrap this in a `deleteDress` TRPC mutation that does both. Phase 13 may not need this mutation yet — but document it as a constraint so phase 14/18 builds it correctly.

**Warning signs:** Vercel Blob storage usage growing without corresponding Dress row growth.

### Pitfall 3: Settings JSON blob mis-parsing

**What goes wrong:** Wardrobe code reads `Settings.findUnique({ where: { key: "wardrobe" } })`, gets `null` on first run, falls back to defaults — but a typo somewhere writes `key: "Wardrobe"` (capitalized) so reads and writes target different rows.

**Why it happens:** Stringly-typed key columns invite typos.

**How to avoid:** Define a single `WARDROBE_SETTINGS_KEY = "wardrobe" as const` and import it everywhere. Mirror the `operationalSettingsSchema` pattern from `settingsQueries.ts` exactly: Zod schema → parse on read → fallback to typed defaults → JSON.stringify on write.

**Warning signs:** Two `Settings` rows with similar-looking keys in `prisma studio`.

### Pitfall 4: User has many relations to many tables; named relation needed only for the ambiguous one

**What goes wrong:** Adding `OwnedDresses Dress[] @relation("DressOwner")` to User and then writing `Owner User @relation("DressOwner", fields: [ownerId], references: [id])` on Dress is correct. But if a future phase adds another User→Dress relation (e.g. `lastEditedById`), Prisma will demand a relation name on BOTH and break the existing migration if not handled.

**Why it happens:** Prisma's auto-naming kicks in when there's only one relation between two models. As soon as there are two, both must be explicitly named.

**How to avoid:** Always use the named-relation form `@relation("DressOwner", ...)` from the start — never rely on Prisma auto-naming for new models that may grow second relations. The design spec already does this correctly. Per [Prisma docs on relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations), the name argument is exactly for this disambiguation.

**Warning signs:** `prisma generate` errors like "Ambiguous relation detected" — usually mid-future-phase, not Phase 13.

### Pitfall 5: `prisma migrate deploy` failure leaves the database in a half-applied state

**What goes wrong:** The migration runs CREATE TABLE Dress, CREATE TABLE DressImage, then fails halfway through CREATE TABLE Rental due to (e.g.) a typo or a transient Neon disconnect. Per [Prisma docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing), further `migrate deploy` runs are blocked until the failed migration is resolved.

**Why it happens:** Without a transactional wrapper, partial SQL statements can apply.

**How to avoid:**
1. **Wrap the migration in `BEGIN; ... COMMIT;`** — author the `migration.sql` file manually after Prisma generates it, prepending `BEGIN;` and appending `COMMIT;`. Postgres will roll back the entire migration on failure.
2. Before running `pnpm prisma:migrate`, run `pnpm db:check` to capture row counts.
3. If the deploy fails: do NOT run another migration. Run `pnpm prisma migrate status` to inspect, then either `prisma migrate resolve --rolled-back <name>` (after manually reverting any partial DDL) or use Neon's point-in-time restore to the timestamp before the migration started.
4. Hot-fix code path: split risky migrations into multiple migration files. For Phase 13, the schema is purely additive, so a single migration is fine — but the BEGIN/COMMIT wrapper is cheap insurance.

**Warning signs:** `pnpm prisma:migrate` exits non-zero; subsequent migration attempts fail with "P3009 migrate found failed migrations".

### Pitfall 6: Public vs Private blob access

**What goes wrong:** Set `access: "private"` on the upload and then put `<img src={blob.url}>` in the catalog. Browser requests fail because private blobs require a signed URL.

**Why it happens:** Vercel Blob has two access tiers. Private = signed URL needed per read. Public = anyone-with-URL can fetch.

**How to avoid:** Dress catalog images should be `access: "public"`. They're product photos shown to all authenticated users (and arguably should be visible without auth on a future public catalog). Confirmed by the design spec — `/wardrobe` is "students browse the catalog" and there's no privacy requirement. Set `access: "public"` in both `upload()` and the `Blob store` configuration.

**Warning signs:** 401/403 on `<img>` fetches; URLs containing `?token=...` query params.

---

## Code Examples

### Migration SQL skeleton (additive, transaction-wrapped)

After authoring the Prisma schema and running locally to generate the migration file, manually edit it to wrap in a transaction:

```sql
-- prisma/migrations/20260528_xxx_add_wardrobe/migration.sql
BEGIN;

-- CreateEnum
CREATE TYPE "DressCategory" AS ENUM ('CLASSICAL', 'DRAMATIC', 'THEMED', 'ICE_DANCE_PARTNER', 'ICE_DANCE_SINGLE', 'COMPETITION', 'TEST');

CREATE TYPE "DressCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GENTLY_USED', 'USED');

CREATE TYPE "DressStatus" AS ENUM ('PENDING_APPROVAL', 'AVAILABLE', 'PENDING', 'RENTED', 'MAINTENANCE', 'ARCHIVED', 'REJECTED');

CREATE TYPE "RentalType" AS ENUM ('COMPETITION', 'SEASONAL', 'PURCHASE');

CREATE TYPE "RentalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CONVERTED', 'CANCELED');

CREATE TYPE "RentalPaymentStatus" AS ENUM ('AWAITING_PAYMENT', 'PAID', 'RETURNED', 'DEPOSIT_RELEASED', 'LATE_FEE_OWED');

-- AlterTable: Student measurements (all nullable, safe)
ALTER TABLE "Student"
  ADD COLUMN "heightCm" INTEGER,
  ADD COLUMN "chestCm" INTEGER,
  ADD COLUMN "waistCm" INTEGER,
  ADD COLUMN "hipsCm" INTEGER,
  ADD COLUMN "torsoCm" INTEGER,
  ADD COLUMN "inseamCm" INTEGER,
  ADD COLUMN "sleeveLengthCm" INTEGER,
  ADD COLUMN "preferredFitNotes" TEXT,
  ADD COLUMN "measurementsUpdatedAt" TIMESTAMP(3);

-- CreateTable: Dress, DressImage, RentalRequest, Rental
-- (Prisma autogenerates this — leave as-is)

COMMIT;
```

> The `BEGIN`/`COMMIT` wrapper is the cheapest insurance against half-applied migrations on Neon. Postgres DDL is transactional, so this works.

### Pre-migration safety check (extend existing)

The existing `scripts/pre-migration-check.ts` only counts old tables. Extend it after the migration deploys so future migrations get visibility:

```ts
// In scripts/pre-migration-check.ts, after the existing counts:
const dresses = await prisma.dress.count();
const dressImages = await prisma.dressImage.count();
const rentalRequests = await prisma.rentalRequest.count();
const rentals = await prisma.rental.count();

tables.push(
  { table: "Dress", count: dresses },
  { table: "DressImage", count: dressImages },
  { table: "RentalRequest", count: rentalRequests },
  { table: "Rental", count: rentals },
);
```

This is a tiny tweak but it satisfies the spec's "Health & Safety Checks" requirement and gives every future migration a tripwire on the wardrobe data.

### Wardrobe settings helper

```ts
// src/features/wardrobe/lib/wardrobeSettings.ts
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const WARDROBE_SETTINGS_KEY = "wardrobe" as const;

export const wardrobeSettingsSchema = z.object({
  defaultConsignmentCommissionPct: z.number().int().min(0).max(100).default(15),
  wardrobeRentalRequestExpiryDays: z.number().int().positive().default(7),
  wardrobeReturnReminderDays: z.number().int().positive().default(1),
});

export type WardrobeSettings = z.infer<typeof wardrobeSettingsSchema>;

const DEFAULTS: WardrobeSettings = wardrobeSettingsSchema.parse({});

export async function getWardrobeSettings(): Promise<WardrobeSettings> {
  const row = await prisma.settings.findUnique({ where: { key: WARDROBE_SETTINGS_KEY } });
  if (!row) return DEFAULTS;
  try {
    return wardrobeSettingsSchema.parse(JSON.parse(row.value));
  } catch {
    return DEFAULTS;
  }
}

export async function updateWardrobeSettings(patch: Partial<WardrobeSettings>): Promise<WardrobeSettings> {
  const current = await getWardrobeSettings();
  const next = wardrobeSettingsSchema.parse({ ...current, ...patch });
  await prisma.settings.upsert({
    where: { key: WARDROBE_SETTINGS_KEY },
    update: { value: JSON.stringify(next), updatedAt: new Date() },
    create: { key: WARDROBE_SETTINGS_KEY, value: JSON.stringify(next) },
  });
  return next;
}
```

This mirrors the existing `settingsQueries.ts` pattern exactly. Future phases (14-22) consume `getWardrobeSettings()` instead of reading raw Settings rows.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|---|---|---|
| Manual `crypto`-signed PUT URL via TRPC mutation | `handleUpload()` route + `@vercel/blob/client` `upload()` | Less code, webhook on completion, type-safe, content-type enforcement at mint time |
| Cloudinary or S3 for image storage | Vercel Blob | $0.023/GB-month storage, $0.05/GB transfer; OIDC auth on Vercel; no separate vendor |
| `compressor.js` (canvas only, main-thread) | `browser-image-compression` (Web Worker) | No UI freeze during compression on large files |
| `BLOB_READ_WRITE_TOKEN` everywhere | OIDC token auto-resolved on Vercel; `BLOB_READ_WRITE_TOKEN` only locally | More secure rotation; but `handleUpload()` still requires the read-write token specifically. Keep `BLOB_READ_WRITE_TOKEN` in env for client-token signing. |

**Deprecated / outdated patterns to avoid:**
- The older `vercel/blob` v0.x `generateClientTokenFromReadWriteToken` direct call. The `handleUpload()` wrapper is now the canonical entry point.
- "Singleton Settings row with typed columns" — the codebase explicitly uses the key/value pattern; don't fight it.

---

## Open Questions

### 1. Should `Dress.Owner` use `onDelete: Restrict` or `onDelete: SetNull`?

- **What we know:** Per [Prisma referential actions docs](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions), the default for a required relation is `Restrict` — deletion of the parent fails if children exist. The design spec doesn't specify `onDelete` for `Dress.Owner`. The User → Coach / Student relations in the existing schema use `Cascade` (delete user → delete coach/student). But for Dress, cascading on User delete would orphan rentals and lose audit history.
- **What's unclear:** Whether the team wants "deleting a consigner is forbidden if they have any dresses" (Restrict) or "deleting a consigner archives their dresses" (SetNull, requires ownerId to become nullable).
- **Recommendation:** Default `Restrict` for Phase 13. If the team later wants soft-delete-on-consigner-leave, add a `Dress.archivedByOwnerDeleteAt` column in a future migration and convert. This deferral is safe.

### 2. Should `RentalRequest.Dress` and `Rental.Dress` cascade?

- **What we know:** Spec doesn't specify. Cascading would mean "archive a Dress → all PENDING requests disappear" which is bad UX (the student gets ghosted, no notification).
- **What's unclear:** What the right behavior is when a Dress is hard-deleted vs archived.
- **Recommendation:** Use `Restrict` (default). Dress archival is soft via `status = ARCHIVED`. If a hard delete is ever needed, application code must clean up requests/rentals first. Surface this constraint to phase 14 (admin CRUD).

### 3. Is "8-image cap" enforced at write time or read time?

- **What we know:** The cap is server-side in the `onBeforeGenerateToken` callback (shown in the example above). That's race-condition-safe enough for single-admin upload flow.
- **What's unclear:** Whether two concurrent uploads from the same admin could both pass the `count() < 8` check and end up with 9 images. Low probability in practice.
- **Recommendation:** Accept the small race window. If it becomes a problem, a Postgres CHECK via a function trigger or a counter column with optimistic concurrency could enforce it. Not worth Phase 13 complexity.

### 4. Should the Phase 13 plan include a seed/bootstrap step for the wardrobe Settings row?

- **What we know:** Option A (JSON blob) means no seed migration — defaults come from code on first read.
- **What's unclear:** Whether admin should see "no row exists yet" vs "defaults loaded" in the eventual settings UI.
- **Recommendation:** Lazy-create on first write (the `upsert` in `updateWardrobeSettings` handles it). No explicit seed needed.

---

## Sources

### Primary (HIGH confidence)

- [Vercel Blob — Client Uploads guide](https://vercel.com/docs/vercel-blob/client-upload) (last_updated 2026-03-27) — canonical `upload()` + `handleUpload()` pattern, content-type whitelist, authentication callback
- [Vercel Blob — `@vercel/blob` SDK reference](https://vercel.com/docs/vercel-blob/using-blob-sdk) (last_updated 2026-05-19) — `put`, `del`, `head`, `handleUpload` signatures, OIDC vs `BLOB_READ_WRITE_TOKEN`, `addRandomSuffix`, `maximumSizeInBytes`, `allowedContentTypes`
- [Prisma Migrate — Patching and hotfixing](https://www.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing) — failed migration recovery via `migrate resolve`
- [Prisma — Referential actions](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions) — Cascade / Restrict / SetNull / NoAction / SetDefault semantics and defaults
- [Prisma — Relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations) — multiple-relation disambiguation via named `@relation("X", ...)`
- `/home/kopacz/projects/ym-movement/prisma/schema.prisma` — actual current schema (the source of truth that contradicts the design spec's Settings shape)
- `/home/kopacz/projects/ym-movement/src/features/admin/api/queries/settingsQueries.ts` — existing key/value Settings access pattern (mirror this)
- `/home/kopacz/projects/ym-movement/CLAUDE.md` — migration safety rules

### Secondary (MEDIUM confidence)

- [Prisma — Limitations and known issues](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues) — known migration gotchas
- [DEV — Prisma Migrations in Production: Zero-Downtime Strategies](https://dev.to/whoffagents/prisma-migrations-in-production-zero-downtime-strategies-and-rollback-patterns-3nf1) — expand-then-contract pattern for risky changes
- [browser-image-compression npm](https://www.npmjs.com/package/browser-image-compression) — API + options (`maxSizeMB`, `maxWidthOrHeight`, `useWebWorker`, `initialQuality`, `fileType`, `preserveExif`)
- [TryUtils — Browser Image Compression Libraries](https://www.tryutils.com/en/blog/imagecompression/browser-image-compression-libraries) — bundle size comparison (browser-image-compression ~19KB vs compressorjs ~12KB)
- [Vercel Blob pricing (Twitter announcement)](https://x.com/vercel/status/1925632672488968683) — $0.023/GB-month storage, $0.05/GB transfer (general availability all plans)

### Tertiary (LOW confidence)

- Specific Vercel Blob Hobby plan storage/bandwidth caps were not nailed down — the public pricing page hides exact free-tier numbers behind the dashboard. **Recommendation:** Planner does not depend on a specific free quota; document this as a runtime concern, monitor Vercel dashboard once Phase 13 ships.

---

## Metadata

**Confidence breakdown:**

- Vercel Blob SDK + client upload flow: HIGH — taken directly from Vercel docs dated 2026-03-27 and 2026-05-19
- Prisma migration safety + referential actions: HIGH — official Prisma docs + corroborating community sources + actual repo migration history
- Settings extension approach: HIGH on the *fact* that the model is key/value (verified in schema + existing router code); MEDIUM on whether the team prefers option A or B — flagged for planner decision
- browser-image-compression: MEDIUM-HIGH — npm listing + community comparisons agree, library is mature (last release in 2.x range, actively maintained)
- Local-dev `onUploadCompleted` webhook limitation: HIGH — explicitly documented in Vercel client-upload guide
- Vercel Blob pricing details: MEDIUM — public sources confirm starting prices; Hobby caps remain dashboard-only

**Research date:** 2026-05-28
**Valid until:** 2026-07-15 (Vercel Blob SDK is on a fast cadence — verify @vercel/blob major version at the time of implementation)
