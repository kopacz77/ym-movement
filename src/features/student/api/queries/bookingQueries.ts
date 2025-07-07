import { randomUUID } from "node:crypto";
import { sendLessonConfirmationEmail } from "@/lib/email";
import { googleCalendar } from "@/lib/google/calendar";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { LessonStatus, LessonType, PaymentMethod, PaymentStatus, RinkArea } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { endOfWeek as dateEndOfWeek, startOfWeek as dateStartOfWeek } from "date-fns";
// src/features/student/api/queries/bookingQueries.ts
import { z } from "zod";

// Define extended Student type with custom pricing fields
interface ExtendedStudent {
  id: string;
  userId: string;
  user: {
    email: string;
    name: string | null;
  };
  maxLessonsPerWeek: number;
  customPricingEnabled: boolean;
  privateLessonPrice: number | null;
  groupLessonPrice: number | null;
  choreographyPrice: number | null;
  competitionPrepPrice: number | null;
}

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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`[BOOKING] Starting booking process for student ${input.studentId}`);

        // 1. Get the time slot to check availability
        const timeSlot = await ctx.prisma.rinkTimeSlot.findUnique({
          where: { id: input.timeSlotId },
          include: {
            Rink: true,
            Lesson: {
              where: {
                status: LessonStatus.SCHEDULED, // Only count active lessons toward capacity
              },
            },
          },
        });

        if (!timeSlot) {
          console.log(`[BOOKING] Time slot ${input.timeSlotId} not found`);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Time slot not found",
          });
        }

        console.log(
          `[BOOKING] Time slot has ${timeSlot.Lesson.length}/${timeSlot.maxStudents} lessons`,
        );

        // 2. Check if slot is available
        if (timeSlot.Lesson.length >= timeSlot.maxStudents) {
          console.log(`[BOOKING] Time slot ${input.timeSlotId} is fully booked`);
          throw new TRPCError({
            code: "CONFLICT",
            message: "Time slot is fully booked",
          });
        }

        // 3. Get student info and check weekly lesson limit
        const student = (await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            User: true,
          },
        })) as unknown as ExtendedStudent; // Cast to our extended type

        if (!student) {
          console.log(`[BOOKING] Student ${input.studentId} not found`);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Get start and end of current week (Sunday to Saturday)
        const now = new Date();
        const startOfWeek = dateStartOfWeek(now, { weekStartsOn: 0 }); // 0 = Sunday
        const endOfWeek = dateEndOfWeek(now, { weekStartsOn: 0 });

        // Reset the time to beginning/end of day
        startOfWeek.setHours(0, 0, 0, 0);
        endOfWeek.setHours(23, 59, 59, 999);

        console.log(
          `[BOOKING] Checking weekly lessons for week ${startOfWeek.toISOString()} to ${endOfWeek.toISOString()}`,
        );

        // Count lessons in current week - only count SCHEDULED lessons
        const weeklyLessonsCount = await ctx.prisma.lesson.count({
          where: {
            studentId: input.studentId,
            startTime: {
              gte: startOfWeek,
              lte: endOfWeek,
            },
            status: LessonStatus.SCHEDULED, // Only count active scheduled lessons
          },
        });

        console.log(
          `[BOOKING] Student has ${weeklyLessonsCount}/${student.maxLessonsPerWeek} lessons this week`,
        );

        if (weeklyLessonsCount >= student.maxLessonsPerWeek) {
          console.log(
            `[BOOKING] Student ${input.studentId} has reached weekly limit of ${student.maxLessonsPerWeek} lessons`,
          );
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You have reached your weekly limit of ${student.maxLessonsPerWeek} lessons`,
          });
        }

        // 4. Try to create Google Calendar event
        let googleEventId = null;

        try {
          // Only attempt calendar integration if name and email are available
          if (student.User?.name && student.User?.email) {
            console.log(`[BOOKING] Attempting to create calendar event for ${student.User.name}`);
            console.log(`[BOOKING] Using timezone: ${timeSlot.Rink.timezone}`);

            // Make sure we have a valid timezone
            const timezone = timeSlot.Rink.timezone || "America/Los_Angeles"; // Fallback timezone

            googleEventId = await googleCalendar.createEvent({
              summary: `${input.type} Lesson with ${student.User.name}`,
              description: ` 
                Student: ${student.User.name}
                Lesson Type: ${input.type}
                Area: ${input.area || "MAIN_RINK"}
                ${input.notes ? `Notes: ${input.notes}` : ""}
              `,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              attendees: [
                { email: student.User.email, name: student.User.name },
                // Include instructor email as in the older version
                { email: process.env.INSTRUCTOR_EMAIL || "yuraxmin@gmail.com" },
              ],
              location: timeSlot.Rink.address,
              timeZone: timezone, // Explicitly pass the timezone
            });

            if (googleEventId) {
              console.log(`[BOOKING] Created Google Calendar event with ID: ${googleEventId}`);
            } else {
              console.log(
                "[BOOKING] Failed to create Google Calendar event, continuing without calendar integration",
              );
            }
          } else {
            console.log("[BOOKING] Skipping calendar integration - missing student name or email");
          }
        } catch (error) {
          console.error("[BOOKING] Error creating Google Calendar event:", error);
          // Continue with booking even if calendar fails
        }

        // 5. Calculate price based on lesson type and student's custom pricing if available
        // First, get the default pricing
        const defaultPricing = await ctx.prisma.$queryRaw`
          SELECT * FROM "DefaultPricing" LIMIT 1
        `;

        const defaultPricingRecord =
          Array.isArray(defaultPricing) && defaultPricing.length > 0 ? defaultPricing[0] : null;

        if (!defaultPricingRecord) {
          console.log("[BOOKING] Default pricing not found, using hardcoded values");
        }

        // Define default prices (fallback if no DefaultPricing record exists)
        const defaultPrices = {
          PRIVATE: defaultPricingRecord?.privateLessonPrice || 75,
          GROUP: defaultPricingRecord?.groupLessonPrice || 45,
          CHOREOGRAPHY: defaultPricingRecord?.choreographyPrice || 90,
          COMPETITION_PREP: defaultPricingRecord?.competitionPrice || 95,
        };

        // Use custom pricing if enabled for this student
        let price = defaultPrices[input.type];

        if (student.customPricingEnabled) {
          // Apply custom pricing based on lesson type if available
          switch (input.type) {
            case "PRIVATE":
              if (student.privateLessonPrice !== null) {
                price = student.privateLessonPrice;
              }
              break;
            case "GROUP":
              if (student.groupLessonPrice !== null) {
                price = student.groupLessonPrice;
              }
              break;
            case "CHOREOGRAPHY":
              if (student.choreographyPrice !== null) {
                price = student.choreographyPrice;
              }
              break;
            case "COMPETITION_PREP":
              if (student.competitionPrepPrice !== null) {
                price = student.competitionPrepPrice;
              }
              break;
          }
        }

        console.log(
          `[BOOKING] Calculated price: $${price} for lesson type ${input.type}${
            student.customPricingEnabled ? " (custom pricing)" : " (default pricing)"
          }`,
        );

        // 6. Create the lesson and payment in a transaction
        console.log("[BOOKING] Creating lesson and payment records");
        // Generate payment reference code
        const paymentRef = `PAY-${randomUUID().substring(0, 8)}`;
        console.log(`[BOOKING] Generated payment reference: ${paymentRef}`);

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
                (timeSlot.endTime.getTime() - timeSlot.startTime.getTime()) / (1000 * 60),
              ),
              type: input.type,
              area: input.area || "MAIN_RINK",
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
              referenceCode: paymentRef,
              lesson_date: lesson.startTime, // Store the lesson date explicitly
            },
          });

          return { lesson, payment };
        });

        console.log(
          `[BOOKING] Successfully created lesson (ID: ${result.lesson.id}) and payment (ID: ${result.payment.id})`,
        );

        // 7. Send confirmation email to the student with fixed timezone information
        if (student.User?.email && student.User?.name) {
          try {
            console.log(`[BOOKING] Sending confirmation email to ${student.User.email}`);

            await sendLessonConfirmationEmail(
              student.User.email,
              student.User.name,
              {
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
                type: input.type,
                rinkName: timeSlot.Rink.name,
                rinkAddress: timeSlot.Rink.address,
                rinkTimezone: timeSlot.Rink.timezone, // FIXED: Ensure timezone is passed
              },
              input.paymentMethod,
              paymentRef,
            );

            console.log(`[BOOKING] Successfully sent confirmation email to ${student.User.email}`);
          } catch (emailError) {
            console.error("[BOOKING] Error sending confirmation email:", emailError);
            // Continue even if email fails - the booking itself was successful
          }
        } else {
          console.log("[BOOKING] Skipping confirmation email - missing student name or email");
        }

        return result;
      } catch (error) {
        console.error("[BOOKING] Error booking lesson:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to book lesson",
          cause: error,
        });
      }
    }),

  // The cancel lesson functionality remains unchanged
  cancelLesson: publicProcedure
    .input(
      z.object({
        lessonId: z.string(),
        reason: z.string(),
      }),
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
            code: "NOT_FOUND",
            message: "Lesson not found",
          });
        }

        // 2. Check if the lesson can be cancelled (not in the past)
        const now = new Date();
        if (lesson.startTime < now) {
          console.log(`[CANCEL] Cannot cancel past lesson ${input.lessonId}`);
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot cancel past lessons",
          });
        }

        // 3. Check cancellation policy - example: 24 hours notice
        const cancellationDeadline = 24; // hours
        const hoursUntilLesson = (lesson.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        console.log(
          `[CANCEL] Lesson starts in ${hoursUntilLesson.toFixed(
            1,
          )} hours, deadline is ${cancellationDeadline} hours`,
        );

        if (hoursUntilLesson < cancellationDeadline) {
          console.log(
            `[CANCEL] Too late to cancel lesson ${input.lessonId} (${hoursUntilLesson.toFixed(
              1,
            )}h < ${cancellationDeadline}h)`,
          );
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Lessons must be cancelled at least ${cancellationDeadline} hours in advance`,
          });
        }

        // 4. Delete Google Calendar event if it exists
        if (lesson.googleCalendarEventId) {
          try {
            console.log(
              `[CANCEL] Attempting to delete Google Calendar event: ${lesson.googleCalendarEventId}`,
            );
            const deleted = await googleCalendar.deleteEvent(lesson.googleCalendarEventId);
            if (deleted) {
              console.log(
                `[CANCEL] Deleted Google Calendar event: ${lesson.googleCalendarEventId}`,
              );
            } else {
              console.log(
                `[CANCEL] Failed to delete Google Calendar event: ${lesson.googleCalendarEventId}`,
              );
            }
          } catch (error) {
            console.error("[CANCEL] Error deleting Google Calendar event:", error);
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
        console.error("[CANCEL] Error cancelling lesson:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel lesson",
          cause: error,
        });
      }
    }),
});
