// src/features/admin/api/queries/schedule/rinkQueries.ts
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { TRPCError } from "@trpc/server";

export const rinkRouter = createTRPCRouter({
  getRinks: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.prisma.rink.findMany({
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
