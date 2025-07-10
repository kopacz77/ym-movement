import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { TRPCError } from "@trpc/server";
import { DateTime } from "luxon"; // Import DateTime for timezone handling
// src/features/admin/api/queries/schedule/timeSlotQueries.ts
import { z } from "zod";
import { randomUUID } from "crypto";

// Define the TimeSlot interface to fix the implicit any[] errors
interface TimeSlot {
  rinkId: string;
  startTime: Date;
  endTime: Date;
  maxStudents: number;
  isActive: boolean;
}

// Define SkippedSlot interface
interface SkippedSlot {
  startTime: Date;
  endTime: Date;
  reason: string;
}

export const timeSlotRouter = createTRPCRouter({
  getTimeSlots: protectedProcedure
    .input(
      z.object({
        rinkId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.rinkTimeSlot.findMany({
          where: {
            rinkId: input.rinkId,
            startTime: input.startDate
              ? {
                  gte: input.startDate,
                  ...(input.endDate && { lte: input.endDate }),
                }
              : undefined,
            isActive: true,
          },
          include: {
            Rink: true,
            Lesson: {
              include: { Student: { include: { User: true } } },
            },
          },
          orderBy: { startTime: "asc" },
        });
      } catch (error) {
        console.error("Error fetching time slots:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch time slots",
          cause: error,
        });
      }
    }),

  createTimeSlot: protectedProcedure
    .input(
      z
        .object({
          rinkId: z.string(),
          startTime: z.date(),
          endTime: z.date(),
          maxStudents: z.number().min(1),
          isActive: z.boolean().default(true),
        })
        .refine((data) => data.endTime > data.startTime, {
          message: "End time must be after start time",
          path: ["endTime"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the rink timezone
        const rink = await ctx.prisma.rink.findUnique({
          where: { id: input.rinkId },
          select: { timezone: true },
        });

        const rinkTimezone = rink?.timezone || "America/Los_Angeles";

        // Convert the start and end times to rink timezone for checking overlap
        const startTimeInRinkTz = DateTime.fromJSDate(input.startTime).setZone(rinkTimezone);
        const endTimeInRinkTz = DateTime.fromJSDate(input.endTime).setZone(rinkTimezone);

        console.log(`Creating time slot in ${rinkTimezone}:`, {
          start: startTimeInRinkTz.toFormat("yyyy-MM-dd HH:mm"),
          end: endTimeInRinkTz.toFormat("yyyy-MM-dd HH:mm"),
          utcStart: input.startTime.toISOString(),
          utcEnd: input.endTime.toISOString(),
        });

        // Check for overlapping time slots
        const overlapping = await ctx.prisma.rinkTimeSlot.findFirst({
          where: {
            rinkId: input.rinkId,
            OR: [
              {
                AND: [
                  { startTime: { lte: input.startTime } },
                  { endTime: { gt: input.startTime } },
                ],
              },
              {
                AND: [{ startTime: { lt: input.endTime } }, { endTime: { gte: input.endTime } }],
              },
              {
                AND: [{ startTime: { gte: input.startTime } }, { endTime: { lte: input.endTime } }],
              },
            ],
          },
        });
        if (overlapping) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Time slot overlaps with existing slot",
          });
        }
        return await ctx.prisma.rinkTimeSlot.create({
          data: {
            ...input,
            id: randomUUID(),
            updatedAt: new Date(),
          },
          include: { Rink: true },
        });
      } catch (error) {
        console.error("Error creating time slot:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof TRPCError ? error.message : "Failed to create time slot",
          cause: error,
        });
      }
    }),

  deleteTimeSlot: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if time slot has any lessons
        const timeSlot = await ctx.prisma.rinkTimeSlot.findUnique({
          where: { id: input.id },
          include: { Lesson: true },
        });

        if (!timeSlot) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Time slot not found",
          });
        }

        // If there are scheduled lessons, prevent deletion or handle appropriately
        if (timeSlot.Lesson.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Cannot delete time slot with existing lessons",
          });
        }

        await ctx.prisma.rinkTimeSlot.delete({ where: { id: input.id } });
        return { success: true };
      } catch (error) {
        console.error("Error deleting time slot:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof TRPCError ? error.message : "Failed to delete time slot",
          cause: error,
        });
      }
    }),

  updateTimeSlot: protectedProcedure
    .input(
      z
        .object({
          id: z.string(),
          startTime: z.date(),
          endTime: z.date(),
        })
        .refine((data) => data.endTime > data.startTime, {
          message: "End time must be after start time",
          path: ["endTime"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // First check if the time slot exists
        const existingSlot = await ctx.prisma.rinkTimeSlot.findUnique({
          where: { id: input.id },
          select: { rinkId: true },
        });

        if (!existingSlot) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Time slot not found",
          });
        }

        // Get the rink timezone
        const rink = await ctx.prisma.rink.findUnique({
          where: { id: existingSlot.rinkId },
          select: { timezone: true },
        });

        const rinkTimezone = rink?.timezone || "America/Los_Angeles";

        // Convert times to rink timezone for logging
        const startTimeInRinkTz = DateTime.fromJSDate(input.startTime).setZone(rinkTimezone);
        const endTimeInRinkTz = DateTime.fromJSDate(input.endTime).setZone(rinkTimezone);

        console.log(`Updating time slot in ${rinkTimezone}:`, {
          start: startTimeInRinkTz.toFormat("yyyy-MM-dd HH:mm"),
          end: endTimeInRinkTz.toFormat("yyyy-MM-dd HH:mm"),
        });

        // Check for overlapping time slots
        const overlapping = await ctx.prisma.rinkTimeSlot.findFirst({
          where: {
            NOT: { id: input.id },
            rinkId: existingSlot.rinkId,
            OR: [
              {
                AND: [
                  { startTime: { lte: input.startTime } },
                  { endTime: { gt: input.startTime } },
                ],
              },
              {
                AND: [{ startTime: { lt: input.endTime } }, { endTime: { gte: input.endTime } }],
              },
              {
                AND: [{ startTime: { gte: input.startTime } }, { endTime: { lte: input.endTime } }],
              },
            ],
          },
        });

        if (overlapping) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Time slot overlaps with existing slot",
          });
        }

        // Update the time slot
        return await ctx.prisma.rinkTimeSlot.update({
          where: { id: input.id },
          data: {
            startTime: input.startTime,
            endTime: input.endTime,
          },
        });
      } catch (error) {
        console.error("Error updating time slot:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof TRPCError ? error.message : "Failed to update time slot",
          cause: error,
        });
      }
    }),

  deleteBulkTimeSlots: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Count existing time slots with these IDs that have lessons
        const slotsWithLessons = await ctx.prisma.rinkTimeSlot.count({
          where: {
            id: { in: input.ids },
            Lesson: { some: {} },
          },
        });

        if (slotsWithLessons > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Cannot delete ${slotsWithLessons} time slots that have scheduled lessons.`,
          });
        }

        // Delete all time slots without lessons in a batch operation
        const result = await ctx.prisma.rinkTimeSlot.deleteMany({
          where: {
            id: { in: input.ids },
            Lesson: { none: {} }, // Extra safety check
          },
        });

        return {
          success: true,
          count: result.count,
          message: `Successfully deleted ${result.count} time slots.`,
        };
      } catch (error) {
        console.error("Error deleting bulk time slots:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof TRPCError ? error.message : "Failed to delete time slots",
          cause: error,
        });
      }
    }),

  createBulkTimeSlots: protectedProcedure
    .input(
      z
        .object({
          rinkId: z.string(),
          startDate: z.string(),
          endDate: z.string(),
          dailyStartTime: z.string(),
          dailyEndTime: z.string(),
          slotDuration: z.number().min(15).max(240), // Min 15 minutes, max 4 hours
          breaks: z
            .array(
              z.object({
                startTime: z.string(),
                duration: z.number().min(1).max(240), // Max 4 hours
              }),
            )
            .max(10), // Allow up to 10 breaks
          maxStudents: z.number().min(1).max(50), // Reasonable limit
          daysOfWeek: z.array(z.number().min(0).max(6)).min(1), // 0=Sunday, 6=Saturday
          skipOverlapping: z.boolean().optional(), // Option to skip rather than fail on overlap
        })
        .refine(
          (data) => {
            // Validate date format and range
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            if (!datePattern.test(data.startDate) || !datePattern.test(data.endDate)) {
              return false;
            }

            const startParts = data.startDate.split("-").map(Number);
            const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);

            const endParts = data.endDate.split("-").map(Number);
            const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);

            // Ensure end date is not before start date
            return endDate >= startDate;
          },
          {
            message: "Invalid date format or range",
            path: ["endDate"],
          },
        )
        .refine(
          (data) => {
            // Validate time format and range
            const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timePattern.test(data.dailyStartTime) || !timePattern.test(data.dailyEndTime)) {
              return false;
            }

            const [startHour, startMinute] = data.dailyStartTime.split(":").map(Number);
            const [endHour, endMinute] = data.dailyEndTime.split(":").map(Number);

            const startTotalMinutes = startHour * 60 + startMinute;
            const endTotalMinutes = endHour * 60 + endMinute;

            // Ensure end time is after start time
            return endTotalMinutes > startTotalMinutes;
          },
          {
            message: "Invalid time format or range",
            path: ["dailyEndTime"],
          },
        )
        .refine(
          (data) => {
            // Ensure all breaks have valid time format
            const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            return data.breaks.every((b) => timePattern.test(b.startTime));
          },
          {
            message: "Invalid break time format",
            path: ["breaks"],
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const slots: TimeSlot[] = [];
      const skippedSlots: SkippedSlot[] = []; // Track slots that were skipped due to conflicts
      const createdSlotIds: string[] = []; // Track IDs of created slots

      console.log("Creating bulk time slots with input:", input);

      // Get the rink to access its timezone
      const rink = await ctx.prisma.rink.findUnique({
        where: { id: input.rinkId },
        select: { timezone: true },
      });

      const rinkTimezone = rink?.timezone || "America/Los_Angeles";
      console.log(`Using rink timezone: ${rinkTimezone}`);

      // Parse dates in the rink's timezone
      const startDate = DateTime.fromFormat(input.startDate, "yyyy-MM-dd", {
        zone: rinkTimezone,
      }).startOf("day");
      const endDate = DateTime.fromFormat(input.endDate, "yyyy-MM-dd", {
        zone: rinkTimezone,
      }).endOf("day");

      // Check date range
      const dayDifference = Math.ceil(
        (endDate.toMillis() - startDate.toMillis()) / (1000 * 60 * 60 * 24),
      );
      if (dayDifference > 120) {
        // Extended to 120 days for more flexibility
        // Instead of throwing error, warn and continue
        console.warn(`Selected date range is ${dayDifference} days, which is quite large.`);
      }

      // Gather all dates in range that match selected days of week
      const dates: DateTime[] = [];
      let currentDate = startDate;

      // Loop through each day, respecting the exact date range
      while (currentDate <= endDate) {
        // Convert Luxon weekday (1-7, Monday is 1) to JS weekday (0-6, Sunday is 0)
        const jsWeekday = currentDate.weekday % 7;
        if (input.daysOfWeek.includes(jsWeekday)) {
          dates.push(currentDate);
        }
        // Increment by one day
        currentDate = currentDate.plus({ days: 1 });
      }

      console.log(`Found ${dates.length} matching dates for days: ${input.daysOfWeek.join(", ")}`);

      // Parse time components
      const [dailyStartHour, dailyStartMinute] = input.dailyStartTime.split(":").map(Number);
      const [dailyEndHour, dailyEndMinute] = input.dailyEndTime.split(":").map(Number);

      // Process each date with proper timezone handling
      for (const date of dates) {
        // Sort the breaks by start time to ensure proper order
        const sortedBreaks = [...input.breaks].sort((a, b) => {
          const [aHours, aMinutes] = a.startTime.split(":").map(Number);
          const [bHours, bMinutes] = b.startTime.split(":").map(Number);
          return aHours * 60 + aMinutes - (bHours * 60 + bMinutes);
        });

        // Setup time periods for this day in rink's timezone
        const dayStart = date.set({
          hour: dailyStartHour,
          minute: dailyStartMinute,
          second: 0,
          millisecond: 0,
        });
        const dayEnd = date.set({
          hour: dailyEndHour,
          minute: dailyEndMinute,
          second: 0,
          millisecond: 0,
        });

        // Convert breaks to actual dates and filter out invalid ones
        const breakPeriods = sortedBreaks
          .filter((b) => b.startTime && b.duration > 0)
          .map((b) => {
            const [breakHour, breakMinute] = b.startTime.split(":").map(Number);
            const breakStart = date.set({
              hour: breakHour,
              minute: breakMinute,
              second: 0,
              millisecond: 0,
            });

            // Skip if break is outside day bounds
            if (breakStart < dayStart || breakStart >= dayEnd) {
              return null;
            }

            const breakEnd = breakStart.plus({ minutes: b.duration });
            // Ensure break end doesn't exceed day end
            if (breakEnd > dayEnd) {
              return { start: breakStart, end: dayEnd };
            }
            return { start: breakStart, end: breakEnd };
          })
          .filter((bp): bp is { start: DateTime; end: DateTime } => bp !== null);

        // Create time periods from day start, around breaks, to day end
        const periods: { start: DateTime; end: DateTime }[] = [];

        // Start with day start
        let currentPeriodStart = dayStart;

        // Add each break as a boundary
        for (const breakPeriod of breakPeriods) {
          // Only add a period if there's time before the break
          if (currentPeriodStart < breakPeriod.start) {
            periods.push({
              start: currentPeriodStart,
              end: breakPeriod.start,
            });
          }

          // Move to after this break
          currentPeriodStart = breakPeriod.end;
        }

        // Add the final period if there's still time left in the day
        if (currentPeriodStart < dayEnd) {
          periods.push({
            start: currentPeriodStart,
            end: dayEnd,
          });
        }

        // Create slots for each valid period
        for (const period of periods) {
          let slotStart = period.start;

          while (slotStart.plus({ minutes: input.slotDuration }) <= period.end) {
            const slotEnd = slotStart.plus({ minutes: input.slotDuration });

            // Create the slot - converting the times to UTC for storage
            slots.push({
              rinkId: input.rinkId,
              startTime: slotStart.toUTC().toJSDate(),
              endTime: slotEnd.toUTC().toJSDate(),
              maxStudents: input.maxStudents,
              isActive: true,
            });

            // Advance to the next slot
            slotStart = slotStart.plus({ minutes: input.slotDuration });
          }
        }
      }

      // Print first few slots for debugging
      if (slots.length > 0) {
        console.log("Sample of slots to be created:");
        slots.slice(0, 3).forEach((slot, i) => {
          // Convert back to rink timezone to verify correct times
          const startInRinkTZ = DateTime.fromJSDate(slot.startTime).setZone(rinkTimezone);
          const endInRinkTZ = DateTime.fromJSDate(slot.endTime).setZone(rinkTimezone);

          console.log(
            `Slot ${i + 1}: ${slot.startTime.toISOString()} to ${slot.endTime.toISOString()}`,
          );
          console.log(
            `  Rink Time: ${startInRinkTZ.toFormat("HH:mm")} to ${endInRinkTZ.toFormat(
              "HH:mm",
            )} (${rinkTimezone})`,
          );
        });
      }

      // Safety check with more reasonable limit
      if (slots.length > 2000) {
        // Increased from 1000 to 2000 for more flexibility
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Attempting to create too many slots (${slots.length}). Please check your settings.`,
        });
      }

      console.log(`Creating ${slots.length} time slots`);

      if (slots.length > 0) {
        // Check for overlapping slots if requested
        if (input.skipOverlapping) {
          // Use transaction to ensure consistency
          await ctx.prisma.$transaction(async (tx) => {
            // Create slots one by one and skip overlapping ones
            for (const slot of slots) {
              try {
                // Check for overlaps
                const overlapping = await tx.rinkTimeSlot.findFirst({
                  where: {
                    rinkId: slot.rinkId,
                    OR: [
                      {
                        AND: [
                          { startTime: { lte: slot.startTime } },
                          { endTime: { gt: slot.startTime } },
                        ],
                      },
                      {
                        AND: [
                          { startTime: { lt: slot.endTime } },
                          { endTime: { gte: slot.endTime } },
                        ],
                      },
                      {
                        AND: [
                          { startTime: { gte: slot.startTime } },
                          { endTime: { lte: slot.endTime } },
                        ],
                      },
                    ],
                  },
                });

                // Fix for no-negation-else
                if (overlapping) {
                  // Convert to rink timezone for the error message
                  const startInRinkTZ = DateTime.fromJSDate(slot.startTime).setZone(rinkTimezone);
                  const endInRinkTZ = DateTime.fromJSDate(slot.endTime).setZone(rinkTimezone);

                  // Track skipped slot
                  skippedSlots.push({
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    reason: `Overlapping with existing slot (${startInRinkTZ.toFormat(
                      "HH:mm",
                    )} - ${endInRinkTZ.toFormat("HH:mm")})`,
                  });
                  continue;
                }

                // Create slot if no overlap
                const createdSlot = await tx.rinkTimeSlot.create({
                  data: {
                    ...slot,
                    id: randomUUID(),
                    updatedAt: new Date(),
                  },
                  select: { id: true },
                });
                createdSlotIds.push(createdSlot.id);
              } catch (error) {
                console.error("Error creating individual slot:", error);
                skippedSlots.push({
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  reason: "Database error",
                });
              }
            }
          });
        } else {
          // Create all slots at once for efficiency
          try {
            await ctx.prisma.rinkTimeSlot.createMany({
              data: slots.map(slot => ({
                ...slot,
                id: randomUUID(),
                updatedAt: new Date(),
              })),
              skipDuplicates: true, // Skip exact duplicates
            });

            // After bulk creation, query the database to get the IDs of recently created slots
            // This is necessary because createMany doesn't return the created records
            const startTimeRange = slots.map((slot) => slot.startTime);
            const endTimeRange = slots.map((slot) => slot.endTime);

            if (startTimeRange.length > 0 && endTimeRange.length > 0) {
              const minStartTime = new Date(Math.min(...startTimeRange.map((d) => d.getTime())));
              const maxEndTime = new Date(Math.max(...endTimeRange.map((d) => d.getTime())));

              // Find all slots that were just created
              const recentlyCreatedSlots = await ctx.prisma.rinkTimeSlot.findMany({
                where: {
                  rinkId: input.rinkId,
                  startTime: { gte: minStartTime },
                  endTime: { lte: maxEndTime },
                  // Additional filter to match the slot duration
                  AND: [
                    {
                      OR: slots.map((slot) => ({
                        AND: [{ startTime: slot.startTime }, { endTime: slot.endTime }],
                      })),
                    },
                  ],
                },
                select: { id: true },
              });

              createdSlotIds.push(...recentlyCreatedSlots.map((slot) => slot.id));
            }
          } catch (error) {
            console.error("Error in bulk creation:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create time slots. There may be overlapping slots.",
              cause: error,
            });
          }
        }
      }

      return {
        success: true,
        count: slots.length,
        created: createdSlotIds.length,
        skipped: skippedSlots.length,
        createdSlotIds, // Return the IDs of created slots
        skippedDetails:
          skippedSlots.length > 0
            ? skippedSlots.slice(0, 10).map((s) => ({
                date: s.startTime.toISOString().split("T")[0],
                time: `${s.startTime.toISOString().split("T")[1].substring(0, 5)} - ${s.endTime
                  .toISOString()
                  .split("T")[1]
                  .substring(0, 5)}`,
                reason: s.reason,
              }))
            : [],
      };
    }),
});
