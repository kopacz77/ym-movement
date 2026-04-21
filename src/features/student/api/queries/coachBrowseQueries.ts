// src/features/student/api/queries/coachBrowseQueries.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

export const coachBrowseRouter = createTRPCRouter({
  getBrowsableCoaches: protectedProcedure.query(async ({ ctx }) => {
    const coaches = await ctx.prisma.coach.findMany({
      where: {
        isApproved: true,
        isActive: true,
      },
      include: {
        User: { select: { name: true, email: true } },
        _count: {
          select: {
            RinkTimeSlot: {
              where: {
                isActive: true,
                startTime: { gte: new Date() },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return coaches.map((coach) => ({
      id: coach.id,
      name: coach.User.name,
      bio: coach.bio,
      photoUrl: coach.photoUrl,
      skills: coach.skills,
      certifications: coach.certifications,
      yearsExperience: coach.yearsExperience,
      privateLessonPrice: coach.privateLessonPrice,
      groupLessonPrice: coach.groupLessonPrice,
      choreographyPrice: coach.choreographyPrice,
      competitionPrepPrice: coach.competitionPrepPrice,
      availableSlots: coach._count.RinkTimeSlot,
    }));
  }),

  getCoachProfile: protectedProcedure
    .input(z.object({ coachId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coach = await ctx.prisma.coach.findUnique({
        where: {
          id: input.coachId,
          isApproved: true,
          isActive: true,
        },
        include: {
          User: { select: { name: true, email: true } },
          _count: {
            select: {
              RinkTimeSlot: {
                where: {
                  isActive: true,
                  startTime: { gte: new Date() },
                },
              },
            },
          },
        },
      });

      if (!coach) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Coach not found or not available",
        });
      }

      return {
        id: coach.id,
        name: coach.User.name,
        bio: coach.bio,
        photoUrl: coach.photoUrl,
        skills: coach.skills,
        certifications: coach.certifications,
        yearsExperience: coach.yearsExperience,
        privateLessonPrice: coach.privateLessonPrice,
        groupLessonPrice: coach.groupLessonPrice,
        choreographyPrice: coach.choreographyPrice,
        competitionPrepPrice: coach.competitionPrepPrice,
        availableSlots: coach._count.RinkTimeSlot,
      };
    }),
});
