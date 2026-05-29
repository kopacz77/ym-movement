// src/features/wardrobe/api/queries/imageQueries.ts
//
// TRPC procedures for managing DressImage rows. The canonical lifecycle:
//   1. Client calls upload() from @vercel/blob/client -> blob URL.
//   2. Client calls wardrobe.images.attachImage({ dressId, url }) -> DressImage row.
//   3. Client may then setPrimary / reorderImages / deleteImage as needed.
//
// Authorization: admins (ADMIN, SUPER_ADMIN) OR the dress's ownerId may mutate.
// Image cap (8 per dress) is enforced HERE in attachImage as defense in depth;
// the route handler at /api/wardrobe/upload enforces it again at token-mint time.

import { TRPCError } from "@trpc/server";
import { del } from "@vercel/blob";
import { z } from "zod";
import type { prisma as prismaClient } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

const MAX_IMAGES_PER_DRESS = 8;

type DressGuardCtx = {
  prisma: typeof prismaClient;
  session: { user: { id: string; role: string } } | null;
};

async function assertCanModifyDress(ctx: DressGuardCtx, dressId: string): Promise<void> {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const dress = await ctx.prisma.dress.findUnique({
    where: { id: dressId },
    select: { ownerId: true },
  });
  if (!dress) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Dress not found" });
  }
  const isOwner = dress.ownerId === ctx.session.user.id;
  const isAdmin = isAdminRole(ctx.session.user.role);
  if (!isOwner && !isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const imageRouter = createTRPCRouter({
  /**
   * Called by the client immediately after upload() to @vercel/blob resolves.
   * Creates the DressImage row, auto-flags isPrimary when it's the first image,
   * and assigns sortOrder based on the existing image count.
   */
  attachImage: protectedProcedure
    .input(
      z.object({
        dressId: z.string().cuid(),
        url: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanModifyDress(ctx, input.dressId);

      const existing = await ctx.prisma.dressImage.count({
        where: { dressId: input.dressId },
      });
      if (existing >= MAX_IMAGES_PER_DRESS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Image cap reached (${MAX_IMAGES_PER_DRESS} per dress)`,
        });
      }

      return ctx.prisma.dressImage.create({
        data: {
          dressId: input.dressId,
          url: input.url,
          sortOrder: existing,
          isPrimary: existing === 0, // first image is auto-primary
        },
      });
    }),

  reorderImages: protectedProcedure
    .input(
      z.object({
        dressId: z.string().cuid(),
        orderedIds: z.array(z.string().cuid()).min(1).max(MAX_IMAGES_PER_DRESS),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanModifyDress(ctx, input.dressId);

      // Validate that all orderedIds belong to this dress.
      const images = await ctx.prisma.dressImage.findMany({
        where: { dressId: input.dressId },
        select: { id: true },
      });
      const validIds = new Set(images.map((i) => i.id));
      for (const id of input.orderedIds) {
        if (!validIds.has(id)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Image ${id} does not belong to dress ${input.dressId}`,
          });
        }
      }
      if (input.orderedIds.length !== images.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "orderedIds must include every image on the dress",
        });
      }

      // Apply new sortOrder in a single transaction.
      await ctx.prisma.$transaction(
        input.orderedIds.map((id, index) =>
          ctx.prisma.dressImage.update({
            where: { id },
            data: { sortOrder: index },
          }),
        ),
      );

      return { success: true };
    }),

  setPrimary: protectedProcedure
    .input(
      z.object({
        imageId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const image = await ctx.prisma.dressImage.findUnique({
        where: { id: input.imageId },
        select: { id: true, dressId: true },
      });
      if (!image) throw new TRPCError({ code: "NOT_FOUND" });
      await assertCanModifyDress(ctx, image.dressId);

      await ctx.prisma.$transaction([
        ctx.prisma.dressImage.updateMany({
          where: { dressId: image.dressId },
          data: { isPrimary: false },
        }),
        ctx.prisma.dressImage.update({
          where: { id: input.imageId },
          data: { isPrimary: true },
        }),
      ]);
      return { success: true };
    }),

  /**
   * Deletes BOTH the Vercel Blob object AND the DressImage row in a single mutation.
   * If the deleted image was primary, promotes the next-lowest-sortOrder remaining
   * image to primary.
   */
  deleteImage: protectedProcedure
    .input(z.object({ imageId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const image = await ctx.prisma.dressImage.findUnique({
        where: { id: input.imageId },
        select: { id: true, url: true, dressId: true, isPrimary: true },
      });
      if (!image) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await assertCanModifyDress(ctx, image.dressId);

      // Order matters per 13-RESEARCH.md Pattern 3:
      // del() is idempotent (no-op on missing blob), do it FIRST.
      // If the DB delete then fails, we have an orphan row pointing at a dead URL
      // — loud failure (404 in UI), not silent orphan blob accruing cost.
      await del(image.url);
      await ctx.prisma.dressImage.delete({ where: { id: input.imageId } });

      // Promote next-lowest sortOrder image to primary if we just removed the primary.
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
