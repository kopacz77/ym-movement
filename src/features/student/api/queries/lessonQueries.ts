import { TRPCError } from "@trpc/server";
// src/features/student/api/queries/lessonQueries.ts
import { z } from "zod";
import { isAdminRole, isCoachRole } from "@/lib/roles";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

export const lessonRouter = createTRPCRouter({
  getLesson: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // Get the lesson with related data
        const lesson = await ctx.prisma.lesson.findUnique({
          where: {
            id: input.id,
          },
          include: {
            Student: { select: { userId: true } },
            Payment: true,
            Rink: true,
            Coach: { include: { User: { select: { name: true } } } },
            RinkTimeSlot: { select: { isActive: true } },
          },
        });

        if (!lesson) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lesson not found",
          });
        }

        // SECURITY: Ownership check — non-admin/coach users can only view their own lessons
        const userRole = ctx.session.user.role;
        if (!isAdminRole(userRole) && !isCoachRole(userRole)) {
          if (lesson.Student.userId !== ctx.session.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You do not have permission to view this lesson",
            });
          }

          // Hide lessons on draft (unpublished) time slots from students
          if (lesson.RinkTimeSlot && !lesson.RinkTimeSlot.isActive) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lesson not found",
            });
          }
        }

        return lesson;
      } catch (error) {
        console.error("Error fetching lesson details:", error);
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve lesson details",
          cause: error,
        });
      }
    }),
});
