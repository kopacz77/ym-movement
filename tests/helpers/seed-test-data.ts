import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
    update: { isApproved: true, isActive: true, revenueSplitPercent: 70 },
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

  // 7. Create/upsert Rink (capture return value for later use)
  const rink = await prisma.rink.upsert({
    where: { name: "Test Ice Rink" },
    update: {},
    create: {
      name: "Test Ice Rink",
      address: "123 Ice Street, Test City, TC 12345",
      timezone: "America/Los_Angeles",
    },
  });
  console.log("  Rink created/updated: Test Ice Rink");

  // 8. Create unapproved coach3 for approval tests (CTST-02)
  const coach3Hash = await bcrypt.hash("COACH3PASS2025!", 10);
  const coach3User = await prisma.user.upsert({
    where: { email: "coach3@test.com" },
    update: { password: coach3Hash, role: "COACH", name: "Pending Coach" },
    create: {
      email: "coach3@test.com",
      password: coach3Hash,
      name: "Pending Coach",
      role: "COACH",
      emailVerified: new Date(),
    },
  });
  await prisma.coach.upsert({
    where: { userId: coach3User.id },
    update: { isApproved: false, isActive: false },
    create: {
      userId: coach3User.id,
      isApproved: false,
      isActive: false,
      bio: "Pending coach for approval tests",
      skills: ["Ice Dance"],
      revenueSplitPercent: 70,
    },
  });
  console.log("  Pending COACH 3 created/updated:", coach3User.email);

  // 9. Create unapproved coach4 for denial tests (CTST-02)
  const coach4Hash = await bcrypt.hash("COACH4PASS2025!", 10);
  const coach4User = await prisma.user.upsert({
    where: { email: "coach4@test.com" },
    update: { password: coach4Hash, role: "COACH", name: "Deny Test Coach" },
    create: {
      email: "coach4@test.com",
      password: coach4Hash,
      name: "Deny Test Coach",
      role: "COACH",
      emailVerified: new Date(),
    },
  });
  await prisma.coach.upsert({
    where: { userId: coach4User.id },
    update: { isApproved: false, isActive: false },
    create: {
      userId: coach4User.id,
      isApproved: false,
      isActive: false,
      bio: "Coach for denial test",
      skills: ["Freestyle"],
      revenueSplitPercent: 70,
    },
  });
  console.log("  Pending COACH 4 created/updated:", coach4User.email);

  // 10. Create a PENDING ProposedTimeSlot for coach (CTST-05 admin approval test)
  await prisma.proposedTimeSlot.deleteMany({
    where: { coachId: coach.id, status: "PENDING" },
  });
  const proposalStart = new Date();
  proposalStart.setDate(proposalStart.getDate() + 14);
  proposalStart.setHours(10, 0, 0, 0);
  const proposalEnd = new Date(proposalStart);
  proposalEnd.setHours(11, 0, 0, 0);
  await prisma.proposedTimeSlot.create({
    data: {
      coachId: coach.id,
      rinkId: rink.id,
      startTime: proposalStart,
      endTime: proposalEnd,
      maxStudents: 1,
      status: "PENDING",
    },
  });
  console.log("  PENDING ProposedTimeSlot created for:", coachUser.email);

  // 11. Create a completed lesson + payment for payout report (ATST-03)
  // Clean up prior E2E test lesson data
  await prisma.payment.deleteMany({
    where: { referenceCode: "TEST-PAYOUT-001" },
  });
  await prisma.lesson.deleteMany({
    where: { coachId: coach.id, status: "COMPLETED", notes: "E2E test lesson" },
  });

  // Create a time slot for the lesson
  const lessonStart = new Date();
  lessonStart.setDate(lessonStart.getDate() + 7);
  lessonStart.setHours(10, 0, 0, 0);
  const lessonEnd = new Date(lessonStart);
  lessonEnd.setHours(11, 0, 0, 0);

  const testTimeSlot = await prisma.rinkTimeSlot.create({
    data: {
      rinkId: rink.id,
      coachId: coach.id,
      startTime: lessonStart,
      endTime: lessonEnd,
      maxStudents: 1,
      isActive: true,
    },
  });

  const testLesson = await prisma.lesson.create({
    data: {
      studentId: student.id,
      rinkId: rink.id,
      coachId: coach.id,
      startTime: lessonStart,
      endTime: lessonEnd,
      duration: 60,
      type: "PRIVATE",
      status: "COMPLETED",
      price: 120.0,
      timeSlotId: testTimeSlot.id,
      notes: "E2E test lesson",
    },
  });

  await prisma.payment.create({
    data: {
      lessonId: testLesson.id,
      studentId: student.id,
      amount: 120.0,
      method: "VENMO",
      status: "COMPLETED",
      referenceCode: "TEST-PAYOUT-001",
      lesson_date: lessonStart,
      verifiedAt: new Date(),
      verifiedBy: adminUser.id,
    },
  });
  console.log("  Completed lesson + payment created for payout reports");

  // 12. Create an unbooked time slot for student booking test (STST-02)
  // Clean up prior unbooked slots to prevent accumulation
  const bookableCleanupStart = new Date();
  bookableCleanupStart.setDate(bookableCleanupStart.getDate() + 9);
  bookableCleanupStart.setHours(0, 0, 0, 0);
  const bookableCleanupEnd = new Date();
  bookableCleanupEnd.setDate(bookableCleanupEnd.getDate() + 11);
  bookableCleanupEnd.setHours(23, 59, 59, 999);

  await prisma.rinkTimeSlot.deleteMany({
    where: {
      coachId: coach.id,
      startTime: { gte: bookableCleanupStart, lte: bookableCleanupEnd },
      Lesson: { none: {} },
    },
  });

  const bookableStart = new Date();
  bookableStart.setDate(bookableStart.getDate() + 10);
  bookableStart.setHours(14, 0, 0, 0);
  const bookableEnd = new Date(bookableStart);
  bookableEnd.setHours(15, 0, 0, 0);

  await prisma.rinkTimeSlot.create({
    data: {
      rinkId: rink.id,
      coachId: coach.id,
      startTime: bookableStart,
      endTime: bookableEnd,
      maxStudents: 1,
      isActive: true,
    },
  });
  console.log("  Unbooked time slot created for booking tests");

  // 13. Coach2 time slot, lesson, and payment (SECT-01 data isolation)
  await prisma.payment.deleteMany({
    where: { referenceCode: "TEST-COACH2-001" },
  });
  await prisma.lesson.deleteMany({
    where: { coachId: coach2.id, notes: "E2E test coach2 lesson" },
  });

  const coach2SlotStart = new Date();
  coach2SlotStart.setDate(coach2SlotStart.getDate() + 7);
  coach2SlotStart.setHours(12, 0, 0, 0);
  const coach2SlotEnd = new Date(coach2SlotStart);
  coach2SlotEnd.setHours(13, 0, 0, 0);

  const coach2TimeSlot = await prisma.rinkTimeSlot.create({
    data: {
      rinkId: rink.id,
      coachId: coach2.id,
      startTime: coach2SlotStart,
      endTime: coach2SlotEnd,
      maxStudents: 1,
      isActive: true,
    },
  });

  const coach2Lesson = await prisma.lesson.create({
    data: {
      studentId: student.id,
      rinkId: rink.id,
      coachId: coach2.id,
      startTime: coach2SlotStart,
      endTime: coach2SlotEnd,
      duration: 60,
      type: "CHOREOGRAPHY",
      status: "COMPLETED",
      price: 90.0,
      timeSlotId: coach2TimeSlot.id,
      notes: "E2E test coach2 lesson",
    },
  });

  await prisma.payment.create({
    data: {
      lessonId: coach2Lesson.id,
      studentId: student.id,
      amount: 90.0,
      method: "ZELLE",
      status: "COMPLETED",
      referenceCode: "TEST-COACH2-001",
      lesson_date: coach2SlotStart,
      verifiedAt: new Date(),
      verifiedBy: adminUser.id,
    },
  });
  console.log("  Coach2 time slot, lesson, and payment created for isolation tests");

  console.log("\nTest data seeded successfully!");
  await prisma.$disconnect();
}

seedTestData().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
