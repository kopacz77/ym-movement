// src/lib/wardrobe-return-reminder-sender.ts

import { addDays } from "date-fns";
import { getWardrobeSettings } from "@/features/admin/api/queries/wardrobeSettingsQueries";
import { sendReturnReminderEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/**
 * NOTIFY-07 (Phase 20): Send return-reminder emails for active rentals whose
 * endDate falls within `wardrobeReturnReminderDays` days from now AND have
 * not yet been reminded.
 *
 * Mirrors `sendBatchEmailNotifications` in src/lib/batch-email-sender.ts:
 *   - Outer try/catch returns {success, error?, stats}.
 *   - Per-rental try/catch inside the loop — one rental's failure does NOT
 *     block the rest (matches batch-email-sender.ts:65-99).
 *   - Stats shape: {processed, emailsSent, errors, remindersMarkedSent}.
 *
 * Idempotency: `WHERE returnReminderSentAt IS NULL` + post-send
 * `UPDATE returnReminderSentAt = NOW()` makes the loop strictly
 * once-per-rental. Cron re-runs (or backfill restarts) cannot duplicate.
 *
 * Settings: `getWardrobeSettings(prisma)` is called on EVERY invocation
 * (no module-level cache). Admin changes to `wardrobeReturnReminderDays`
 * take effect at the next cron tick.
 *
 * Cron schedule: `0 4 * * *` UTC (= 8 PM Pacific) — declared in vercel.json.
 */
export async function sendWardrobeReturnReminders() {
  const stats = {
    processed: 0,
    emailsSent: 0,
    errors: 0,
    remindersMarkedSent: 0,
  };

  try {
    const settings = await getWardrobeSettings(prisma);
    const now = new Date();
    const reminderWindowEnd = addDays(now, settings.wardrobeReturnReminderDays);

    // Find active rentals (PAID or RETURNED) whose endDate is upcoming within
    // the configured window, and that have not yet been reminded.
    // Exclude AWAITING_PAYMENT (no money has changed hands), DEPOSIT_RELEASED
    // (lifecycle closed), LATE_FEE_OWED (separate admin attention).
    const rentals = await prisma.rental.findMany({
      where: {
        paymentStatus: { in: ["PAID", "RETURNED"] },
        endDate: { lte: reminderWindowEnd, gte: now },
        returnReminderSentAt: null,
      },
      select: {
        id: true,
        endDate: true,
        Dress: { select: { title: true } },
        Student: { select: { User: { select: { email: true, name: true } } } },
      },
    });

    for (const rental of rentals) {
      stats.processed++;
      try {
        await sendReturnReminderEmail(
          rental.Student.User.email,
          rental.Student.User.name ?? "Student",
          {
            dressTitle: rental.Dress.title,
            endDate: rental.endDate,
            daysUntilDue: settings.wardrobeReturnReminderDays,
          },
        );
        stats.emailsSent++;

        // Mark reminder sent ONLY on email success — a failed send leaves
        // returnReminderSentAt null so the next cron tick re-tries (with
        // the caveat that endDate must still be in the window).
        await prisma.rental.update({
          where: { id: rental.id },
          data: { returnReminderSentAt: new Date() },
        });
        stats.remindersMarkedSent++;
      } catch (rentalError) {
        console.error(
          `[WARDROBE_RETURN_REMINDER] Error processing rental ${rental.id}:`,
          rentalError,
        );
        stats.errors++;
      }
    }

    return { success: true, stats };
  } catch (error) {
    console.error("[WARDROBE_RETURN_REMINDER] Fatal error in return-reminder process:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stats,
    };
  }
}
