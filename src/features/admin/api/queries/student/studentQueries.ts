import { createPasswordResetToken } from "@/lib/auth-tokens";
import { sendWelcomeEmail } from "@/lib/email";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { Level, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
// src/features/admin/api/queries/student/studentQueries.ts
import { z } from "zod";
import { StudentWithInviteStatus, studentFormSchema } from "./schemas";

export const studentQueries = createTRPCRouter({
  // Query: Get all students with filters
  getStudents: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          level: z.nativeEnum(Level).optional(),
          active: z.boolean().optional(),
          page: z.number().min(1).optional(),
          limit: z.number().min(1).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: Prisma.StudentWhereInput = {
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
            skip: input?.page ? (input.page - 1) * (input.limit ?? 10) : undefined,
            take: input?.limit ?? 10,
          }),
          ctx.prisma.student.count({ where }),
        ]);

        return {
          students,
          pagination: {
            total,
            pages: Math.ceil(total / (input?.limit ?? 10)),
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

      try {
        // Check if user already exists to avoid conflicts
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email },
        });

        let student: {
          id: string;
          userId: string;
          user: {
            name: string | null;
            email: string;
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
              ...studentData,
              userId: existingUser.id,
            },
            include: {
              user: true,
            },
          });
        } else {
          // Create new user and student
          student = await ctx.prisma.student.create({
            data: {
              ...studentData,
              user: {
                create: {
                  name,
                  email,
                  role: "STUDENT",
                },
              },
            },
            include: {
              user: true,
            },
          });
        }

        // Create result object with proper typing
        const result: StudentWithInviteStatus = {
          ...student,
          inviteSent: false,
        };

        // Send regular welcome email if requested
        if (sendEmail) {
          try {
            await sendWelcomeEmail(student.user.email, student.user.name || "Student");
            console.log(`Welcome email sent to ${student.user.email}`);
          } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
            // We don't throw here - we just log the error
          }
        }

        // Send invitation with password reset link if requested
        if (sendInvite) {
          try {
            await createPasswordResetToken(
              student.userId,
              student.user.email,
              student.user.name,
              true, // Mark as invitation
            );

            // Set the flag in our response object
            result.inviteSent = true;

            console.log(`Invitation with password reset link sent to ${student.user.email}`);
          } catch (inviteError) {
            console.error("Failed to send invitation email:", inviteError);
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
            data: { name, email },
          }),
          ctx.prisma.student.update({
            where: { id },
            data: studentData,
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
});
