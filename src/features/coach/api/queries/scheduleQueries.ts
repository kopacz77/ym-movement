import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { coachProcedure, createTRPCRouter } from "@/lib/trpc";

export const scheduleRouter = createTRPCRouter({
  getMyTimeSlots: coachProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          rinkId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const timeSlots = await ctx.prisma.rinkTimeSlot.findMany({
          where: {
            coachId: ctx.coach.id,
            isActive: true,
            ...(input?.rinkId && { rinkId: input.rinkId }),
            ...(input?.startDate && {
              startTime: {
                gte: input.startDate,
                ...(input.endDate && { lte: input.endDate }),
              },
            }),
          },
          select: {
            id: true,
            rinkId: true,
            startTime: true,
            endTime: true,
            maxStudents: true,
            isActive: true,
            createdAt: true,
            Rink: {
              select: {
                id: true,
                name: true,
                timezone: true,
                address: true,
              },
            },
            Lesson: {
              select: {
                id: true,
                type: true,
                price: true,
                status: true,
                notes: true,
                Student: {
                  select: {
                    id: true,
                    notes: true,
                    StudentNote: {
                      select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        type: true,
                        User: {
                          select: {
                            name: true,
                          },
                        },
                      },
                      orderBy: {
                        createdAt: "desc" as const,
                      },
                      take: 3,
                    },
                    User: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { startTime: "asc" },
        });

        return timeSlots;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching coach time slots:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch time slots",
          cause: error,
        });
      }
    }),

  getMyBlockedDates: coachProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: Record<string, unknown> = {
          coachId: ctx.coach.id,
        };

        if (input?.startDate && input?.endDate) {
          where.OR = [
            // Blocked range starts within query range
            {
              startDate: {
                gte: input.startDate,
                lte: input.endDate,
              },
            },
            // Blocked range ends within query range
            {
              endDate: {
                gte: input.startDate,
                lte: input.endDate,
              },
            },
            // Blocked range encompasses entire query range
            {
              startDate: { lte: input.startDate },
              endDate: { gte: input.endDate },
            },
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
          orderBy: [{ startDate: "asc" }],
        });

        return blockedDates;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching coach blocked dates:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch blocked dates",
          cause: error,
        });
      }
    }),

  getRinks: coachProcedure.query(async ({ ctx }) => {
    return ctx.prisma.rink.findMany({
      select: { id: true, name: true, timezone: true, address: true },
      orderBy: { name: "asc" },
    });
  }),

  createBlockedDate: coachProcedure
    .input(
      z
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
        }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check for overlapping blocked date ranges for this coach
        const overlapping = await ctx.prisma.blockedDateRange.findFirst({
          where: {
            coachId: ctx.coach.id,
            OR: [
              {
                startDate: { lte: input.startDate },
                endDate: { gte: input.startDate },
              },
              {
                startDate: { lte: input.endDate },
                endDate: { gte: input.endDate },
              },
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
            title: input.title,
            description: input.description,
            startDate: input.startDate,
            endDate: input.endDate,
            type: input.type,
            coachId: ctx.coach.id,
            createdById: ctx.session!.user.id,
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
        console.error("Error creating coach blocked date:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create blocked date range",
          cause: error,
        });
      }
    }),

  updateBlockedDate: coachProcedure
    .input(
      z
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
        ),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;

        // Verify the blocked date exists and belongs to this coach
        const existing = await ctx.prisma.blockedDateRange.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Blocked date range not found",
          });
        }

        if (existing.coachId !== ctx.coach.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update your own blocked dates",
          });
        }

        // Check for overlapping ranges (excluding current record, scoped to this coach)
        if (updateData.startDate || updateData.endDate) {
          const startDate = updateData.startDate || existing.startDate;
          const endDate = updateData.endDate || existing.endDate;

          const overlapping = await ctx.prisma.blockedDateRange.findFirst({
            where: {
              id: { not: id },
              coachId: ctx.coach.id,
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
        console.error("Error updating coach blocked date:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update blocked date range",
          cause: error,
        });
      }
    }),

  deleteBlockedDate: coachProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify the blocked date exists and belongs to this coach
        const existing = await ctx.prisma.blockedDateRange.findUnique({
          where: { id: input.id },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Blocked date range not found",
          });
        }

        if (existing.coachId !== ctx.coach.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete your own blocked dates",
          });
        }

        await ctx.prisma.blockedDateRange.delete({
          where: { id: input.id },
        });

        return {
          success: true,
          message: `Blocked date range "${existing.title}" deleted successfully`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error deleting coach blocked date:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete blocked date range",
          cause: error,
        });
      }
    }),
});
