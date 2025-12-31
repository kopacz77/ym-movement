import { TRPCError } from "@trpc/server";
// src/features/student/api/queries/availabilityQueries.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

// Define a proper type for the where clause
interface WhereClause {
  startTime: {
    gte: Date;
    lte: Date;
  };
  isActive?: boolean;
  rinkId?: string;
}

export const availabilityRouter = createTRPCRouter({
  getAvailableTimeSlots: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        rinkId: z.string().optional(),
        _cache: z.number().optional(), // Cache-busting parameter
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // CRITICAL: Check if the student is approved before showing available slots
        if (ctx.session?.user?.role === "STUDENT") {
          const student = await ctx.prisma.student.findUnique({
            where: { userId: ctx.session.user.id },
            select: { isApproved: true, id: true },
          });

          if (!student) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Student profile not found",
            });
          }

          if (!student.isApproved) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Your account is pending approval. Please wait for admin approval before booking lessons.",
            });
          }
        }
        const startDate = input.startDate || new Date();
        const endDate = input.endDate || new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        // CRITICAL: Ensure we never show past time slots - use current time as minimum start time
        const now = new Date();
        const effectiveStartDate = startDate > now ? startDate : now;

        console.log(
          `[DEBUG] Fetching time slots from ${effectiveStartDate.toISOString()} to ${endDate.toISOString()}`,
        );

        // Log the input parameters
        console.log(
          `[DEBUG] Query params - rinkId: ${input.rinkId || "all"}, _cache: ${
            input._cache || "none"
          }`,
        );

        // Create where clause with all matching slots in the date range (excluding past slots)
        // Only show active slots to students
        const whereClause: WhereClause = {
          startTime: {
            gte: effectiveStartDate,
            lte: endDate,
          },
          isActive: true,
        };

        // Only add rinkId filter if it is provided and not "all_rinks"
        if (input.rinkId && input.rinkId !== "all_rinks") {
          whereClause.rinkId = input.rinkId;
        }

        console.log("[DEBUG] Where clause:", JSON.stringify(whereClause));

        // Run the query with the modified where clause
        const timeSlots = await ctx.prisma.rinkTimeSlot.findMany({
          where: whereClause,
          include: {
            Rink: {
              select: {
                id: true,
                name: true,
                address: true,
                timezone: true,
              },
            },
            Lesson: true, // Include ALL lessons to properly calculate availability
          },
          orderBy: {
            startTime: "asc",
          },
        });

        console.log(`[DEBUG] Found ${timeSlots.length} time slots for the queried date range`);

        if (timeSlots.length === 0) {
          // Enhanced debugging for no results case
          const allSlots = await ctx.prisma.rinkTimeSlot.findMany({
            take: 5,
            orderBy: { startTime: "asc" },
            select: { id: true, startTime: true, isActive: true },
          });

          console.log("[DEBUG] Sample of available slots in database:");
          for (const slot of allSlots) {
            console.log(
              `[DEBUG] Sample slot: ID=${
                slot.id
              }, startTime=${slot.startTime.toISOString()}, isActive=${slot.isActive}`,
            );
          }
        }

        // Process slots to include availability information
        const enhancedTimeSlots = timeSlots.map((slot) => {
          // Count only non-canceled lessons for availability calculation
          const activeLesson = slot.Lesson.filter((lesson) => lesson.status !== "CANCELLED");

          const studentCount = activeLesson.length;
          // A slot is available if it's active and not fully booked
          const isAvailable = studentCount < slot.maxStudents && slot.isActive === true;

          console.log(
            `[DEBUG] Slot ${slot.id} at ${slot.startTime.toISOString()}: ` +
              `${studentCount}/${slot.maxStudents} students, available: ${isAvailable}, isActive: ${slot.isActive}`,
          );

          return {
            ...slot,
            currentStudents: studentCount,
            isAvailable: isAvailable,
          };
        });

        return enhancedTimeSlots;
      } catch (error) {
        console.error("Error fetching available time slots:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch available time slots",
          cause: error,
        });
      }
    }),

  getRinks: protectedProcedure.query(async ({ ctx }) => {
    try {
      // CRITICAL: Check if the student is approved before showing rinks
      if (ctx.session?.user?.role === "STUDENT") {
        const student = await ctx.prisma.student.findUnique({
          where: { userId: ctx.session.user.id },
          select: { isApproved: true },
        });

        if (!student?.isApproved) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Your account is pending approval. Please wait for admin approval before booking lessons.",
          });
        }
      }

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
        orderBy: {
          name: "asc",
        },
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
