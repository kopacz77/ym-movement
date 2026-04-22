import { randomUUID } from "node:crypto";
import { Level, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
// src/features/admin/api/queries/student/studentQueries.ts
import { z } from "zod";
import { createPasswordResetToken } from "@/lib/auth-tokens";
import { sendInvitationEmail, sendWelcomeEmail } from "@/lib/email";
import { logSecurityEvent, sanitizeInput } from "@/lib/security";
import { adminProcedure, createTRPCRouter } from "@/lib/trpc";
import { formatEmail, formatPhoneNumber, toProperCase } from "@/lib/utils";
import { type StudentWithInviteStatus, studentFormSchema } from "./schemas";

export const studentQueries = createTRPCRouter({
  // Debug query: Get student count and approval status
  getStudentStats: adminProcedure.query(async ({ ctx }) => {
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
  getStudents: adminProcedure
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
          // Apply active filter if specified (undefined = show all, true = active only, false = inactive only)
          ...(input?.active !== undefined ? { isActive: input.active } : {}),
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
            select: {
              id: true,
              userId: true,
              phone: true,
              level: true,
              isApproved: true,
              approvedAt: true,
              isActive: true,
              deactivatedAt: true,
              maxLessonsPerWeek: true,
              createdAt: true,
              customPricingEnabled: true,
              privateLessonPrice: true,
              groupLessonPrice: true,
              choreographyPrice: true,
              competitionPrepPrice: true,
              offIceDancePrice: true,
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  createdAt: true,
                  // Explicitly exclude: password, emailVerified, updatedAt
                },
              },
              // Replace full Lesson loading with just a count
              _count: {
                select: {
                  Lesson: {
                    where: { status: "SCHEDULED" },
                  },
                },
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
  getStudent: adminProcedure
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
  createStudent: adminProcedure
    .input(
      studentFormSchema.extend({
        sendEmail: z.boolean().default(true),
        sendInvite: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, email, sendEmail, sendInvite, ...studentData } = input;

      // Sanitize and format all input data
      const sanitizedName = toProperCase(sanitizeInput(name));
      const sanitizedEmail = formatEmail(email);
      const sanitizedStudentData = {
        ...studentData,
        notes: studentData.notes ? sanitizeInput(studentData.notes) : undefined,
        phone: studentData.phone ? formatPhoneNumber(sanitizeInput(studentData.phone)) : undefined,
        dateOfBirth: studentData.dateOfBirth || undefined,
        emergencyContact: studentData.emergencyContact
          ? {
              name: toProperCase(sanitizeInput(studentData.emergencyContact.name || "")),
              phone: formatPhoneNumber(sanitizeInput(studentData.emergencyContact.phone || "")),
              relationship: toProperCase(
                sanitizeInput(studentData.emergencyContact.relationship || ""),
              ),
            }
          : undefined,
      };

      // Log security event
      logSecurityEvent("STUDENT_CREATED", {
        userId: ctx.session?.user?.id,
        studentEmail: sanitizedEmail,
        studentName: sanitizedName,
      });

      try {
        // Check if user already exists to avoid conflicts
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email: sanitizedEmail },
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
              email: sanitizedEmail,
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
  updateStudent: adminProcedure
    .input(studentFormSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, name, email, ...studentData } = input;

      // Sanitize and format all input data
      const sanitizedName = toProperCase(sanitizeInput(name));
      const sanitizedEmail = formatEmail(email);
      const sanitizedStudentData = {
        ...studentData,
        notes: studentData.notes ? sanitizeInput(studentData.notes) : undefined,
        phone: studentData.phone ? formatPhoneNumber(sanitizeInput(studentData.phone)) : undefined,
        dateOfBirth: studentData.dateOfBirth || undefined,
        emergencyContact: studentData.emergencyContact
          ? {
              name: toProperCase(sanitizeInput(studentData.emergencyContact.name || "")),
              phone: formatPhoneNumber(sanitizeInput(studentData.emergencyContact.phone || "")),
              relationship: toProperCase(
                sanitizeInput(studentData.emergencyContact.relationship || ""),
              ),
            }
          : undefined,
      };

      // Log security event
      logSecurityEvent("STUDENT_UPDATED", {
        userId: ctx.session?.user?.id,
        studentId: id,
        studentEmail: sanitizedEmail,
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
            data: { name: sanitizedName, email: sanitizedEmail },
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

  // Mutation: Toggle student active status (deactivate/reactivate)
  toggleStatus: adminProcedure
    .input(z.object({ studentId: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`Toggling student ${input.studentId} active status to: ${input.active}`);

        // Find the student first
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

        // Update the student's active status
        const updatedStudent = await ctx.prisma.student.update({
          where: { id: input.studentId },
          data: {
            isActive: input.active,
            deactivatedAt: input.active ? null : new Date(),
            deactivatedById: input.active ? null : ctx.session?.user?.id,
          },
          include: { User: true },
        });

        // Log security event
        logSecurityEvent(input.active ? "STUDENT_REACTIVATED" : "STUDENT_DEACTIVATED", {
          userId: ctx.session?.user?.id,
          studentId: input.studentId,
          studentEmail: student.User.email,
          studentName: student.User.name,
        });

        console.log(
          `Student ${student.User.name} (${student.User.email}) has been ${input.active ? "reactivated" : "deactivated"}`,
        );

        return updatedStudent;
      } catch (error) {
        console.error("Error toggling student status:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update student status",
          cause: error,
        });
      }
    }),

  // Mutation: Resend invitation email to student
  resendInvitation: adminProcedure
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

        // Create token WITHOUT letting the helper send the email — we send it here so
        // email failures surface as real errors instead of being swallowed internally.
        const token = await createPasswordResetToken(
          student.User.id,
          student.User.email,
          student.User.name,
          true, // Mark as invitation
          false, // Don't send email — we'll send and surface errors ourselves
        );

        try {
          await sendInvitationEmail(
            student.User.email,
            student.User.name || "Student",
            token.token,
          );
        } catch (emailError) {
          console.error("Failed to resend student invitation email:", emailError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              emailError instanceof Error ? emailError.message : "Failed to send invitation email",
          });
        }

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
  deleteStudent: adminProcedure
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`Deleting student with ID: ${input.studentId}`);

        // Find the student first to get user details and check for related data
        const [student, counts] = await Promise.all([
          ctx.prisma.student.findUnique({
            where: { id: input.studentId },
            select: {
              id: true,
              userId: true,
              User: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          }),
          // Get counts instead of loading all IDs
          Promise.all([
            ctx.prisma.lesson.count({ where: { studentId: input.studentId } }),
            ctx.prisma.payment.count({ where: { studentId: input.studentId } }),
            ctx.prisma.studentNote.count({ where: { studentId: input.studentId } }),
          ]).then(([lessonCount, paymentCount, noteCount]) => ({
            lessons: lessonCount,
            payments: paymentCount,
            notes: noteCount,
          })),
        ]);

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        console.log(
          `Found student with ${counts.lessons} lessons, ${counts.payments} payments, ${counts.notes} notes`,
        );

        // Log security event
        logSecurityEvent("STUDENT_DELETED", {
          userId: ctx.session?.user?.id,
          studentId: input.studentId,
          studentEmail: student.User.email,
          studentName: student.User.name,
        });

        // Use transaction to properly handle cascade deletions
        await ctx.prisma.$transaction(async (tx) => {
          console.log("Starting transaction to delete student and related records...");

          // 1. Delete student notes first
          if (counts.notes > 0) {
            console.log(`Deleting ${counts.notes} student notes...`);
            await tx.studentNote.deleteMany({
              where: { studentId: input.studentId },
            });
          }

          // 2. Delete payments (these reference lessons, so delete before lessons)
          if (counts.payments > 0) {
            console.log(`Deleting ${counts.payments} payments...`);
            await tx.payment.deleteMany({
              where: { studentId: input.studentId },
            });
          }

          // 3. Delete lessons
          if (counts.lessons > 0) {
            console.log(`Deleting ${counts.lessons} lessons...`);
            await tx.lesson.deleteMany({
              where: { studentId: input.studentId },
            });
          }

          // 4. Delete any notifications for this user
          console.log("Deleting user notifications...");
          await tx.notification.deleteMany({
            where: { userId: student.userId },
          });

          // 5. Delete any password reset tokens
          console.log("Deleting password reset tokens...");
          await tx.passwordResetToken.deleteMany({
            where: { userId: student.userId },
          });

          // 6. Finally delete the student record
          console.log("Deleting student record...");
          await tx.student.delete({
            where: { id: input.studentId },
          });

          // 7. Delete the user record last
          console.log("Deleting user record...");
          await tx.user.delete({
            where: { id: student.userId },
          });

          console.log("Transaction completed successfully");
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

        // Provide more specific error messages
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2003") {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Cannot delete student due to foreign key constraints. Please check for related records.",
            });
          }
          if (error.code === "P2025") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Student record not found during deletion",
            });
          }
        }

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
