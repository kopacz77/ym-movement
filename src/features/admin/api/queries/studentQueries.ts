// src/features/admin/api/queries/studentQueries.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { TRPCError } from "@trpc/server";
import { Level, Prisma } from "@prisma/client";
import { sendWelcomeEmail } from "@/lib/email";
import { sendApprovalEmail } from "@/lib/email";

const studentFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  level: z.nativeEnum(Level),
  maxLessonsPerWeek: z.number().min(1, "Minimum 1 lesson per week"),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

// Pricing schemas
const defaultPricingSchema = z.object({
  privateLessonPrice: z.number().min(0),
  groupLessonPrice: z.number().min(0),
  choreographyPrice: z.number().min(0),
  competitionPrice: z.number().min(0),
});

const studentPricingSchema = z.object({
  studentId: z.string(),
  customPricingEnabled: z.boolean(),
  privateLessonPrice: z.number().nullable(),
  groupLessonPrice: z.number().nullable(),
  choreographyPrice: z.number().nullable(),
  competitionPrepPrice: z.number().nullable(),
});

export const studentRouter = createTRPCRouter({
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
                  user: {
                    name: { contains: input.search, mode: "insensitive" },
                  },
                },
                {
                  user: {
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
              user: true,
              lessons: {
                orderBy: { startTime: "desc" },
                take: 1,
              },
            },
            orderBy: {
              user: { name: "asc" },
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
        // biome-ignore lint/suspicious/noConsoleLog: <explanation>
        console.log("Fetching student with ID:", input.studentId);
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            user: true,
            lessons: {
              take: 5,
              orderBy: { startTime: "desc" },
              include: {
                payment: true,
              },
            },
          },
        });

        // biome-ignore lint/suspicious/noConsoleLog: <explanation>
        console.log("Fetching student with ID:", input.studentId);
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

  // Query: Get pending approvals
  getPendingApprovals: protectedProcedure.query(async ({ ctx }) => {
    try {
      console.log("Fetching pending approvals");
      // Use raw query to work around the type issue with isApproved
      const pendingStudents = await ctx.prisma.$queryRaw`
        SELECT s.*, u.*
        FROM "Student" s
        JOIN "User" u ON s."userId" = u.id
        WHERE s."isApproved" = false
        ORDER BY s."createdAt" DESC
        LIMIT 5
      `;

      console.log(
        `Found ${Array.isArray(pendingStudents) ? pendingStudents.length : 0} pending approvals`,
      );
      return pendingStudents;
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch pending approvals",
        cause: error,
      });
    }
  }),

  // Mutation: Create new student
  createStudent: protectedProcedure
    .input(studentFormSchema.extend({ sendEmail: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const { name, email, sendEmail, ...studentData } = input;

      try {
        // Check if user already exists to avoid conflicts
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email },
        });

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
          return await ctx.prisma.student.create({
            data: {
              ...studentData,
              userId: existingUser.id,
            },
            include: {
              user: true,
            },
          });
        }

        // Create new user and student
        const student = await ctx.prisma.student.create({
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

        if (sendEmail) {
          try {
            await sendWelcomeEmail(student.user.email, student.user.name || "Student");
            console.log(`Welcome email sent to ${student.user.email}`);
          } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
            // We don't throw here - we just log the error
            // This way, the student is still created even if email sending fails
          }
        }

        return student;
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
            user: true,
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
            createdById: "system", // We'll use a placeholder since auth is bypassed
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

  // Mutation: Approve student
  approveStudent: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`Approving student with ID: ${input.studentId}`);
        // Find the student first
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            user: true,
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
        // Use executeRaw to work around type issues
        await ctx.prisma.$executeRaw`
          UPDATE "Student"
          SET "isApproved" = true,
              "approvedAt" = NOW(),
              "approvedById" = 'admin001'
          WHERE id = ${input.studentId}
        `;

        // Fetch the updated student with user info
        const updatedStudent = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            user: true,
          },
        });

        if (!updatedStudent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found after update",
          });
        }

        // Send approval email
        try {
          if (updatedStudent.user?.email) {
            await sendApprovalEmail(
              updatedStudent.user.email,
              updatedStudent.user.name || "Student",
            );
            console.log(`Approval email sent to ${updatedStudent.user.email}`);
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

  // NEW PROCEDURES FOR CUSTOM PRICING

  // Query: Get default pricing
  getDefaultPricing: protectedProcedure.query(async ({ ctx }) => {
    try {
      console.log("Fetching default pricing");
      // Use raw query to get DefaultPricing
      const result = await ctx.prisma.$queryRaw`
        SELECT * FROM "DefaultPricing" LIMIT 1
      `;

      const defaultPricing = Array.isArray(result) && result.length > 0 ? result[0] : null;

      if (!defaultPricing) {
        console.log("Default pricing not found, creating...");
        await ctx.prisma.$executeRaw`
  INSERT INTO "DefaultPricing" (
    "privateLessonPrice", 
    "groupLessonPrice", 
    "choreographyPrice", 
    "competitionPrice", 
    "createdAt", 
    "updatedAt"
  ) 
  VALUES (75, 45, 90, 95, NOW(), NOW())
  RETURNING *
`;

        // Fetch the newly created record
        const created = await ctx.prisma.$queryRaw`
          SELECT * FROM "DefaultPricing" LIMIT 1
        `;

        return Array.isArray(created) && created.length > 0
          ? created[0]
          : {
              privateLessonPrice: 75,
              groupLessonPrice: 45,
              choreographyPrice: 90,
              competitionPrice: 95,
            };
      }

      return defaultPricing;
    } catch (error) {
      console.error("Error fetching default pricing:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch default pricing",
        cause: error,
      });
    }
  }),

  // Mutation: Update default pricing
  updateDefaultPricing: protectedProcedure
    .input(defaultPricingSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Updating default pricing");
        // Use raw query to check if DefaultPricing exists
        const existing = await ctx.prisma.$queryRaw`
          SELECT id FROM "DefaultPricing" LIMIT 1
        `;

        const existingRecord = Array.isArray(existing) && existing.length > 0 ? existing[0] : null;

        if (existingRecord) {
          // Update existing record
          await ctx.prisma.$executeRaw`
            UPDATE "DefaultPricing"
            SET "privateLessonPrice" = ${input.privateLessonPrice},
                "groupLessonPrice" = ${input.groupLessonPrice},
                "choreographyPrice" = ${input.choreographyPrice},
                "competitionPrice" = ${input.competitionPrice},
                "updatedAt" = NOW()
            WHERE id = ${existingRecord.id}
          `;

          return {
            ...input,
            id: existingRecord.id,
          };
        }

        // Create new record
        await ctx.prisma.$executeRaw`
          INSERT INTO "DefaultPricing" (
            "privateLessonPrice", 
            "groupLessonPrice", 
            "choreographyPrice", 
            "competitionPrice", 
            "createdAt", 
            "updatedAt"
          ) 
          VALUES (
            ${input.privateLessonPrice}, 
            ${input.groupLessonPrice}, 
            ${input.choreographyPrice}, 
            ${input.competitionPrice}, 
            NOW(), 
            NOW()
          )
        `;

        // Fetch the newly created record
        const newRecord = await ctx.prisma.$queryRaw`
          SELECT * FROM "DefaultPricing" 
          ORDER BY "createdAt" DESC 
          LIMIT 1
        `;

        return Array.isArray(newRecord) && newRecord.length > 0 ? newRecord[0] : input;
      } catch (error) {
        console.error("Error updating default pricing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update default pricing",
          cause: error,
        });
      }
    }),

  // Query: Get student-specific pricing
  getStudentPricing: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        console.log(`Fetching pricing for student ID: ${input.studentId}`);

        // Use raw query to get student with pricing fields
        const studentResult = await ctx.prisma.$queryRaw`
          SELECT 
            "customPricingEnabled", 
            "privateLessonPrice", 
            "groupLessonPrice", 
            "choreographyPrice", 
            "competitionPrepPrice"
          FROM "Student"
          WHERE id = ${input.studentId}
        `;

        const student =
          Array.isArray(studentResult) && studentResult.length > 0 ? studentResult[0] : null;

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Get default pricing
        const defaultPricingResult = await ctx.prisma.$queryRaw`
          SELECT * FROM "DefaultPricing" LIMIT 1
        `;

        const defaultPricing =
          Array.isArray(defaultPricingResult) && defaultPricingResult.length > 0
            ? defaultPricingResult[0]
            : {
                privateLessonPrice: 75,
                groupLessonPrice: 45,
                choreographyPrice: 90,
                competitionPrice: 95,
              };

        return {
          student,
          defaultPricing,
        };
      } catch (error) {
        console.error("Error fetching student pricing:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch student pricing",
          cause: error,
        });
      }
    }),

  // Mutation: Update student-specific pricing
  updateStudentPricing: protectedProcedure
    .input(studentPricingSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`Updating pricing for student ID: ${input.studentId}`);

        // Check if student exists
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          select: { id: true },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Update student pricing using raw query
        await ctx.prisma.$executeRaw`
          UPDATE "Student"
          SET "customPricingEnabled" = ${input.customPricingEnabled},
              "privateLessonPrice" = ${input.privateLessonPrice},
              "groupLessonPrice" = ${input.groupLessonPrice},
              "choreographyPrice" = ${input.choreographyPrice},
              "competitionPrepPrice" = ${input.competitionPrepPrice},
              "updatedAt" = NOW()
          WHERE id = ${input.studentId}
        `;

        // Return updated student
        const updatedStudent = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
        });

        return updatedStudent;
      } catch (error) {
        console.error("Error updating student pricing:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update student pricing",
          cause: error,
        });
      }
    }),
});
