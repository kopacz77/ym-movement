/**
 * TRPC queries and mutations for blocked date management
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

// Input validation schemas
const createBlockedDateSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100, "Title too long"),
    description: z.string().optional(),
    startDate: z.date(),
    endDate: z.date(),
    type: z.enum(["TRAVEL", "COMPETITION", "OTHER"]).default("TRAVEL"),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  });

const updateBlockedDateSchema = z
  .object({
    id: z.string(),
    title: z.string().min(1, "Title is required").max(100, "Title too long").optional(),
    description: z.string().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    type: z.enum(["TRAVEL", "COMPETITION", "OTHER"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    },
  );

const getBlockedDatesSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const blockedDateRouter = createTRPCRouter({
  // Get all blocked date ranges (with optional date filtering)
  getBlockedDates: protectedProcedure.input(getBlockedDatesSchema).query(async ({ ctx, input }) => {
    try {
      const where: any = {};

      if (input.startDate || input.endDate) {
        where.OR = [
          // Blocked range starts within query range
          ...(input.startDate && input.endDate
            ? [
                {
                  startDate: {
                    gte: input.startDate,
                    lte: input.endDate,
                  },
                },
              ]
            : []),
          // Blocked range ends within query range
          ...(input.startDate && input.endDate
            ? [
                {
                  endDate: {
                    gte: input.startDate,
                    lte: input.endDate,
                  },
                },
              ]
            : []),
          // Blocked range encompasses entire query range
          ...(input.startDate && input.endDate
            ? [
                {
                  startDate: { lte: input.startDate },
                  endDate: { gte: input.endDate },
                },
              ]
            : []),
        ];
      }

      const blockedDates = await ctx.prisma.blockedDateRange.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
      });

      return blockedDates;
    } catch (error) {
      console.error("Error fetching blocked dates:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch blocked dates",
      });
    }
  }),

  // Create a new blocked date range
  createBlockedDate: protectedProcedure
    .input(createBlockedDateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check for overlapping blocked date ranges
        const overlapping = await ctx.prisma.blockedDateRange.findFirst({
          where: {
            OR: [
              // New range starts during existing range
              {
                startDate: { lte: input.startDate },
                endDate: { gte: input.startDate },
              },
              // New range ends during existing range
              {
                startDate: { lte: input.endDate },
                endDate: { gte: input.endDate },
              },
              // New range encompasses existing range
              {
                startDate: { gte: input.startDate },
                endDate: { lte: input.endDate },
              },
            ],
          },
        });

        if (overlapping) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Date range overlaps with existing blocked period: "${overlapping.title}"`,
          });
        }

        const blockedDate = await ctx.prisma.blockedDateRange.create({
          data: {
            ...input,
            createdById: ctx.session.user.id,
          },
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return {
          success: true,
          blockedDate,
          message: `Blocked date range "${input.title}" created successfully`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error creating blocked date:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create blocked date range",
        });
      }
    }),

  // Update a blocked date range
  updateBlockedDate: protectedProcedure
    .input(updateBlockedDateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;

        // Check if blocked date exists
        const existing = await ctx.prisma.blockedDateRange.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Blocked date range not found",
          });
        }

        // Check for overlapping ranges (excluding current one)
        if (updateData.startDate || updateData.endDate) {
          const startDate = updateData.startDate || existing.startDate;
          const endDate = updateData.endDate || existing.endDate;

          const overlapping = await ctx.prisma.blockedDateRange.findFirst({
            where: {
              id: { not: id },
              OR: [
                {
                  startDate: { lte: startDate },
                  endDate: { gte: startDate },
                },
                {
                  startDate: { lte: endDate },
                  endDate: { gte: endDate },
                },
                {
                  startDate: { gte: startDate },
                  endDate: { lte: endDate },
                },
              ],
            },
          });

          if (overlapping) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Date range would overlap with existing blocked period: "${overlapping.title}"`,
            });
          }
        }

        const blockedDate = await ctx.prisma.blockedDateRange.update({
          where: { id },
          data: updateData,
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return {
          success: true,
          blockedDate,
          message: `Blocked date range "${blockedDate.title}" updated successfully`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error updating blocked date:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update blocked date range",
        });
      }
    }),

  // Delete a blocked date range
  deleteBlockedDate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const blockedDate = await ctx.prisma.blockedDateRange.findUnique({
          where: { id: input.id },
        });

        if (!blockedDate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Blocked date range not found",
          });
        }

        await ctx.prisma.blockedDateRange.delete({
          where: { id: input.id },
        });

        return {
          success: true,
          message: `Blocked date range "${blockedDate.title}" deleted successfully`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error deleting blocked date:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete blocked date range",
        });
      }
    }),
});
