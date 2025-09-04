import { Level, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
// src/features/admin/api/queries/student/studentQueries.ts
import { z } from "zod";
import { createPasswordResetToken } from "@/lib/auth-tokens";
import { sendWelcomeEmail } from "@/lib/email";
import { logSecurityEvent, sanitizeInput } from "@/lib/security";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { type StudentWithInviteStatus, studentFormSchema } from "./schemas";

export const studentQueries = createTRPCRouter({
  // Debug query: Get student count and approval status
  getStudentStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const [total, approved, unapproved] = await Promise.all([
        ctx.prisma.student.count(),
        ctx.prisma.student.count({ where: { isApproved: true } }),
        ctx.prisma.student.count({ where: { isApproved: false } }),
      ]);

      return {
        total,
        approved,
        unapproved,
      };
    } catch (error) {
      console.error("Error fetching student stats:", error);
      return { total: 0, approved: 0, unapproved: 0 };
    }
  }),

  // Query: Get all students with filters
  getStudents: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          level: z.nativeEnum(Level).optional(),
          active: z.boolean().optional(),
          approved: z.boolean().optional(), // Add approved filter
          page: z.number().min(1).optional(),
          limit: z.number().min(1).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: Prisma.StudentWhereInput = {
          // Apply approved filter if specified, default to approved students for assignment purposes
          ...(input?.approved !== undefined
            ? { isApproved: input.approved }
            : { isApproved: true }),
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
          level: input?.level,
        };

        const [students, total] = await Promise.all([
          ctx.prisma.student.findMany({
            where,
            include: {
              User: true,
              Lesson: {
                orderBy: { startTime: "desc" },
                take: 1,
              },
            },
            orderBy: {
              User: { name: "asc" },
            },
            skip: input?.page ? (input.page - 1) * (input.limit ?? 100) : undefined,
            take: input?.limit ?? 100,
          }),
          ctx.prisma.student.count({ where }),
        ]);

        return {
          students,
          pagination: {
            total,
            pages: Math.ceil(total / (input?.limit ?? 100)),
            current: input?.page ?? 1,
          },
        };
      } catch (error) {
        console.error("Error fetching students:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch students",
          cause: error,
        });
      }
    }),

  // Query: Get single student details
  getStudent: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        console.log("Fetching student with ID:", input.studentId);
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            User: true,
            Lesson: {
              take: 5,
              orderBy: { startTime: "desc" },
              include: {
                Payment: true,
              },
            },
          },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        return student;
      } catch (error) {
        console.error("Error fetching student details:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch student details",
          cause: error,
        });
      }
    }),

  // Mutation: Create new student - UPDATED with password reset invitation
  createStudent: protectedProcedure
    .input(
      studentFormSchema.extend({
        sendEmail: z.boolean().default(true),
        sendInvite: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, email, sendEmail, sendInvite, ...studentData } = input;

      // Sanitize all input data
      const sanitizedName = sanitizeInput(name);
      const sanitizedStudentData = {
        ...studentData,
        notes: studentData.notes ? sanitizeInput(studentData.notes) : undefined,
        phone: studentData.phone ? sanitizeInput(studentData.phone) : undefined,
        emergencyContact: studentData.emergencyContact
          ? {
              name: sanitizeInput(studentData.emergencyContact.name || ""),
              phone: sanitizeInput(studentData.emergencyContact.phone || ""),
              relationship: sanitizeInput(studentData.emergencyContact.relationship || ""),
            }
          : undefined,
      };

      // Log security event
      logSecurityEvent("STUDENT_CREATED", {
        userId: ctx.session?.user?.id,
        studentEmail: email,
        studentName: sanitizedName,
      });

      try {
        // Check if user already exists to avoid conflicts
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email },
        });

        let newUser: { id: string; name: string | null; email: string } | null = null;
        let student: {
          id: string;
          userId: string;
          User?: {
            name: string | null;
            email: string;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        } | null = null;

        if (existingUser) {
          // If user exists but doesn't have a student record, create one
          const existingStudent = await ctx.prisma.student.findUnique({
            where: { userId: existingUser.id },
          });

          if (existingStudent) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A student with this email already exists",
            });
          }

          // Create student for existing user
          student = await ctx.prisma.student.create({
            data: {
              id: randomUUID(),
              ...sanitizedStudentData,
              userId: existingUser.id,
              updatedAt: new Date(),
            },
            include: {
              User: true,
            },
          });
        } else {
          // Create new user first, then student
          newUser = await ctx.prisma.user.create({
            data: {
              id: randomUUID(),
              name: sanitizedName,
              email,
              role: "STUDENT",
              updatedAt: new Date(),
            },
          });

          // Create student with the new user's ID
          student = await ctx.prisma.student.create({
            data: {
              id: randomUUID(),
              ...sanitizedStudentData,
              userId: newUser.id,
              updatedAt: new Date(),
            },
            include: {
              User: true,
            },
          });
        }

        // Create result object with proper typing
        if (!student || !student.id) {
          throw new Error("Failed to create student");
        }

        const result: StudentWithInviteStatus = {
          ...student,
          user: {
            name: student?.User?.name || null,
            email: student?.User?.email || "",
          },
          inviteSent: false,
        };

        // Get user data - either from existing user or newly created user
        const userData = existingUser || newUser || student?.User;

        // Only send ONE email - either welcome OR invitation, not both
        if (sendInvite && userData && student) {
          // If sending invitation, don't send welcome email - the invitation serves as welcome
          try {
            await createPasswordResetToken(
              student.userId,
              userData.email,
              userData.name,
              true, // Mark as invitation
              true, // Send invitation email
            );

            // Set the flag in our response object
            result.inviteSent = true;

            console.log(`Invitation with password reset link sent to ${userData.email}`);
          } catch (inviteError) {
            console.error("Failed to send invitation email:", inviteError);
          }
        } else if (sendEmail && userData) {
          // Only send welcome email if NOT sending invitation
          try {
            await sendWelcomeEmail(userData.email, userData.name || "Student");
            console.log(`Welcome email sent to ${userData.email}`);
          } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
            // We don't throw here - we just log the error
          }
        }

        return result;
      } catch (error) {
        console.error("Error creating student:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A student with this email already exists",
            });
          }
        }
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create student",
          cause: error,
        });
      }
    }),

  // Mutation: Update student
  updateStudent: protectedProcedure
    .input(studentFormSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, name, email, ...studentData } = input;

      // Sanitize all input data
      const sanitizedName = sanitizeInput(name);
      const sanitizedStudentData = {
        ...studentData,
        notes: studentData.notes ? sanitizeInput(studentData.notes) : undefined,
        phone: studentData.phone ? sanitizeInput(studentData.phone) : undefined,
        emergencyContact: studentData.emergencyContact
          ? {
              name: sanitizeInput(studentData.emergencyContact.name || ""),
              phone: sanitizeInput(studentData.emergencyContact.phone || ""),
              relationship: sanitizeInput(studentData.emergencyContact.relationship || ""),
            }
          : undefined,
      };

      // Log security event
      logSecurityEvent("STUDENT_UPDATED", {
        userId: ctx.session?.user?.id,
        studentId: id,
        studentEmail: email,
      });

      try {
        console.log(`Updating student with ID: ${id}`);
        // Find the student to update by ID
        const student = await ctx.prisma.student.findUnique({
          where: { id },
          include: {
            User: true,
          },
        });

        if (!student) {
          console.error(`Student not found with ID: ${id}`);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        console.log(`Found student: ${student.id}, userId: ${student.userId}`);

        // Update user and student in a transaction
        const [user, updatedStudent] = await ctx.prisma.$transaction([
          ctx.prisma.user.update({
            where: { id: student.userId },
            data: { name: sanitizedName, email },
          }),
          ctx.prisma.student.update({
            where: { id },
            data: sanitizedStudentData,
          }),
        ]);

        return { user, student: updatedStudent };
      } catch (error) {
        console.error("Error updating student:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A student with this email already exists",
            });
          }
        }
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update student",
          cause: error,
        });
      }
    }),

  // Mutation: Toggle student status
  toggleStatus: protectedProcedure
    .input(z.object({ studentId: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Since there's no active field, we'll just return the student for now
        return await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
        });
      } catch (error) {
        console.error("Error toggling student status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update student status",
          cause: error,
        });
      }
    }),

  // Mutation: Resend invitation email to student
  resendInvitation: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`Resending invitation for student ID: ${input.studentId}`);

        // Find the student with user details
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

        // Create a new password reset token and send invitation
        await createPasswordResetToken(
          student.User.id,
          student.User.email,
          student.User.name,
          true, // Mark as invitation
        );

        return {
          success: true,
          email: student.User.email,
        };
      } catch (error) {
        console.error("Error resending invitation:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to resend invitation",
          cause: error,
        });
      }
    }),

  // Mutation: Delete student
  deleteStudent: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`Deleting student with ID: ${input.studentId}`);

        // Find the student first to get user details
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

        // Log security event
        logSecurityEvent("STUDENT_DELETED", {
          userId: ctx.session?.user?.id,
          studentId: input.studentId,
          studentEmail: student.User.email,
          studentName: student.User.name,
        });

        // Delete the student record (this will cascade to user via onDelete in schema)
        await ctx.prisma.student.delete({
          where: { id: input.studentId },
        });

        console.log(`Successfully deleted student: ${student.User.name} (${student.User.email})`);
        return {
          success: true,
          message: "Student deleted successfully",
          deletedStudent: {
            name: student.User.name,
            email: student.User.email,
          },
        };
      } catch (error) {
        console.error("Error deleting student:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete student",
          cause: error,
        });
      }
    }),
});
