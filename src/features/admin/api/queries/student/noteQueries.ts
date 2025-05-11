import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { TRPCError } from "@trpc/server";
// src/features/admin/api/queries/student/noteQueries.ts
import { z } from "zod";

export const noteQueries = createTRPCRouter({
  // Mutation: Add student note
  addStudentNote: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        content: z.string(),
        type: z.enum(["ADMIN", "INSTRUCTOR"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.studentNote.create({
          data: {
            ...input,
            createdById: ctx.session?.user?.id || "system",
          },
        });
      } catch (error) {
        console.error("Error adding note:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add note",
          cause: error,
        });
      }
    }),
});
