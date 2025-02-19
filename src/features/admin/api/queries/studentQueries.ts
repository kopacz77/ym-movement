// features/admin/api/queries/studentQueries.ts
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { Level, Prisma } from '@prisma/client';
import type {
  Student,
  StudentFormData,
  LessonNote,
  StudentProgress,
  AttendanceData,
} from '../components/students/types';

const studentFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  level: z.nativeEnum(Level),
  maxLessonsPerWeek: z.number().min(1, 'Minimum 1 lesson per week'),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

export const studentRouter = createTRPCRouter({
  // Query: Get all students with filters
  getStudents: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          level: z.nativeEnum(Level).optional(),
          active: z.boolean().optional(),
          page: z.number().min(1).optional(),
          limit: z.number().min(1).max(100).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: Prisma.StudentWhereInput = {
          OR: input?.search
            ? [
                { user: { name: { contains: input.search, mode: 'insensitive' } } },
                { user: { email: { contains: input.search, mode: 'insensitive' } } },
              ]
            : undefined,
          level: input?.level,
          active: input?.active,
        };

        const [students, total] = await Promise.all([
          ctx.prisma.student.findMany({
            where,
            include: {
              user: true,
              lessons: { orderBy: { startTime: 'desc' }, take: 1 },
            },
            orderBy: { user: { name: 'asc' } },
            skip: input?.page ? (input.page - 1) * (input.limit ?? 10) : undefined,
            take: input?.limit ?? 10,
          }),
          ctx.prisma.student.count({ where }),
        ]);

        return {
          students,
          pagination: { total, pages: Math.ceil(total / (input?.limit ?? 10)), current: input?.page ?? 1 },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch students',
          cause: error,
        });
      }
    }),
  // Query: Get single student details
  getStudent: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            user: true,
            lessons: {
              take: 5,
              orderBy: { startTime: 'desc' },
              include: {
                payment: true,
                notes: { include: { createdBy: { select: { name: true } } } },
              },
            },
          },
        });
        if (!student) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Student not found' });
        }
        return student;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch student details',
          cause: error,
        });
      }
    }),
  // Query: Get pending approvals
  getPendingApprovals: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.prisma.student.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        include: { user: true, lessons: { take: 1 } },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch pending approvals',
        cause: error,
      });
    }
  }),
  // Query: Get student progress
  getStudentProgress: protectedProcedure
    .input(z.object({ studentId: z.string(), period: z.enum(['month', 'quarter', 'year']) }))
    .query(async ({ ctx, input }) => {
      try {
        const startDate = new Date();
        switch (input.period) {
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }
        const lessons = await ctx.prisma.lesson.findMany({
          where: { studentId: input.studentId, startTime: { gte: startDate } },
          include: { notes: true, skillProgress: true },
          orderBy: { startTime: 'asc' },
        });
        return lessons.map(lesson => ({
          date: lesson.startTime,
          attendance: lesson.status === 'COMPLETED' ? 100 : 0,
          skillProgress: lesson.skillProgress.length
            ? (lesson.skillProgress.filter(sp => sp.status === 'COMPLETED').length / lesson.skillProgress.length) * 100
            : 0,
        }));
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch student progress',
          cause: error,
        });
      }
    }),
  // Mutation: Create new student
  createStudent: protectedProcedure
    .input(studentFormSchema.extend({ sendEmail: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const { name, email, sendEmail, ...studentData } = input;
      try {
        const student = await ctx.prisma.student.create({
          data: {
            ...studentData,
            user: { create: { name, email, role: 'STUDENT' } },
          },
          include: { user: true },
        });
        if (sendEmail) {
          // TODO: Implement email sending
          // await sendWelcomeEmail(student.user.email, student.user.name);
        }
        return student;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new TRPCError({ code: 'CONFLICT', message: 'A student with this email already exists' });
          }
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create student',
          cause: error,
        });
      }
    }),
  // Mutation: Update student
  updateStudent: protectedProcedure
    .input(studentFormSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, name, email, ...studentData } = input;
      try {
        const [user, student] = await ctx.prisma.$transaction([
          ctx.prisma.user.update({ where: { id }, data: { name, email } }),
          ctx.prisma.student.update({ where: { userId: id }, data: studentData }),
        ]);
        return { user, student };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new TRPCError({ code: 'CONFLICT', message: 'A student with this email already exists' });
          }
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update student',
          cause: error,
        });
      }
    }),
  // Mutation: Add student note
  addStudentNote: protectedProcedure
    .input(z.object({ studentId: z.string(), content: z.string(), type: z.enum(['ADMIN', 'INSTRUCTOR']) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.studentNote.create({
          data: { ...input, createdById: ctx.session?.user?.id ?? 'system' },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add note',
          cause: error,
        });
      }
    }),
  // Mutation: Approve student
  approveStudent: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const student = await ctx.prisma.student.update({
          where: { id: input.studentId },
          data: { approved: true, active: true, approvedAt: new Date(), approvedById: ctx.session?.user?.id },
          include: { user: true },
        });
        // TODO: Send approval email
        // await sendApprovalEmail(student.user.email, student.user.name);
        return student;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to approve student',
          cause: error,
        });
      }
    }),
  // Mutation: Toggle student status
  toggleStatus: protectedProcedure
    .input(z.object({ studentId: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.student.update({
          where: { id: input.studentId },
          data: { active: input.active },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update student status',
          cause: error,
        });
      }
    }),
});
