import { LessonStatus, PaymentStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { endOfMonth, startOfMonth } from "date-fns";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/lib/trpc";

// Define proper type interfaces for our data structures
interface ActivityData {
  date: string;
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  byType: Record<string, number>;
  byArea: Record<string, number>;
}

interface RevenueData {
  date: string;
  totalRevenue: number;
  byMethod: Record<string, number>;
  byLessonType: Record<string, number>;
  byStudentLevel: Record<string, number>;
}

interface AttendanceData {
  total: number;
  attended: number;
  cancelled: number;
  scheduled: number;
  attendanceRate: number;
  lessons: Array<{
    id: string;
    date: Date;
    status: string;
    cancellationReason?: string;
    duration: number;
  }>;
}

export const analyticsRouter = createTRPCRouter({
  getOverview: publicProcedure.query(async ({ ctx }) => {
    try {
      const [totalStudents, activeLessons, pendingPayments, monthlyRevenue] = await Promise.all([
        ctx.prisma.student.count(),
        ctx.prisma.lesson.count({
          where: {
            status: LessonStatus.SCHEDULED,
            startTime: { gte: new Date() },
          },
        }),
        ctx.prisma.payment.count({
          where: { status: PaymentStatus.PENDING },
        }),
        ctx.prisma.payment.aggregate({
          where: {
            status: PaymentStatus.COMPLETED,
            lesson_date: {
              gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
            },
          },
          _sum: { amount: true },
        }),
      ]);

      return {
        totalStudents,
        activeLessons,
        pendingPayments,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
      };
    } catch (error) {
      console.error("Error in getOverview:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch overview data",
        cause: error,
      });
    }
  }),

  getStudentActivity: publicProcedure
    .input(
      z.object({
        period: z.enum(["week", "month", "year"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        let queryStartDate: Date;
        let queryEndDate: Date | undefined;

        // If explicit dates provided, use them; otherwise fall back to period-based calculation
        if (input.startDate && input.endDate) {
          queryStartDate = input.startDate;
          queryEndDate = input.endDate;
        } else {
          queryStartDate = new Date();
          const period = input.period || "month";
          switch (period) {
            case "week":
              queryStartDate.setDate(queryStartDate.getDate() - 7);
              break;
            case "month":
              queryStartDate.setMonth(queryStartDate.getMonth() - 1);
              break;
            case "year":
              queryStartDate.setFullYear(queryStartDate.getFullYear() - 1);
              break;
          }
        }

        const lessons = await ctx.prisma.lesson.findMany({
          where: {
            startTime: {
              gte: queryStartDate,
              ...(queryEndDate && { lte: queryEndDate }),
            },
          },
          select: { startTime: true, status: true, type: true, area: true },
          orderBy: { startTime: "asc" },
        });

        // Determine if we should aggregate by month (for ranges > 31 days)
        const effectiveEnd = queryEndDate || new Date();
        const rangeMs = effectiveEnd.getTime() - queryStartDate.getTime();
        const rangeDays = rangeMs / (1000 * 60 * 60 * 24);
        const aggregateByMonth = rangeDays > 31;

        // Group by date or month depending on range
        const activityByDate: Record<string, ActivityData> = {};

        for (const lesson of lessons) {
          const dateKey = aggregateByMonth
            ? lesson.startTime
                .toISOString()
                .slice(0, 7) // YYYY-MM
            : lesson.startTime.toISOString().split("T")[0]; // YYYY-MM-DD

          if (!activityByDate[dateKey]) {
            activityByDate[dateKey] = {
              date: dateKey,
              totalLessons: 0,
              completedLessons: 0,
              cancelledLessons: 0,
              byType: {},
              byArea: {},
            };
          }

          activityByDate[dateKey].totalLessons++;

          if (lesson.status === LessonStatus.COMPLETED) {
            activityByDate[dateKey].completedLessons++;
          } else if (lesson.status === LessonStatus.CANCELLED) {
            activityByDate[dateKey].cancelledLessons++;
          }

          // Track by lesson type
          const lessonType = lesson.type as string;
          if (!activityByDate[dateKey].byType[lessonType]) {
            activityByDate[dateKey].byType[lessonType] = 0;
          }
          activityByDate[dateKey].byType[lessonType]++;

          // Track by area
          const areaType = lesson.area as string;
          if (!activityByDate[dateKey].byArea[areaType]) {
            activityByDate[dateKey].byArea[areaType] = 0;
          }
          activityByDate[dateKey].byArea[areaType]++;
        }

        return Object.values(activityByDate);
      } catch (error) {
        console.error("Error in getStudentActivity:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch student activity data",
          cause: error,
        });
      }
    }),

  getRevenueReport: publicProcedure
    .input(
      z.object({
        period: z.enum(["week", "month", "year"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        let queryStartDate: Date;
        let queryEndDate: Date | undefined;

        // If explicit dates provided, use them; otherwise fall back to period-based calculation
        if (input.startDate && input.endDate) {
          queryStartDate = input.startDate;
          queryEndDate = input.endDate;
        } else {
          queryStartDate = new Date();
          const period = input.period || "month";
          switch (period) {
            case "week":
              queryStartDate.setDate(queryStartDate.getDate() - 7);
              break;
            case "month":
              queryStartDate.setMonth(queryStartDate.getMonth() - 1);
              break;
            case "year":
              queryStartDate.setFullYear(queryStartDate.getFullYear() - 1);
              break;
          }
        }

        const payments = await ctx.prisma.payment.findMany({
          where: {
            lesson_date: {
              gte: queryStartDate,
              ...(queryEndDate && { lte: queryEndDate }),
            },
            status: PaymentStatus.COMPLETED,
          },
          include: {
            Lesson: {
              select: {
                type: true,
                Student: { select: { level: true } },
              },
            },
          },
          orderBy: { lesson_date: "asc" },
        });

        // Determine if we should aggregate by month (for ranges > 31 days)
        const effectiveEnd = queryEndDate || new Date();
        const rangeMs = effectiveEnd.getTime() - queryStartDate.getTime();
        const rangeDays = rangeMs / (1000 * 60 * 60 * 24);
        const aggregateByMonth = rangeDays > 31;

        // Group by date or month depending on range
        const revenueByDate: Record<string, RevenueData> = {};

        for (const payment of payments) {
          const dateKey = aggregateByMonth
            ? payment.lesson_date
                .toISOString()
                .slice(0, 7) // YYYY-MM
            : payment.lesson_date.toISOString().split("T")[0]; // YYYY-MM-DD

          if (!revenueByDate[dateKey]) {
            revenueByDate[dateKey] = {
              date: dateKey,
              totalRevenue: 0,
              byMethod: {},
              byLessonType: {},
              byStudentLevel: {},
            };
          }

          revenueByDate[dateKey].totalRevenue += payment.amount;

          // Group by payment method
          const paymentMethod = payment.method as string;
          if (!revenueByDate[dateKey].byMethod[paymentMethod]) {
            revenueByDate[dateKey].byMethod[paymentMethod] = 0;
          }
          revenueByDate[dateKey].byMethod[paymentMethod] += payment.amount;

          // Group by lesson type
          if (payment.Lesson?.type) {
            const lessonType = payment.Lesson.type as string;
            if (!revenueByDate[dateKey].byLessonType[lessonType]) {
              revenueByDate[dateKey].byLessonType[lessonType] = 0;
            }
            revenueByDate[dateKey].byLessonType[lessonType] += payment.amount;
          }

          // Group by student level
          if (payment.Lesson?.Student?.level) {
            const studentLevel = payment.Lesson.Student.level as string;
            if (!revenueByDate[dateKey].byStudentLevel[studentLevel]) {
              revenueByDate[dateKey].byStudentLevel[studentLevel] = 0;
            }
            revenueByDate[dateKey].byStudentLevel[studentLevel] += payment.amount;
          }
        }

        return Object.values(revenueByDate);
      } catch (error) {
        console.error("Error in getRevenueReport:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch revenue data",
          cause: error,
        });
      }
    }),

  // New endpoint for student attendance
  getStudentAttendance: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // Default to current month if dates not provided
        const startDate = input.startDate || startOfMonth(new Date());
        const endDate = input.endDate || endOfMonth(new Date());

        // Get all lessons for the student in the date range
        const lessons = await ctx.prisma.lesson.findMany({
          where: {
            studentId: input.studentId,
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            startTime: "asc",
          },
        });

        // Calculate attendance metrics
        const total = lessons.length;
        const attended = lessons.filter(
          (lesson) => lesson.status === LessonStatus.COMPLETED,
        ).length;
        const cancelled = lessons.filter(
          (lesson) => lesson.status === LessonStatus.CANCELLED,
        ).length;
        const scheduled = lessons.filter(
          (lesson) => lesson.status === LessonStatus.SCHEDULED,
        ).length;

        const attendanceData: AttendanceData = {
          total,
          attended,
          cancelled,
          scheduled,
          attendanceRate: total > 0 ? (attended / total) * 100 : 0,
          lessons: lessons.map((lesson) => ({
            id: lesson.id,
            date: lesson.startTime,
            status: lesson.status,
            cancellationReason: lesson.cancellationReason || undefined,
            duration: lesson.duration,
          })),
        };

        return attendanceData;
      } catch (error) {
        console.error("Error fetching student attendance:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch student attendance data",
          cause: error,
        });
      }
    }),
});
