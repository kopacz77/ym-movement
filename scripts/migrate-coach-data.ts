/**
 * Migration Script: Coach Data Backfill
 *
 * This script:
 * 1. Creates a Coach record for Yura (the current ADMIN/SUPER_ADMIN user)
 * 2. Updates Yura's role from ADMIN to SUPER_ADMIN
 * 3. Backfills coachId on all Lessons, RinkTimeSlots, and BlockedDateRanges
 * 4. Creates CoachStudent records linking Yura to all existing students
 *
 * Usage:
 *   npx tsx scripts/migrate-coach-data.ts
 *
 * Or:
 *   pnpm migrate:coach-data
 *
 * This script is idempotent - safe to run multiple times.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateCoachData() {
  console.log("Starting coach data migration...\n");

  // 1. Find Yura's user (the current ADMIN or SUPER_ADMIN)
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
  });

  if (!adminUser) {
    throw new Error("No admin user found. Cannot proceed with migration.");
  }

  console.log(`Found admin user: ${adminUser.name || adminUser.email} (${adminUser.role})`);

  // 2. Create Coach record (idempotent via findUnique check)
  let coach = await prisma.coach.findUnique({
    where: { userId: adminUser.id },
  });

  if (coach) {
    console.log("Coach record already exists, skipping creation.");
  } else {
    coach = await prisma.coach.create({
      data: {
        userId: adminUser.id,
        bio: "Head Coach & Founder",
        isApproved: true,
        isActive: true,
        approvedAt: new Date(),
        revenueSplitPercent: 100, // Owner keeps 100%
      },
    });
    console.log("Created Coach record for Yura.");
  }

  // 3. Update role to SUPER_ADMIN (if still ADMIN)
  if (adminUser.role === "ADMIN") {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: "SUPER_ADMIN" },
    });
    console.log("Updated role from ADMIN to SUPER_ADMIN.");
  } else {
    console.log(`Role is already ${adminUser.role}, skipping role update.`);
  }

  // 4. Backfill coachId on all Lessons where coachId is null
  const lessonResult = await prisma.lesson.updateMany({
    where: { coachId: null },
    data: { coachId: coach.id },
  });
  console.log(`Updated ${lessonResult.count} lessons with coachId.`);

  // 5. Backfill coachId on all RinkTimeSlots where coachId is null
  const slotResult = await prisma.rinkTimeSlot.updateMany({
    where: { coachId: null },
    data: { coachId: coach.id },
  });
  console.log(`Updated ${slotResult.count} time slots with coachId.`);

  // 6. Backfill coachId on all BlockedDateRanges where coachId is null
  const blockedResult = await prisma.blockedDateRange.updateMany({
    where: { coachId: null },
    data: { coachId: coach.id },
  });
  console.log(`Updated ${blockedResult.count} blocked date ranges with coachId.`);

  // 7. Create CoachStudent records for all existing students (idempotent via upsert)
  const students = await prisma.student.findMany({ select: { id: true } });
  let coachStudentCreated = 0;
  let coachStudentSkipped = 0;

  for (const student of students) {
    try {
      await prisma.coachStudent.upsert({
        where: {
          coachId_studentId: { coachId: coach.id, studentId: student.id },
        },
        create: {
          coachId: coach.id,
          studentId: student.id,
          isPrimary: true,
        },
        update: {}, // No-op if already exists
      });
      coachStudentCreated++;
    } catch (error) {
      coachStudentSkipped++;
      console.error(
        `Failed to create CoachStudent for student ${student.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log(`\nMigration Summary:`);
  console.log(`  Coach record: ${coach.id}`);
  console.log(`  Role: SUPER_ADMIN`);
  console.log(`  Lessons updated: ${lessonResult.count}`);
  console.log(`  Time slots updated: ${slotResult.count}`);
  console.log(`  Blocked dates updated: ${blockedResult.count}`);
  console.log(`  CoachStudent records: ${coachStudentCreated} created, ${coachStudentSkipped} skipped`);
  console.log(`\nMigration completed successfully.`);
}

migrateCoachData()
  .catch((error) => {
    console.error("\nMigration failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
