import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/lib/trpc";
import { LessonStatus, LessonType, Level, PaymentStatus, RinkArea } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { endOfMonth, startOfMonth } from "date-fns";
import { z } from "zod";

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
            createdAt: {
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
        period: z.enum(["week", "month", "year"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const startDate = new Date();
        switch (input.period) {
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }
        const lessons = await ctx.prisma.lesson.findMany({
          where: { startTime: { gte: startDate } },
          select: { startTime: true, status: true, type: true, area: true },
          orderBy: { startTime: "asc" },
        });

        // Group by date and calculate statistics
        const activityByDate: Record<string, ActivityData> = {};

        // Replace forEach with for...of loop
        for (const lesson of lessons) {
          const date = lesson.startTime.toISOString().split("T")[0];

          if (!activityByDate[date]) {
            activityByDate[date] = {
              date,
              totalLessons: 0,
              completedLessons: 0,
              cancelledLessons: 0,
              byType: {},
              byArea: {},
            };
          }

          activityByDate[date].totalLessons++;

          if (lesson.status === LessonStatus.COMPLETED) {
            activityByDate[date].completedLessons++;
          } else if (lesson.status === LessonStatus.CANCELLED) {
            activityByDate[date].cancelledLessons++;
          }

          // Track by lesson type
          const lessonType = lesson.type as string;
          if (!activityByDate[date].byType[lessonType]) {
            activityByDate[date].byType[lessonType] = 0;
          }
          activityByDate[date].byType[lessonType]++;

          // Track by area
          const areaType = lesson.area as string;
          if (!activityByDate[date].byArea[areaType]) {
            activityByDate[date].byArea[areaType] = 0;
          }
          activityByDate[date].byArea[areaType]++;
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
        period: z.enum(["week", "month", "year"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const startDate = new Date();
        switch (input.period) {
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }
        const payments = await ctx.prisma.payment.findMany({
          where: {
            createdAt: { gte: startDate },
            status: PaymentStatus.COMPLETED,
          },
          include: {
            lesson: {
              select: {
                type: true,
                student: { select: { level: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        });

        // Group by date
        const revenueByDate: Record<string, RevenueData> = {};

        // Replace forEach with for...of loop
        for (const payment of payments) {
          const date = payment.createdAt.toISOString().split("T")[0];

          if (!revenueByDate[date]) {
            revenueByDate[date] = {
              date,
              totalRevenue: 0,
              byMethod: {},
              byLessonType: {},
              byStudentLevel: {},
            };
          }

          revenueByDate[date].totalRevenue += payment.amount;

          // Group by payment method
          const paymentMethod = payment.method as string;
          if (!revenueByDate[date].byMethod[paymentMethod]) {
            revenueByDate[date].byMethod[paymentMethod] = 0;
          }
          revenueByDate[date].byMethod[paymentMethod] += payment.amount;

          // Group by lesson type
          if (payment.lesson?.type) {
            const lessonType = payment.lesson.type as string;
            if (!revenueByDate[date].byLessonType[lessonType]) {
              revenueByDate[date].byLessonType[lessonType] = 0;
            }
            revenueByDate[date].byLessonType[lessonType] += payment.amount;
          }

          // Group by student level
          if (payment.Lesson?.Student?.level) {
            const studentLevel = payment.Lesson.Student.level as string;
            if (!revenueByDate[date].byStudentLevel[studentLevel]) {
              revenueByDate[date].byStudentLevel[studentLevel] = 0;
            }
            revenueByDate[date].byStudentLevel[studentLevel] += payment.amount;
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
