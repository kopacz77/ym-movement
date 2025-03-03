// src/features/student/api/queries/bookingQueries.ts
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { LessonStatus, LessonType, PaymentMethod, PaymentStatus, RinkArea } from '@prisma/client';
import { googleCalendar } from '@/lib/google/calendar';
import { randomUUID } from 'crypto';

export const bookingRouter = createTRPCRouter({
  bookLesson: publicProcedure
    .input(
      z.object({
        studentId: z.string(),
        timeSlotId: z.string(),
        type: z.nativeEnum(LessonType),
        area: z.nativeEnum(RinkArea).optional(),
        paymentMethod: z.nativeEnum(PaymentMethod),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. Get the time slot to check availability
        const timeSlot = await ctx.prisma.rinkTimeSlot.findUnique({
          where: { id: input.timeSlotId },
          include: {
            rink: true,
            lessons: true,
          },
        });

        if (!timeSlot) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Time slot not found',
          });
        }

        // 2. Check if slot is available
        if (timeSlot.lessons.length >= timeSlot.maxStudents) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Time slot is fully booked',
          });
        }

        // 3. Check if student has reached weekly lesson limit
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: { user: true },
        });

        if (!student) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Student not found',
          });
        }

        // Get start and end of current week
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const weeklyLessonsCount = await ctx.prisma.lesson.count({
          where: {
            studentId: input.studentId,
            startTime: {
              gte: startOfWeek,
              lte: endOfWeek,
            },
            status: {
              not: LessonStatus.CANCELLED,
            },
          },
        });

        if (weeklyLessonsCount >= student.maxLessonsPerWeek) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `You have reached your weekly limit of ${student.maxLessonsPerWeek} lessons`,
          });
        }

        // 4. Create Google Calendar event
        let googleEventId = null;
        try {
          googleEventId = await googleCalendar.createEvent({
            summary: `${input.type} Lesson with ${student.user.name}`,
            description: `
              Lesson Type: ${input.type}
              Area: ${input.area || 'MAIN_RINK'}
              ${input.notes ? `Notes: ${input.notes}` : ''}
            `,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            attendees: [
              { email: student.user.email },
              { email: process.env.INSTRUCTOR_EMAIL! },
            ],
            location: timeSlot.rink.address,
          });
        } catch (error) {
          console.error('Error creating Google Calendar event:', error);
          // Continue with booking even if calendar fails
        }

        // 5. Calculate price (in a real app, this would come from settings)
        const defaultPrices = {
          PRIVATE: 75,
          GROUP: 45,
          CHOREOGRAPHY: 90,
          COMPETITION_PREP: 95,
        };
        const price = defaultPrices[input.type];

        // 6. Create the lesson booking with transaction
        const result = await ctx.prisma.$transaction(async (prisma) => {
          // Create the lesson
          const lesson = await prisma.lesson.create({
            data: {
              studentId: input.studentId,
              timeSlotId: input.timeSlotId,
              rinkId: timeSlot.rinkId,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              duration: Math.round(
                (timeSlot.endTime.getTime() - timeSlot.startTime.getTime()) / (1000 * 60)
              ),
              type: input.type,
              area: input.area || 'MAIN_RINK',
              status: LessonStatus.SCHEDULED,
              price,
              notes: input.notes,
              googleCalendarEventId: googleEventId,
            },
            include: {
              student: {
                include: {
                  user: true,
                },
              },
              rink: true,
            },
          });

          // Create payment record
          const payment = await prisma.payment.create({
            data: {
              lessonId: lesson.id,
              studentId: input.studentId,
              amount: price,
              method: input.paymentMethod,
              status: PaymentStatus.PENDING,
              referenceCode: `PAY-${randomUUID().substring(0, 8)}`,
            },
          });

          return { lesson, payment };
        });

        return result;
      } catch (error) {
        console.error('Error booking lesson:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to book lesson',
          cause: error,
        });
      }
    }),

  cancelLesson: publicProcedure
    .input(
      z.object({
        lessonId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. Find the lesson
        const lesson = await ctx.prisma.lesson.findUnique({
          where: { id: input.lessonId },
          include: {
            timeSlot: true,
          },
        });

        if (!lesson) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lesson not found',
          });
        }

        // 2. Check if the lesson can be cancelled (not in the past)
        if (lesson.startTime < new Date()) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot cancel past lessons',
          });
        }

        // 3. Check cancellation policy - example: 24 hours notice
        const cancellationDeadline = 24; // hours
        const hoursUntilLesson = 
          (lesson.startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);
        
        if (hoursUntilLesson < cancellationDeadline) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Lessons must be cancelled at least ${cancellationDeadline} hours in advance`,
          });
        }

        // 4. Delete Google Calendar event if it exists
        if (lesson.googleCalendarEventId) {
          try {
            await googleCalendar.deleteEvent(lesson.googleCalendarEventId);
          } catch (error) {
            console.error('Error deleting Google Calendar event:', error);
            // Continue with cancellation even if calendar fails
          }
        }

        // 5. Update the lesson status
        const updatedLesson = await ctx.prisma.lesson.update({
          where: { id: input.lessonId },
          data: {
            status: LessonStatus.CANCELLED,
            cancellationReason: input.reason,
            cancellationTime: new Date(),
            googleCalendarEventId: null,
          },
        });

        return updatedLesson;
      } catch (error) {
        console.error('Error cancelling lesson:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel lesson',
          cause: error,
        });
      }
    }),
});