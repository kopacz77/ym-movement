// src/features/notifications/utils/notificationHelpers.ts
import { prisma } from "@/lib/prisma";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

export async function createNotification({
  userId,
  title,
  message,
  type = "INFO",
  link,
}: CreateNotificationParams) {
  return await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link,
    },
  });
}

export async function createNotificationForMultipleUsers(
  userIds: string[],
  { title, message, type = "INFO", link }: Omit<CreateNotificationParams, "userId">,
) {
  return await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      message,
      type,
      link,
    })),
  });
}
