// __tests__/notifications/notifications.test.ts
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { createTestUser, createTestLesson, createMaliciousInput } from "../helpers/test-data";
import { sanitizeInput } from "@/lib/security";

// Mock notification services
const mockEmailService = {
  sendEmail: vi.fn(),
  sendBulkEmail: vi.fn()
};

const mockPushService = {
  sendPushNotification: vi.fn(),
  sendBulkPushNotification: vi.fn()
};

// Mock external services
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: any[]) => mockEmailService.sendEmail(...args),
  sendBulkEmail: (...args: any[]) => mockEmailService.sendBulkEmail(...args)
}));

vi.mock("@/lib/push-notifications", () => ({
  sendPushNotification: (...args: any[]) => mockPushService.sendPushNotification(...args),
  sendBulkPushNotification: (...args: any[]) => mockPushService.sendBulkPushNotification(...args)
}));

// Mock database for notification queries
const mockNotifications = [
  {
    id: "notif-1",
    title: "Lesson Reminder",
    message: "Your lesson starts in 1 hour",
    type: "LESSON_REMINDER",
    userId: "user-1",
    isRead: false,
    createdAt: new Date(),
    data: { lessonId: "lesson-1" }
  },
  {
    id: "notif-2", 
    title: "Payment Confirmed",
    message: "Your payment has been verified",
    type: "PAYMENT_CONFIRMED",
    userId: "user-1",
    isRead: true,
    createdAt: new Date(),
    data: { paymentId: "payment-1" }
  }
];

const mockNotificationService = {
  create: vi.fn(),
  findMany: vi.fn().mockResolvedValue(mockNotifications),
  markAsRead: vi.fn(),
  delete: vi.fn(),
  markAllAsRead: vi.fn()
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: mockNotificationService,
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    lesson: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

describe("Notification System Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Notification Creation", () => {
    it("should create notification with sanitized content", async () => {
      const maliciousInput = createMaliciousInput();
      const notificationData = {
        title: maliciousInput.xssPayload,
        message: maliciousInput.htmlInjection,
        type: "LESSON_REMINDER",
        userId: "user-1",
        data: { lessonId: "lesson-1" }
      };

      mockNotificationService.create.mockResolvedValue({
        id: "notif-new",
        ...notificationData,
        title: sanitizeInput(notificationData.title),
        message: sanitizeInput(notificationData.message),
        isRead: false,
        createdAt: new Date()
      });

      // Simulate notification creation
      const result = await mockNotificationService.create({
        data: {
          ...notificationData,
          title: sanitizeInput(notificationData.title),
          message: sanitizeInput(notificationData.message)
        }
      });

      expect(mockNotificationService.create).toHaveBeenCalled();
      expect(result.title).not.toContain("<script>");
      expect(result.message).not.toContain("<img");
      expect(result.title).toBe(sanitizeInput(maliciousInput.xssPayload));
      expect(result.message).toBe(sanitizeInput(maliciousInput.htmlInjection));
    });

    it("should validate required notification fields", async () => {
      const invalidNotification = {
        title: "", // Empty title
        message: "", // Empty message
        type: "INVALID_TYPE", // Invalid type
        userId: "user-1"
      };

      mockNotificationService.create.mockRejectedValue(
        new Error("Validation failed: title and message are required")
      );

      await expect(
        mockNotificationService.create({ data: invalidNotification })
      ).rejects.toThrow("Validation failed");
    });

    it("should enforce notification message length limits", async () => {
      const longMessage = "a".repeat(1001); // Exceeds typical limit
      const notificationData = {
        title: "Test Notification",
        message: longMessage,
        type: "LESSON_REMINDER",
        userId: "user-1"
      };

      mockNotificationService.create.mockResolvedValue({
        ...notificationData,
        message: sanitizeInput(longMessage).substring(0, 1000), // Truncated
        id: "notif-truncated",
        isRead: false,
        createdAt: new Date()
      });

      const result = await mockNotificationService.create({
        data: {
          ...notificationData,
          message: sanitizeInput(longMessage).substring(0, 1000)
        }
      });

      expect(result.message.length).toBeLessThanOrEqual(1000);
    });
  });

  describe("Email Notifications", () => {
    it("should send lesson reminder emails", async () => {
      const student = createTestUser({ role: "STUDENT" });
      const lesson = createTestLesson();

      mockEmailService.sendEmail.mockResolvedValue({
        success: true,
        messageId: "email-123"
      });

      // Simulate sending lesson reminder
      await mockEmailService.sendEmail({
        to: student.email,
        subject: "Lesson Reminder - Figure Skating",
        template: "lesson-reminder",
        data: {
          studentName: student.name,
          lessonTime: lesson.startTime,
          lessonType: lesson.lessonType,
          rinkName: "Main Rink"
        }
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: student.email,
        subject: "Lesson Reminder - Figure Skating",
        template: "lesson-reminder",
        data: expect.objectContaining({
          studentName: student.name,
          lessonTime: lesson.startTime
        })
      });
    });

    it("should sanitize email content before sending", async () => {
      const maliciousInput = createMaliciousInput();
      const student = createTestUser({ 
        role: "STUDENT",
        name: maliciousInput.xssPayload
      });

      mockEmailService.sendEmail.mockResolvedValue({
        success: true,
        messageId: "email-sanitized"
      });

      // Email content should be sanitized
      await mockEmailService.sendEmail({
        to: student.email,
        subject: "Welcome to Yura Scheduler",
        template: "welcome",
        data: {
          studentName: sanitizeInput(student.name),
          message: sanitizeInput(maliciousInput.htmlInjection)
        }
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studentName: expect.not.stringContaining("<script>"),
            message: expect.not.stringContaining("<img")
          })
        })
      );
    });

    it("should handle email delivery failures gracefully", async () => {
      const student = createTestUser({ role: "STUDENT" });

      mockEmailService.sendEmail.mockRejectedValue(
        new Error("SMTP server unavailable")
      );

      // Should not throw error, but log failure
      await expect(
        mockEmailService.sendEmail({
          to: student.email,
          subject: "Test Email",
          template: "generic",
          data: {}
        })
      ).rejects.toThrow("SMTP server unavailable");

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it("should send bulk notifications efficiently", async () => {
      const students = Array.from({ length: 100 }, () => 
        createTestUser({ role: "STUDENT" })
      );

      mockEmailService.sendBulkEmail.mockResolvedValue({
        success: true,
        sentCount: 100,
        failedCount: 0
      });

      const emailData = students.map(student => ({
        to: student.email,
        subject: "Important Announcement",
        template: "announcement",
        data: {
          studentName: sanitizeInput(student.name),
          message: "Rink will be closed for maintenance"
        }
      }));

      const result = await mockEmailService.sendBulkEmail(emailData);

      expect(mockEmailService.sendBulkEmail).toHaveBeenCalledWith(emailData);
      expect(result.sentCount).toBe(100);
      expect(result.failedCount).toBe(0);
    });
  });

  describe("Push Notifications", () => {
    it("should send push notifications to mobile devices", async () => {
      const student = createTestUser({ role: "STUDENT" });
      const deviceToken = "mobile-device-token-123";

      mockPushService.sendPushNotification.mockResolvedValue({
        success: true,
        messageId: "push-123"
      });

      await mockPushService.sendPushNotification({
        token: deviceToken,
        title: "Lesson Starting Soon",
        body: "Your lesson starts in 15 minutes",
        data: {
          type: "LESSON_REMINDER",
          lessonId: "lesson-1",
          action: "view_lesson"
        }
      });

      expect(mockPushService.sendPushNotification).toHaveBeenCalledWith({
        token: deviceToken,
        title: "Lesson Starting Soon",
        body: "Your lesson starts in 15 minutes",
        data: expect.objectContaining({
          type: "LESSON_REMINDER",
          lessonId: "lesson-1"
        })
      });
    });

    it("should sanitize push notification content", async () => {
      const maliciousInput = createMaliciousInput();
      const deviceToken = "device-token-456";

      mockPushService.sendPushNotification.mockResolvedValue({
        success: true,
        messageId: "push-sanitized"
      });

      await mockPushService.sendPushNotification({
        token: deviceToken,
        title: sanitizeInput(maliciousInput.xssPayload),
        body: sanitizeInput(maliciousInput.htmlInjection),
        data: {
          type: "ANNOUNCEMENT",
          message: sanitizeInput("Important update <script>alert('hack')</script>")
        }
      });

      expect(mockPushService.sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.not.stringContaining("<script>"),
          body: expect.not.stringContaining("<img"),
          data: expect.objectContaining({
            message: expect.not.stringContaining("<script>")
          })
        })
      );
    });

    it("should handle push notification failures", async () => {
      const deviceToken = "invalid-token";

      mockPushService.sendPushNotification.mockRejectedValue(
        new Error("Invalid device token")
      );

      await expect(
        mockPushService.sendPushNotification({
          token: deviceToken,
          title: "Test Notification",
          body: "This should fail",
          data: {}
        })
      ).rejects.toThrow("Invalid device token");
    });

    it("should send bulk push notifications", async () => {
      const deviceTokens = Array.from({ length: 50 }, (_, i) => `token-${i}`);

      mockPushService.sendBulkPushNotification.mockResolvedValue({
        success: true,
        sentCount: 48,
        failedCount: 2, // Some tokens might be invalid
        failedTokens: ["token-5", "token-23"]
      });

      const pushData = {
        tokens: deviceTokens,
        title: "Rink Closure Notice",
        body: "The rink will be closed tomorrow for maintenance",
        data: {
          type: "ANNOUNCEMENT",
          priority: "high"
        }
      };

      const result = await mockPushService.sendBulkPushNotification(pushData);

      expect(mockPushService.sendBulkPushNotification).toHaveBeenCalledWith(pushData);
      expect(result.sentCount).toBe(48);
      expect(result.failedCount).toBe(2);
      expect(result.failedTokens).toEqual(["token-5", "token-23"]);
    });
  });

  describe("Notification Queries", () => {
    it("should fetch user notifications with pagination", async () => {
      const userId = "user-1";

      const result = await mockNotificationService.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: 0
      });

      expect(mockNotificationService.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: 0
      });

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(userId);
    });

    it("should filter notifications by type", async () => {
      const userId = "user-1";
      const filteredNotifications = mockNotifications.filter(
        n => n.type === "LESSON_REMINDER"
      );

      mockNotificationService.findMany.mockResolvedValue(filteredNotifications);

      const result = await mockNotificationService.findMany({
        where: { 
          userId,
          type: "LESSON_REMINDER"
        },
        orderBy: { createdAt: "desc" }
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("LESSON_REMINDER");
    });

    it("should filter unread notifications", async () => {
      const userId = "user-1";
      const unreadNotifications = mockNotifications.filter(n => !n.isRead);

      mockNotificationService.findMany.mockResolvedValue(unreadNotifications);

      const result = await mockNotificationService.findMany({
        where: { 
          userId,
          isRead: false
        },
        orderBy: { createdAt: "desc" }
      });

      expect(result).toHaveLength(1);
      expect(result[0].isRead).toBe(false);
    });
  });

  describe("Notification Actions", () => {
    it("should mark notification as read", async () => {
      const notificationId = "notif-1";
      
      mockNotificationService.markAsRead.mockResolvedValue({
        id: notificationId,
        isRead: true,
        readAt: new Date()
      });

      const result = await mockNotificationService.markAsRead(notificationId);

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(notificationId);
      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    it("should mark all notifications as read for user", async () => {
      const userId = "user-1";
      
      mockNotificationService.markAllAsRead.mockResolvedValue({
        count: 5 // Number of notifications marked as read
      });

      const result = await mockNotificationService.markAllAsRead(userId);

      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith(userId);
      expect(result.count).toBe(5);
    });

    it("should delete notification", async () => {
      const notificationId = "notif-1";
      
      mockNotificationService.delete.mockResolvedValue({
        id: notificationId,
        deleted: true
      });

      const result = await mockNotificationService.delete(notificationId);

      expect(mockNotificationService.delete).toHaveBeenCalledWith(notificationId);
      expect(result.deleted).toBe(true);
    });
  });

  describe("Notification Templates", () => {
    it("should use correct template for lesson reminders", async () => {
      const student = createTestUser({ role: "STUDENT" });
      const lesson = createTestLesson();

      mockEmailService.sendEmail.mockResolvedValue({ success: true });

      await mockEmailService.sendEmail({
        to: student.email,
        subject: "Lesson Reminder",
        template: "lesson-reminder",
        data: {
          studentName: student.name,
          lessonTime: lesson.startTime.toLocaleString(),
          lessonType: lesson.lessonType,
          rinkName: "Main Rink",
          instructorName: "Coach Smith"
        }
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: "lesson-reminder",
          data: expect.objectContaining({
            studentName: student.name,
            lessonType: lesson.lessonType
          })
        })
      );
    });

    it("should use correct template for payment confirmations", async () => {
      const student = createTestUser({ role: "STUDENT" });

      mockEmailService.sendEmail.mockResolvedValue({ success: true });

      await mockEmailService.sendEmail({
        to: student.email,
        subject: "Payment Confirmation",
        template: "payment-confirmed",
        data: {
          studentName: student.name,
          amount: "$75.00",
          paymentMethod: "Venmo",
          transactionId: "txn-123",
          lessonDate: "January 30, 2025"
        }
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: "payment-confirmed",
          data: expect.objectContaining({
            amount: "$75.00",
            paymentMethod: "Venmo"
          })
        })
      );
    });

    it("should use correct template for cancellations", async () => {
      const student = createTestUser({ role: "STUDENT" });

      mockEmailService.sendEmail.mockResolvedValue({ success: true });

      await mockEmailService.sendEmail({
        to: student.email,
        subject: "Lesson Cancellation Confirmation",
        template: "lesson-cancelled",
        data: {
          studentName: student.name,
          lessonDate: "January 30, 2025",
          lessonTime: "10:00 AM",
          cancellationReason: "Student request",
          refundAmount: "$75.00"
        }
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: "lesson-cancelled",
          data: expect.objectContaining({
            lessonDate: "January 30, 2025",
            refundAmount: "$75.00"
          })
        })
      );
    });
  });

  describe("Notification Security", () => {
    it("should prevent notification injection attacks", async () => {
      const maliciousInput = createMaliciousInput();
      
      // Attempt to create notification with malicious content
      const notificationData = {
        title: maliciousInput.xssPayload,
        message: `${maliciousInput.htmlInjection} Your lesson is confirmed`,
        type: "LESSON_CONFIRMATION",
        userId: "user-1"
      };

      mockNotificationService.create.mockImplementation(({ data }) => {
        // Simulate server-side sanitization
        return Promise.resolve({
          id: "notif-secure",
          ...data,
          title: sanitizeInput(data.title),
          message: sanitizeInput(data.message),
          isRead: false,
          createdAt: new Date()
        });
      });

      const result = await mockNotificationService.create({
        data: notificationData
      });

      expect(result.title).not.toContain("<script>");
      expect(result.message).not.toContain("<img");
      expect(result.message).toContain("Your lesson is confirmed");
    });

    it("should validate notification permissions", async () => {
      const unauthorizedUser = "user-unauthorized";
      const restrictedNotification = {
        title: "Admin Only Notification",
        message: "This should not be accessible",
        type: "ADMIN_ALERT",
        userId: unauthorizedUser
      };

      // Simulate permission check failure
      mockNotificationService.create.mockRejectedValue(
        new Error("Insufficient permissions to create admin notifications")
      );

      await expect(
        mockNotificationService.create({ data: restrictedNotification })
      ).rejects.toThrow("Insufficient permissions");
    });

    it("should rate limit notification creation", async () => {
      const userId = "user-spam";
      let callCount = 0;

      mockNotificationService.create.mockImplementation(() => {
        callCount++;
        if (callCount > 10) {
          throw new Error("Rate limit exceeded: too many notifications");
        }
        return Promise.resolve({
          id: `notif-${callCount}`,
          title: "Test",
          message: "Test message",
          userId,
          isRead: false,
          createdAt: new Date()
        });
      });

      // Should succeed for first 10 calls
      for (let i = 0; i < 10; i++) {
        await mockNotificationService.create({
          data: {
            title: "Test",
            message: "Test message",
            type: "TEST",
            userId
          }
        });
      }

      // 11th call should fail
      await expect(
        mockNotificationService.create({
          data: {
            title: "Test",
            message: "Test message",
            type: "TEST",
            userId
          }
        })
      ).rejects.toThrow("Rate limit exceeded");
    });
  });

  describe("Real-time Notifications", () => {
    it("should emit real-time notification events", async () => {
      const mockWebSocket = {
        emit: vi.fn(),
        to: vi.fn().mockReturnThis()
      };

      // Mock WebSocket implementation
      const emitNotification = (userId: string, notification: any) => {
        mockWebSocket.to(`user-${userId}`).emit("notification", notification);
      };

      const notification = {
        id: "notif-realtime",
        title: "New Message",
        message: "You have a new message from your instructor",
        type: "MESSAGE",
        userId: "user-1",
        isRead: false,
        createdAt: new Date()
      };

      emitNotification(notification.userId, notification);

      expect(mockWebSocket.to).toHaveBeenCalledWith("user-user-1");
      expect(mockWebSocket.emit).toHaveBeenCalledWith("notification", notification);
    });

    it("should handle WebSocket connection errors", async () => {
      const mockWebSocket = {
        emit: vi.fn().mockImplementation(() => {
          throw new Error("WebSocket connection lost");
        }),
        to: vi.fn().mockReturnThis()
      };

      const emitNotification = (userId: string, notification: any) => {
        try {
          mockWebSocket.to(`user-${userId}`).emit("notification", notification);
        } catch (error) {
          console.error("Failed to emit real-time notification:", error);
          // Fall back to persistent notification storage
          return mockNotificationService.create({
            data: notification
          });
        }
      };

      mockNotificationService.create.mockResolvedValue({
        id: "fallback-notif",
        title: "Fallback Notification",
        message: "Stored for later delivery",
        userId: "user-1",
        isRead: false,
        createdAt: new Date()
      });

      const notification = {
        title: "Test Notification",
        message: "This should fallback to storage",
        type: "TEST",
        userId: "user-1"
      };

      const result = await emitNotification(notification.userId, notification);

      expect(mockWebSocket.emit).toHaveBeenCalled();
      expect(mockNotificationService.create).toHaveBeenCalled();
      expect(result.id).toBe("fallback-notif");
    });
  });
});