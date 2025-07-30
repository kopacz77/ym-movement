// __tests__/performance/database-performance.test.ts
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestUser, createTestLesson } from "../helpers/test-data";

const prisma = new PrismaClient();

describe("Database Performance Tests", () => {
  let testUsers: any[] = [];
  let testRink: any;
  let adminUser: any;

  beforeAll(async () => {
    // Clean up and setup
    await prisma.payment.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.rinkTimeSlot.deleteMany();
    await prisma.user.deleteMany();
    await prisma.rink.deleteMany();

    // Create test rink
    testRink = await prisma.rink.create({
      data: {
        id: "perf-test-rink",
        name: "Performance Test Rink",
        location: "Test Building"
      }
    });

    // Create admin user
    adminUser = await prisma.user.create({
      data: createTestUser({ role: "ADMIN" })
    });
  });

  afterAll(async () => {
    await prisma.payment.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.rinkTimeSlot.deleteMany();
    await prisma.user.deleteMany();
    await prisma.rink.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test users from previous tests
    await prisma.payment.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.user.deleteMany({
      where: { role: "STUDENT" }
    });
    await prisma.rinkTimeSlot.deleteMany();
    testUsers = [];
  });

  describe("Large Dataset Performance", () => {
    it("should efficiently handle large user queries", async () => {
      // Create 1000 test users
      const usersData = Array.from({ length: 1000 }, () => 
        createTestUser({ role: "STUDENT" })
      );

      const startCreate = performance.now();
      
      // Batch create users for better performance
      for (let i = 0; i < usersData.length; i += 100) {
        const batch = usersData.slice(i, i + 100);
        await prisma.user.createMany({
          data: batch
        });
      }
      
      const endCreate = performance.now();
      console.log(`Created 1000 users in ${endCreate - startCreate}ms`);

      // Test query performance
      const startQuery = performance.now();
      const users = await prisma.user.findMany({
        where: { role: "STUDENT" },
        orderBy: { createdAt: "desc" },
        take: 50 // Paginated query
      });
      const endQuery = performance.now();

      expect(users).toHaveLength(50);
      expect(endQuery - startQuery).toBeLessThan(100); // Should be fast with proper indexing
      console.log(`Queried 50 users from 1000 in ${endQuery - startQuery}ms`);

      // Test filtered query performance
      const startFilter = performance.now();
      const filteredUsers = await prisma.user.findMany({
        where: {
          role: "STUDENT",
          isApproved: true,
          email: {
            contains: "@example.com"
          }
        },
        take: 20
      });
      const endFilter = performance.now();

      expect(endFilter - startFilter).toBeLessThan(50); // Should be very fast
      console.log(`Filtered query completed in ${endFilter - startFilter}ms`);
    });

    it("should efficiently handle large lesson datasets", async () => {
      // Create test students
      const studentsData = Array.from({ length: 100 }, () =>
        createTestUser({ role: "STUDENT" })
      );

      await prisma.user.createMany({
        data: studentsData
      });

      const students = await prisma.user.findMany({
        where: { role: "STUDENT" }
      });

      // Create 2000 lessons
      const lessonsData = [];
      const baseDate = new Date();

      for (let i = 0; i < 2000; i++) {
        const startTime = new Date(baseDate.getTime() + i * 3600000); // Every hour
        const endTime = new Date(startTime.getTime() + 3600000);
        const randomStudent = students[Math.floor(Math.random() * students.length)];

        lessonsData.push({
          startTime,
          endTime,
          studentId: randomStudent.id,
          instructorId: adminUser.id,
          rinkId: testRink.id,
          lessonType: "Private Lesson",
          status: "SCHEDULED"
        });
      }

      const startCreate = performance.now();
      
      // Batch create lessons
      for (let i = 0; i < lessonsData.length; i += 200) {
        const batch = lessonsData.slice(i, i + 200);
        await prisma.lesson.createMany({
          data: batch
        });
      }
      
      const endCreate = performance.now();
      console.log(`Created 2000 lessons in ${endCreate - startCreate}ms`);

      // Test date range query performance
      const startQuery = performance.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayLessons = await prisma.lesson.findMany({
        where: {
          startTime: {
            gte: todayStart,
            lte: todayEnd
          }
        },
        include: {
          Student: { select: { name: true, email: true } },
          Instructor: { select: { name: true } },
          Rink: { select: { name: true } }
        },
        orderBy: { startTime: "asc" }
      });
      const endQuery = performance.now();

      expect(endQuery - startQuery).toBeLessThan(200); // Should be reasonably fast
      console.log(`Date range query with joins completed in ${endQuery - startQuery}ms`);

      // Test instructor schedule query
      const startInstructorQuery = performance.now();
      const instructorLessons = await prisma.lesson.findMany({
        where: {
          instructorId: adminUser.id,
          startTime: {
            gte: new Date()
          }
        },
        include: {
          Student: { select: { name: true, email: true } },
          Rink: { select: { name: true, location: true } }
        },
        orderBy: { startTime: "asc" },
        take: 100
      });
      const endInstructorQuery = performance.now();

      expect(endInstructorQuery - startInstructorQuery).toBeLessThan(100);
      console.log(`Instructor schedule query completed in ${endInstructorQuery - startInstructorQuery}ms`);
    });

    it("should handle complex aggregation queries efficiently", async () => {
      // Setup data for aggregation tests
      const studentsData = Array.from({ length: 50 }, () =>
        createTestUser({ role: "STUDENT" })
      );

      await prisma.user.createMany({
        data: studentsData
      });

      const students = await prisma.user.findMany({
        where: { role: "STUDENT" }
      });

      // Create lessons and payments
      const lessonsData = [];
      const paymentsData = [];

      for (let i = 0; i < 500; i++) {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - Math.floor(Math.random() * 90)); // Random dates in last 90 days
        const endTime = new Date(startTime.getTime() + 3600000);
        const randomStudent = students[Math.floor(Math.random() * students.length)];

        const lessonId = `lesson-${i}`;
        lessonsData.push({
          id: lessonId,
          startTime,
          endTime,
          studentId: randomStudent.id,
          instructorId: adminUser.id,
          rinkId: testRink.id,
          lessonType: i % 3 === 0 ? "Group Lesson" : "Private Lesson",
          status: i % 4 === 0 ? "COMPLETED" : "SCHEDULED"
        });

        // Create payments for some lessons
        if (i % 2 === 0) {
          paymentsData.push({
            amount: Math.floor(Math.random() * 100) + 50, // $50-$150
            currency: "USD",
            method: i % 3 === 0 ? "VENMO" : "ZELLE",
            status: i % 5 === 0 ? "VERIFIED" : "PENDING",
            studentId: randomStudent.id,
            lessonId: lessonId
          });
        }
      }

      // Insert lessons
      for (let i = 0; i < lessonsData.length; i += 100) {
        const batch = lessonsData.slice(i, i + 100);
        await prisma.lesson.createMany({
          data: batch
        });
      }

      // Insert payments
      for (let i = 0; i < paymentsData.length; i += 100) {
        const batch = paymentsData.slice(i, i + 100);
        await prisma.payment.createMany({
          data: batch
        });
      }

      // Test revenue aggregation
      const startRevenue = performance.now();
      const revenueData = await prisma.payment.aggregate({
        _sum: { amount: true },
        _avg: { amount: true },
        _count: { id: true },
        where: { status: "VERIFIED" }
      });
      const endRevenue = performance.now();

      expect(revenueData._count.id).toBeGreaterThan(0);
      expect(endRevenue - startRevenue).toBeLessThan(50);
      console.log(`Revenue aggregation completed in ${endRevenue - startRevenue}ms`);

      // Test lesson statistics by type
      const startLessonStats = performance.now();
      const lessonStats = await prisma.lesson.groupBy({
        by: ["lessonType", "status"],
        _count: { id: true },
        _min: { startTime: true },
        _max: { startTime: true }
      });
      const endLessonStats = performance.now();

      expect(lessonStats.length).toBeGreaterThan(0);
      expect(endLessonStats - startLessonStats).toBeLessThan(100);
      console.log(`Lesson statistics completed in ${endLessonStats - startLessonStats}ms`);

      // Test monthly revenue breakdown
      const startMonthly = performance.now();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const monthlyRevenue = await prisma.payment.findMany({
        where: {
          status: "VERIFIED",
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        select: {
          amount: true,
          createdAt: true,
          method: true
        },
        orderBy: { createdAt: "desc" }
      });
      const endMonthly = performance.now();

      expect(endMonthly - startMonthly).toBeLessThan(100);
      console.log(`Monthly revenue query completed in ${endMonthly - startMonthly}ms`);
    });
  });

  describe("Concurrent Operation Performance", () => {
    it("should handle concurrent read operations efficiently", async () => {
      // Setup test data
      const studentsData = Array.from({ length: 200 }, () =>
        createTestUser({ role: "STUDENT" })
      );

      await prisma.user.createMany({
        data: studentsData
      });

      // Simulate concurrent read operations
      const concurrentQueries = Array.from({ length: 20 }, (_, index) => {
        return prisma.user.findMany({
          where: { role: "STUDENT" },
          skip: index * 10,
          take: 10,
          orderBy: { createdAt: "desc" }
        });
      });

      const startConcurrent = performance.now();
      const results = await Promise.all(concurrentQueries);
      const endConcurrent = performance.now();

      expect(results).toHaveLength(20);
      expect(results.every(result => result.length <= 10)).toBe(true);
      expect(endConcurrent - startConcurrent).toBeLessThan(500); // Should handle concurrent reads well
      console.log(`20 concurrent queries completed in ${endConcurrent - startConcurrent}ms`);
    });

    it("should handle concurrent write operations with proper isolation", async () => {
      // Create test students
      const studentsData = Array.from({ length: 10 }, () =>
        createTestUser({ role: "STUDENT" })
      );

      await prisma.user.createMany({
        data: studentsData
      });

      const students = await prisma.user.findMany({
        where: { role: "STUDENT" }
      });

      // Simulate concurrent lesson bookings
      const concurrentBookings = students.map((student, index) => {
        const startTime = new Date();
        startTime.setHours(startTime.getHours() + index); // Different times to avoid conflicts

        return prisma.lesson.create({
          data: {
            startTime,
            endTime: new Date(startTime.getTime() + 3600000),
            studentId: student.id,
            instructorId: adminUser.id,
            rinkId: testRink.id,
            lessonType: "Private Lesson",
            status: "SCHEDULED"
          }
        });
      });

      const startBookings = performance.now();
      const bookingResults = await Promise.allSettled(concurrentBookings);
      const endBookings = performance.now();

      const successfulBookings = bookingResults.filter(
        result => result.status === 'fulfilled'
      );

      expect(successfulBookings).toHaveLength(students.length);
      expect(endBookings - startBookings).toBeLessThan(1000);
      console.log(`${students.length} concurrent bookings completed in ${endBookings - startBookings}ms`);
    });
  });

  describe("Query Optimization Tests", () => {
    it("should use indexes effectively for common queries", async () => {
      // Create test data
      const studentsData = Array.from({ length: 500 }, (_, index) =>
        createTestUser({ 
          role: "STUDENT",
          email: `student${index}@example.com`
        })
      );

      await prisma.user.createMany({
        data: studentsData
      });

      // Test email lookup (should use unique index)
      const startEmailQuery = performance.now();
      const userByEmail = await prisma.user.findUnique({
        where: { email: "student250@example.com" }
      });
      const endEmailQuery = performance.now();

      expect(userByEmail).toBeDefined();
      expect(endEmailQuery - startEmailQuery).toBeLessThan(10); // Should be very fast with unique index
      console.log(`Email lookup completed in ${endEmailQuery - startEmailQuery}ms`);

      // Test role-based query (should use index on role)
      const startRoleQuery = performance.now();
      const studentCount = await prisma.user.count({
        where: { role: "STUDENT" }
      });
      const endRoleQuery = performance.now();

      expect(studentCount).toBe(500);
      expect(endRoleQuery - startRoleQuery).toBeLessThan(20);
      console.log(`Role-based count completed in ${endRoleQuery - startRoleQuery}ms`);

      // Test composite query with multiple conditions
      const startCompositeQuery = performance.now();
      const approvedStudents = await prisma.user.findMany({
        where: {
          role: "STUDENT",
          isApproved: true,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      });
      const endCompositeQuery = performance.now();

      expect(endCompositeQuery - startCompositeQuery).toBeLessThan(50);
      console.log(`Composite query completed in ${endCompositeQuery - startCompositeQuery}ms`);
    });

    it("should optimize lesson queries with proper indexing", async () => {
      // Setup lesson data
      const studentsData = Array.from({ length: 100 }, () =>
        createTestUser({ role: "STUDENT" })
      );

      await prisma.user.createMany({
        data: studentsData
      });

      const students = await prisma.user.findMany({
        where: { role: "STUDENT" }
      });

      // Create lessons with varied dates
      const lessonsData = [];
      const baseDate = new Date();

      for (let i = 0; i < 1000; i++) {
        const daysOffset = Math.floor(Math.random() * 60) - 30; // Random date within ±30 days
        const startTime = new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 3600000);
        const randomStudent = students[Math.floor(Math.random() * students.length)];

        lessonsData.push({
          startTime,
          endTime,
          studentId: randomStudent.id,
          instructorId: adminUser.id,
          rinkId: testRink.id,
          lessonType: "Private Lesson",
          status: Math.random() > 0.8 ? "COMPLETED" : "SCHEDULED"
        });
      }

      // Batch insert lessons
      for (let i = 0; i < lessonsData.length; i += 200) {
        const batch = lessonsData.slice(i, i + 200);
        await prisma.lesson.createMany({
          data: batch
        });
      }

      // Test date range queries (should use index on startTime)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const startDateRange = performance.now();
      const futureLessons = await prisma.lesson.findMany({
        where: {
          startTime: {
            gte: tomorrow,
            lte: nextWeek
          }
        },
        orderBy: { startTime: "asc" }
      });
      const endDateRange = performance.now();

      expect(endDateRange - startDateRange).toBeLessThan(100);
      console.log(`Date range query completed in ${endDateRange - startDateRange}ms`);

      // Test student-specific queries (should use index on studentId)
      const randomStudent = students[0];
      const startStudentQuery = performance.now();
      const studentLessons = await prisma.lesson.findMany({
        where: { studentId: randomStudent.id },
        include: {
          Rink: { select: { name: true } }
        },
        orderBy: { startTime: "desc" }
      });
      const endStudentQuery = performance.now();

      expect(endStudentQuery - startStudentQuery).toBeLessThan(50);
      console.log(`Student lessons query completed in ${endStudentQuery - startStudentQuery}ms`);

      // Test instructor schedule query (should use index on instructorId)
      const startInstructorQuery = performance.now();
      const instructorSchedule = await prisma.lesson.findMany({
        where: {
          instructorId: adminUser.id,
          startTime: {
            gte: new Date()
          }
        },
        include: {
          Student: { select: { name: true } },
          Rink: { select: { name: true } }
        },
        orderBy: { startTime: "asc" },
        take: 50
      });
      const endInstructorQuery = performance.now();

      expect(endInstructorQuery - startInstructorQuery).toBeLessThan(100);
      console.log(`Instructor schedule query completed in ${endInstructorQuery - startInstructorQuery}ms`);
    });
  });

  describe("Memory Usage Tests", () => {
    it("should handle large result sets efficiently", async () => {
      // Create large dataset
      const studentsData = Array.from({ length: 1000 }, () =>
        createTestUser({ role: "STUDENT" })
      );

      await prisma.user.createMany({
        data: studentsData
      });

      // Measure memory usage before large query
      const memBefore = process.memoryUsage();

      // Execute large query with streaming/pagination
      const allStudents = [];
      const batchSize = 100;
      let skip = 0;
      let batch;

      const startStream = performance.now();
      do {
        batch = await prisma.user.findMany({
          where: { role: "STUDENT" },
          skip,
          take: batchSize,
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        });
        allStudents.push(...batch);
        skip += batchSize;
      } while (batch.length === batchSize);
      const endStream = performance.now();

      // Measure memory after
      const memAfter = process.memoryUsage();

      expect(allStudents).toHaveLength(1000);
      expect(endStream - startStream).toBeLessThan(1000);

      const memoryIncrease = memAfter.heapUsed - memBefore.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      console.log(`Streamed 1000 records in ${endStream - startStream}ms`);
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });

  describe("Connection Pool Performance", () => {
    it("should handle connection pool efficiently under load", async () => {
      // Create minimal test data
      await prisma.user.create({
        data: createTestUser({ role: "STUDENT" })
      });

      // Simulate high connection load
      const connectionTests = Array.from({ length: 50 }, async (_, index) => {
        const start = performance.now();
        
        const user = await prisma.user.findFirst({
          where: { role: "STUDENT" }
        });
        
        const end = performance.now();
        return { user, duration: end - start, index };
      });

      const startPool = performance.now();
      const results = await Promise.all(connectionTests);
      const endPool = performance.now();

      expect(results).toHaveLength(50);
      expect(results.every(result => result.user !== null)).toBe(true);
      expect(endPool - startPool).toBeLessThan(2000); // Should handle 50 concurrent connections reasonably

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`50 concurrent connections completed in ${endPool - startPool}ms`);
      console.log(`Average query duration: ${avgDuration.toFixed(2)}ms`);
    });
  });
});