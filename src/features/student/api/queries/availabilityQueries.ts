// src/features/student/api/queries/availabilityQueries.ts
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';

export const availabilityRouter = createTRPCRouter({
  getAvailableTimeSlots: publicProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        rinkId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const startDate = input.startDate || new Date();
        const endDate = input.endDate || new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        const timeSlots = await ctx.prisma.rinkTimeSlot.findMany({
          where: {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
            rinkId: input.rinkId,
            isActive: true,
          },
          include: {
            rink: {
              select: {
                name: true,
                address: true,
              },
            },
            lessons: true,
          },
          orderBy: {
            startTime: 'asc',
          },
        });

        // Filter out time slots that are already fully booked
        return timeSlots.map(slot => ({
          ...slot,
          currentStudents: slot.lessons.length,
          isAvailable: slot.lessons.length < slot.maxStudents,
        }));
      } catch (error) {
        console.error('Error fetching available time slots:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch available time slots',
          cause: error,
        });
      }
    }),

  getRinks: publicProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.prisma.rink.findMany({
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      console.error('Error fetching rinks:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch rinks',
        cause: error,
      });
    }
  }),
});