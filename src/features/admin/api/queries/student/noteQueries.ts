import { TRPCError } from "@trpc/server";
// src/features/admin/api/queries/student/noteQueries.ts
import { z } from "zod";
import { logSecurityEvent, sanitizeInput } from "@/lib/security";
import { adminProcedure, createTRPCRouter } from "@/lib/trpc";

export const noteQueries = createTRPCRouter({
  // Query: Get student notes
  getStudentNotes: adminProcedure
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
  addStudentNote: adminProcedure
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

  // Mutation: Delete student note
  deleteStudentNote: adminProcedure
    .input(
      z.object({
        noteId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Log security event for note deletion
        logSecurityEvent("STUDENT_NOTE_DELETED", {
          userId: ctx.session?.user?.id,
          noteId: input.noteId,
        });

        await ctx.prisma.studentNote.delete({
          where: {
            id: input.noteId,
          },
        });

        return { success: true };
      } catch (error) {
        console.error("Error deleting note:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete note",
          cause: error,
        });
      }
    }),
});
