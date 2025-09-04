// __tests__/helpers/test-data.ts
import { LessonStatus, LessonType, Level, RinkArea, Role } from "@prisma/client";

// Test user data
export const createTestUser = (overrides = {}) => ({
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  password: "$2b$10$hashedpassword",
  role: Role.ADMIN,
  emailVerified: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Test student data
export const createTestStudent = (overrides = {}) => ({
  id: "test-student-id",
  userId: "test-user-id",
  level: Level.PRELIMINARY,
  maxLessonsPerWeek: 3,
  isApproved: true,
  notes: "Test student notes",
  phone: "123-456-7890",
  dateOfBirth: new Date("2000-01-01"),
  emergencyContact: {
    name: "Emergency Contact",
    phone: "987-654-3210",
    relationship: "Parent",
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  user: createTestUser({ role: Role.STUDENT }),
  ...overrides,
});

// Test rink data
export const createTestRink = (overrides = {}) => ({
  id: "test-rink-id",
  name: "Test Ice Rink",
  address: "123 Test Street",
  timezone: "America/Toronto",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Test time slot data
export const createTestTimeSlot = (overrides = {}) => ({
  id: "test-timeslot-id",
  rinkId: "test-rink-id",
  startTime: new Date("2024-01-01T10:00:00Z"),
  endTime: new Date("2024-01-01T11:00:00Z"),
  maxStudents: 4,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  Rink: createTestRink(),
  Lesson: [],
  ...overrides,
});

// Test lesson data
export const createTestLesson = (overrides = {}) => ({
  id: "test-lesson-id",
  studentId: "test-student-id",
  rinkId: "test-rink-id",
  startTime: new Date("2024-01-01T10:00:00Z"),
  endTime: new Date("2024-01-01T11:00:00Z"),
  duration: 60,
  type: LessonType.PRIVATE,
  area: RinkArea.MAIN_RINK,
  status: LessonStatus.SCHEDULED,
  price: 75.0,
  notes: "Test lesson notes",
  googleCalendarEventId: "test-calendar-event",
  createdAt: new Date(),
  updatedAt: new Date(),
  Student: createTestStudent(),
  Rink: createTestRink(),
  ...overrides,
});

// Test payment data
export const createTestPayment = (overrides = {}) => ({
  id: "test-payment-id",
  studentId: "test-student-id",
  amount: 75.0,
  method: "VENMO",
  status: "COMPLETED",
  transactionId: "test-transaction-123",
  notes: "Test payment",
  processedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  Student: createTestStudent(),
  ...overrides,
});

// Test authentication data
export const createTestSession = (overrides = {}) => ({
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: Role.ADMIN,
    ...overrides,
  },
});

// Security test data
export const createMaliciousInput = () => ({
  xssPayload: "<script>alert('xss')</script>",
  sqlInjection: "'; DROP TABLE users; --",
  htmlInjection: "<img src='x' onerror='alert(1)'>",
  scriptTag: "<script src='malicious.js'></script>",
  iframeTag: "<iframe src='malicious.com'></iframe>",
  longString: "a".repeat(20000),
});

// Rate limiting test data
export const createRateLimitTestData = () => ({
  clientIP: "192.168.1.100",
  userAgent: "Mozilla/5.0 Test Browser",
  endpoint: "/api/auth/signin",
});
