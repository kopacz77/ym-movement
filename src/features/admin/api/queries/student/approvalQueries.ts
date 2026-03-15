import { TRPCError } from "@trpc/server";
// src/features/admin/api/queries/student/approvalQueries.ts
import { z } from "zod";
import { createPasswordResetToken } from "@/lib/auth-tokens";
import { sendApprovalEmail } from "@/lib/email";
import { adminProcedure, createTRPCRouter } from "@/lib/trpc";

export const approvalQueries = createTRPCRouter({
  // Query: Get pending approvals
  getPendingApprovals: adminProcedure.query(async ({ ctx }) => {
    try {
      console.log("Fetching pending approvals");

      // For clarity, let's use Prisma's built-in querying instead of raw SQL
      const pendingStudents = await ctx.prisma.student.findMany({
        where: { isApproved: false },
        include: { User: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      // Transform to match the expected format
      const formattedStudents = pendingStudents.map((student) => ({
        id: student.id,
        user: {
          name: student.User.name || "Unnamed",
          email: student.User.email,
        },
        status: "PENDING" as const,
        createdAt: student.createdAt,
      }));

      console.log(`Found ${formattedStudents.length} pending approvals`);
      return { students: formattedStudents };
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch pending approvals",
        cause: error,
      });
    }
  }),

  // Mutation: Approve student
  approveStudent: adminProcedure
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`Approving student with ID: ${input.studentId}`);
        // Find the student first
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            User: true,
          },
        });

        if (!student) {
          console.log(`Student not found: ${input.studentId}`);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Update the student with approval details
        await ctx.prisma.student.update({
          where: { id: input.studentId },
          data: {
            isApproved: true,
            approvedAt: new Date(),
            approvedById: ctx.session?.user?.id || "admin001",
          },
        });

        // Fetch the updated student with user info
        const updatedStudent = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            User: true,
          },
        });

        if (!updatedStudent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found after update",
          });
        }

        // Send approval email with registration completion link
        try {
          if (updatedStudent.User?.email) {
            // Create a password reset token for the registration completion process
            const passwordResetToken = await createPasswordResetToken(
              updatedStudent.User.id,
              updatedStudent.User.email,
              updatedStudent.User.name,
              false, // Not an invitation
              false, // Don't send any email - we'll send our custom approval email
            );

            // Send approval email with completion link
            await sendApprovalEmail(
              updatedStudent.User.email,
              updatedStudent.User.name || "Student",
              passwordResetToken.token,
            );

            console.log(
              `Approval email with registration completion link sent to ${updatedStudent.User.email}`,
            );
          } else {
            console.error("Cannot send approval email: user or email is missing");
          }
        } catch (emailError) {
          console.error("Failed to send approval email:", emailError);
          // We still return success even if email fails
        }

        return updatedStudent;
      } catch (error) {
        console.error("Error approving student:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to approve student",
          cause: error,
        });
      }
    }),

  // Mutation: Approve all students (development helper)
  approveAllStudents: adminProcedure.mutation(async ({ ctx }) => {
    try {
      console.log("Approving all unapproved students");

      const unapprovedStudents = await ctx.prisma.student.findMany({
        where: { isApproved: false },
        include: { User: true },
      });

      if (unapprovedStudents.length === 0) {
        return { message: "No unapproved students found", approved: 0 };
      }

      const result = await ctx.prisma.student.updateMany({
        where: { isApproved: false },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedById: ctx.session?.user?.id || "admin001",
        },
      });

      console.log(`Approved ${result.count} students`);
      return {
        message: `Successfully approved ${result.count} students`,
        approved: result.count,
        students: unapprovedStudents.map((s) => s.User.name || s.User.email),
      };
    } catch (error) {
      console.error("Error approving all students:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to approve all students",
        cause: error,
      });
    }
  }),

  // Mutation: Reject student
  rejectStudent: adminProcedure
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`Rejecting student with ID: ${input.studentId}`);
        // Find the student first
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            User: true,
          },
        });

        if (!student) {
          console.log(`Student not found: ${input.studentId}`);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Delete the student record (this will cascade to user via onDelete in schema)
        await ctx.prisma.student.delete({
          where: { id: input.studentId },
        });

        return { success: true, message: "Student registration rejected successfully" };
      } catch (error) {
        console.error("Error rejecting student:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reject student",
          cause: error,
        });
      }
    }),
});
