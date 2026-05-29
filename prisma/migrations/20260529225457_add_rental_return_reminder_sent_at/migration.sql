BEGIN;

-- AlterTable: add nullable returnReminderSentAt column to Rental.
-- Set by /api/cron/wardrobe-return-reminders (Phase 20 NOTIFY-07) when a
-- return-reminder email is successfully sent for the row. WHERE predicate
-- "returnReminderSentAt IS NULL" makes the cron idempotent — each rental
-- gets at most one reminder.
--
-- Additive + nullable = zero-downtime migration. No data backfill needed
-- (existing rentals will have NULL and be candidates for the next cron tick
-- if their endDate falls within the wardrobeReturnReminderDays window).
ALTER TABLE "Rental" ADD COLUMN "returnReminderSentAt" TIMESTAMP(3);

COMMIT;
