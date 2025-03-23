// src/features/admin/api/queries/progressQueries.ts
/*

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { Level } from '@prisma/client';

export const progressRouter = createTRPCRouter({
  // Skills
  getSkills: protectedProcedure
    .input(z.object({
      level: z.nativeEnum(Level).optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.skill.findMany({
        where: input?.level ? { level: input.level } : undefined,
        orderBy: { name: 'asc' }
      });
    }),

  createSkill: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      level: z.nativeEnum(Level)
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.skill.create({
        data: input
      });
    }),

  // Achievements
  getAchievements: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.achievement.findMany({
      orderBy: { name: 'asc' }
    });
  }),

  createAchievement: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      description: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.achievement.create({
        data: input
      });
    }),

  // Student Progress
  getStudentProgress: protectedProcedure
    .input(z.object({
      studentId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const [skills, achievements] = await Promise.all([
        ctx.prisma.studentSkill.findMany({
          where: { studentId: input.studentId },
          include: { 
            skill: true 
          },
          orderBy: { masteredAt: 'desc' }
        }),
        ctx.prisma.studentAchievement.findMany({
          where: { studentId: input.studentId },
          include: { 
            achievement: true 
          },
          orderBy: { awardedAt: 'desc' }
        })
      ]);

      return {
        skills,
        achievements
      };
    }),

  addStudentSkill: protectedProcedure
    .input(z.object({
      studentId: z.string(),
      skillId: z.string(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.studentSkill.create({
        data: {
          studentId: input.studentId,
          skillId: input.skillId,
          notes: input.notes,
        },
        include: {
          skill: true
        }
      });
    }),

  addStudentAchievement: protectedProcedure
    .input(z.object({
      studentId: z.string(),
      achievementId: z.string(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.studentAchievement.create({
        data: {
          studentId: input.studentId,
          achievementId: input.achievementId,
          notes: input.notes,
        },
        include: {
          achievement: true
        }
      });
    }),

  removeStudentSkill: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.studentSkill.delete({
        where: { id: input.id }
      });
    }),

  removeStudentAchievement: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.studentAchievement.delete({
        where: { id: input.id }
      });
    })
});

// Update the main router to include the progress router
// In src/features/admin/api/queries/index.ts
import { progressRouter } from '@/features/admin/api/queries/progressQueries';

export const adminRouter = createTRPCRouter({
  analytics: analyticsRouter,
  schedule: scheduleRouter,
  student: studentRouter,
  progress: progressRouter,  // Add this line
});

*/
