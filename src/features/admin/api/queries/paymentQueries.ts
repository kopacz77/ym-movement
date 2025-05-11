// src/features/admin/api/queries/paymentQueries.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { TRPCError } from "@trpc/server";
import { PaymentStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
// Import email functions if you have them
// import { sendPaymentReminderEmail } from '@/lib/email';

export const paymentRouter = createTRPCRouter({
  getPayments: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          status: z.nativeEnum(PaymentStatus).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          page: z.number().min(1).optional(),
          limit: z.number().min(1).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: Prisma.PaymentWhereInput = {};

        // Add filters if provided
        if (input?.status) {
          where.status = input.status;
        }

        if (input?.search) {
          where.OR = [
            {
              student: {
                user: { name: { contains: input.search, mode: "insensitive" } },
              },
            },
            { referenceCode: { contains: input.search, mode: "insensitive" } },
          ];
        }

        if (input?.startDate) {
          where.createdAt = { gte: input.startDate };
          if (input?.endDate) {
            where.createdAt.lte = input.endDate;
          }
        }

        const payments = await ctx.prisma.payment.findMany({
          where,
          include: {
            student: {
              include: {
                user: true,
              },
            },
            lesson: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: input?.page ? (input.page - 1) * (input.limit ?? 10) : undefined,
          take: input?.limit ?? 100,
        });

        return payments;
      } catch (error) {
        console.error("Error fetching payments:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch payments",
          cause: error,
        });
      }
    }),

  getPaymentById: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const payment = await ctx.prisma.payment.findUnique({
          where: { id: input.paymentId },
          include: {
            student: {
              include: {
                user: true,
              },
            },
            lesson: {
              include: {
                rink: true,
              },
            },
          },
        });

        if (!payment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment not found",
          });
        }

        return payment;
      } catch (error) {
        if (error instanceof TRPCError) { throw error; }
        console.error("Error fetching payment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch payment details",
          cause: error,
        });
      }
    }),

  verifyPayment: protectedProcedure
    .input(z.object({ paymentId: z.string(), verifiedBy: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const payment = await ctx.prisma.payment.findUnique({
          where: { id: input.paymentId },
          include: {
            lesson: true,
            student: {
              include: {
                user: true,
              },
            },
          },
        });

        if (!payment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment not found",
          });
        }

        if (payment.status === "COMPLETED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Payment has already been verified",
          });
        }

        // Update the payment status
        const updatedPayment = await ctx.prisma.payment.update({
          where: { id: input.paymentId },
          data: {
            status: "COMPLETED",
            verifiedBy: input.verifiedBy,
            verifiedAt: new Date(),
          },
        });

        // Here you could also send a confirmation email to the student
        // if you have that functionality

        return updatedPayment;
      } catch (error) {
        if (error instanceof TRPCError) { throw error; }
        console.error("Error verifying payment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify payment",
          cause: error,
        });
      }
    }),

  addPaymentNote: protectedProcedure
    .input(z.object({ paymentId: z.string(), notes: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const payment = await ctx.prisma.payment.findUnique({
          where: { id: input.paymentId },
        });

        if (!payment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment not found",
          });
        }

        // Append to existing notes or create new notes
        const updatedNotes = payment.notes
          ? `${payment.notes}\n\n${new Date().toISOString()}: ${input.notes}`
          : `${new Date().toISOString()}: ${input.notes}`;

        return await ctx.prisma.payment.update({
          where: { id: input.paymentId },
          data: { notes: updatedNotes },
        });
      } catch (error) {
        if (error instanceof TRPCError) { throw error; }
        console.error("Error adding payment note:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add payment note",
          cause: error,
        });
      }
    }),

  sendPaymentReminder: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const payment = await ctx.prisma.payment.findUnique({
          where: { id: input.paymentId },
          include: {
            student: {
              include: {
                user: true,
              },
            },
            lesson: true,
          },
        });

        if (!payment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment not found",
          });
        }

        if (payment.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only send reminders for pending payments",
          });
        }

        // Send email reminder
        // This would be implemented in your email service
        // For example:
        // await sendPaymentReminderEmail(
        //   payment.student.user.email,
        //   payment.student.user.name || 'Student',
        //   {
        //     amount: payment.amount,
        //     referenceCode: payment.referenceCode,
        //     dueDate: new Date(payment.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days after creation
        //   }
        // );

        // Update the payment to record when reminder was sent
        return await ctx.prisma.payment.update({
          where: { id: input.paymentId },
          data: { reminderSentAt: new Date() },
        });
      } catch (error) {
        if (error instanceof TRPCError) { throw error; }
        console.error("Error sending payment reminder:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send payment reminder",
          cause: error,
        });
      }
    }),

  getPaymentStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const [totalPayments, pendingAmount, completedAmount] = await Promise.all([
        ctx.prisma.payment.count(),
        ctx.prisma.payment.aggregate({
          where: { status: "PENDING" },
          _sum: { amount: true },
        }),
        ctx.prisma.payment.aggregate({
          where: { status: "COMPLETED" },
          _sum: { amount: true },
        }),
      ]);

      return {
        totalPayments,
        pendingAmount: pendingAmount._sum.amount || 0,
        completedAmount: completedAmount._sum.amount || 0,
      };
    } catch (error) {
      console.error("Error fetching payment stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch payment statistics",
        cause: error,
      });
    }
  }),
});
