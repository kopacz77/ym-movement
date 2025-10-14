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

/**
 * Create a pending email notification that will be batched and sent at end of day
 */
export async function createPendingEmailNotification({
  userId,
  type,
  lessonId,
  metadata,
}: {
  userId: string;
  type: string;
  lessonId?: string;
  metadata?: Record<string, unknown>;
}) {
  return await prisma.pendingEmailNotification.create({
    data: {
      userId,
      type,
      lessonId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    },
  });
}

/**
 * Create both in-app and pending email notification
 * This is the main function to use when admin makes schedule changes
 */
export async function createScheduleChangeNotification({
  userId,
  title,
  message,
  link,
  lessonId,
  metadata,
}: {
  userId: string;
  title: string;
  message: string;
  link?: string;
  lessonId?: string;
  metadata?: Record<string, unknown>;
}) {
  // Create in-app notification (instant)
  const notification = await createNotification({
    userId,
    title,
    message,
    type: "INFO",
    link,
  });

  // Create pending email notification (batched for end of day)
  await createPendingEmailNotification({
    userId,
    type: "SCHEDULE_CHANGE",
    lessonId,
    metadata: {
      ...metadata,
      notificationTitle: title,
      notificationMessage: message,
      notificationLink: link,
    },
  });

  return notification;
}
