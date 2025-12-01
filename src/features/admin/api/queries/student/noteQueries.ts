import { TRPCError } from "@trpc/server";
// src/features/admin/api/queries/student/noteQueries.ts
import { z } from "zod";
import { logSecurityEvent, sanitizeInput } from "@/lib/security";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

export const noteQueries = createTRPCRouter({
  // Query: Get student notes
  getStudentNotes: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const notes = await ctx.prisma.studentNote.findMany({
          where: {
            studentId: input.studentId,
          },
          include: {
            User: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return notes;
      } catch (error) {
        console.error("Error fetching student notes:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch student notes",
          cause: error,
        });
      }
    }),

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
        // Sanitize the content input
        const sanitizedContent = sanitizeInput(input.content);

        // Log security event for note creation
        logSecurityEvent("STUDENT_NOTE_CREATED", {
          userId: ctx.session?.user?.id,
          studentId: input.studentId,
          contentLength: sanitizedContent.length,
        });

        return await ctx.prisma.studentNote.create({
          data: {
            ...input,
            content: sanitizedContent,
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
