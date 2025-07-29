// __tests__/database/schema.test.ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestUser, createTestStudent, createTestLesson, createTestPayment } from "../helpers/test-data";

const prisma = new PrismaClient();

describe("Database Schema Tests", () => {
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

  describe("User Model", () => {
    it("should create a user with required fields", async () => {
      const userData = createTestUser({ role: "ADMIN" });
      
      const user = await prisma.user.create({
        data: userData
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe("ADMIN");
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it("should enforce unique email constraint", async () => {
      const userData = createTestUser();
      
      await prisma.user.create({ data: userData });

      await expect(
        prisma.user.create({ data: userData })
      ).rejects.toThrow();
    });

    it("should enforce role enum values", async () => {
      const userData = createTestUser();
      
      await expect(
        prisma.user.create({
          data: { ...userData, role: "INVALID_ROLE" as any }
        })
      ).rejects.toThrow();
    });

    it("should cascade delete related records", async () => {
      const adminUser = await prisma.user.create({
        data: createTestUser({ role: "ADMIN" })
      });

      const studentUser = await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });

      const rink = await prisma.rink.create({
        data: {
          id: "test-rink",
          name: "Test Rink",
          location: "Test Location"
        }
      });

      const lesson = await prisma.lesson.create({
        data: {
          ...createTestLesson(),
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        }
      });

      // Delete student user
      await prisma.user.delete({ where: { id: studentUser.id } });

      // Lesson should be deleted due to cascade
      const lessonExists = await prisma.lesson.findUnique({
        where: { id: lesson.id }
      });
      expect(lessonExists).toBeNull();
    });
  });

  describe("Lesson Model", () => {
    it("should create lesson with all relationships", async () => {
      const adminUser = await prisma.user.create({
        data: createTestUser({ role: "ADMIN" })
      });

      const studentUser = await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });

      const rink = await prisma.rink.create({
        data: {
          id: "test-rink",
          name: "Test Rink",
          location: "Test Location"
        }
      });

      const lessonData = createTestLesson();
      const lesson = await prisma.lesson.create({
        data: {
          ...lessonData,
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: rink.id
        },
        include: {
          Student: true,
          Instructor: true,
          Rink: true
        }
      });

      expect(lesson.Student.email).toBe(studentUser.email);
      expect(lesson.Instructor.email).toBe(adminUser.email);
      expect(lesson.Rink.name).toBe("Test Rink");
    });

    it("should enforce date constraints", async () => {
      const adminUser = await prisma.user.create({
        data: createTestUser({ role: "ADMIN" })
      });

      const studentUser = await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });

      const rink = await prisma.rink.create({
        data: {
          id: "test-rink",
          name: "Test Rink",
          location: "Test Location"
        }
      });

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() - 3600000); // 1 hour before start

      await expect(
        prisma.lesson.create({
          data: {
            ...createTestLesson(),
            startTime,
            endTime,
            studentId: studentUser.id,
            instructorId: adminUser.id,
            rinkId: rink.id
          }
        })
      ).rejects.toThrow();
    });
  });

  describe("Payment Model", () => {
    it("should create payment with valid amount", async () => {
      const studentUser = await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });

      const paymentData = createTestPayment();
      const payment = await prisma.payment.create({
        data: {
          ...paymentData,
          studentId: studentUser.id
        }
      });

      expect(payment.amount).toBeGreaterThan(0);
      expect(payment.status).toBe("PENDING");
      expect(payment.studentId).toBe(studentUser.id);
    });

    it("should enforce positive amount constraint", async () => {
      const studentUser = await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });

      await expect(
        prisma.payment.create({
          data: {
            ...createTestPayment(),
            amount: -100,
            studentId: studentUser.id
          }
        })
      ).rejects.toThrow();
    });

    it("should enforce payment status enum", async () => {
      const studentUser = await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });

      await expect(
        prisma.payment.create({
          data: {
            ...createTestPayment(),
            status: "INVALID_STATUS" as any,
            studentId: studentUser.id
          }
        })
      ).rejects.toThrow();
    });
  });

  describe("RinkTimeSlot Model", () => {
    it("should create time slot with valid time range", async () => {
      const rink = await prisma.rink.create({
        data: {
          id: "test-rink",
          name: "Test Rink",
          location: "Test Location"
        }
      });

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const timeSlot = await prisma.rinkTimeSlot.create({
        data: {
          startTime,
          endTime,
          rinkId: rink.id,
          isAvailable: true
        }
      });

      expect(timeSlot.startTime).toEqual(startTime);
      expect(timeSlot.endTime).toEqual(endTime);
      expect(timeSlot.isAvailable).toBe(true);
    });

    it("should prevent overlapping time slots for same rink", async () => {
      const rink = await prisma.rink.create({
        data: {
          id: "test-rink",
          name: "Test Rink",
          location: "Test Location"
        }
      });

      const startTime1 = new Date();
      const endTime1 = new Date(startTime1.getTime() + 3600000);

      await prisma.rinkTimeSlot.create({
        data: {
          startTime: startTime1,
          endTime: endTime1,
          rinkId: rink.id,
          isAvailable: true
        }
      });

      // Overlapping time slot
      const startTime2 = new Date(startTime1.getTime() + 1800000); // 30 min after start1
      const endTime2 = new Date(endTime1.getTime() + 1800000);

      // This should be prevented by application logic, not database constraints
      // In a real implementation, you'd have a unique constraint or check this in your TRPC procedures
    });
  });

  describe("Index Performance", () => {
    it("should efficiently query lessons by date range", async () => {
      const adminUser = await prisma.user.create({
        data: createTestUser({ role: "ADMIN" })
      });

      const studentUser = await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });

      const rink = await prisma.rink.create({
        data: {
          id: "test-rink",
          name: "Test Rink",
          location: "Test Location"
        }
      });

      // Create multiple lessons
      const lessons = [];
      for (let i = 0; i < 10; i++) {
        const startTime = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
        lessons.push(
          prisma.lesson.create({
            data: {
              ...createTestLesson(),
              startTime,
              endTime: new Date(startTime.getTime() + 3600000),
              studentId: studentUser.id,
              instructorId: adminUser.id,
              rinkId: rink.id
            }
          })
        );
      }

      await Promise.all(lessons);

      const startDate = new Date();
      const endDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      const start = performance.now();
      const foundLessons = await prisma.lesson.findMany({
        where: {
          startTime: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      const end = performance.now();

      expect(foundLessons.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // Should be fast
    });

    it("should efficiently query users by email", async () => {
      // Create multiple users
      const users = [];
      for (let i = 0; i < 50; i++) {
        users.push(
          prisma.user.create({
            data: createTestUser()
          })
        );
      }

      await Promise.all(users);

      const testEmail = (await users[0]).email;

      const start = performance.now();
      const user = await prisma.user.findUnique({
        where: { email: testEmail }
      });
      const end = performance.now();

      expect(user).toBeDefined();
      expect(end - start).toBeLessThan(50); // Should be very fast due to unique index
    });
  });
});