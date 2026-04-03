import { LessonStatus, LessonType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
// src/features/student/api/queries/profileQueries.ts
import { z } from "zod";
import { getHourlyRateForLessonType } from "@/lib/pricing";
import { isAdminRole } from "@/lib/roles";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

// Define a proper type for the query filters
interface LessonQueryFilters {
  studentId: string;
  status?: LessonStatus;
  startTime?: {
    gte?: Date;
    lte?: Date;
  };
  OR?: Array<{
    timeSlotId?: null;
    RinkTimeSlot?: { isActive: boolean };
  }>;
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
                id: true,
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

        // Authorization check: Verify student ownership or admin access
        const isOwner = student.User.id === ctx.session.user.id;
        const isAdmin = isAdminRole(ctx.session.user.role);

        if (!isOwner && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to access this student profile",
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
        // First, fetch the student to verify ownership
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          select: { userId: true },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Authorization check: Verify student ownership or admin access
        const isOwner = student.userId === ctx.session.user.id;
        const isAdmin = isAdminRole(ctx.session.user.role);

        if (!isOwner && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to update this student profile",
          });
        }

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
        // First, verify student ownership
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          select: { userId: true },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Authorization check: Verify student ownership or admin access
        const isOwner = student.userId === ctx.session.user.id;
        const isAdmin = isAdminRole(ctx.session.user.role);

        if (!isOwner && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to access these lessons",
          });
        }

        const where: LessonQueryFilters = {
          studentId: input.studentId,
          // Only show lessons where the time slot is published (isActive=true)
          // or where there is no time slot (legacy lessons)
          OR: [
            { timeSlotId: null },
            { RinkTimeSlot: { isActive: true } },
          ],
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
            Coach: { include: { User: { select: { name: true } } } },
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
    .input(z.object({ studentId: z.string(), coachId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          select: {
            userId: true,
            customPricingEnabled: true,
            privateLessonPrice: true,
            choreographyPrice: true,
            groupLessonPrice: true,
            competitionPrepPrice: true,
            offIceDancePrice: true,
          },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Authorization check: Verify student ownership or admin access
        const isOwner = student.userId === ctx.session.user.id;
        const isAdmin = isAdminRole(ctx.session.user.role);

        if (!isOwner && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to access this pricing information",
          });
        }

        // Get default pricing for reference
        const defaultPricing = await ctx.prisma.defaultPricing.findFirst();

        // Fetch coach pricing if coachId is provided
        let coachPricing = null;
        if (input.coachId) {
          coachPricing = await ctx.prisma.coach.findUnique({
            where: { id: input.coachId },
            select: {
              privateLessonPrice: true,
              groupLessonPrice: true,
              choreographyPrice: true,
              competitionPrepPrice: true,
              offIceDancePrice: true,
            },
          });
        }

        // Apply the full pricing waterfall for each lesson type
        return {
          customPricingEnabled: student.customPricingEnabled,
          privateLessonPrice: getHourlyRateForLessonType(
            LessonType.PRIVATE,
            student,
            defaultPricing,
            coachPricing,
          ),
          choreographyPrice: getHourlyRateForLessonType(
            LessonType.CHOREOGRAPHY,
            student,
            defaultPricing,
            coachPricing,
          ),
          groupLessonPrice: getHourlyRateForLessonType(
            LessonType.GROUP,
            student,
            defaultPricing,
            coachPricing,
          ),
          competitionPrepPrice: getHourlyRateForLessonType(
            LessonType.COMPETITION_PREP,
            student,
            defaultPricing,
            coachPricing,
          ),
          offIceDancePrice: getHourlyRateForLessonType(
            LessonType.OFF_ICE_DANCE,
            student,
            defaultPricing,
            coachPricing,
          ),
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
        // Get student info for max lessons and verify ownership
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          select: { userId: true, maxLessonsPerWeek: true },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Authorization check: Verify student ownership or admin access
        const isOwner = student.userId === ctx.session.user.id;
        const isAdmin = isAdminRole(ctx.session.user.role);

        if (!isOwner && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to access these statistics",
          });
        }

        // Get all student lessons (only from published time slots)
        const allLessons = await ctx.prisma.lesson.findMany({
          where: {
            studentId: input.studentId,
            OR: [
              { timeSlotId: null },
              { RinkTimeSlot: { isActive: true } },
            ],
          },
        });

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
