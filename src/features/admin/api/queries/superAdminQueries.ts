import { LessonStatus, PaymentStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { startOfMonth } from "date-fns";
import { z } from "zod";
import { createTRPCRouter, superAdminProcedure } from "@/lib/trpc";

export const superAdminDashboardRouter = createTRPCRouter({
  /**
   * SADM-01: Coaches Overview
   * Returns all approved coaches with status, hours booked, student count, and monthly earnings.
   */
  getCoachesOverview: superAdminProcedure.query(async ({ ctx }) => {
    try {
      const coaches = await ctx.prisma.coach.findMany({
        where: { isApproved: true },
        include: {
          User: { select: { name: true, email: true } },
          _count: {
            select: {
              Lesson: true,
              CoachStudent: true,
              RinkTimeSlot: { where: { isActive: true } },
            },
          },
        },
      });

      const monthStart = startOfMonth(new Date());

      const coachData = await Promise.all(
        coaches.map(async (coach) => {
          const [hoursAgg, monthEarningsAgg] = await Promise.all([
            ctx.prisma.lesson.aggregate({
              where: {
                coachId: coach.id,
                status: LessonStatus.SCHEDULED,
              },
              _sum: { duration: true },
            }),
            ctx.prisma.payment.aggregate({
              where: {
                Lesson: { coachId: coach.id },
                status: PaymentStatus.COMPLETED,
                lesson_date: { gte: monthStart },
              },
              _sum: { amount: true },
            }),
          ]);

          const totalRevenue = monthEarningsAgg._sum.amount ?? 0;
          const splitMultiplier = coach.revenueSplitPercent / 100;

          return {
            id: coach.id,
            name: coach.User.name,
            email: coach.User.email,
            isActive: coach.isActive,
            suspendedAt: coach.suspendedAt,
            revenueSplitPercent: coach.revenueSplitPercent,
            lessonCount: coach._count.Lesson,
            studentCount: coach._count.CoachStudent,
            activeSlots: coach._count.RinkTimeSlot,
            totalHoursBooked: (hoursAgg._sum.duration ?? 0) / 60,
            monthEarnings: totalRevenue * splitMultiplier,
            totalRevenue,
          };
        }),
      );

      return coachData;
    } catch (error) {
      console.error("Error in getCoachesOverview:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch coaches overview",
        cause: error,
      });
    }
  }),

  /**
   * SADM-02: Coach Detail
   * Returns a single coach's profile, upcoming lessons, student roster, and monthly stats.
   */
  getCoachDetail: superAdminProcedure
    .input(z.object({ coachId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const coach = await ctx.prisma.coach.findUnique({
          where: { id: input.coachId },
          include: {
            User: { select: { name: true, email: true } },
          },
        });

        if (!coach) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coach not found",
          });
        }

        const monthStart = startOfMonth(new Date());

        const [upcomingLessons, studentRoster, monthLessonCount, monthEarningsAgg] =
          await Promise.all([
            ctx.prisma.lesson.findMany({
              where: {
                coachId: input.coachId,
                status: LessonStatus.SCHEDULED,
                startTime: { gte: new Date() },
              },
              include: {
                Student: {
                  include: { User: { select: { name: true } } },
                },
                Rink: { select: { name: true } },
              },
              orderBy: { startTime: "asc" },
              take: 20,
            }),
            ctx.prisma.coachStudent.findMany({
              where: { coachId: input.coachId },
              include: {
                Student: {
                  include: { User: { select: { name: true, email: true } } },
                },
              },
            }),
            ctx.prisma.lesson.count({
              where: {
                coachId: input.coachId,
                startTime: { gte: monthStart },
              },
            }),
            ctx.prisma.payment.aggregate({
              where: {
                Lesson: { coachId: input.coachId },
                status: PaymentStatus.COMPLETED,
                lesson_date: { gte: monthStart },
              },
              _sum: { amount: true },
            }),
          ]);

        const totalRevenue = monthEarningsAgg._sum.amount ?? 0;
        const splitMultiplier = coach.revenueSplitPercent / 100;

        return {
          profile: {
            id: coach.id,
            name: coach.User.name,
            email: coach.User.email,
            bio: coach.bio,
            skills: coach.skills,
            certifications: coach.certifications,
            isActive: coach.isActive,
            isApproved: coach.isApproved,
            suspendedAt: coach.suspendedAt,
            revenueSplitPercent: coach.revenueSplitPercent,
          },
          upcomingLessons,
          studentRoster,
          stats: {
            monthLessonCount,
            monthEarnings: totalRevenue * splitMultiplier,
            totalRevenue,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error in getCoachDetail:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch coach detail",
          cause: error,
        });
      }
    }),

  /**
   * SADM-03: Revenue Breakdown
   * Returns per-coach revenue with payout calculations using revenueSplitPercent,
   * plus platform-wide totals.
   */
  getRevenueBreakdown: superAdminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const startDate = input.startDate ?? startOfMonth(new Date());
        const endDate = input.endDate ?? new Date();

        const coaches = await ctx.prisma.coach.findMany({
          where: { isActive: true },
          include: {
            User: { select: { name: true, email: true } },
          },
        });

        const perCoachData = await Promise.all(
          coaches.map(async (coach) => {
            const [revenueAgg, lessonCount] = await Promise.all([
              ctx.prisma.payment.aggregate({
                where: {
                  Lesson: { coachId: coach.id },
                  status: PaymentStatus.COMPLETED,
                  lesson_date: { gte: startDate, lte: endDate },
                },
                _sum: { amount: true },
              }),
              ctx.prisma.lesson.count({
                where: {
                  coachId: coach.id,
                  startTime: { gte: startDate, lte: endDate },
                },
              }),
            ]);

            const totalRevenue = revenueAgg._sum.amount ?? 0;
            const splitMultiplier = coach.revenueSplitPercent / 100;
            const coachPayout = totalRevenue * splitMultiplier;
            const platformRevenue = totalRevenue - coachPayout;

            return {
              coachId: coach.id,
              name: coach.User.name,
              email: coach.User.email,
              revenueSplitPercent: coach.revenueSplitPercent,
              totalRevenue,
              coachPayout,
              platformRevenue,
              lessonCount,
            };
          }),
        );

        const totals = perCoachData.reduce(
          (acc, coach) => ({
            totalRevenue: acc.totalRevenue + coach.totalRevenue,
            totalCoachPayouts: acc.totalCoachPayouts + coach.coachPayout,
            totalPlatformRevenue: acc.totalPlatformRevenue + coach.platformRevenue,
          }),
          { totalRevenue: 0, totalCoachPayouts: 0, totalPlatformRevenue: 0 },
        );

        return {
          coaches: perCoachData,
          totals,
        };
      } catch (error) {
        console.error("Error in getRevenueBreakdown:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch revenue breakdown",
          cause: error,
        });
      }
    }),
});
