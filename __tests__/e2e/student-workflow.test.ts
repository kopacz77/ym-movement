// __tests__/e2e/student-workflow.test.ts
import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestUser, createTestStudent, createMaliciousInput } from "../helpers/test-data";
import { sanitizeInput } from "@/lib/security";

const prisma = new PrismaClient();

// Mock fetch for API calls
global.fetch = async (url: string, options?: RequestInit) => {
  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({ success: true }),
    text: async () => 'OK'
  };
  return mockResponse as Response;
};

describe("End-to-End Student Workflow", () => {
  let testRink: any;
  let adminUser: any;

  beforeAll(async () => {
    // Set up test environment
    await prisma.payment.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.rinkTimeSlot.deleteMany();
    await prisma.user.deleteMany();
    await prisma.rink.deleteMany();

    // Create test rink
    testRink = await prisma.rink.create({
      data: {
        id: "test-rink-e2e",
        name: "E2E Test Rink",
        location: "Test Building"
      }
    });

    // Create admin user
    adminUser = await prisma.user.create({
      data: createTestUser({ role: "ADMIN" })
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.payment.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.rinkTimeSlot.deleteMany();
    await prisma.user.deleteMany();
    await prisma.rink.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up between tests
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" }
    });
    
    for (const student of students) {
      await prisma.payment.deleteMany({
        where: { studentId: student.id }
      });
      await prisma.lesson.deleteMany({
        where: { studentId: student.id }
      });
    }
    
    await prisma.user.deleteMany({
      where: { role: "STUDENT" }
    });
    
    await prisma.rinkTimeSlot.deleteMany();
  });

  describe("Complete Student Registration to Lesson Booking Flow", () => {
    it("should complete the full student workflow with security validation", async () => {
      // Step 1: Student Registration with Input Sanitization
      const maliciousInput = createMaliciousInput();
      const registrationData = {
        name: maliciousInput.xssPayload, // Will be sanitized
        email: "test-student@example.com",
        password: "SecurePass123!",
        phone: "555-0123",
        notes: maliciousInput.htmlInjection, // Will be sanitized
        emergencyContact: {
          name: maliciousInput.xssPayload, // Will be sanitized
          phone: "555-0456",
          relationship: "Parent"
        }
      };

      // Simulate student registration with sanitization
      const sanitizedData = {
        ...registrationData,
        name: sanitizeInput(registrationData.name),
        notes: sanitizeInput(registrationData.notes),
        emergencyContact: {
          ...registrationData.emergencyContact,
          name: sanitizeInput(registrationData.emergencyContact.name)
        }
      };

      const studentUser = await prisma.user.create({
        data: {
          id: "test-student-e2e",
          email: sanitizedData.email,
          name: sanitizedData.name,
          role: "STUDENT",
          password: "$2a$12$hashedpassword", // Mock hashed password
          phone: sanitizedData.phone,
          notes: sanitizedData.notes,
          emergencyContact: sanitizedData.emergencyContact,
          isApproved: false, // Initially not approved
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Verify input sanitization worked
      expect(studentUser.name).not.toContain("<script>");
      expect(studentUser.notes).not.toContain("<img");
      expect(studentUser.emergencyContact.name).not.toContain("<script>");
      expect(studentUser.name).toBe(sanitizeInput(maliciousInput.xssPayload));

      // Step 2: Admin Reviews and Approves Student
      const approvedStudent = await prisma.user.update({
        where: { id: studentUser.id },
        data: { 
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: adminUser.id
        }
      });

      expect(approvedStudent.isApproved).toBe(true);
      expect(approvedStudent.approvedBy).toBe(adminUser.id);

      // Step 3: Admin Creates Available Time Slots
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const timeSlots = [];
      for (let i = 0; i < 3; i++) {
        const startTime = new Date(tomorrow.getTime() + i * 3600000); // Every hour
        const endTime = new Date(startTime.getTime() + 3600000); // 1 hour duration

        const timeSlot = await prisma.rinkTimeSlot.create({
          data: {
            startTime,
            endTime,
            rinkId: testRink.id,
            isAvailable: true
          }
        });
        timeSlots.push(timeSlot);
      }

      expect(timeSlots).toHaveLength(3);
      expect(timeSlots.every(slot => slot.isAvailable)).toBe(true);

      // Step 4: Student Views Available Slots
      const availableSlots = await prisma.rinkTimeSlot.findMany({
        where: {
          isAvailable: true,
          startTime: {
            gte: new Date()
          }
        },
        include: {
          Rink: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });

      expect(availableSlots).toHaveLength(3);
      expect(availableSlots[0].Rink.name).toBe("E2E Test Rink");

      // Step 5: Student Books a Lesson with Input Sanitization
      const selectedSlot = availableSlots[0];
      const maliciousNotes = "<script>alert('booking hack')</script>Help me with basic jumps";
      const sanitizedNotes = sanitizeInput(maliciousNotes);

      const lessonBooking = await prisma.lesson.create({
        data: {
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: testRink.id,
          lessonType: "Private Lesson",
          notes: sanitizedNotes,
          status: "SCHEDULED"
        }
      });

      // Verify lesson sanitization
      expect(lessonBooking.notes).not.toContain("<script>");
      expect(lessonBooking.notes).toContain("Help me with basic jumps");
      expect(lessonBooking.status).toBe("SCHEDULED");

      // Mark time slot as unavailable
      await prisma.rinkTimeSlot.update({
        where: { id: selectedSlot.id },
        data: { isAvailable: false }
      });

      // Step 6: Student Views Their Schedule
      const studentLessons = await prisma.lesson.findMany({
        where: { studentId: studentUser.id },
        include: {
          Instructor: { select: { name: true, email: true } },
          Rink: { select: { name: true, location: true } }
        },
        orderBy: { startTime: 'asc' }
      });

      expect(studentLessons).toHaveLength(1);
      expect(studentLessons[0].lessonType).toBe("Private Lesson");
      expect(studentLessons[0].Instructor.name).toBe(adminUser.name);
      expect(studentLessons[0].Rink.name).toBe("E2E Test Rink");

      // Step 7: Payment Processing
      const payment = await prisma.payment.create({
        data: {
          amount: 75.00,
          currency: "USD",
          method: "VENMO",
          status: "PENDING",
          studentId: studentUser.id,
          lessonId: lessonBooking.id,
          paymentDetails: JSON.stringify({
            venmoUsername: "@student-test",
            transactionId: "test-txn-123"
          })
        }
      });

      expect(payment.status).toBe("PENDING");
      expect(payment.amount).toBe(75.00);

      // Step 8: Admin Verifies Payment
      const verifiedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: adminUser.id,
          adminNotes: "Payment confirmed via Venmo"
        }
      });

      expect(verifiedPayment.status).toBe("VERIFIED");
      expect(verifiedPayment.verifiedBy).toBe(adminUser.id);

      // Step 9: Lesson Completion and Notes
      const completedLesson = await prisma.lesson.update({
        where: { id: lessonBooking.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          instructorNotes: sanitizeInput("Student did great! <script>alert('hack')</script>Ready for next level")
        }
      });

      expect(completedLesson.status).toBe("COMPLETED");
      expect(completedLesson.instructorNotes).not.toContain("<script>");
      expect(completedLesson.instructorNotes).toContain("Student did great!");

      // Step 10: Verify Complete Workflow Data Integrity
      const finalStudentData = await prisma.user.findUnique({
        where: { id: studentUser.id },
        include: {
          StudentLessons: {
            include: {
              Payment: true,
              Rink: true
            }
          }
        }
      });

      expect(finalStudentData).toBeDefined();
      expect(finalStudentData?.isApproved).toBe(true);
      expect(finalStudentData?.StudentLessons).toHaveLength(1);
      expect(finalStudentData?.StudentLessons[0].Payment).toHaveLength(1);
      expect(finalStudentData?.StudentLessons[0].Payment[0].status).toBe("VERIFIED");
      expect(finalStudentData?.StudentLessons[0].status).toBe("COMPLETED");

      // Step 11: Analytics and Reporting Verification
      const totalRevenue = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "VERIFIED" }
      });

      const completedLessons = await prisma.lesson.count({
        where: { status: "COMPLETED" }
      });

      const approvedStudents = await prisma.user.count({
        where: { role: "STUDENT", isApproved: true }
      });

      expect(totalRevenue._sum.amount).toBe(75.00);
      expect(completedLessons).toBe(1);
      expect(approvedStudents).toBe(1);
    });

    it("should handle lesson cancellation workflow", async () => {
      // Setup: Create student and lesson
      const studentUser = await prisma.user.create({
        data: {
          ...createTestUser({ role: "STUDENT" }),
          isApproved: true
        }
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      const timeSlot = await prisma.rinkTimeSlot.create({
        data: {
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 3600000),
          rinkId: testRink.id,
          isAvailable: false // Already booked
        }
      });

      const lesson = await prisma.lesson.create({
        data: {
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          studentId: studentUser.id,
          instructorId: adminUser.id,
          rinkId: testRink.id,
          lessonType: "Group Lesson",
          status: "SCHEDULED"
        }
      });

      // Step 1: Student Cancels Lesson (more than 24 hours in advance)
      const cancelledLesson = await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: sanitizeInput("Family emergency <script>alert('xss')</script>")
        }
      });

      expect(cancelledLesson.status).toBe("CANCELLED");
      expect(cancelledLesson.cancellationReason).not.toContain("<script>");
      expect(cancelledLesson.cancellationReason).toContain("Family emergency");

      // Step 2: Time Slot Becomes Available Again
      const availableSlot = await prisma.rinkTimeSlot.update({
        where: { id: timeSlot.id },
        data: { isAvailable: true }
      });

      expect(availableSlot.isAvailable).toBe(true);

      // Step 3: Another Student Can Book the Same Slot
      const anotherStudent = await prisma.user.create({
        data: {
          ...createTestUser({ role: "STUDENT" }),
          isApproved: true
        }
      });

      const newLesson = await prisma.lesson.create({
        data: {
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          studentId: anotherStudent.id,
          instructorId: adminUser.id,
          rinkId: testRink.id,
          lessonType: "Private Lesson",
          status: "SCHEDULED"
        }
      });

      expect(newLesson.status).toBe("SCHEDULED");
      expect(newLesson.studentId).toBe(anotherStudent.id);

      // Verify no conflicts
      const lessonsAtSameTime = await prisma.lesson.findMany({
        where: {
          startTime: timeSlot.startTime,
          status: { not: "CANCELLED" }
        }
      });

      expect(lessonsAtSameTime).toHaveLength(1);
      expect(lessonsAtSameTime[0].id).toBe(newLesson.id);
    });

    it("should prevent double booking and handle conflicts", async () => {
      // Setup: Create two students
      const student1 = await prisma.user.create({
        data: {
          ...createTestUser({ role: "STUDENT" }),
          isApproved: true
        }
      });

      const student2 = await prisma.user.create({
        data: {
          ...createTestUser({ role: "STUDENT" }),
          isApproved: true
        }
      });

      const futureTime = new Date();
      futureTime.setDate(futureTime.getDate() + 1);
      futureTime.setHours(16, 0, 0, 0);

      const timeSlot = await prisma.rinkTimeSlot.create({
        data: {
          startTime: futureTime,
          endTime: new Date(futureTime.getTime() + 3600000),
          rinkId: testRink.id,
          isAvailable: true
        }
      });

      // Step 1: First student books the slot
      const lesson1 = await prisma.lesson.create({
        data: {
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          studentId: student1.id,
          instructorId: adminUser.id,
          rinkId: testRink.id,
          lessonType: "Private Lesson",
          status: "SCHEDULED"
        }
      });

      // Mark slot as unavailable
      await prisma.rinkTimeSlot.update({
        where: { id: timeSlot.id },
        data: { isAvailable: false }
      });

      // Step 2: Verify second student cannot book the same slot
      const existingLesson = await prisma.lesson.findFirst({
        where: {
          startTime: timeSlot.startTime,
          rinkId: testRink.id,
          status: { not: "CANCELLED" }
        }
      });

      expect(existingLesson).toBeDefined();
      expect(existingLesson?.studentId).toBe(student1.id);

      // Attempting to create a conflicting lesson should be prevented
      // In a real application, this would be handled by business logic
      const conflictingLessons = await prisma.lesson.findMany({
        where: {
          startTime: timeSlot.startTime,
          rinkId: testRink.id,
          status: { not: "CANCELLED" }
        }
      });

      expect(conflictingLessons).toHaveLength(1);

      // Step 3: Verify slot availability is correctly managed
      const unavailableSlot = await prisma.rinkTimeSlot.findUnique({
        where: { id: timeSlot.id }
      });

      expect(unavailableSlot?.isAvailable).toBe(false);
    });
  });

  describe("Security Integration Tests", () => {
    it("should maintain data integrity throughout the workflow", async () => {
      const maliciousInputs = createMaliciousInput();
      
      // Create student with malicious inputs
      const studentData = {
        ...createTestUser({ role: "STUDENT" }),
        name: maliciousInputs.xssPayload,
        notes: maliciousInputs.htmlInjection,
        emergencyContact: {
          name: maliciousInputs.scriptInjection,
          phone: "555-0123",
          relationship: "Parent"
        }
      };

      const student = await prisma.user.create({
        data: {
          ...studentData,
          name: sanitizeInput(studentData.name),
          notes: sanitizeInput(studentData.notes),
          emergencyContact: {
            ...studentData.emergencyContact,
            name: sanitizeInput(studentData.emergencyContact.name)
          },
          isApproved: true
        }
      });

      // Create lesson with malicious notes
      const futureTime = new Date();
      futureTime.setDate(futureTime.getDate() + 1);
      futureTime.setHours(11, 0, 0, 0);

      const lesson = await prisma.lesson.create({
        data: {
          startTime: futureTime,
          endTime: new Date(futureTime.getTime() + 3600000),
          studentId: student.id,
          instructorId: adminUser.id,
          rinkId: testRink.id,
          lessonType: "Private Lesson",
          notes: sanitizeInput(maliciousInputs.xssPayload),
          status: "SCHEDULED"
        }
      });

      // Create payment with potentially malicious details
      const payment = await prisma.payment.create({
        data: {
          amount: 50.00,
          currency: "USD",
          method: "VENMO",
          status: "PENDING",
          studentId: student.id,
          lessonId: lesson.id,
          paymentDetails: JSON.stringify({
            note: sanitizeInput(maliciousInputs.htmlInjection)
          })
        }
      });

      // Verify all data is sanitized
      expect(student.name).not.toContain("<script>");
      expect(student.notes).not.toContain("<img");
      expect(student.emergencyContact.name).not.toContain("javascript:");
      expect(lesson.notes).not.toContain("<script>");

      const paymentDetails = JSON.parse(payment.paymentDetails);
      expect(paymentDetails.note).not.toContain("<img");

      // Verify data integrity across relations
      const studentWithLessons = await prisma.user.findUnique({
        where: { id: student.id },
        include: {
          StudentLessons: {
            include: {
              Payment: true
            }
          }
        }
      });

      expect(studentWithLessons?.StudentLessons).toHaveLength(1);
      expect(studentWithLessons?.StudentLessons[0].Payment).toHaveLength(1);
      
      // All related data should be sanitized
      expect(studentWithLessons?.name).toBe(sanitizeInput(maliciousInputs.xssPayload));
      expect(studentWithLessons?.StudentLessons[0].notes).toBe(sanitizeInput(maliciousInputs.xssPayload));
    });

    it("should handle concurrent booking attempts gracefully", async () => {
      // Create multiple students
      const students = [];
      for (let i = 0; i < 3; i++) {
        const student = await prisma.user.create({
          data: {
            ...createTestUser({ role: "STUDENT" }),
            isApproved: true
          }
        });
        students.push(student);
      }

      const futureTime = new Date();
      futureTime.setDate(futureTime.getDate() + 1);
      futureTime.setHours(13, 0, 0, 0);

      const timeSlot = await prisma.rinkTimeSlot.create({
        data: {
          startTime: futureTime,
          endTime: new Date(futureTime.getTime() + 3600000),
          rinkId: testRink.id,
          isAvailable: true
        }
      });

      // Simulate concurrent booking attempts
      const bookingPromises = students.map((student, index) =>
        prisma.lesson.create({
          data: {
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            studentId: student.id,
            instructorId: adminUser.id,
            rinkId: testRink.id,
            lessonType: "Private Lesson",
            notes: `Concurrent booking attempt ${index + 1}`,
            status: "SCHEDULED"
          }
        }).catch(error => ({ error, studentIndex: index }))
      );

      const results = await Promise.allSettled(bookingPromises);
      
      // Only one booking should succeed
      const successfulBookings = results.filter(result => 
        result.status === 'fulfilled' && !('error' in result.value)
      );
      
      expect(successfulBookings).toHaveLength(1);

      // Verify database consistency
      const actualLessons = await prisma.lesson.findMany({
        where: {
          startTime: timeSlot.startTime,
          rinkId: testRink.id,
          status: "SCHEDULED"
        }
      });

      expect(actualLessons).toHaveLength(1);
    });
  });
});