import { z } from "zod";
import { coachProcedure, createTRPCRouter } from "@/lib/trpc";

export const dashboardRouter = createTRPCRouter({
  getUpcomingLessons: coachProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).default(10),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 10;

      return ctx.prisma.lesson.findMany({
        where: {
          coachId: ctx.coach.id,
          startTime: { gte: new Date() },
          status: "SCHEDULED",
        },
        include: {
          Student: {
            include: {
              User: { select: { name: true, email: true } },
            },
          },
          Rink: { select: { name: true, timezone: true } },
        },
        orderBy: { startTime: "asc" },
        take: limit,
      });
    }),

  getPastLessons: coachProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).default(10),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 10;

      return ctx.prisma.lesson.findMany({
        where: {
          coachId: ctx.coach.id,
          startTime: { lt: new Date() },
        },
        include: {
          Student: {
            include: {
              User: { select: { name: true, email: true } },
            },
          },
          Rink: { select: { name: true } },
        },
        orderBy: { startTime: "desc" },
        take: limit,
      });
    }),

  getDashboardStats: coachProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalStudents, upcomingLessons, completedThisMonth, earningsThisMonth] =
      await Promise.all([
        // Total distinct students
        ctx.prisma.lesson
          .findMany({
            where: { coachId: ctx.coach.id },
            select: { studentId: true },
            distinct: ["studentId"],
          })
          .then((results) => results.length),

        // Upcoming lessons count
        ctx.prisma.lesson.count({
          where: {
            coachId: ctx.coach.id,
            startTime: { gte: now },
            status: "SCHEDULED",
          },
        }),

        // This month's completed lessons
        ctx.prisma.lesson.count({
          where: {
            coachId: ctx.coach.id,
            startTime: { gte: startOfMonth },
            status: "COMPLETED",
          },
        }),

        // Total earnings this month
        ctx.prisma.payment.aggregate({
          where: {
            Lesson: { coachId: ctx.coach.id },
            status: "COMPLETED",
            lesson_date: { gte: startOfMonth },
          },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalStudents,
      upcomingLessons,
      completedThisMonth,
      earningsThisMonth: earningsThisMonth._sum.amount ?? 0,
    };
  }),
});
