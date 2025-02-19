import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export const paymentRouter = createTRPCRouter({
  createPayment: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        amount: z.number(),
        method: z.nativeEnum(PaymentMethod),
        referenceCode: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const lesson = await ctx.prisma.lesson.findUnique({
          where: { id: input.lessonId },
          include: { payment: true },
        });
        if (!lesson) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lesson not found',
          });
        }
        if (lesson.payment) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Payment already exists for this lesson',
          });
        }
        return await ctx.prisma.payment.create({
          data: { ...input, status: PaymentStatus.PENDING, studentId: lesson.studentId },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create payment',
          cause: error,
        });
      }
    }),
  verifyPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
        verifiedBy: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.payment.update({
          where: { id: input.paymentId },
          data: {
            status: PaymentStatus.COMPLETED,
            verifiedBy: input.verifiedBy,
            verifiedAt: new Date(),
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify payment',
          cause: error,
        });
      }
    }),
});
