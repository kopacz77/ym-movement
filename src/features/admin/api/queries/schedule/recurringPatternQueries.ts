import { TRPCError } from "@trpc/server";
// src/features/admin/api/queries/schedule/recurringPatternQueries.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

export const recurringPatternRouter = createTRPCRouter({
  createRecurringPattern: protectedProcedure
    .input(
      z.object({
        rinkId: z.string(),
        daysOfWeek: z.array(z.number().min(0).max(6)),
        startDate: z.date(),
        endDate: z.date(),
        startTime: z.string(),
        duration: z.number().min(30),
        maxStudents: z.number().min(1),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const pattern = await ctx.prisma.recurringPattern.create({
          data: input,
        });

        // Generate time slots based on the pattern
        const slots = [];
        const currentDate = new Date(input.startDate);

        console.log(
          `Creating recurring pattern from ${currentDate.toISOString()} to ${input.endDate.toISOString()} on days: ${input.daysOfWeek.join(
            ", ",
          )}`,
        );

        while (currentDate <= input.endDate) {
          if (input.daysOfWeek.includes(currentDate.getDay())) {
            const [hours, minutes] = input.startTime.split(":").map(Number);
            const startTime = new Date(currentDate);
            startTime.setHours(hours, minutes, 0, 0);

            slots.push({
              rinkId: input.rinkId,
              startTime,
              endTime: new Date(startTime.getTime() + input.duration * 60000),
              maxStudents: input.maxStudents,
              isActive: input.isActive,
              recurringId: pattern.id,
            });
          }

          // Add exactly one day to ensure we don't have timezone issues
          currentDate.setDate(currentDate.getDate() + 1);
        }

        console.log(`Generated ${slots.length} slots for recurring pattern`);

        if (slots.length > 0) {
          await ctx.prisma.rinkTimeSlot.createMany({
            data: slots,
          });
        }

        return { pattern, slotsCreated: slots.length };
      } catch (error) {
        console.error("Error creating recurring pattern:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create recurring pattern",
          cause: error,
        });
      }
    }),
});
