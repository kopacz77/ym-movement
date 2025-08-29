import { LessonStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
// src/features/student/api/queries/profileQueries.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

// Define a proper type for the query filters
interface LessonQueryFilters {
  studentId: string;
  status?: LessonStatus;
  startTime?: {
    gte?: Date;
    lte?: Date;
  };
}

export const profileRouter = createTRPCRouter({
  getStudentProfile: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            User: {
              select: {
                name: true,
                email: true,
                createdAt: true,
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
        console.error("Error fetching student profile:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch student profile",
          cause: error,
        });
      }
    }),

  updateStudentProfile: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        phone: z.string().optional(),
        emergencyContact: z
          .object({
            name: z.string().optional(),
            phone: z.string().optional(),
            relationship: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedStudent = await ctx.prisma.student.update({
          where: { id: input.studentId },
          data: {
            phone: input.phone,
            emergencyContact: input.emergencyContact,
          },
          include: {
            User: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        return updatedStudent;
      } catch (error) {
        console.error("Error updating student profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update student profile",
          cause: error,
        });
      }
    }),

  getStudentLessons: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        status: z.enum(["ALL", "SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: LessonQueryFilters = {
          studentId: input.studentId,
        };

        if (input.status && input.status !== "ALL") {
          where.status = input.status as LessonStatus;
        }

        if (input.startDate || input.endDate) {
          where.startTime = {};

          if (input.startDate) {
            const minDate = new Date("1970-01-01");
            where.startTime.gte = input.startDate < minDate ? minDate : input.startDate;
          }
          if (input.endDate) {
            const maxDate = new Date("2100-01-01"); // Reasonable future limit
            where.startTime.lte = input.endDate > maxDate ? maxDate : input.endDate;
          }
        }

        const lessons = await ctx.prisma.lesson.findMany({
          where,
          include: {
            Rink: true,
            Payment: true,
          },
          orderBy: {
            startTime: "asc",
          },
        });

        return lessons;
      } catch (error) {
        console.error("Error fetching student lessons:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch student lessons",
          cause: error,
        });
      }
    }),

  getStudentPricing: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          select: {
            customPricingEnabled: true,
            privateLessonPrice: true,
            choreographyPrice: true,
          },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Get default pricing for reference
        const defaultPricing = await ctx.prisma.defaultPricing.findFirst();

        return {
          customPricingEnabled: student.customPricingEnabled,
          privateLessonPrice:
            student.privateLessonPrice ?? defaultPricing?.privateLessonPrice ?? 75,
          choreographyPrice: student.choreographyPrice ?? defaultPricing?.choreographyPrice ?? 90,
        };
      } catch (error) {
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

  getStudentLessonStats: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // Get all student lessons
        const allLessons = await ctx.prisma.lesson.findMany({
          where: { studentId: input.studentId },
        });

        // Get student info for max lessons
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          select: { maxLessonsPerWeek: true },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Get current week's lessons
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const thisWeekLessons = allLessons.filter(
          (lesson) =>
            lesson.startTime >= startOfWeek &&
            lesson.startTime <= endOfWeek &&
            lesson.status !== LessonStatus.CANCELLED,
        );

        // Calculate stats
        const upcoming = allLessons.filter(
          (l) => l.startTime > now && l.status === LessonStatus.SCHEDULED,
        ).length;

        const completed = allLessons.filter((l) => l.status === LessonStatus.COMPLETED).length;

        const cancelled = allLessons.filter((l) => l.status === LessonStatus.CANCELLED).length;

        return {
          total: allLessons.length,
          upcoming,
          completed,
          cancelled,
          thisWeekCount: thisWeekLessons.length,
          maxAllowed: student.maxLessonsPerWeek,
        };
      } catch (error) {
        console.error("Error calculating student lesson stats:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate student lesson stats",
          cause: error,
        });
      }
    }),
});
