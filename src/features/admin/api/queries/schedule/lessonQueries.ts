import { randomUUID } from "node:crypto";
import { LessonStatus, LessonType, PaymentMethod, PaymentStatus, RinkArea } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { format } from "date-fns";
// src/features/admin/api/queries/schedule/lessonQueries.ts
import { z } from "zod";
import { createScheduleChangeNotification } from "@/features/notifications/utils/notificationHelpers";
import { type CoachWithTokens, googleCalendar } from "@/lib/google/calendar";
import { calculateLessonPrice } from "@/lib/pricing";
import { logSecurityEvent, sanitizeInput } from "@/lib/security";
import { adminProcedure, createTRPCRouter } from "@/lib/trpc";

export const lessonRouter = createTRPCRouter({
  createLesson: adminProcedure
    .input(
      z.object({
        studentId: z.string(),
        timeSlotId: z.string(),
        type: z.nativeEnum(LessonType),
        area: z.nativeEnum(RinkArea),
        price: z.number(),
        notes: z.string().max(1000).optional(),
        coachId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Sanitize input data
      const sanitizedInput = {
        ...input,
        notes: input.notes ? sanitizeInput(input.notes) : undefined,
      };

      // Log security event
      logSecurityEvent("LESSON_CREATED", {
        userId: ctx.session?.user?.id,
        studentId: sanitizedInput.studentId,
        timeSlotId: sanitizedInput.timeSlotId,
        lessonType: sanitizedInput.type,
        price: sanitizedInput.price,
      });

      try {
        const [timeSlot, student] = await Promise.all([
          ctx.prisma.rinkTimeSlot.findUnique({
            where: { id: sanitizedInput.timeSlotId },
            include: { Rink: true, Lesson: { where: { status: LessonStatus.SCHEDULED } } },
          }),
          ctx.prisma.student.findUnique({
            where: { id: sanitizedInput.studentId },
            include: { User: { select: { id: true, name: true, email: true } } },
          }),
        ]);
        if (!timeSlot || !student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: timeSlot ? "Student not found" : "Time slot not found",
          });
        }
        // Check slot capacity
        if (timeSlot.Lesson.length >= timeSlot.maxStudents) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Time slot is full",
          });
        }

        // Check if the student already has a lesson in this time slot
        const existingLesson = timeSlot.Lesson.find(
          (lesson) => lesson.studentId === sanitizedInput.studentId,
        );
        if (existingLesson) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Student already has a lesson in this time slot",
          });
        }

        // Check for overlapping lessons — prevent student from double-booking across coaches
        // Exclude lessons on this same time slot (already handled by the check above)
        const overlappingLesson = await ctx.prisma.lesson.findFirst({
          where: {
            studentId: sanitizedInput.studentId,
            status: LessonStatus.SCHEDULED,
            timeSlotId: { not: sanitizedInput.timeSlotId },
            startTime: { lt: timeSlot.endTime },
            endTime: { gt: timeSlot.startTime },
          },
        });

        if (overlappingLesson) {
          const overlapTime = format(overlappingLesson.startTime, "h:mm a");
          throw new TRPCError({
            code: "CONFLICT",
            message: `Student already has a lesson at ${overlapTime} that overlaps with this time slot`,
          });
        }

        // Default to a safe timezone if not specified
        const timezone = timeSlot.Rink.timezone || "America/Toronto";

        // Look up coach with calendar tokens
        const coachForCalendar: CoachWithTokens | null = timeSlot.coachId
          ? await ctx.prisma.coach.findUnique({
              where: { id: timeSlot.coachId },
              select: { id: true, googleAccessToken: true, googleRefreshToken: true, googleTokenExpiresAt: true, googleCalendarId: true },
            })
          : null;

        // Create Google Calendar event with improved error handling
        let eventId: string | null = null;
        try {
          if (coachForCalendar) {
            eventId = await googleCalendar.createEvent(coachForCalendar, {
              summary: `${sanitizedInput.type} Lesson with ${student.User.name || "Student"}`,
              description: `Lesson Type: ${sanitizedInput.type}
Area: ${sanitizedInput.area}
${sanitizedInput.notes ? `Notes: ${sanitizedInput.notes}` : ""}`,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              attendees: [
                { email: student.User.email, name: student.User.name || undefined },
              ],
              location: timeSlot.Rink.address || "",
              timeZone: timezone,
            });
          }
        } catch (calendarError) {
          console.error("Google Calendar Error:", calendarError);
          // We'll continue and create the lesson without calendar event
        }

        // Calculate duration properly
        const durationMs = timeSlot.endTime.getTime() - timeSlot.startTime.getTime();
        const durationMinutes = Math.max(Math.floor(durationMs / 60000), 1); // Ensure at least 1 minute

        // Create the lesson with the calendar event ID (if available)
        // Inherit coachId from input or from the time slot
        const lessonCoachId = sanitizedInput.coachId || timeSlot.coachId || undefined;
        const lesson = await ctx.prisma.lesson.create({
          data: {
            ...sanitizedInput,
            id: randomUUID(),
            status: LessonStatus.SCHEDULED,
            rinkId: timeSlot.rinkId,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            duration: durationMinutes,
            googleCalendarEventId: eventId, // May be null if calendar creation failed
            ...(lessonCoachId && { coachId: lessonCoachId }),
            updatedAt: new Date(),
          },
          include: {
            Student: { include: { User: { select: { id: true, name: true, email: true } } } },
            Rink: true,
          },
        });

        // If we couldn't create the calendar event, still return success but with a note
        if (!eventId) {
          console.warn(`Lesson created without Google Calendar event: ${lesson.id}`);
          // Could add a flag to the response indicating calendar event was not created
        }

        return lesson;
      } catch (error) {
        console.error("Error creating lesson:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof TRPCError ? error.message : "Failed to create lesson",
          cause: error,
        });
      }
    }),

  cancelLesson: adminProcedure
    .input(
      z.object({
        lessonId: z.string(),
        reason: z.string().max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const lesson = await ctx.prisma.lesson.findUnique({
          where: { id: input.lessonId },
        });
        if (!lesson) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lesson not found",
          });
        }

        // Delete Google Calendar event if it exists
        if (lesson.googleCalendarEventId && lesson.coachId) {
          try {
            const coach = await ctx.prisma.coach.findUnique({
              where: { id: lesson.coachId },
              select: { id: true, googleAccessToken: true, googleRefreshToken: true, googleTokenExpiresAt: true, googleCalendarId: true },
            });
            if (coach) {
              await googleCalendar.deleteEvent(coach, lesson.googleCalendarEventId);
            }
          } catch (calendarError) {
            console.error("Error deleting Google Calendar event:", calendarError);
            // Continue with lesson cancellation even if calendar deletion fails
          }
        }

        return await ctx.prisma.lesson.update({
          where: { id: input.lessonId },
          data: {
            status: LessonStatus.CANCELLED,
            cancellationReason: input.reason,
            cancellationTime: new Date(),
            googleCalendarEventId: null, // Clear the Google Calendar event ID
          },
        });
      } catch (error) {
        console.error("Error cancelling lesson:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof TRPCError ? error.message : "Failed to cancel lesson",
          cause: error,
        });
      }
    }),

  getLessonsByDate: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        rinkId: z.string().optional(),
        coachId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // Validate the date range
        if (input.endDate < input.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "End date must be after start date",
          });
        }

        return await ctx.prisma.lesson.findMany({
          where: {
            startTime: { gte: input.startDate, lte: input.endDate },
            rinkId: input.rinkId,
            ...(input.coachId && { coachId: input.coachId }),
          },
          include: {
            Student: { include: { User: { select: { id: true, name: true, email: true } } } },
            Rink: true,
            Payment: true,
            RinkTimeSlot: true, // Include time slot for more context
          },
          orderBy: { startTime: "asc" },
        });
      } catch (error) {
        console.error("Error fetching lessons:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof TRPCError ? error.message : "Failed to fetch lessons",
          cause: error,
        });
      }
    }),

  getStudents: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          active: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const students = await ctx.prisma.student.findMany({
          where: {
            OR: input?.search
              ? [
                  {
                    User: {
                      name: { contains: input.search, mode: "insensitive" },
                    },
                  },
                  {
                    User: {
                      email: { contains: input.search, mode: "insensitive" },
                    },
                  },
                ]
              : undefined,
            User: { role: "STUDENT" },
            // If active flag is provided, filter by it
            ...(input?.active !== undefined ? { isActive: input.active } : {}),
          },
          include: {
            User: { select: { id: true, name: true, email: true, role: true } },
            // Include recent lessons for context
            Lesson: {
              where: {
                startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
                status: { not: LessonStatus.CANCELLED },
              },
              orderBy: { startTime: "desc" },
              take: 5,
            },
          },
          orderBy: { User: { name: "asc" } },
        });

        return { students };
      } catch (error) {
        console.error("Error fetching students:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof TRPCError ? error.message : "Failed to fetch students",
          cause: error,
        });
      }
    }),

  assignStudentToTimeSlot: adminProcedure
    .input(
      z.object({
        timeSlotId: z.string(),
        studentId: z.string(),
        lessonType: z.nativeEnum(LessonType).optional().default(LessonType.PRIVATE),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Assigning student to time slot:", input);

        // Validate input
        if (!input.timeSlotId || !input.studentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "timeSlotId and studentId are required",
          });
        }

        // First check if the slot is full and get timezone info
        const timeSlot = await ctx.prisma.rinkTimeSlot.findUnique({
          where: { id: input.timeSlotId },
          include: {
            Lesson: {
              where: { status: LessonStatus.SCHEDULED },
            },
            Rink: true,
          },
        });

        if (!timeSlot) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Time slot not found",
          });
        }

        if (timeSlot.Lesson.length >= timeSlot.maxStudents) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Time slot is at maximum capacity",
          });
        }

        // Check if student is already assigned
        const existingLesson = timeSlot.Lesson.find(
          (lesson) => lesson.studentId === input.studentId,
        );

        if (existingLesson) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Student is already assigned to this time slot",
          });
        }

        // Check for overlapping lessons — prevent student from double-booking across coaches
        // Exclude lessons on this same time slot (already handled by the check above)
        const overlappingLesson = await ctx.prisma.lesson.findFirst({
          where: {
            studentId: input.studentId,
            status: LessonStatus.SCHEDULED,
            timeSlotId: { not: input.timeSlotId },
            startTime: { lt: timeSlot.endTime },
            endTime: { gt: timeSlot.startTime },
          },
          include: {
            Coach: { include: { User: { select: { name: true } } } },
            Rink: { select: { name: true } },
          },
        });

        if (overlappingLesson) {
          const overlapTime = format(overlappingLesson.startTime, "h:mm a");
          const overlapEnd = format(overlappingLesson.endTime, "h:mm a");
          const coachName = overlappingLesson.Coach?.User?.name || "another coach";
          const rinkName = overlappingLesson.Rink?.name || "";
          throw new TRPCError({
            code: "CONFLICT",
            message: `This student already has a lesson with ${coachName} from ${overlapTime}–${overlapEnd}${rinkName ? ` at ${rinkName}` : ""}. A student cannot be in two lessons at the same time.`,
          });
        }

        // Get student information for calendar event
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: { User: { select: { id: true, name: true, email: true } } },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Default to a safe timezone if not specified
        const timezone = timeSlot.Rink.timezone || "America/Toronto";

        // Calculate duration in minutes
        const durationMs = timeSlot.endTime.getTime() - timeSlot.startTime.getTime();
        const durationMinutes = Math.max(Math.floor(durationMs / 60000), 1);

        // Get default pricing from database
        const defaultPricing = await ctx.prisma.defaultPricing.findFirst();

        // Fetch coach with both pricing fields and calendar tokens
        const assignCoach: (CoachWithTokens & {
          privateLessonPrice: number | null;
          groupLessonPrice: number | null;
          choreographyPrice: number | null;
          competitionPrepPrice: number | null;
          offIceDancePrice: number | null;
        }) | null = timeSlot.coachId
          ? await ctx.prisma.coach.findUnique({
              where: { id: timeSlot.coachId },
              select: {
                id: true,
                googleAccessToken: true,
                googleRefreshToken: true,
                googleTokenExpiresAt: true,
                googleCalendarId: true,
                privateLessonPrice: true,
                groupLessonPrice: true,
                choreographyPrice: true,
                competitionPrepPrice: true,
                offIceDancePrice: true,
              },
            })
          : null;

        // Build coach pricing for the price calculator
        const coachPricing = assignCoach
          ? {
              privateLessonPrice: assignCoach.privateLessonPrice,
              groupLessonPrice: assignCoach.groupLessonPrice,
              choreographyPrice: assignCoach.choreographyPrice,
              competitionPrepPrice: assignCoach.competitionPrepPrice,
              offIceDancePrice: assignCoach.offIceDancePrice,
            }
          : undefined;

        // Calculate price based on lesson type, duration, student custom pricing, and coach pricing
        const price = calculateLessonPrice(
          input.lessonType || LessonType.PRIVATE,
          durationMinutes,
          student,
          defaultPricing,
          coachPricing,
        );

        // Create Google Calendar event
        let eventId: string | null = null;
        try {
          if (assignCoach) {
            eventId = await googleCalendar.createEvent(assignCoach, {
              summary: `${input.lessonType} Lesson with ${student.User.name || "Student"}`,
              description: `Lesson Type: ${input.lessonType}
${input.notes ? `Notes: ${input.notes}` : ""}`,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              attendees: [
                { email: student.User.email, name: student.User.name || undefined },
              ],
              location: timeSlot.Rink.address || "",
              timeZone: timezone,
            });
          }
        } catch (calendarError) {
          console.error("Google Calendar Error:", calendarError);
          // Continue without calendar event
        }

        // Create the lesson and payment in a transaction
        const { lesson } = await ctx.prisma.$transaction(async (prisma) => {
          // Create the lesson (inherit coachId from the time slot)
          const lesson = await prisma.lesson.create({
            data: {
              id: randomUUID(),
              studentId: input.studentId,
              timeSlotId: input.timeSlotId,
              rinkId: timeSlot.rinkId,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              status: "SCHEDULED",
              type: input.lessonType || LessonType.PRIVATE,
              area: "MAIN_RINK",
              price,
              notes: input.notes ? sanitizeInput(input.notes) : undefined,
              duration: durationMinutes,
              googleCalendarEventId: eventId,
              ...(timeSlot.coachId && { coachId: timeSlot.coachId }),
              updatedAt: new Date(),
            },
            include: { Student: { include: { User: { select: { id: true, name: true, email: true } } } } },
          });

          // Create payment record
          const payment = await prisma.payment.create({
            data: {
              lessonId: lesson.id,
              studentId: input.studentId,
              amount: price,
              method: PaymentMethod.VENMO, // Default to Venmo, can be changed later
              status: PaymentStatus.PENDING,
              referenceCode: `PAY-${randomUUID().substring(0, 8)}`,
              lesson_date: timeSlot.startTime,
            },
          });

          return { lesson, payment };
        });

        // Create notifications for the student (in-app + pending email)
        try {
          await createScheduleChangeNotification({
            userId: student.userId,
            title: "New Lesson Scheduled",
            message: `A new ${input.lessonType || "PRIVATE"} lesson has been scheduled for ${timeSlot.startTime.toLocaleDateString()} at ${timeSlot.startTime.toLocaleTimeString()}`,
            link: "/student/schedule",
            lessonId: lesson.id,
            metadata: {
              lessonType: input.lessonType || "PRIVATE",
              rinkName: timeSlot.Rink.name,
              startTime: timeSlot.startTime.toISOString(),
              endTime: timeSlot.endTime.toISOString(),
            },
          });
        } catch (notificationError) {
          console.error("Error creating notifications:", notificationError);
          // Don't fail the lesson creation if notification fails
        }

        return lesson;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error assigning student:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign student",
          cause: error,
        });
      }
    }),

  updateLessonType: adminProcedure
    .input(
      z.object({
        lessonId: z.string(),
        lessonType: z.nativeEnum(LessonType),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get existing lesson with student and rink info
        const existingLesson = await ctx.prisma.lesson.findUnique({
          where: { id: input.lessonId },
          include: {
            Student: { include: { User: { select: { id: true, name: true, email: true } } } },
            Rink: true,
            Payment: true,
          },
        });

        if (!existingLesson) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lesson not found",
          });
        }

        // Calculate duration in minutes
        const durationMs = existingLesson.endTime.getTime() - existingLesson.startTime.getTime();
        const durationMinutes = Math.max(Math.floor(durationMs / 60000), 1);

        // Get default pricing from database
        const defaultPricing = await ctx.prisma.defaultPricing.findFirst();

        // Fetch coach pricing and calendar tokens
        const updateCoach = existingLesson.coachId
          ? await ctx.prisma.coach.findUnique({
              where: { id: existingLesson.coachId },
              select: {
                id: true,
                googleAccessToken: true,
                googleRefreshToken: true,
                googleTokenExpiresAt: true,
                googleCalendarId: true,
                privateLessonPrice: true,
                groupLessonPrice: true,
                choreographyPrice: true,
                competitionPrepPrice: true,
                offIceDancePrice: true,
              },
            })
          : null;

        const updateCoachPricing = updateCoach
          ? {
              privateLessonPrice: updateCoach.privateLessonPrice,
              groupLessonPrice: updateCoach.groupLessonPrice,
              choreographyPrice: updateCoach.choreographyPrice,
              competitionPrepPrice: updateCoach.competitionPrepPrice,
              offIceDancePrice: updateCoach.offIceDancePrice,
            }
          : undefined;

        // Calculate new price based on lesson type, duration, student custom pricing, and coach pricing
        const student = existingLesson.Student;
        const price = calculateLessonPrice(
          input.lessonType,
          durationMinutes,
          student,
          defaultPricing,
          updateCoachPricing,
        );

        // Update Google Calendar event if it exists
        if (existingLesson.googleCalendarEventId && updateCoach) {
          try {
            await googleCalendar.updateEvent(updateCoach, {
              eventId: existingLesson.googleCalendarEventId,
              summary: `${input.lessonType} Lesson with ${student.User.name || "Student"}`,
              description: `Lesson Type: ${input.lessonType}
${input.notes ? `Notes: ${input.notes}` : existingLesson.notes || ""}`,
              startTime: existingLesson.startTime,
              endTime: existingLesson.endTime,
              attendees: [
                { email: student.User.email, name: student.User.name || undefined },
              ],
              location: existingLesson.Rink.address || "",
              timeZone: existingLesson.Rink.timezone || "America/Toronto",
            });
          } catch (calendarError) {
            console.error("Error updating Google Calendar event:", calendarError);
            // Continue with lesson update even if calendar update fails
          }
        }

        // Update the lesson
        const updatedLesson = await ctx.prisma.lesson.update({
          where: { id: input.lessonId },
          data: {
            type: input.lessonType,
            price,
            notes:
              input.notes !== undefined
                ? input.notes
                  ? sanitizeInput(input.notes)
                  : null
                : undefined,
            updatedAt: new Date(),
          },
          include: {
            Student: { include: { User: { select: { id: true, name: true, email: true } } } },
            Rink: true,
            Payment: true,
          },
        });

        // Update or create payment record
        if (existingLesson.Payment) {
          // Update existing payment
          await ctx.prisma.payment.update({
            where: { lessonId: input.lessonId },
            data: {
              amount: price,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create payment if it doesn't exist (for legacy lessons)
          await ctx.prisma.payment.create({
            data: {
              lessonId: input.lessonId,
              studentId: existingLesson.studentId,
              amount: price,
              method: PaymentMethod.VENMO,
              status: PaymentStatus.PENDING,
              referenceCode: `PAY-${randomUUID().substring(0, 8)}`,
              lesson_date: existingLesson.startTime,
            },
          });
        }

        // Log security event
        logSecurityEvent("LESSON_TYPE_UPDATED", {
          userId: ctx.session?.user?.id,
          lessonId: input.lessonId,
          oldType: existingLesson.type,
          newType: input.lessonType,
          oldPrice: existingLesson.price,
          newPrice: price,
        });

        // Create notification for student
        try {
          await createScheduleChangeNotification({
            userId: student.userId,
            title: "Lesson Type Updated",
            message: `Your lesson on ${existingLesson.startTime.toLocaleDateString()} has been updated to ${input.lessonType}`,
            link: `/student/schedule/${input.lessonId}`,
            lessonId: input.lessonId,
            metadata: {
              oldType: existingLesson.type,
              newType: input.lessonType,
              oldPrice: existingLesson.price,
              newPrice: price,
            },
          });
        } catch (notificationError) {
          console.error("Error creating notification:", notificationError);
          // Don't fail the update if notification fails
        }

        return updatedLesson;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error updating lesson type:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update lesson type",
          cause: error,
        });
      }
    }),

  unassignStudent: adminProcedure
    .input(z.object({ lessonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the lesson to delete its Google Calendar event if present
        const lesson = await ctx.prisma.lesson.findUnique({
          where: { id: input.lessonId },
        });

        if (!lesson) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lesson not found",
          });
        }

        // Delete Google Calendar event if it exists
        if (lesson.googleCalendarEventId && lesson.coachId) {
          try {
            const unassignCoach = await ctx.prisma.coach.findUnique({
              where: { id: lesson.coachId },
              select: { id: true, googleAccessToken: true, googleRefreshToken: true, googleTokenExpiresAt: true, googleCalendarId: true },
            });
            if (unassignCoach) {
              await googleCalendar.deleteEvent(unassignCoach, lesson.googleCalendarEventId);
            }
          } catch (calendarError) {
            console.error("Error deleting Google Calendar event:", calendarError);
            // Continue with lesson deletion even if calendar deletion fails
          }
        }

        await ctx.prisma.lesson.delete({
          where: { id: input.lessonId },
        });

        return { success: true };
      } catch (error) {
        console.error("Error unassigning student:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof TRPCError ? error.message : "Failed to unassign student",
          cause: error,
        });
      }
    }),
});
