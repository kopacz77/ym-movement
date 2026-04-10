// src/features/admin/api/queries/paymentQueries.ts

import type { Prisma } from "@prisma/client";
import { PaymentStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createNotification } from "@/features/notifications/utils/notificationHelpers";
import { sendPaymentReminderEmail } from "@/lib/email";
import { adminProcedure, createTRPCRouter } from "@/lib/trpc";

export const paymentRouter = createTRPCRouter({
  getPayments: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          status: z.nativeEnum(PaymentStatus).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          page: z.number().min(1).optional(),
          limit: z.number().min(1).max(100).optional(),
          sortBy: z
            .enum(["date-desc", "date-asc", "name-asc", "name-desc", "amount-desc", "amount-asc"])
            .optional(),
          coachId: z.string().optional(),
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
              Student: {
                User: { name: { contains: input.search, mode: "insensitive" } },
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

        // Scope by coach via Lesson relation (Payment has no direct coachId)
        if (input?.coachId) {
          where.Lesson = { coachId: input.coachId };
        }

        // Determine orderBy based on sortBy parameter
        let orderBy: Prisma.PaymentOrderByWithRelationInput = { lesson_date: "desc" };

        if (input?.sortBy) {
          switch (input.sortBy) {
            case "date-desc":
              orderBy = { lesson_date: "desc" };
              break;
            case "date-asc":
              orderBy = { lesson_date: "asc" };
              break;
            case "name-asc":
              orderBy = { Student: { User: { name: "asc" } } };
              break;
            case "name-desc":
              orderBy = { Student: { User: { name: "desc" } } };
              break;
            case "amount-desc":
              orderBy = { amount: "desc" };
              break;
            case "amount-asc":
              orderBy = { amount: "asc" };
              break;
          }
        }

        const [payments, total] = await Promise.all([
          ctx.prisma.payment.findMany({
            where,
            select: {
              id: true,
              amount: true,
              method: true,
              referenceCode: true,
              status: true,
              createdAt: true,
              lesson_date: true,
              Student: {
                include: {
                  User: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              Lesson: {
                select: {
                  id: true,
                  startTime: true,
                  endTime: true,
                  type: true,
                  area: true,
                  Rink: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  Coach: {
                    select: {
                      id: true,
                      User: { select: { name: true } },
                    },
                  },
                },
              },
            },
            orderBy,
            skip: input?.page ? (input.page - 1) * (input.limit ?? 10) : undefined,
            take: input?.limit ?? 100,
          }),
          ctx.prisma.payment.count({ where }),
        ]);

        return {
          payments,
          pagination: {
            total,
            pages: Math.ceil(total / (input?.limit ?? 100)),
            current: input?.page ?? 1,
          },
        };
      } catch (error) {
        console.error("Error fetching payments:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch payments",
          cause: error,
        });
      }
    }),

  getPaymentById: adminProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const payment = await ctx.prisma.payment.findUnique({
          where: { id: input.paymentId },
          include: {
            Student: {
              include: {
                User: true,
              },
            },
            Lesson: {
              include: {
                Rink: true,
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
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching payment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch payment details",
          cause: error,
        });
      }
    }),

  verifyPayment: adminProcedure
    .input(z.object({ paymentId: z.string(), verifiedBy: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const payment = await ctx.prisma.payment.findUnique({
          where: { id: input.paymentId },
          include: {
            Lesson: true,
            Student: {
              include: {
                User: true,
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

        // Notify the coach if this payment is for one of their lessons
        if (payment.Lesson?.coachId) {
          try {
            const coachRecord = await ctx.prisma.coach.findUnique({
              where: { id: payment.Lesson.coachId },
              select: { userId: true },
            });
            if (coachRecord) {
              await createNotification({
                userId: coachRecord.userId,
                title: "Payment Verified",
                message: `Payment of $${payment.amount.toFixed(2)} from ${
                  payment.Student?.User?.name || "a student"
                } has been verified`,
                type: "SUCCESS",
                link: "/coach/earnings",
              });
            }
          } catch (coachNotifError) {
            console.error("[PAYMENT] Error creating coach notification:", coachNotifError);
          }
        }

        return updatedPayment;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error verifying payment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify payment",
          cause: error,
        });
      }
    }),

  addPaymentNote: adminProcedure
    .input(z.object({ paymentId: z.string(), notes: z.string().max(1000) }))
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
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error adding payment note:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add payment note",
          cause: error,
        });
      }
    }),

  sendPaymentReminder: adminProcedure
    .input(z.object({ paymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const payment = await ctx.prisma.payment.findUnique({
          where: { id: input.paymentId },
          include: {
            Student: {
              include: {
                User: true,
              },
            },
            Lesson: true,
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
        try {
          await sendPaymentReminderEmail(
            payment.Student.User.email,
            payment.Student.User.name || "Student",
            {
              amount: payment.amount,
              referenceCode: payment.referenceCode,
              dueDate: new Date(payment.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days after creation
              lessonDate: payment.Lesson?.startTime,
              lessonType: payment.Lesson?.type,
              paymentMethod: payment.method,
            },
          );
        } catch (emailError) {
          // Log email error but don't fail the entire operation
          console.error("Failed to send payment reminder email:", emailError);
        }

        // Update the payment to record when reminder was sent
        return await ctx.prisma.payment.update({
          where: { id: input.paymentId },
          data: { reminderSentAt: new Date() },
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error sending payment reminder:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send payment reminder",
          cause: error,
        });
      }
    }),

  getCoachesForFilter: adminProcedure.query(async ({ ctx }) => {
    const coaches = await ctx.prisma.coach.findMany({
      where: { isActive: true },
      select: {
        id: true,
        User: { select: { name: true } },
      },
      orderBy: { User: { name: "asc" } },
    });
    return coaches.map((c) => ({ id: c.id, name: c.User.name }));
  }),

  getPaymentStats: adminProcedure
    .input(z.object({ coachId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const coachFilter = input?.coachId ? { Lesson: { coachId: input.coachId } } : {};
        const [totalPayments, pendingAmount, completedAmount] = await Promise.all([
          ctx.prisma.payment.count({ where: coachFilter }),
          ctx.prisma.payment.aggregate({
            where: { status: "PENDING", ...coachFilter },
            _sum: { amount: true },
          }),
          ctx.prisma.payment.aggregate({
            where: { status: "COMPLETED", ...coachFilter },
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
