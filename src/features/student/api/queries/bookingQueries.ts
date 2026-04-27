import { randomUUID } from "node:crypto";
import { LessonStatus, LessonType, PaymentMethod, PaymentStatus, RinkArea } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { endOfWeek as dateEndOfWeek, startOfWeek as dateStartOfWeek, format } from "date-fns";
// src/features/student/api/queries/bookingQueries.ts
import { z } from "zod";
import { createNotification } from "@/features/notifications/utils/notificationHelpers";
import { sendLessonConfirmationEmail } from "@/lib/email";
import { type CoachWithTokens, googleCalendar } from "@/lib/google/calendar";
import { calculateLessonPrice } from "@/lib/pricing";
import { isAdminRole, isCoachRole } from "@/lib/roles";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

// Define extended Student type with custom pricing fields
interface ExtendedStudent {
  id: string;
  userId: string;
  isApproved: boolean;
  User: {
    email: string;
    name: string | null;
  };
  maxLessonsPerWeek: number;
  customPricingEnabled: boolean;
  privateLessonPrice: number | null;
  groupLessonPrice: number | null;
  choreographyPrice: number | null;
  competitionPrepPrice: number | null;
  offIceDancePrice: number | null;
}

export const bookingRouter = createTRPCRouter({
  bookLesson: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        timeSlotId: z.string(),
        type: z.nativeEnum(LessonType),
        area: z.nativeEnum(RinkArea).optional(),
        paymentMethod: z.nativeEnum(PaymentMethod),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // SECURITY: Ownership check — non-admin/coach users can only book for themselves
        const userRole = ctx.session.user.role;
        if (!isAdminRole(userRole) && !isCoachRole(userRole)) {
          const requestingStudent = await ctx.prisma.student.findUnique({
            where: { userId: ctx.session.user.id },
            select: { id: true },
          });
          if (!requestingStudent || requestingStudent.id !== input.studentId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can only book lessons for yourself",
            });
          }
        }

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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Time slot not found",
          });
        }

        // 2. Check if time slot is in the past
        const now = new Date();
        if (timeSlot.startTime <= now) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot book lessons for past time slots",
          });
        }

        // 2b. Block student self-booking of virtual rink slots on blocked dates
        if (timeSlot.Rink.isVirtual) {
          const slotDate = new Date(timeSlot.startTime);
          slotDate.setHours(0, 0, 0, 0);
          const slotDateEnd = new Date(slotDate);
          slotDateEnd.setHours(23, 59, 59, 999);

          const overlappingBlock = await ctx.prisma.blockedDateRange.findFirst({
            where: {
              startDate: { lte: slotDateEnd },
              endDate: { gte: slotDate },
            },
          });

          if (overlappingBlock) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Video lessons on blocked dates are only available by coach assignment.",
            });
          }
        }

        // 3. Check if slot is available
        if (timeSlot.Lesson.length >= timeSlot.maxStudents) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Time slot is fully booked",
          });
        }

        // 4. Get student info and check approval status + weekly lesson limit
        const student = (await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            User: { select: { id: true, name: true, email: true } },
          },
        })) as unknown as ExtendedStudent; // Cast to our extended type

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // CRITICAL: Check if student is approved before allowing booking
        if (!student.isApproved) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Your account is pending approval. Please wait for admin approval before booking lessons.",
          });
        }

        // Get start and end of current week (Sunday to Saturday) - reuse existing 'now' variable
        const startOfWeek = dateStartOfWeek(now, { weekStartsOn: 0 }); // 0 = Sunday
        const endOfWeek = dateEndOfWeek(now, { weekStartsOn: 0 });

        // Reset the time to beginning/end of day
        startOfWeek.setHours(0, 0, 0, 0);
        endOfWeek.setHours(23, 59, 59, 999);

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

        if (weeklyLessonsCount >= student.maxLessonsPerWeek) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You have reached your weekly limit of ${student.maxLessonsPerWeek} lessons`,
          });
        }

        // 4a. Check for overlapping lessons — prevent student from double-booking across coaches
        const overlappingLesson = await ctx.prisma.lesson.findFirst({
          where: {
            studentId: input.studentId,
            status: LessonStatus.SCHEDULED,
            startTime: { lt: timeSlot.endTime },
            endTime: { gt: timeSlot.startTime },
          },
          include: { Rink: true },
        });

        if (overlappingLesson) {
          const overlapTime = format(overlappingLesson.startTime, "h:mm a");
          throw new TRPCError({
            code: "CONFLICT",
            message: `You already have a lesson scheduled at ${overlapTime} that overlaps with this time slot`,
          });
        }

        // 4b. Fetch coach name, pricing, and calendar tokens if the time slot has a coach
        let coachName: string | null = null;
        let coachPricing: {
          privateLessonPrice: number | null;
          groupLessonPrice: number | null;
          choreographyPrice: number | null;
          competitionPrepPrice: number | null;
          offIceDancePrice: number | null;
        } | null = null;
        let coachWithTokens: CoachWithTokens | null = null;
        let coachIsAdmin = false;

        if (timeSlot.coachId) {
          const coach = await ctx.prisma.coach.findUnique({
            where: { id: timeSlot.coachId },
            select: {
              id: true,
              privateLessonPrice: true,
              groupLessonPrice: true,
              choreographyPrice: true,
              competitionPrepPrice: true,
              offIceDancePrice: true,
              googleAccessToken: true,
              googleRefreshToken: true,
              googleTokenExpiresAt: true,
              googleCalendarId: true,
              User: { select: { name: true, role: true } },
            },
          });
          if (coach) {
            coachName = coach.User?.name ?? null;
            coachIsAdmin = isAdminRole(coach.User.role);
            coachPricing = {
              privateLessonPrice: coach.privateLessonPrice,
              groupLessonPrice: coach.groupLessonPrice,
              choreographyPrice: coach.choreographyPrice,
              competitionPrepPrice: coach.competitionPrepPrice,
              offIceDancePrice: coach.offIceDancePrice,
            };
            coachWithTokens = {
              id: coach.id,
              googleAccessToken: coach.googleAccessToken,
              googleRefreshToken: coach.googleRefreshToken,
              googleTokenExpiresAt: coach.googleTokenExpiresAt,
              googleCalendarId: coach.googleCalendarId,
            };
          }
        }

        // 5. Try to create Google Calendar event
        let googleEventId = null;

        try {
          // Only attempt calendar integration if name and email are available
          if (student.User?.name && student.User?.email) {
            // Make sure we have a valid timezone
            const timezone = timeSlot.Rink.timezone || "America/Los_Angeles"; // Fallback timezone

            const calendarSummary = `${input.type} Lesson with ${student.User.name}${coachName ? ` [${coachName}]` : ""}`;

            if (coachWithTokens) {
              googleEventId = await googleCalendar.createEvent(coachWithTokens, {
                summary: calendarSummary,
                description: `
                Student: ${student.User.name}
                ${coachName ? `Coach: ${coachName}` : ""}
                Lesson Type: ${input.type}
                Area: ${input.area || "MAIN_RINK"}
                ${input.notes ? `Notes: ${input.notes}` : ""}
              `,
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
                attendees: [{ email: student.User.email, name: student.User.name }],
                location: timeSlot.Rink.address,
                timeZone: timezone,
              });
            }
          }
        } catch (error) {
          console.error("[BOOKING] Error creating Google Calendar event:", error);
          // Continue with booking even if calendar fails
        }

        // 6. Calculate price based on lesson type, duration, and student's/coach's pricing
        // Calculate duration in minutes
        const durationMs = timeSlot.endTime.getTime() - timeSlot.startTime.getTime();
        const durationMinutes = Math.max(Math.floor(durationMs / 60000), 1);

        // Get default pricing from database
        const defaultPricing = await ctx.prisma.defaultPricing.findFirst();

        // Determine effective coach pricing based on coach role:
        // - Admin coaches (Yura): student custom pricing wins IF they have a rate for this
        //   specific lesson type; otherwise coach pricing provides the fallback
        // - Non-admin coaches (Renee): coach pricing always wins (standard waterfall)
        let effectiveCoachPricing = coachPricing;
        if (coachIsAdmin && student.customPricingEnabled) {
          const studentHasCustomRate = (() => {
            switch (input.type) {
              case LessonType.PRIVATE:
                return student.privateLessonPrice != null;
              case LessonType.GROUP:
                return student.groupLessonPrice != null;
              case LessonType.CHOREOGRAPHY:
                return student.choreographyPrice != null;
              case LessonType.COMPETITION_PREP:
                return student.competitionPrepPrice != null;
              case LessonType.OFF_ICE_DANCE:
                return student.offIceDancePrice != null;
              default:
                return false;
            }
          })();
          if (studentHasCustomRate) {
            effectiveCoachPricing = null;
          }
        }

        const price = calculateLessonPrice(
          input.type,
          durationMinutes,
          student,
          defaultPricing,
          effectiveCoachPricing,
        );

        // 7. Create the lesson and payment in a transaction
        // Generate payment reference code
        const paymentRef = `PAY-${randomUUID().substring(0, 8)}`;

        const result = await ctx.prisma.$transaction(async (prisma) => {
          // Create the lesson
          const lesson = await prisma.lesson.create({
            data: {
              studentId: input.studentId,
              timeSlotId: input.timeSlotId,
              rinkId: timeSlot.rinkId,
              coachId: timeSlot.coachId || undefined,
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
              Student: {
                include: {
                  User: { select: { id: true, name: true, email: true } },
                },
              },
              Rink: true,
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

        // 7b. Upsert CoachStudent junction record if the lesson has a coach
        if (timeSlot.coachId) {
          try {
            await ctx.prisma.coachStudent.upsert({
              where: {
                coachId_studentId: {
                  coachId: timeSlot.coachId,
                  studentId: input.studentId,
                },
              },
              create: {
                coachId: timeSlot.coachId,
                studentId: input.studentId,
              },
              update: {},
            });
          } catch (coachStudentError) {
            console.error("[BOOKING] Error upserting CoachStudent record:", coachStudentError);
            // Non-blocking: the booking itself succeeded
          }
        }

        // 8. Create notification for the student
        try {
          const coachSuffix = coachName ? ` with ${coachName}` : "";
          await createNotification({
            userId: (student as any).User?.id || (student as any).userId,
            title: "Lesson Booked Successfully",
            message: `Your ${input.type} lesson${coachSuffix} has been scheduled for ${new Date(
              timeSlot.startTime,
            ).toLocaleDateString()} at ${timeSlot.Rink.name}`,
            type: "SUCCESS",
            link: `/student/schedule/${result.lesson.id}`,
          });
        } catch (notificationError) {
          console.error("[BOOKING] Error creating notification:", notificationError);
          // Continue even if notification fails - the booking itself was successful
        }

        // 9. Create notification for admin users
        try {
          // Find all admin users
          const adminUsers = await ctx.prisma.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true },
          });

          // Format the date nicely
          const formattedDate = format(timeSlot.startTime, "MMMM d, yyyy 'at' h:mm a");

          // Format lesson type (e.g., PRIVATE -> Private, GROUP -> Group)
          const lessonType = input.type
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");

          const coachSuffix = coachName ? ` with ${coachName}` : "";

          // Create notification for each admin
          const notificationPromises = adminUsers.map((admin) =>
            createNotification({
              userId: admin.id,
              title: "New Lesson Booking",
              message: `New booking: ${student.User.name || student.User.email || "Unknown Student"} booked ${lessonType} lesson${coachSuffix} on ${formattedDate}`,
              type: "SUCCESS",
              link: "/admin/schedule",
            }),
          );

          // Use Promise.allSettled for partial success tolerance
          await Promise.allSettled(notificationPromises);
        } catch (adminNotificationError) {
          console.error("[BOOKING] Error creating admin notifications:", adminNotificationError);
          // Continue even if admin notification fails - the booking itself was successful
        }

        // 9b. Notify the coach (if time slot has a coach)
        if (timeSlot.coachId) {
          try {
            const coachRecord = await ctx.prisma.coach.findUnique({
              where: { id: timeSlot.coachId },
              select: { userId: true },
            });
            if (coachRecord) {
              const lessonTypeFormatted = input.type
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(" ");
              const formattedDateForCoach = format(timeSlot.startTime, "MMM d, yyyy 'at' h:mm a");
              await createNotification({
                userId: coachRecord.userId,
                title: "New Lesson Booked",
                message: `${student.User.name || "A student"} booked a ${lessonTypeFormatted} lesson on ${formattedDateForCoach}`,
                type: "SUCCESS",
                link: "/coach/schedule",
              });
            }
          } catch (coachNotifError) {
            console.error("[BOOKING] Error creating coach notification:", coachNotifError);
          }
        }

        // 10. Send confirmation email to the student with fixed timezone information
        if (student.User?.email && student.User?.name) {
          try {
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
          } catch (emailError) {
            console.error("[BOOKING] Error sending confirmation email:", emailError);
            // Continue even if email fails - the booking itself was successful
          }
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

  cancelLesson: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        reason: z.string().max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. Find the lesson with student info for notification
        const lesson = await ctx.prisma.lesson.findUnique({
          where: { id: input.lessonId },
          include: {
            Student: {
              include: { User: { select: { id: true, name: true, email: true } } },
            },
            Rink: true,
          },
        });

        if (!lesson) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lesson not found",
          });
        }

        // SECURITY: Ownership check — non-admin/coach users can only cancel their own lessons
        const cancelUserRole = ctx.session.user.role;
        if (!isAdminRole(cancelUserRole) && !isCoachRole(cancelUserRole)) {
          if (lesson.Student.User.id !== ctx.session.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can only cancel your own lessons",
            });
          }
        }

        // 2. Cannot cancel past lessons
        const now = new Date();
        if (lesson.startTime < now) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot cancel past lessons",
          });
        }

        // 3. Determine if this is a late cancellation (within 24 hours)
        const hoursUntilLesson = (lesson.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isLateCancellation = hoursUntilLesson < 24;

        // 4. Delete Google Calendar event if it exists
        if (lesson.googleCalendarEventId && lesson.coachId) {
          try {
            const coach = await ctx.prisma.coach.findUnique({
              where: { id: lesson.coachId },
              select: {
                id: true,
                googleAccessToken: true,
                googleRefreshToken: true,
                googleTokenExpiresAt: true,
                googleCalendarId: true,
              },
            });
            if (coach) {
              await googleCalendar.deleteEvent(coach, lesson.googleCalendarEventId);
            }
          } catch (error) {
            console.error("[CANCEL] Error deleting Google Calendar event:", error);
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

        // 6. Notify all admin users
        const adminUsers = await ctx.prisma.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        });

        const studentName = lesson.Student.User.name || "A student";
        const lessonDate = format(lesson.startTime, "MMM d, yyyy");
        const lessonTime = format(lesson.startTime, "h:mm a");
        const lessonType = lesson.type.replace("_", " ");
        const lateTag = isLateCancellation ? " (Late cancellation - within 24 hours)" : "";

        for (const admin of adminUsers) {
          await createNotification({
            userId: admin.id,
            title: "Lesson Cancelled by Student",
            message: `${studentName} cancelled their ${lessonType} lesson on ${lessonDate} at ${lessonTime}${lateTag}`,
            type: "WARNING",
          });
        }

        // 6b. Notify the coach (if lesson has a coach)
        if (lesson.coachId) {
          try {
            const coachRecord = await ctx.prisma.coach.findUnique({
              where: { id: lesson.coachId },
              select: { userId: true },
            });
            if (coachRecord) {
              await createNotification({
                userId: coachRecord.userId,
                title: "Lesson Cancelled",
                message: `${studentName} cancelled their ${lessonType} lesson on ${lessonDate} at ${lessonTime}${lateTag}`,
                type: "WARNING",
                link: "/coach/schedule",
              });
            }
          } catch (coachNotifError) {
            console.error("[CANCEL] Error creating coach notification:", coachNotifError);
          }
        }

        return { ...updatedLesson, isLateCancellation };
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
