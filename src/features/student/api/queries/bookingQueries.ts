// src/features/student/api/queries/bookingQueries.ts
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { LessonStatus, LessonType, PaymentMethod, PaymentStatus, RinkArea } from '@prisma/client';
import { googleCalendar } from '@/lib/google/calendar';
import { randomUUID } from 'crypto';
import { startOfWeek as dateStartOfWeek, endOfWeek as dateEndOfWeek } from 'date-fns';

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
        console.log(`[BOOKING] Starting booking process for student ${input.studentId}`);
        
        // 1. Get the time slot to check availability
        const timeSlot = await ctx.prisma.rinkTimeSlot.findUnique({
          where: { id: input.timeSlotId },
          include: {
            rink: true,
            lessons: {
              where: { 
                status: LessonStatus.SCHEDULED // Only count active lessons toward capacity
              }
            },
          },
        });

        if (!timeSlot) {
          console.log(`[BOOKING] Time slot ${input.timeSlotId} not found`);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Time slot not found',
          });
        }

        console.log(`[BOOKING] Time slot has ${timeSlot.lessons.length}/${timeSlot.maxStudents} lessons`);
        
        // 2. Check if slot is available
        if (timeSlot.lessons.length >= timeSlot.maxStudents) {
          console.log(`[BOOKING] Time slot ${input.timeSlotId} is fully booked`);
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Time slot is fully booked',
          });
        }

        // 3. Get student info and check weekly lesson limit
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            user: true,
          },
        });

        if (!student) {
          console.log(`[BOOKING] Student ${input.studentId} not found`);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Student not found',
          });
        }

        // Get start and end of current week (Sunday to Saturday)
        const now = new Date();
        const startOfWeek = dateStartOfWeek(now, { weekStartsOn: 0 }); // 0 = Sunday
        const endOfWeek = dateEndOfWeek(now, { weekStartsOn: 0 });
        
        // Reset the time to beginning/end of day
        startOfWeek.setHours(0, 0, 0, 0);
        endOfWeek.setHours(23, 59, 59, 999);

        console.log(`[BOOKING] Checking weekly lessons for week ${startOfWeek.toISOString()} to ${endOfWeek.toISOString()}`);

        // Count lessons in current week - only count SCHEDULED lessons
        const weeklyLessonsCount = await ctx.prisma.lesson.count({
          where: {
            studentId: input.studentId,
            startTime: { 
              gte: startOfWeek, 
              lte: endOfWeek 
            },
            status: LessonStatus.SCHEDULED, // Only count active scheduled lessons
          },
        });

        console.log(`[BOOKING] Student has ${weeklyLessonsCount}/${student.maxLessonsPerWeek} lessons this week`);

        if (weeklyLessonsCount >= student.maxLessonsPerWeek) {
          console.log(`[BOOKING] Student ${input.studentId} has reached weekly limit of ${student.maxLessonsPerWeek} lessons`);
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `You have reached your weekly limit of ${student.maxLessonsPerWeek} lessons`,
          });
        }

        // 4. Try to create Google Calendar event
        let googleEventId = null;
        
        try {
          // Only attempt calendar integration if name and email are available
          if (student.user?.name && student.user?.email) {
            console.log(`[BOOKING] Attempting to create calendar event for ${student.user.name}`);
            
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
                { email: process.env.INSTRUCTOR_EMAIL || 'instructor@example.com' },
              ],
              location: timeSlot.rink.address,
            });

            if (googleEventId) {
              console.log(`[BOOKING] Created Google Calendar event with ID: ${googleEventId}`);
            } else {
              console.log('[BOOKING] Failed to create Google Calendar event, continuing without calendar integration');
            }
          } else {
            console.log('[BOOKING] Skipping calendar integration - missing student name or email');
          }
        } catch (error) {
          console.error('[BOOKING] Error creating Google Calendar event:', error);
          // Continue with booking even if calendar fails
        }

        // 5. Calculate price
        const defaultPrices = {
          PRIVATE: 75,
          GROUP: 45,
          CHOREOGRAPHY: 90,
          COMPETITION_PREP: 95,
        };

        const price = defaultPrices[input.type];
        console.log(`[BOOKING] Calculated price: $${price} for lesson type ${input.type}`);

        // 6. Create the lesson and payment in a transaction
        console.log('[BOOKING] Creating lesson and payment records');
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
          const paymentRef = `PAY-${randomUUID().substring(0, 8)}`;
          console.log(`[BOOKING] Generated payment reference: ${paymentRef}`);
          
          const payment = await prisma.payment.create({
            data: {
              lessonId: lesson.id,
              studentId: input.studentId,
              amount: price,
              method: input.paymentMethod,
              status: PaymentStatus.PENDING,
              referenceCode: paymentRef,
            },
          });

          return { lesson, payment };
        });

        console.log(`[BOOKING] Successfully created lesson (ID: ${result.lesson.id}) and payment (ID: ${result.payment.id})`);
        return result;
      } catch (error) {
        console.error('[BOOKING] Error booking lesson:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
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
        console.log(`[CANCEL] Starting cancellation process for lesson ${input.lessonId}`);
        
        // 1. Find the lesson
        const lesson = await ctx.prisma.lesson.findUnique({
          where: {
            id: input.lessonId,
          },
          include: {
            timeSlot: true,
          },
        });

        if (!lesson) {
          console.log(`[CANCEL] Lesson ${input.lessonId} not found`);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lesson not found',
          });
        }

        // 2. Check if the lesson can be cancelled (not in the past)
        const now = new Date();
        if (lesson.startTime < now) {
          console.log(`[CANCEL] Cannot cancel past lesson ${input.lessonId}`);
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot cancel past lessons',
          });
        }

        // 3. Check cancellation policy - example: 24 hours notice
        const cancellationDeadline = 24; // hours
        const hoursUntilLesson = (lesson.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        console.log(`[CANCEL] Lesson starts in ${hoursUntilLesson.toFixed(1)} hours, deadline is ${cancellationDeadline} hours`);
        
        if (hoursUntilLesson < cancellationDeadline) {
          console.log(`[CANCEL] Too late to cancel lesson ${input.lessonId} (${hoursUntilLesson.toFixed(1)}h < ${cancellationDeadline}h)`);
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Lessons must be cancelled at least ${cancellationDeadline} hours in advance`,
          });
        }

        // 4. Delete Google Calendar event if it exists
        if (lesson.googleCalendarEventId) {
          try {
            console.log(`[CANCEL] Attempting to delete Google Calendar event: ${lesson.googleCalendarEventId}`);
            const deleted = await googleCalendar.deleteEvent(lesson.googleCalendarEventId);
            if (deleted) {
              console.log(`[CANCEL] Deleted Google Calendar event: ${lesson.googleCalendarEventId}`);
            } else {
              console.log(`[CANCEL] Failed to delete Google Calendar event: ${lesson.googleCalendarEventId}`);
            }
          } catch (error) {
            console.error('[CANCEL] Error deleting Google Calendar event:', error);
            // Continue with cancellation even if calendar deletion fails
          }
        }

        // 5. Update the lesson status
        console.log(`[CANCEL] Updating lesson ${input.lessonId} status to CANCELLED`);
        const updatedLesson = await ctx.prisma.lesson.update({
          where: {
            id: input.lessonId,
          },
          data: {
            status: LessonStatus.CANCELLED,
            cancellationReason: input.reason,
            cancellationTime: new Date(),
            googleCalendarEventId: null,
          },
        });

        console.log(`[CANCEL] Successfully cancelled lesson ${input.lessonId}`);
        return updatedLesson;
      } catch (error) {
        console.error('[CANCEL] Error cancelling lesson:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel lesson',
          cause: error,
        });
      }
    }),
});