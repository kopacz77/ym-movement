// __tests__/database/crud.test.ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestUser, createTestStudent, createTestLesson, createTestPayment } from "../helpers/test-data";

const prisma = new PrismaClient();

describe("Database CRUD Operations", () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.payment.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.rinkTimeSlot.deleteMany();
    await prisma.user.deleteMany();
    await prisma.rink.deleteMany();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.payment.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.rinkTimeSlot.deleteMany();
    await prisma.user.deleteMany();
    await prisma.rink.deleteMany();
  });

  describe("User CRUD Operations", () => {
    it("should create a new user", async () => {
      const userData = createTestUser({ role: "STUDENT" });
      
      const user = await prisma.user.create({
        data: userData
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe("STUDENT");
    });

    it("should read user by ID", async () => {
      const userData = createTestUser();
      const createdUser = await prisma.user.create({ data: userData });

      const foundUser = await prisma.user.findUnique({
        where: { id: createdUser.id }
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(userData.email);
    });

    it("should update user information", async () => {
      const userData = createTestUser();
      const user = await prisma.user.create({ data: userData });

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { name: "Updated Name" }
      });

      expect(updatedUser.name).toBe("Updated Name");
      expect(updatedUser.email).toBe(userData.email); // Should remain unchanged
    });

    it("should delete user", async () => {
      const userData = createTestUser();
      const user = await prisma.user.create({ data: userData });

      await prisma.user.delete({
        where: { id: user.id }
      });

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(deletedUser).toBeNull();
    });

    it("should find users by role", async () => {
      const adminData = createTestUser({ role: "ADMIN" });
      const studentData = createTestUser({ role: "STUDENT" });

      await prisma.user.create({ data: adminData });
      await prisma.user.create({ data: studentData });

      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" }
      });

      const students = await prisma.user.findMany({
        where: { role: "STUDENT" }
      });

      expect(admins).toHaveLength(1);
      expect(students).toHaveLength(1);
      expect(admins[0].email).toBe(adminData.email);
      expect(students[0].email).toBe(studentData.email);
    });
  });

  describe("Lesson CRUD Operations", () => {
    let adminUser: any;
    let studentUser: any;
    let rink: any;

    beforeEach(async () => {
      adminUser = await prisma.user.create({
        data: createTestUser({ role: "ADMIN" })
      });

      studentUser = await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });

      rink = await prisma.rink.create({
        data: {
          id: "test-rink",
          name: "Test Rink",
          location: "Test Location"
        }
      });
    });

    it("should create a new lesson", async () => {
      const lessonData = createTestLesson();
      
      const lesson = await prisma.lesson.create({
        data: {
          ...lessonData,
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      expect(lesson.id).toBeDefined();
      expect(lesson.studentId).toBe(studentUser.id);
      expect(lesson.instructorId).toBe(adminUser.id);
      expect(lesson.rinkId).toBe(rink.id);
    });

    it("should read lesson with relationships", async () => {
      const lessonData = createTestLesson();
      const createdLesson = await prisma.lesson.create({
        data: {
          ...lessonData,
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      const lesson = await prisma.lesson.findUnique({
        where: { id: createdLesson.id },
        include: {
          Student: true,
          Instructor: true,
          Rink: true
        }
      });

      expect(lesson).toBeDefined();
      expect(lesson?.Student.email).toBe(studentUser.email);
      expect(lesson?.Instructor.email).toBe(adminUser.email);
      expect(lesson?.Rink.name).toBe("Test Rink");
    });

    it("should update lesson status", async () => {
      const lessonData = createTestLesson();
      const lesson = await prisma.lesson.create({
        data: {
          ...lessonData,
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      const updatedLesson = await prisma.lesson.update({
        where: { id: lesson.id },
        data: { status: "COMPLETED" }
      });

      expect(updatedLesson.status).toBe("COMPLETED");
    });

    it("should delete lesson", async () => {
      const lessonData = createTestLesson();
      const lesson = await prisma.lesson.create({
        data: {
          ...lessonData,
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      await prisma.lesson.delete({
        where: { id: lesson.id }
      });

      const deletedLesson = await prisma.lesson.findUnique({
        where: { id: lesson.id }
      });

      expect(deletedLesson).toBeNull();
    });

    it("should find lessons by date range", async () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

      // Create lessons for different days
      await prisma.lesson.create({
        data: {
          ...createTestLesson(),
          startTime: today,
          endTime: new Date(today.getTime() + 3600000),
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      await prisma.lesson.create({
        data: {
          ...createTestLesson(),
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 3600000),
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      const lessons = await prisma.lesson.findMany({
        where: {
          startTime: {
            gte: today,
            lt: dayAfter
          }
        },
        orderBy: { startTime: "asc" }
      });

      expect(lessons).toHaveLength(2);
      expect(lessons[0].startTime.getDate()).toBe(today.getDate());
      expect(lessons[1].startTime.getDate()).toBe(tomorrow.getDate());
    });

    it("should find lessons by student", async () => {
      const anotherStudent = await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });

      // Create lesson for first student
      await prisma.lesson.create({
        data: {
          ...createTestLesson(),
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      // Create lesson for second student
      await prisma.lesson.create({
        data: {
          ...createTestLesson(),
          studentId: anotherStudent.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      const studentLessons = await prisma.lesson.findMany({
        where: { studentId: studentUser.id }
      });

      expect(studentLessons).toHaveLength(1);
      expect(studentLessons[0].studentId).toBe(studentUser.id);
    });
  });

  describe("Payment CRUD Operations", () => {
    let studentUser: any;

    beforeEach(async () => {
      studentUser = await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });
    });

    it("should create a new payment", async () => {
      const paymentData = createTestPayment();
      
      const payment = await prisma.payment.create({
        data: {
          ...paymentData,
          studentId: studentUser.id
        }
      });

      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(paymentData.amount);
      expect(payment.status).toBe("PENDING");
      expect(payment.studentId).toBe(studentUser.id);
    });

    it("should update payment status", async () => {
      const paymentData = createTestPayment();
      const payment = await prisma.payment.create({
        data: {
          ...paymentData,
          studentId: studentUser.id
        }
      });

      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: "VERIFIED",
          adminNotes: "Payment verified by admin"
        }
      });

      expect(updatedPayment.status).toBe("VERIFIED");
      expect(updatedPayment.adminNotes).toBe("Payment verified by admin");
    });

    it("should find payments by status", async () => {
      const payment1 = createTestPayment();
      const payment2 = createTestPayment();

      await prisma.payment.create({
        data: {
          ...payment1,
          studentId: studentUser.id,
          status: "PENDING"
        }
      });

      await prisma.payment.create({
        data: {
          ...payment2,
          studentId: studentUser.id,
          status: "VERIFIED"
        }
      });

      const pendingPayments = await prisma.payment.findMany({
        where: { status: "PENDING" }
      });

      const verifiedPayments = await prisma.payment.findMany({
        where: { status: "VERIFIED" }
      });

      expect(pendingPayments).toHaveLength(1);
      expect(verifiedPayments).toHaveLength(1);
    });

    it("should calculate total payments for student", async () => {
      const payments = [
        { ...createTestPayment(), amount: 100 },
        { ...createTestPayment(), amount: 150 },
        { ...createTestPayment(), amount: 200 }
      ];

      for (const paymentData of payments) {
        await prisma.payment.create({
          data: {
            ...paymentData,
            studentId: studentUser.id
          }
        });
      }

      const totalResult = await prisma.payment.aggregate({
        where: { studentId: studentUser.id },
        _sum: { amount: true },
        _count: { id: true }
      });

      expect(totalResult._sum.amount).toBe(450);
      expect(totalResult._count.id).toBe(3);
    });
  });

  describe("Time Slot CRUD Operations", () => {
    let rink: any;

    beforeEach(async () => {
      rink = await prisma.rink.create({
        data: {
          id: "test-rink",
          name: "Test Rink",
          location: "Test Location"
        }
      });
    });

    it("should create time slots", async () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 3600000);

      const timeSlot = await prisma.rinkTimeSlot.create({
        data: {
          startTime,
          endTime,
          rinkId: rink.id,
          isAvailable: true
        }
      });

      expect(timeSlot.id).toBeDefined();
      expect(timeSlot.isAvailable).toBe(true);
      expect(timeSlot.rinkId).toBe(rink.id);
    });

    it("should find available time slots", async () => {
      const baseTime = new Date();
      
      // Create available slot
      await prisma.rinkTimeSlot.create({
        data: {
          startTime: baseTime,
          endTime: new Date(baseTime.getTime() + 3600000),
          rinkId: rink.id,
          isAvailable: true
        }
      });

      // Create unavailable slot
      await prisma.rinkTimeSlot.create({
        data: {
          startTime: new Date(baseTime.getTime() + 7200000),
          endTime: new Date(baseTime.getTime() + 10800000),
          rinkId: rink.id,
          isAvailable: false
        }
      });

      const availableSlots = await prisma.rinkTimeSlot.findMany({
        where: { 
          isAvailable: true,
          rinkId: rink.id
        }
      });

      expect(availableSlots).toHaveLength(1);
      expect(availableSlots[0].isAvailable).toBe(true);
    });

    it("should bulk create time slots", async () => {
      const slots = [];
      const baseTime = new Date();

      for (let i = 0; i < 5; i++) {
        const startTime = new Date(baseTime.getTime() + i * 3600000);
        const endTime = new Date(startTime.getTime() + 3600000);
        
        slots.push({
          startTime,
          endTime,
          rinkId: rink.id,
          isAvailable: true
        });
      }

      await prisma.rinkTimeSlot.createMany({
        data: slots
      });

      const createdSlots = await prisma.rinkTimeSlot.findMany({
        where: { rinkId: rink.id }
      });

      expect(createdSlots).toHaveLength(5);
    });

    it("should update time slot availability", async () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 3600000);

      const timeSlot = await prisma.rinkTimeSlot.create({
        data: {
          startTime,
          endTime,
          rinkId: rink.id,
          isAvailable: true
        }
      });

      const updatedSlot = await prisma.rinkTimeSlot.update({
        where: { id: timeSlot.id },
        data: { isAvailable: false }
      });

      expect(updatedSlot.isAvailable).toBe(false);
    });

    it("should delete expired time slots", async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      // Create past slot
      await prisma.rinkTimeSlot.create({
        data: {
          startTime: pastTime,
          endTime: new Date(pastTime.getTime() + 3600000),
          rinkId: rink.id,
          isAvailable: true
        }
      });

      // Create future slot
      await prisma.rinkTimeSlot.create({
        data: {
          startTime: futureTime,
          endTime: new Date(futureTime.getTime() + 3600000),
          rinkId: rink.id,
          isAvailable: true
        }
      });

      // Delete past slots
      await prisma.rinkTimeSlot.deleteMany({
        where: {
          endTime: {
            lt: new Date()
          }
        }
      });

      const remainingSlots = await prisma.rinkTimeSlot.findMany({
        where: { rinkId: rink.id }
      });

      expect(remainingSlots).toHaveLength(1);
      expect(remainingSlots[0].startTime.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("Complex Queries", () => {
    let adminUser: any;
    let studentUser: any;
    let rink: any;

    beforeEach(async () => {
      adminUser = await prisma.user.create({
        data: createTestUser({ role: "ADMIN" })
      });

      studentUser = await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });

      rink = await prisma.rink.create({
        data: {
          id: "test-rink",
          name: "Test Rink",
          location: "Test Location"
        }
      });
    });

    it("should find lessons with payments", async () => {
      const lesson = await prisma.lesson.create({
        data: {
          ...createTestLesson(),
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      await prisma.payment.create({
        data: {
          ...createTestPayment(),
          studentId: studentUser.id,
          lessonId: lesson.id
        }
      });

      const lessonsWithPayments = await prisma.lesson.findMany({
        include: {
          Payment: true,
          Student: true
        },
        where: {
          Payment: {
            some: {}
          }
        }
      });

      expect(lessonsWithPayments).toHaveLength(1);
      expect(lessonsWithPayments[0].Payment).toHaveLength(1);
    });

    it("should get instructor schedule", async () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      // Create lessons for instructor
      await prisma.lesson.create({
        data: {
          ...createTestLesson(),
          startTime: today,
          endTime: new Date(today.getTime() + 3600000),
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      await prisma.lesson.create({
        data: {
          ...createTestLesson(),
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 3600000),
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      const instructorSchedule = await prisma.lesson.findMany({
        where: {
          instructorId: adminUser.id,
          startTime: {
            gte: today,
            lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
          }
        },
        include: {
          Student: { select: { name: true, email: true } },
          Rink: { select: { name: true, location: true } }
        },
        orderBy: { startTime: "asc" }
      });

      expect(instructorSchedule).toHaveLength(2);
      expect(instructorSchedule[0].Student.name).toBe(studentUser.name);
      expect(instructorSchedule[0].Rink.name).toBe("Test Rink");
    });

    it("should get analytics data", async () => {
      // Create multiple lessons and payments
      for (let i = 0; i < 5; i++) {
        const lesson = await prisma.lesson.create({
          data: {
            ...createTestLesson(),
            status: i % 2 === 0 ? "COMPLETED" : "SCHEDULED",
            studentId: studentUser.id,
            instructorId: adminUser.id,
            rinkId: rink.id
          }
        });

        await prisma.payment.create({
          data: {
            ...createTestPayment(),
            amount: (i + 1) * 50,
            status: "VERIFIED",
            studentId: studentUser.id,
            lessonId: lesson.id
          }
        });
      }

      // Get analytics
      const totalRevenue = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "VERIFIED" }
      });

      const lessonStats = await prisma.lesson.groupBy({
        by: ["status"],
        _count: { id: true }
      });

      const monthlyRevenue = await prisma.payment.groupBy({
        by: ["createdAt"],
        _sum: { amount: true },
        where: {
          status: "VERIFIED",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      });

      expect(totalRevenue._sum.amount).toBe(750); // 50+100+150+200+250
      expect(lessonStats).toHaveLength(2); // COMPLETED and SCHEDULED
      expect(monthlyRevenue.length).toBeGreaterThan(0);
    });
  });
});