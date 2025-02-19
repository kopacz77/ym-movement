import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { TRPCError } from "@trpc/server";
import { PaymentStatus, LessonStatus } from "@prisma/client";

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
            createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
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
      })
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
        const activityByDate = lessons.reduce((acc, lesson) => {
          const date = lesson.startTime.toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { date, totalLessons: 0, completedLessons: 0, cancelledLessons: 0, byType: {}, byArea: {} };
          }
          acc[date].totalLessons++;
          if (lesson.status === LessonStatus.COMPLETED) {
            acc[date].completedLessons++;
          } else if (lesson.status === LessonStatus.CANCELLED) {
            acc[date].cancelledLessons++;
          }
          // Track by lesson type
          if (!acc[date].byType[lesson.type]) {
            acc[date].byType[lesson.type] = 0;
          }
          acc[date].byType[lesson.type]++;
          // Track by area
          if (!acc[date].byArea[lesson.area]) {
            acc[date].byArea[lesson.area] = 0;
          }
          acc[date].byArea[lesson.area]++;
          return acc;
        }, {});

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
      })
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
        const revenueByDate = payments.reduce((acc, payment) => {
          const date = payment.createdAt.toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = {
              date,
              totalRevenue: 0,
              byMethod: {},
              byLessonType: {},
              byStudentLevel: {},
            };
          }
          acc[date].totalRevenue += payment.amount;

          // Group by payment method
          if (!acc[date].byMethod[payment.method]) {
            acc[date].byMethod[payment.method] = 0;
          }
          acc[date].byMethod[payment.method] += payment.amount;

          // Group by lesson type
          if (payment.lesson?.type) {
            if (!acc[date].byLessonType[payment.lesson.type]) {
              acc[date].byLessonType[payment.lesson.type] = 0;
            }
            acc[date].byLessonType[payment.lesson.type] += payment.amount;
          }

          // Group by student level
          if (payment.lesson?.student?.level) {
            if (!acc[date].byStudentLevel[payment.lesson.student.level]) {
              acc[date].byStudentLevel[payment.lesson.student.level] = 0;
            }
            acc[date].byStudentLevel[payment.lesson.student.level] += payment.amount;
          }
          return acc;
        }, {});

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
});
