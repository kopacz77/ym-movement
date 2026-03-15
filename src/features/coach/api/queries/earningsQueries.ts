import { z } from "zod";
import { coachProcedure, createTRPCRouter } from "@/lib/trpc";

export const earningsRouter = createTRPCRouter({
  getEarningsSummary: coachProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueSplitPercent = ctx.coach.revenueSplitPercent;
    const splitMultiplier = revenueSplitPercent / 100;

    const [totalAllTime, totalThisMonth, pendingPayments] = await Promise.all([
      // Total all-time earnings
      ctx.prisma.payment.aggregate({
        where: {
          Lesson: { coachId: ctx.coach.id },
          status: "COMPLETED",
        },
        _sum: { amount: true },
      }),

      // This month earnings
      ctx.prisma.payment.aggregate({
        where: {
          Lesson: { coachId: ctx.coach.id },
          status: "COMPLETED",
          lesson_date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),

      // Pending payments (sum + count)
      ctx.prisma.payment.aggregate({
        where: {
          Lesson: { coachId: ctx.coach.id },
          status: "PENDING",
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalEarnings: (totalAllTime._sum.amount ?? 0) * splitMultiplier,
      monthEarnings: (totalThisMonth._sum.amount ?? 0) * splitMultiplier,
      pendingAmount: (pendingPayments._sum.amount ?? 0) * splitMultiplier,
      pendingCount: pendingPayments._count,
      revenueSplitPercent,
    };
  }),

  getPaymentHistory: coachProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;

      return ctx.prisma.payment.findMany({
        where: {
          Lesson: { coachId: ctx.coach.id },
        },
        include: {
          Student: {
            include: {
              User: { select: { name: true } },
            },
          },
          Lesson: {
            select: {
              startTime: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }),
});
