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
      }).refine((data) => {
        // Check if date range exceeds 30 days
        const dayDifference = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24));
        return dayDifference <= 30;
      }, {
        message: "Date range cannot exceed 30 days",
        path: ["endDate"],
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
        return { pattern, slotsCreated: slots.length };
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
        startDate: z.string(),
        endDate: z.string(),
        dailyStartTime: z.string(),
        dailyEndTime: z.string(),
        slotDuration: z.number().min(15),
        breakStartTime: z.string().optional(),
        breakDuration: z.number().optional(),
        maxStudents: z.number().min(1),
        daysOfWeek: z.array(z.number()).min(1),
      }).refine((data) => {
        const startParts = data.startDate.split('-').map(Number);
        const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        
        const endParts = data.endDate.split('-').map(Number);
        const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
        
        // Ensure end date is not before start date
        if (endDate < startDate) {
          return false;
        }
        
        // Check if date range exceeds 30 days
        const dayDifference = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return dayDifference <= 30;
      }, {
        message: "Date range cannot exceed 30 days",
        path: ["endDate"],
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Bulk create input:", {
        dates: `${input.startDate} to ${input.endDate}`,
        times: `${input.dailyStartTime} to ${input.dailyEndTime}`,
        days: input.daysOfWeek,
        slotDuration: input.slotDuration,
      });
      
      const slots = [];
      
      // Parse dates manually to avoid timezone issues
      const startParts = input.startDate.split('-').map(Number);
      const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      
      const endParts = input.endDate.split('-').map(Number);
      const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
      
      // Gather all dates in range that match selected days of week
      const dates = [];
      const currentDate = new Date(startDate);
      
      // Loop through each day from start to end (inclusive)
      while (currentDate <= endDate) {
        // Check if this day of week is selected
        if (input.daysOfWeek.includes(currentDate.getDay())) {
          // Clone the date to avoid reference issues
          dates.push(new Date(currentDate));
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`Selected ${dates.length} dates based on days of week filters`);
      
      // Parse time components
      const [dailyStartHour, dailyStartMinute] = input.dailyStartTime.split(':').map(Number);
      const [dailyEndHour, dailyEndMinute] = input.dailyEndTime.split(':').map(Number);
      
      // Process each selected date
      for (const date of dates) {
        // Create period 1: from dailyStartTime to breakStartTime (if break provided) or to dailyEndTime
        const period1Start = new Date(date);
        period1Start.setHours(dailyStartHour, dailyStartMinute, 0, 0);
        
        const period1End = new Date(date);
        
        if (input.breakStartTime && input.breakDuration) {
          const [breakStartHour, breakStartMinute] = input.breakStartTime.split(':').map(Number);
          period1End.setHours(breakStartHour, breakStartMinute, 0, 0);
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
          
          // FIX #1: Advance slot start time by slotDuration instead of using the previous end time
          slotStart = new Date(slotStart.getTime() + input.slotDuration * 60000);
        }
        
        // If break time is provided, create period 2: from break end to dailyEndTime
        if (input.breakStartTime && input.breakDuration) {
          const [breakStartHour, breakStartMinute] = input.breakStartTime.split(':').map(Number);
          
          // FIX #2: Correctly calculate break end time
          const breakStart = new Date(date);
          breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);
          const breakEnd = new Date(breakStart.getTime() + (input.breakDuration * 60000));
          
          const period2Start = new Date(breakEnd);
          const period2End = new Date(date);
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
            
            // FIX #1 (repeated): Advance slot start time by slotDuration
            slotStart = new Date(slotStart.getTime() + input.slotDuration * 60000);
          }
        }
      }
    
      // Safety check - don't allow creating too many slots
      if (slots.length > 200) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Attempted to create too many slots (${slots.length}). Please check your configuration.`,
        });
      }
    
      console.log(`Creating ${slots.length} time slots`);
    
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
