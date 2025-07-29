// src/features/admin/api/queries/schedule/rinkQueries.ts

import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

export const rinkRouter = createTRPCRouter({
  getRinks: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.prisma.rink.findMany({
        select: {
          id: true,
          name: true,
          address: true,
          timezone: true,
          maxCapacity: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: "asc" },
      });
    } catch (error) {
      console.error("Error fetching rinks:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch rinks",
        cause: error,
      });
    }
  }),
});
