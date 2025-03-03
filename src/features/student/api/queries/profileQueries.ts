// src/features/student/api/queries/profileQueries.ts
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { LessonStatus } from '@prisma/client';

export const profileRouter = createTRPCRouter({
  getStudentProfile: publicProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            user: {
              select: {
                name: true,
                email: true,
                createdAt: true,
              },
            },
          },
        });

        if (!student) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Student not found',
          });
        }

        return student;
      } catch (error) {
        console.error('Error fetching student profile:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch student profile',
          cause: error,
        });
      }
    }),

  updateStudentProfile: publicProcedure
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedStudent = await ctx.prisma.student.update({
          where: { id: input.studentId },
          data: {
            phone: input.phone,
            emergencyContact: input.emergencyContact,
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        return updatedStudent;
      } catch (error) {
        console.error('Error updating student profile:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update student profile',
          cause: error,
        });
      }
    }),

  getStudentLessons: publicProcedure
    .input(
      z.object({
        studentId: z.string(),
        status: z.enum(['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {
          studentId: input.studentId,
        };

        if (input.status && input.status !== 'ALL') {
          where.status = input.status;
        }

        if (input.startDate || input.endDate) {
          where.startTime = {};
          if (input.startDate) {
            where.startTime.gte = input.startDate;
          }
          if (input.endDate) {
            where.startTime.lte = input.endDate;
          }
        }

        const lessons = await ctx.prisma.lesson.findMany({
          where,
          include: {
            rink: true,
            payment: true,
          },
          orderBy: {
            startTime: 'asc',
          },
        });

        return lessons;
      } catch (error) {
        console.error('Error fetching student lessons:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch student lessons',
          cause: error,
        });
      }
    }),

  getStudentLessonStats: publicProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // Get all student lessons
        const allLessons = await ctx.prisma.lesson.findMany({
          where: { studentId: input.studentId },
        });

        // Get student info for max lessons
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          select: { maxLessonsPerWeek: true },
        });

        if (!student) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Student not found',
          });
        }

        // Get current week's lessons
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const thisWeekLessons = allLessons.filter(
          lesson => 
            lesson.startTime >= startOfWeek &&
            lesson.startTime <= endOfWeek &&
            lesson.status !== LessonStatus.CANCELLED
        );

        // Calculate stats
        const upcoming = allLessons.filter(
          l => l.startTime > now && l.status === LessonStatus.SCHEDULED
        ).length;
        
        const completed = allLessons.filter(
          l => l.status === LessonStatus.COMPLETED
        ).length;
        
        const cancelled = allLessons.filter(
          l => l.status === LessonStatus.CANCELLED
        ).length;

        return {
          total: allLessons.length,
          upcoming,
          completed,
          cancelled,
          thisWeekCount: thisWeekLessons.length,
          maxAllowed: student.maxLessonsPerWeek,
        };
      } catch (error) {
        console.error('Error calculating student lesson stats:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to calculate student lesson stats',
          cause: error,
        });
      }
    }),
});