// src/features/student/api/queries/lessonQueries.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { TRPCError } from "@trpc/server";

export const lessonRouter = createTRPCRouter({
  getLesson: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    try {
      // Get the lesson with related data
      const lesson = await ctx.prisma.lesson.findUnique({
        where: {
          id: input.id,
        },
        include: {
          payment: true,
          rink: true,
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
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve lesson details",
        cause: error,
      });
    }
  }),

  cancelLesson: publicProcedure
    .input(
      z.object({
        lessonId: z.string(),
        reason: z.string().optional().default("No reason provided"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Update the lesson status to cancelled
        const result = await ctx.prisma.lesson.update({
          where: { id: input.lessonId },
          data: {
            status: "CANCELLED",
            cancellationReason: input.reason,
            cancellationTime: new Date(),
          },
        });

        return result;
      } catch (error) {
        console.error("Error cancelling lesson:", error);
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel lesson",
          cause: error,
        });
      }
    }),
});
