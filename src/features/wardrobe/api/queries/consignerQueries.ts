// src/features/wardrobe/api/queries/consignerQueries.ts
//
// Phase 18 self-serve consignment TRPC procedures. Mounted at wardrobe.consigner.*.
//
// PERM-01 is enforced inline via assertOwnsDress (NOT via a new middleware) — the
// codebase pattern is per-procedure ownership checks (Phase 16 requestQueries.cancel,
// Phase 13 imageQueries.assertCanModifyDress).
//
// CONSIGN-02 (forbidden fields hidden from consigner) is enforced via Zod .pick() —
// the input schemas omit consignmentCommissionPct, securityDeposit, cleaningFee, and
// the admin-only notes column. Zod silently strips unknown keys, so a malicious
// client sending those fields gets them ignored on parse. The create mutation then
// sets consignmentCommissionPct from Settings server-side.
//
// CONSIGN-04 (pricing/size locked after first approval) is enforced inline: the
// update mutation checks dress.status and BAD_REQUESTs locked fields if status is
// post-approval (any state OTHER than PENDING_APPROVAL or REJECTED).

import type { DressStatus, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { dressInputSchema } from "@/features/admin/api/queries/wardrobeDressQueries";
import { getWardrobeSettings } from "@/features/admin/api/queries/wardrobeSettingsQueries";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

/**
 * Asserts that the calling session.user owns the given dress. Throws:
 *   - UNAUTHORIZED if no session (shouldn't happen behind protectedProcedure but
 *     belt-and-suspenders for type safety)
 *   - NOT_FOUND if the dress id doesn't exist
 *   - FORBIDDEN if the dress exists but is owned by someone else
 *
 * Returns { ownerId, status } so the caller can do further gates (e.g. status
 * checks in archive/resubmit/update) without re-querying.
 *
 * PERM-01 enforcement point. Distinct from imageQueries.assertCanModifyDress
 * which ALSO accepts admins -- this helper does NOT, because admin-side
 * consigner moderation lives under admin.wardrobe.* (separate procedures with
 * adminProcedure middleware).
 */
async function assertOwnsDress(
  ctx: { prisma: PrismaClient; session: { user: { id: string } } | null },
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
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this dress" });
  }
  return dress;
}

/**
 * Fields the consigner is allowed to set on create. Notably EXCLUDES:
 *   - consignmentCommissionPct (server reads from Settings)
 *   - securityDeposit, cleaningFee (server uses schema defaults)
 *   - admin-only notes column (hidden from consigners per CONSIGN-02)
 *
 * Zod silently strips unknown keys on parse, so a malicious client sending the
 * excluded fields gets them ignored. The mutation then explicitly hardcodes
 * consignmentCommissionPct from Settings server-side.
 */
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

/**
 * Fields that are LOCKED after the dress's first approval. Mutating these on a
 * dress whose status is anything other than PENDING_APPROVAL or REJECTED yields
 * a BAD_REQUEST. Cosmetic fields (title/description/themeTags/color/
 * secondaryColors) are always editable.
 */
const LOCKED_AFTER_APPROVAL_KEYS = [
  "sizeLabel",
  "chestMinCm",
  "chestMaxCm",
  "waistMinCm",
  "waistMaxCm",
  "hipsMinCm",
  "hipsMaxCm",
  "torsoMinCm",
  "torsoMaxCm",
  "lengthCm",
  "alterableSmaller",
  "alterableLarger",
  "competitionPrice",
  "seasonalPrice",
  "purchasePrice",
] as const satisfies readonly (keyof z.infer<typeof consignerCreateInputSchema>)[];

/**
 * Update schema: same allow-list as create, all fields optional (partial update).
 * The runtime gate inside the mutation BAD_REQUESTs the LOCKED fields (pricing +
 * size) when dress.status is post-approval.
 */
export const consignerUpdateInputSchema = z
  .object({ id: z.string().cuid() })
  .merge(consignerCreateInputSchema.partial());

export const consignerRouter = createTRPCRouter({
  /**
   * CONSIGN-01: A consigner creates a new dress listing.
   *
   * Server forces status=PENDING_APPROVAL (clients cannot bypass the approval
   * gate). consignmentCommissionPct is hydrated from Settings on every call —
   * the default the admin configured in /admin/wardrobe/settings is the
   * canonical value, applied at create time so per-dress overrides can land
   * later via admin.wardrobe.approveDress override.
   *
   * securityDeposit + cleaningFee fall back to the schema @default values
   * (20000 + 3000 cents respectively).
   */
  create: protectedProcedure.input(consignerCreateInputSchema).mutation(async ({ ctx, input }) => {
    const settings = await getWardrobeSettings(ctx.prisma);
    return ctx.prisma.dress.create({
      data: {
        ...input,
        ownerId: ctx.session.user.id,
        status: "PENDING_APPROVAL",
        consignmentCommissionPct: settings.defaultConsignmentCommissionPct,
        // securityDeposit + cleaningFee fall back to schema @default(20000) / @default(3000)
        // rejectionReason intentionally left as schema default (NULL)
      },
    });
  }),

  /**
   * CONSIGN-04 + PERM-01: Caller updates their own dress. Caller-owns guard
   * via assertOwnsDress. Locked-field gate via LOCKED_AFTER_APPROVAL_KEYS when
   * status is post-approval (AVAILABLE, PENDING, RENTED, MAINTENANCE, ARCHIVED).
   * Pre-approval states (PENDING_APPROVAL, REJECTED) allow every consigner-set
   * field.
   *
   * This procedure NEVER touches status or rejectionReason. The
   * REJECTED → PENDING_APPROVAL transition belongs to resubmit() exclusively;
   * the AVAILABLE flip belongs to admin.wardrobe.approveDress.
   */
  update: protectedProcedure.input(consignerUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const { id, ...patch } = input;
    const dress = await assertOwnsDress(ctx, id);

    // CONSIGN-04: pricing + size locked after first approval. Pre-approval states
    // (PENDING_APPROVAL, REJECTED) allow ALL fields. Post-approval states
    // (AVAILABLE, PENDING, RENTED, MAINTENANCE, ARCHIVED) reject the locked keys.
    const isPreApproval = dress.status === "PENDING_APPROVAL" || dress.status === "REJECTED";
    if (!isPreApproval) {
      for (const key of LOCKED_AFTER_APPROVAL_KEYS) {
        if (patch[key] !== undefined) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot edit ${key} after dress has been approved`,
          });
        }
      }
    }

    // NEVER auto-flip status or rejectionReason here. resubmit() owns the
    // REJECTED → PENDING_APPROVAL transition explicitly.
    return ctx.prisma.dress.update({ where: { id }, data: patch });
  }),

  /**
   * CONSIGN-05: Caller archives their own dress. Only AVAILABLE dresses can be
   * archived — pulling a dress with a pending or active rental would corrupt
   * the rental lifecycle. To archive a dress with active rentals, the consigner
   * must wait for the rental to complete and return to AVAILABLE.
   */
  archive: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const dress = await assertOwnsDress(ctx, input.id);
      if (dress.status !== "AVAILABLE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only available dresses can be archived (cannot pull during pending rental)",
        });
      }
      return ctx.prisma.dress.update({
        where: { id: input.id },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
    }),

  /**
   * CONSIGN-09: Caller resubmits a REJECTED dress for another round of admin
   * review. Flips status REJECTED → PENDING_APPROVAL and clears the stale
   * rejectionReason. The consigner typically calls update() first to address
   * the admin's feedback, then resubmit() to put it back in the queue.
   */
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
          rejectionReason: null, // clear the stale reason on resubmit
        },
      });
    }),

  /**
   * Caller fetches a single one of their own dresses (used by the consigner
   * edit page in Plan 18-06). Explicit select OMITS the admin-only notes
   * column (per CONSIGN-02). rejectionReason is INCLUDED so the consigner can
   * read it on the REJECTED banner.
   */
  byId: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnsDress(ctx, input.id);
      return ctx.prisma.dress.findUniqueOrThrow({
        where: { id: input.id },
        select: {
          id: true,
          ownerId: true,
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
          securityDeposit: true,
          cleaningFee: true,
          consignmentCommissionPct: true, // visible — it's THEIR own commission rate
          status: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true,
          archivedAt: true,
          Images: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, url: true, isPrimary: true, sortOrder: true },
          },
        },
      });
    }),

  /**
   * Caller lists ALL of their own dresses across every status (used by Plan
   * 18-05 MyConsignedDressesList — the UI groups by status into tabs).
   * Explicit select OMITS the admin-only notes column.
   */
  mine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.dress.findMany({
      where: { ownerId: ctx.session.user.id },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        color: true,
        sizeLabel: true,
        status: true,
        rejectionReason: true,
        competitionPrice: true,
        seasonalPrice: true,
        purchasePrice: true,
        consignmentCommissionPct: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        Images: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1,
        },
        _count: { select: { Images: true, Rentals: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),
});
