import { TRPCError } from "@trpc/server";
// src/features/student/api/queries/lessonQueries.ts
import { z } from "zod";
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
            Payment: true,
            Rink: true,
            Coach: { include: { User: { select: { name: true } } } },
          },
        });

        if (!lesson) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lesson not found",
          });
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
