import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { LessonStatus, LessonType, RinkArea, PaymentStatus } from '@prisma/client';
import { googleCalendar } from '@/lib/google/calendar';

export const scheduleRouter = createTRPCRouter({
  getRinks: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        return await ctx.prisma.rink.findMany({
          orderBy: { name: 'asc' },
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
  getTimeSlots: protectedProcedure
    .input(
      z.object({
        rinkId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
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
            rink: true,
            lessons: {
              include: { student: { include: { user: true } } },
            },
          },
          orderBy: { startTime: 'asc' },
        });
      } catch (error) {
        console.error('Error fetching time slots:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch time slots',
          cause: error,
        });
      }
    }),
  createTimeSlot: protectedProcedure
    .input(
      z.object({
        rinkId: z.string(),
        startTime: z.date(),
        endTime: z.date(),
        maxStudents: z.number().min(1),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
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
                AND: [
                  { startTime: { lt: input.endTime } },
                  { endTime: { gte: input.endTime } },
                ],
              },
            ],
          },
        });
        if (overlapping) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Time slot overlaps with existing slot',
          });
        }
        return await ctx.prisma.rinkTimeSlot.create({
          data: input,
          include: { rink: true },
        });
      } catch (error) {
        console.error('Error creating time slot:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create time slot',
          cause: error,
        });
      }
    }),
  deleteTimeSlot: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.rinkTimeSlot.delete({ where: { id: input.id } });
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete time slot',
          cause: error,
        });
      }
    }),
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const pattern = await ctx.prisma.recurringPattern.create({
          data: input,
        });
        // Generate time slots based on the pattern
        const slots = [];
        let currentDate = new Date(input.startDate);
        while (currentDate <= input.endDate) {
          if (input.daysOfWeek.includes(currentDate.getDay())) {
            const [hours, minutes] = input.startTime.split(':').map(Number);
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
          currentDate.setDate(currentDate.getDate() + 1);
        }
        if (slots.length > 0) {
          await ctx.prisma.rinkTimeSlot.createMany({
            data: slots,
          });
        }
        return pattern;
      } catch (error) {
        console.error('Error creating recurring pattern:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create recurring pattern',
          cause: error,
        });
      }
    }),
  createBulkTimeSlots: protectedProcedure
    .input(
      z.object({
        rinkId: z.string(),
        startDate: z.string(), // or z.date() if you want to pass Date objects
        endDate: z.string(),
        dailyStartTime: z.string(), // e.g., "08:00"
        dailyEndTime: z.string(), // e.g., "21:00"
        slotDuration: z.number().min(15),
        breakStartTime: z.string().optional(), // e.g., "12:00"
        breakDuration: z.number().optional(), // in minutes
        maxStudents: z.number().min(1),
        daysOfWeek: z.array(z.number()).min(1), // e.g., [0, 1, 2, 3, 4, 5] for Sunday to Friday
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slots = [];
      let currentDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      // Parse the daily start and end times into hours and minutes
      const [dailyStartHour, dailyStartMinute] = input.dailyStartTime.split(':').map(Number);
      const [dailyEndHour, dailyEndMinute] = input.dailyEndTime.split(':').map(Number);
      // Parse break start time if provided
      let breakStartHour: number | undefined, breakStartMinute: number | undefined;
      if (input.breakStartTime && input.breakDuration) {
        [breakStartHour, breakStartMinute] = input.breakStartTime.split(':').map(Number);
      }
      // Loop through each day from startDate to endDate
      while (currentDate <= endDate) {
        // Check if this day's number is in the allowed days (0 = Sunday, 6 = Saturday)
        if (input.daysOfWeek.includes(currentDate.getDay())) {
          // Create period 1: from dailyStartTime to breakStartTime (if break provided) or to dailyEndTime otherwise
          const period1Start = new Date(currentDate);
          period1Start.setHours(dailyStartHour, dailyStartMinute, 0, 0);
          const period1End = new Date(currentDate);
          if (input.breakStartTime && input.breakDuration) {
            period1End.setHours(breakStartHour!, breakStartMinute!, 0, 0);
          } else {
            period1End.setHours(dailyEndHour, dailyEndMinute, 0, 0);
          }
          // Subdivide period1 into slots
          let slotStart = new Date(period1Start);
          while (slotStart.getTime() + input.slotDuration * 60000 <= period1End.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + input.slotDuration * 60000);
            slots.push({
              rinkId: input.rinkId,
              startTime: new Date(slotStart),
              endTime: new Date(slotEnd),
              maxStudents: input.maxStudents,
              isActive: true,
            });
            slotStart = slotEnd;
          }
          // If break time is provided, create period 2: from break end to dailyEndTime
          if (input.breakStartTime && input.breakDuration) {
            const breakEnd = new Date(currentDate);
            // Add the break duration to the break start time
            breakEnd.setHours(breakStartHour!, breakStartMinute! + input.breakDuration, 0, 0);
            const period2Start = new Date(breakEnd);
            const period2End = new Date(currentDate);
            period2End.setHours(dailyEndHour, dailyEndMinute, 0, 0);
            slotStart = new Date(period2Start);
            while (slotStart.getTime() + input.slotDuration * 60000 <= period2End.getTime()) {
              const slotEnd = new Date(slotStart.getTime() + input.slotDuration * 60000);
              slots.push({
                rinkId: input.rinkId,
                startTime: new Date(slotStart),
                endTime: new Date(slotEnd),
                maxStudents: input.maxStudents,
                isActive: true,
              });
              slotStart = slotEnd;
            }
          }
        }
        // Move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      if (slots.length > 0) {
        await ctx.prisma.rinkTimeSlot.createMany({
          data: slots,
        });
      }
      return { success: true, count: slots.length };
    }),
  createLesson: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        timeSlotId: z.string(),
        type: z.nativeEnum(LessonType),
        area: z.nativeEnum(RinkArea),
        price: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [timeSlot, student] = await Promise.all([
          ctx.prisma.rinkTimeSlot.findUnique({
            where: { id: input.timeSlotId },
            include: { rink: true, lessons: true },
          }),
          ctx.prisma.student.findUnique({
            where: { id: input.studentId },
            include: { user: true },
          }),
        ]);
        if (!timeSlot || !student) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: timeSlot ? 'Student not found' : 'Time slot not found',
          });
        }
        // Check slot capacity
        if (timeSlot.lessons.length >= timeSlot.maxStudents) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Time slot is full',
          });
        }
        // Create Google Calendar event
        const eventId = await googleCalendar.createEvent({
          summary: `${input.type} Lesson with ${student.user.name}`,
          description: ` Lesson Type: ${input.type} Area: ${input.area} ${input.notes ? `Notes: ${input.notes}` : ''} `,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          attendees: [
            { email: student.user.email },
            { email: process.env.INSTRUCTOR_EMAIL! },
          ],
          location: timeSlot.rink.address,
        });
        // Create the lesson with the calendar event ID
        const lesson = await ctx.prisma.lesson.create({
          data: {
            ...input,
            status: LessonStatus.SCHEDULED,
            rinkId: timeSlot.rinkId,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            duration: Math.floor(
              (timeSlot.endTime.getTime() - timeSlot.startTime.getTime()) / 60000
            ),
            googleCalendarEventId: eventId,
          },
          include: {
            student: { include: { user: true } },
            rink: true,
          },
        });
        return lesson;
      } catch (error) {
        console.error('Error creating lesson:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create lesson',
          cause: error,
        });
      }
    }),
  cancelLesson: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const lesson = await ctx.prisma.lesson.findUnique({
          where: { id: input.lessonId },
        });
        if (!lesson) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lesson not found',
          });
        }
        // Delete Google Calendar event if it exists
        if (lesson.googleCalendarEventId) {
          await googleCalendar.deleteEvent(lesson.googleCalendarEventId);
        }
        return await ctx.prisma.lesson.update({
          where: { id: input.lessonId },
          data: {
            status: LessonStatus.CANCELLED,
            cancellationReason: input.reason,
            cancellationTime: new Date(),
            googleCalendarEventId: null,
          },
        });
      } catch (error) {
        console.error('Error cancelling lesson:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel lesson',
          cause: error,
        });
      }
    }),
  getLessonsByDate: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        rinkId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.lesson.findMany({
          where: {
            startTime: { gte: input.startDate, lte: input.endDate },
            rinkId: input.rinkId,
          },
          include: {
            student: { include: { user: true } },
            rink: true,
            payment: true,
          },
          orderBy: { startTime: 'asc' },
        });
      } catch (error) {
        console.error('Error fetching lessons:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch lessons',
          cause: error,
        });
      }
    }),
  getStudents: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          active: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.student.findMany({
          where: {
            OR: input?.search
              ? [
                  { user: { name: { contains: input.search, mode: 'insensitive' } } },
                  { user: { email: { contains: input.search, mode: 'insensitive' } } },
                ]
              : undefined,
            user: { role: 'STUDENT' },
          },
          include: { user: true },
          orderBy: { user: { name: 'asc' } },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch students',
          cause: error,
        });
      }
    }),
  assignStudentToTimeSlot: protectedProcedure
    .input(
      z.object({
        timeSlotId: z.string(),
        studentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // First check if the slot is full
        const timeSlot = await ctx.prisma.rinkTimeSlot.findUnique({
          where: { id: input.timeSlotId },
          include: { lessons: true },
        });
        if (!timeSlot) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Time slot not found',
          });
        }
        if (timeSlot.lessons.length >= timeSlot.maxStudents) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Time slot is at maximum capacity',
          });
        }
        // Check if student is already assigned
        const existingLesson = timeSlot.lessons.find(
          (lesson) => lesson.studentId === input.studentId
        );
        if (existingLesson) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Student is already assigned to this time slot',
          });
        }
        // Create the lesson
        return await ctx.prisma.lesson.create({
          data: {
            studentId: input.studentId,
            timeSlotId: input.timeSlotId,
            rinkId: timeSlot.rinkId,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            status: 'SCHEDULED',
            type: 'PRIVATE', // or whatever default you want
            area: 'MAIN_RINK', // or get from time slot
            price: 0, // Set your default price
            duration: Math.round(
              (timeSlot.endTime.getTime() - timeSlot.startTime.getTime()) /
                (1000 * 60)
            ),
          },
          include: { student: { include: { user: true } } },
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to assign student',
          cause: error,
        });
      }
    }),
  unassignStudent: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.lesson.delete({
          where: { id: input.lessonId },
        });
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to unassign student',
          cause: error,
        });
      }
    }),
  updateTimeSlot: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        startTime: z.date(),
        endTime: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check for overlapping time slots
        const overlapping = await ctx.prisma.rinkTimeSlot.findFirst({
          where: {
            NOT: { id: input.id },
            rinkId: (await ctx.prisma.rinkTimeSlot.findUnique({
              where: { id: input.id },
              select: { rinkId: true },
            }))?.rinkId,
            OR: [
              {
                AND: [
                  { startTime: { lte: input.startTime } },
                  { endTime: { gt: input.startTime } },
                ],
              },
              {
                AND: [
                  { startTime: { lt: input.endTime } },
                  { endTime: { gte: input.endTime } },
                ],
              },
            ],
          },
        });
        if (overlapping) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Time slot overlaps with existing slot',
          });
        }
        return await ctx.prisma.rinkTimeSlot.update({
          where: { id: input.id },
          data: {
            startTime: input.startTime,
            endTime: input.endTime,
          },
        });
      } catch (error) {
        console.error('Error updating time slot:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update time slot',
          cause: error,
        });
      }
    }),
});
