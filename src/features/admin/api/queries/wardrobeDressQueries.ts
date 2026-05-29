// src/features/admin/api/queries/wardrobeDressQueries.ts

import { DressCategory, DressCondition, DressStatus, type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/lib/trpc";

/**
 * Shared Zod schema for dress create/update inputs.
 *
 * Mirrors the Prisma `Dress` model fields EXCEPT system-managed columns
 * (`id`, `createdAt`, `updatedAt`, `archivedAt`, `ownerId`, `status`) -- those
 * are set automatically by the server (`ownerId` from the session, `status` to
 * AVAILABLE on create, archivedAt on archive).
 *
 * Exported so that the admin form (Wave 2) can reuse this exact schema via
 * React Hook Form + zodResolver for client-side validation.
 *
 * All money fields are Int cents (e.g. 37500 = $375.00). See
 * `formatCurrencyFromCents` in `@/lib/utils` for display formatting.
 */
export const dressInputSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1),
  category: z.nativeEnum(DressCategory),
  themeTags: z.array(z.string()).default([]),
  color: z.string().min(1),
  secondaryColors: z.array(z.string()).default([]),
  condition: z.nativeEnum(DressCondition),
  yearMade: z.number().int().optional(),
  sizeLabel: z.string().min(1),
  chestMinCm: z.number().int().nonnegative().optional(),
  chestMaxCm: z.number().int().nonnegative().optional(),
  waistMinCm: z.number().int().nonnegative().optional(),
  waistMaxCm: z.number().int().nonnegative().optional(),
  hipsMinCm: z.number().int().nonnegative().optional(),
  hipsMaxCm: z.number().int().nonnegative().optional(),
  torsoMinCm: z.number().int().nonnegative().optional(),
  torsoMaxCm: z.number().int().nonnegative().optional(),
  lengthCm: z.number().int().nonnegative().optional(),
  alterableSmaller: z.boolean().default(false),
  alterableLarger: z.boolean().default(false),
  competitionPrice: z.number().int().nonnegative().default(5000), // cents
  seasonalPrice: z.number().int().nonnegative().default(37500), // cents
  purchasePrice: z.number().int().nonnegative().optional(), // cents
  securityDeposit: z.number().int().nonnegative().default(20000), // cents
  cleaningFee: z.number().int().nonnegative().default(3000), // cents
  consignmentCommissionPct: z.number().int().min(0).max(100).default(0),
  internalNotes: z.string().optional(),
});

export type DressInput = z.infer<typeof dressInputSchema>;

const listInputSchema = z.object({
  statuses: z.array(z.nativeEnum(DressStatus)).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const wardrobeDressRouter = createTRPCRouter({
  /**
   * List all dresses for the admin inventory grid.
   *
   * Supports optional status filtering, free-text search across title +
   * description, and offset/limit pagination. Returns dresses with the Owner
   * summary, the primary image URL (if any), and counts of images/requests/
   * rentals for the inventory card UI.
   *
   * When `statuses` is omitted or empty, returns ALL statuses including
   * PENDING_APPROVAL, REJECTED, and ARCHIVED (ADMIN-01: admins see everything).
   */
  list: adminProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
    try {
      const where: Prisma.DressWhereInput = {};

      if (input.statuses && input.statuses.length > 0) {
        where.status = { in: input.statuses };
      }

      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const [dresses, total] = await Promise.all([
        ctx.prisma.dress.findMany({
          where,
          include: {
            Owner: { select: { id: true, name: true, email: true } },
            Images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
            _count: { select: { Images: true, Requests: true, Rentals: true } },
          },
          orderBy: { updatedAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.prisma.dress.count({ where }),
      ]);

      return {
        dresses,
        total,
        page: input.page,
        limit: input.limit,
      };
    } catch (error) {
      console.error("Error listing dresses:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list dresses",
        cause: error,
      });
    }
  }),

  /**
   * Fetch a single dress by id including all images (sorted) and the Owner
   * summary. Used by the admin edit page to pre-fill the form.
   */
  byId: adminProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    let dress: Awaited<ReturnType<typeof ctx.prisma.dress.findUnique>> = null;
    try {
      dress = await ctx.prisma.dress.findUnique({
        where: { id: input.id },
        include: {
          Owner: { select: { id: true, name: true, email: true } },
          Images: { orderBy: { sortOrder: "asc" } },
        },
      });
    } catch (error) {
      console.error("Error fetching dress by id:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch dress",
        cause: error,
      });
    }

    if (!dress) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Dress not found" });
    }

    return dress;
  }),

  /**
   * Create a new dress.
   *
   * ADMIN-02: Admins bypass the consigner approval queue. The server hardcodes
   * `status: "AVAILABLE"` regardless of what the client sends, and sets
   * `ownerId` to the calling admin's user id. Consigners use the separate
   * pending-approval flow (Phase 18).
   */
  create: adminProcedure.input(dressInputSchema).mutation(async ({ ctx, input }) => {
    try {
      return await ctx.prisma.dress.create({
        data: {
          ...input,
          ownerId: ctx.session.user.id,
          status: "AVAILABLE",
        },
      });
    } catch (error) {
      console.error("Error creating dress:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create dress",
        cause: error,
      });
    }
  }),

  /**
   * Update any field on a dress, including admin-only fields like
   * `internalNotes` and `consignmentCommissionPct` (ADMIN-03). Admins can also
   * flip `status` (e.g. to PENDING_APPROVAL/REJECTED for consigner review) and
   * reassign ownership.
   */
  update: adminProcedure
    .input(
      dressInputSchema.partial().extend({
        id: z.string().cuid(),
        status: z.nativeEnum(DressStatus).optional(),
        ownerId: z.string().cuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      try {
        return await ctx.prisma.dress.update({
          where: { id },
          data,
        });
      } catch (error) {
        console.error("Error updating dress:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update dress",
          cause: error,
        });
      }
    }),

  /**
   * Soft-archive a dress: flips status to ARCHIVED and stamps archivedAt with
   * the current time. The row is never hard-deleted from the database -- audit
   * history (rentals, requests, images) is preserved. There is no hard-delete
   * procedure exposed in the MVP.
   */
  archive: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.dress.update({
          where: { id: input.id },
          data: { status: "ARCHIVED", archivedAt: new Date() },
        });
      } catch (error) {
        console.error("Error archiving dress:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to archive dress",
          cause: error,
        });
      }
    }),
});
