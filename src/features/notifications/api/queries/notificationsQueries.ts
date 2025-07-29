import { TRPCError } from "@trpc/server";
// src/features/notifications/api/queries/notificationsQueries.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

export const notificationsRouter = createTRPCRouter({
  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    const { prisma, session } = ctx;
    const userId = session.user.id;

    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return notifications;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch notifications",
        cause: error,
      });
    }
  }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, session } = ctx;
      const userId = session.user.id;

      try {
        const notification = await prisma.notification.findUnique({
          where: { id: input.id },
        });

        if (!notification || notification.userId !== userId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Notification not found",
          });
        }

        const updatedNotification = await prisma.notification.update({
          where: { id: input.id },
          data: { isRead: true },
        });

        return updatedNotification;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark notification as read",
          cause: error,
        });
      }
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { prisma, session } = ctx;
    const userId = session.user.id;

    try {
      await prisma.notification.updateMany({
        where: {
          userId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to mark all notifications as read",
        cause: error,
      });
    }
  }),
});
