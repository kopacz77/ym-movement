import { googleCalendar } from "@/lib/google/calendar";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { LessonStatus, LessonType, RinkArea } from "@prisma/client";
import { TRPCError } from "@trpc/server";
// src/features/admin/api/queries/schedule/lessonQueries.ts
import { z } from "zod";
import { randomUUID } from "crypto";

export const lessonRouter = createTRPCRouter({
  createLesson: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        timeSlotId: z.string(),
        type: z.nativeEnum(LessonType),
        area: z.nativeEnum(RinkArea),
        price: z.number(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [timeSlot, student] = await Promise.all([
          ctx.prisma.rinkTimeSlot.findUnique({
            where: { id: input.timeSlotId },
            include: { Rink: true, Lesson: true },
          }),
          ctx.prisma.student.findUnique({
            where: { id: input.studentId },
            include: { User: true },
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
          (lesson) => lesson.studentId === input.studentId,
        );
        if (existingLesson) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Student already has a lesson in this time slot",
          });
        }

        // Default to a safe timezone if not specified
        const timezone = timeSlot.Rink.timezone || "America/Toronto";

        // Create Google Calendar event with improved error handling
        let eventId: string | null = null;
        try {
          eventId = await googleCalendar.createEvent({
            summary: `${input.type} Lesson with ${student.User.name || "Student"}`,
            description: `Lesson Type: ${input.type}
Area: ${input.area}
${input.notes ? `Notes: ${input.notes}` : ""}`,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            attendees: [
              { email: student.User.email, name: student.User.name || undefined },
              { email: process.env.INSTRUCTOR_EMAIL || "" },
            ],
            location: timeSlot.Rink.address || "",
            timeZone: timezone,
          });
        } catch (calendarError) {
          console.error("Google Calendar Error:", calendarError);
          // We'll continue and create the lesson without calendar event
        }

        // Calculate duration properly
        const durationMs = timeSlot.endTime.getTime() - timeSlot.startTime.getTime();
        const durationMinutes = Math.max(Math.floor(durationMs / 60000), 1); // Ensure at least 1 minute

        // Create the lesson with the calendar event ID (if available)
        const lesson = await ctx.prisma.lesson.create({
          data: {
            ...input,
            id: randomUUID(),
            status: LessonStatus.SCHEDULED,
            rinkId: timeSlot.rinkId,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            duration: durationMinutes,
            googleCalendarEventId: eventId, // May be null if calendar creation failed
            updatedAt: new Date(),
          },
          include: {
            Student: { include: { User: true } },
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

  cancelLesson: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        reason: z.string(),
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
        if (lesson.googleCalendarEventId) {
          try {
            await googleCalendar.deleteEvent(lesson.googleCalendarEventId);
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

  getLessonsByDate: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        rinkId: z.string().optional(),
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
          },
          include: {
            Student: { include: { User: true } },
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

  getStudents: protectedProcedure
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
            User: true,
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

  assignStudentToTimeSlot: protectedProcedure
    .input(
      z.object({
        timeSlotId: z.string(),
        studentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // First check if the slot is full and get timezone info
        const timeSlot = await ctx.prisma.rinkTimeSlot.findUnique({
          where: { id: input.timeSlotId },
          include: {
            Lesson: true,
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

        // Get student information for calendar event
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: { User: true },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Default to a safe timezone if not specified
        const timezone = timeSlot.Rink.timezone || "America/Toronto";

        // Create Google Calendar event
        let eventId: string | null = null;
        try {
          eventId = await googleCalendar.createEvent({
            summary: `Lesson with ${student.User.name || "Student"}`,
            description: "Quick assignment from scheduler",
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            attendees: [
              { email: student.User.email, name: student.User.name || undefined },
              { email: process.env.INSTRUCTOR_EMAIL || "" },
            ],
            location: timeSlot.Rink.address || "",
            timeZone: timezone,
          });
        } catch (calendarError) {
          console.error("Google Calendar Error:", calendarError);
          // Continue without calendar event
        }

        // Calculate duration properly
        const durationMs = timeSlot.endTime.getTime() - timeSlot.startTime.getTime();
        const durationMinutes = Math.max(Math.floor(durationMs / 60000), 1); // Ensure at least 1 minute

        // Create the lesson
        return await ctx.prisma.lesson.create({
          data: {
            id: randomUUID(),
            studentId: input.studentId,
            timeSlotId: input.timeSlotId,
            rinkId: timeSlot.rinkId,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            status: "SCHEDULED",
            type: "PRIVATE",
            area: "MAIN_RINK",
            price: 0,
            duration: durationMinutes,
            googleCalendarEventId: eventId,
            updatedAt: new Date(),
          },
          include: { Student: { include: { User: true } } },
        });
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

  unassignStudent: protectedProcedure
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
        if (lesson.googleCalendarEventId) {
          try {
            await googleCalendar.deleteEvent(lesson.googleCalendarEventId);
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
