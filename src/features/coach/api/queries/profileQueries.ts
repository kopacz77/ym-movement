import { z } from "zod";
import { coachProcedure, createTRPCRouter } from "@/lib/trpc";

export const profileRouter = createTRPCRouter({
  getProfile: coachProcedure.query(async ({ ctx }) => {
    return ctx.prisma.coach.findUniqueOrThrow({
      where: { id: ctx.coach.id },
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
  }),

  updateProfile: coachProcedure
    .input(
      z.object({
        bio: z.string().max(500).optional(),
        photoUrl: z.string().url().optional().nullable(),
        skills: z.array(z.string()).optional(),
        certifications: z.string().max(1000).optional().nullable(),
        yearsExperience: z.number().int().min(0).max(99).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.coach.update({
        where: { id: ctx.coach.id },
        data: {
          bio: input.bio,
          photoUrl: input.photoUrl,
          skills: input.skills,
          certifications: input.certifications,
          yearsExperience: input.yearsExperience,
        },
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
    }),

  getCalendarStatus: coachProcedure.query(async ({ ctx }) => {
    const coach = await ctx.prisma.coach.findUniqueOrThrow({
      where: { id: ctx.coach.id },
      select: { googleCalendarId: true, googleAccessToken: true },
    });
    return {
      isConnected: !!(coach.googleCalendarId && coach.googleAccessToken),
      calendarId: coach.googleCalendarId,
    };
  }),

  disconnectCalendar: coachProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.coach.update({
      where: { id: ctx.coach.id },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiresAt: null,
        googleCalendarId: null,
      },
    });
    return { success: true };
  }),
});
