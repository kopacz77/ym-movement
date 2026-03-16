import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function seedTestData() {
  console.log("Seeding test data for E2E tests...");

  // 1. Create/upsert SUPER_ADMIN user
  const adminHash = await bcrypt.hash("ADMINPASS2025!", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: { password: adminHash, role: "SUPER_ADMIN", name: "Test Admin" },
    create: {
      email: "admin@test.com",
      password: adminHash,
      name: "Test Admin",
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log("  SUPER_ADMIN user created/updated:", adminUser.email);

  // Ensure admin has a Coach record (mirrors production Yura setup)
  await prisma.coach.upsert({
    where: { userId: adminUser.id },
    update: { isApproved: true, isActive: true },
    create: {
      userId: adminUser.id,
      isApproved: true,
      isActive: true,
      bio: "Test admin coach",
      skills: ["Figure Skating"],
      revenueSplitPercent: 100,
    },
  });
  console.log("  SUPER_ADMIN Coach record created/updated");

  // 2. Create/upsert COACH user
  const coachHash = await bcrypt.hash("COACHPASS2025!", 10);
  const coachUser = await prisma.user.upsert({
    where: { email: "coach@test.com" },
    update: { password: coachHash, role: "COACH", name: "Test Coach" },
    create: {
      email: "coach@test.com",
      password: coachHash,
      name: "Test Coach",
      role: "COACH",
      emailVerified: new Date(),
    },
  });
  console.log("  COACH user created/updated:", coachUser.email);

  // Create Coach record for primary coach
  const coach = await prisma.coach.upsert({
    where: { userId: coachUser.id },
    update: { isApproved: true, isActive: true },
    create: {
      userId: coachUser.id,
      isApproved: true,
      isActive: true,
      bio: "Test coach profile",
      skills: ["Ice Dance", "Freestyle"],
      revenueSplitPercent: 70,
    },
  });
  console.log("  COACH record created/updated for:", coachUser.email);

  // 3. Create/upsert second COACH user
  const coach2Hash = await bcrypt.hash("COACH2PASS2025!", 10);
  const coach2User = await prisma.user.upsert({
    where: { email: "coach2@test.com" },
    update: { password: coach2Hash, role: "COACH", name: "Test Coach 2" },
    create: {
      email: "coach2@test.com",
      password: coach2Hash,
      name: "Test Coach 2",
      role: "COACH",
      emailVerified: new Date(),
    },
  });
  console.log("  COACH 2 user created/updated:", coach2User.email);

  // Create Coach record for second coach
  const coach2 = await prisma.coach.upsert({
    where: { userId: coach2User.id },
    update: { isApproved: true, isActive: true },
    create: {
      userId: coach2User.id,
      isApproved: true,
      isActive: true,
      bio: "Test coach 2 profile",
      skills: ["Pairs"],
      revenueSplitPercent: 65,
    },
  });
  console.log("  COACH 2 record created/updated for:", coach2User.email);

  // 4. Create/upsert STUDENT user
  const studentHash = await bcrypt.hash("TestPassword123!", 10);
  const studentUser = await prisma.user.upsert({
    where: { email: "test.student@example.com" },
    update: { password: studentHash, name: "Test Student" },
    create: {
      email: "test.student@example.com",
      password: studentHash,
      name: "Test Student",
      role: "STUDENT",
      emailVerified: new Date(),
    },
  });
  console.log("  STUDENT user created/updated:", studentUser.email);

  // Create Student record
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: { isApproved: true },
    create: {
      userId: studentUser.id,
      phone: "555-123-4567",
      level: "PRELIMINARY",
      maxLessonsPerWeek: 2,
      isApproved: true,
      emergencyContact: {
        name: "Test Parent",
        phone: "555-987-6543",
        relationship: "Parent",
      },
    },
  });
  console.log("  Student record created/updated for:", studentUser.email);

  // 5. Create/upsert CoachStudent relationship (primary coach -> student)
  await prisma.coachStudent.upsert({
    where: {
      coachId_studentId: { coachId: coach.id, studentId: student.id },
    },
    update: { isPrimary: true },
    create: {
      coachId: coach.id,
      studentId: student.id,
      isPrimary: true,
    },
  });
  console.log("  CoachStudent relationship created/updated: primary coach -> student");

  // 6. Create/upsert CoachStudent relationship (coach2 -> student)
  await prisma.coachStudent.upsert({
    where: {
      coachId_studentId: { coachId: coach2.id, studentId: student.id },
    },
    update: { isPrimary: false },
    create: {
      coachId: coach2.id,
      studentId: student.id,
      isPrimary: false,
    },
  });
  console.log("  CoachStudent relationship created/updated: coach2 -> student");

  // 7. Create/upsert Rink
  await prisma.rink.upsert({
    where: { name: "Test Ice Rink" },
    update: {},
    create: {
      name: "Test Ice Rink",
      address: "123 Ice Street, Test City, TC 12345",
      timezone: "America/Los_Angeles",
    },
  });
  console.log("  Rink created/updated: Test Ice Rink");

  console.log("\nTest data seeded successfully!");
  await prisma.$disconnect();
}

seedTestData().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
