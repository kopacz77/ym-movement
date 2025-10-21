// src/lib/batch-email-sender.ts

import { prisma } from "@/lib/prisma";
import { sendScheduleChangesEmail } from "@/lib/email";

/**
 * Process and send batch email notifications for all users with pending notifications
 * This should be called once per day (e.g., at 8 PM) via a cron job
 *
 * Returns stats about emails sent
 */
export async function sendBatchEmailNotifications() {
  console.log("[BATCH_EMAIL] ========================================");
  console.log("[BATCH_EMAIL] Function called! Starting...");
  console.log("[BATCH_EMAIL] ========================================");

  const stats = {
    usersProcessed: 0,
    emailsSent: 0,
    errors: 0,
    notificationsMarkedSent: 0,
  };

  try {
    console.log("[BATCH_EMAIL] Inside try block");
    console.log("[BATCH_EMAIL] Starting batch email notification process...");

    // Get all pending email notifications that haven't been sent
    const pendingNotifications = await prisma.pendingEmailNotification.findMany({
      where: {
        sentAt: null,
      },
      include: {
        User: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`[BATCH_EMAIL] Found ${pendingNotifications.length} pending notifications`);

    // Group notifications by user
    const notificationsByUser = new Map<
      string,
      Array<{
        id: string;
        title: string;
        message: string;
        link?: string;
        createdAt: Date;
      }>
    >();

    for (const notification of pendingNotifications) {
      const userId = notification.userId;
      if (!notificationsByUser.has(userId)) {
        notificationsByUser.set(userId, []);
      }

      // Extract notification details from metadata
      const metadata = notification.metadata as any;
      notificationsByUser.get(userId)?.push({
        id: notification.id,
        title: metadata?.notificationTitle || "Schedule Change",
        message: metadata?.notificationMessage || "Your schedule has been updated",
        link: metadata?.notificationLink,
        createdAt: notification.createdAt,
      });
    }

    console.log(`[BATCH_EMAIL] Processing notifications for ${notificationsByUser.size} users`);

    // Send one email per user with all their changes
    for (const [userId, changes] of notificationsByUser.entries()) {
      try {
        stats.usersProcessed++;

        // Get user details
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          console.error(`[BATCH_EMAIL] User not found: ${userId}`);
          stats.errors++;
          continue;
        }

        console.log(`[BATCH_EMAIL] Sending email to ${user.email} with ${changes.length} changes`);

        // Send the batch email (generic notification)
        await sendScheduleChangesEmail(user.email, user.name || "Student", changes.length);

        stats.emailsSent++;

        // Mark all notifications for this user as sent
        const notificationIds = changes.map((c) => c.id);
        await prisma.pendingEmailNotification.updateMany({
          where: {
            id: { in: notificationIds },
          },
          data: {
            sentAt: new Date(),
          },
        });

        stats.notificationsMarkedSent += notificationIds.length;

        console.log(
          `[BATCH_EMAIL] ✅ Email sent to ${user.email}, marked ${notificationIds.length} notifications as sent`,
        );
      } catch (userError) {
        console.error(`[BATCH_EMAIL] Error processing user ${userId}:`, userError);
        stats.errors++;
      }
    }

    console.log("[BATCH_EMAIL] Batch email process completed:", stats);
    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error("[BATCH_EMAIL] Fatal error in batch email process:", error);
    console.error("[BATCH_EMAIL] Error stack:", error instanceof Error ? error.stack : "No stack");
    console.error("[BATCH_EMAIL] Error details:", JSON.stringify(error, null, 2));
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stats,
    };
  }
}
