// Custom OpenAPI document generator for TRPC v11
// This creates comprehensive API documentation for the YM Movement Scheduler

export const openApiDocument = {
  openapi: "3.0.0",
  info: {
    title: "YM Movement API",
    description:
      "API documentation for YM Movement Scheduler - Yura Min's figure skating coaching platform",
    version: "3.0.0",
    contact: {
      name: "YM Movement",
      url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      description: "Main API Server",
    },
  ],
  tags: [
    { name: "Admin - Analytics", description: "Analytics and reporting endpoints" },
    { name: "Admin - Scheduling", description: "Schedule and time slot management" },
    { name: "Admin - Students", description: "Student management" },
    { name: "Admin - Payments", description: "Payment processing and tracking" },
    { name: "Student - Lessons", description: "Student lesson booking and management" },
    { name: "Student - Payments", description: "Student payment viewing" },
    { name: "Notifications", description: "Notification system" },
    { name: "Authentication", description: "User authentication and password reset" },
  ],
  paths: {
    "/api/trpc/admin.analytics.getOverview": {
      get: {
        tags: ["Admin - Analytics"],
        summary: "Get dashboard overview",
        description:
          "Returns total students, active lessons, pending payments, and monthly revenue",
        responses: {
          "200": {
            description: "Overview data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalStudents: { type: "number" },
                    activeLessons: { type: "number" },
                    pendingPayments: { type: "number" },
                    monthlyRevenue: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/trpc/admin.analytics.getStudentActivity": {
      get: {
        tags: ["Admin - Analytics"],
        summary: "Get student activity data",
        description:
          "Returns activity data grouped by lessons, types, and areas for a given period",
        parameters: [
          {
            name: "period",
            in: "query",
            required: true,
            schema: {
              type: "string",
              enum: ["week", "month", "year"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Activity data",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string" },
                      totalLessons: { type: "number" },
                      completedLessons: { type: "number" },
                      cancelledLessons: { type: "number" },
                      byType: { type: "object" },
                      byArea: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/trpc/admin.analytics.getRevenueData": {
      get: {
        tags: ["Admin - Analytics"],
        summary: "Get revenue data",
        description:
          "Returns revenue broken down by payment method, lesson type, and student level",
        parameters: [
          {
            name: "period",
            in: "query",
            required: true,
            schema: {
              type: "string",
              enum: ["week", "month", "year"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Revenue data",
          },
        },
      },
    },
    "/api/trpc/admin.schedule.getRinkTimeSlots": {
      get: {
        tags: ["Admin - Scheduling"],
        summary: "Get rink time slots",
        description: "Returns all time slots for a specific rink and date range",
        parameters: [
          {
            name: "rinkId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "startDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date-time" },
          },
          {
            name: "endDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date-time" },
          },
        ],
        responses: {
          "200": {
            description: "List of time slots",
          },
        },
      },
    },
    "/api/trpc/admin.schedule.createTimeSlot": {
      post: {
        tags: ["Admin - Scheduling"],
        summary: "Create a time slot",
        description: "Creates a new available time slot for lesson booking",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  rinkId: { type: "string" },
                  startTime: { type: "string", format: "date-time" },
                  endTime: { type: "string", format: "date-time" },
                  area: { type: "string", enum: ["FULL_RINK", "HALF_RINK", "QUARTER_RINK"] },
                },
                required: ["rinkId", "startTime", "endTime", "area"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Created time slot",
          },
        },
      },
    },
    "/api/trpc/admin.student.getStudents": {
      get: {
        tags: ["Admin - Students"],
        summary: "Get all students",
        description: "Returns list of all students with their details",
        responses: {
          "200": {
            description: "List of students",
          },
        },
      },
    },
    "/api/trpc/admin.student.approveStudent": {
      post: {
        tags: ["Admin - Students"],
        summary: "Approve student registration",
        description: "Approves a pending student registration",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  studentId: { type: "string" },
                },
                required: ["studentId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Student approved",
          },
        },
      },
    },
    "/api/trpc/admin.payment.getPayments": {
      get: {
        tags: ["Admin - Payments"],
        summary: "Get all payments",
        description: "Returns list of all payments with student and lesson details",
        responses: {
          "200": {
            description: "List of payments",
          },
        },
      },
    },
    "/api/trpc/admin.payment.markAsPaid": {
      post: {
        tags: ["Admin - Payments"],
        summary: "Mark payment as paid",
        description: "Marks a pending payment as completed",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  paymentId: { type: "string" },
                },
                required: ["paymentId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Payment marked as paid",
          },
        },
      },
    },
    "/api/trpc/student.lessons.getAvailableSlots": {
      get: {
        tags: ["Student - Lessons"],
        summary: "Get available time slots",
        description: "Returns available time slots for booking",
        parameters: [
          {
            name: "startDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date-time" },
          },
          {
            name: "endDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date-time" },
          },
        ],
        responses: {
          "200": {
            description: "List of available slots",
          },
        },
      },
    },
    "/api/trpc/student.lessons.bookLesson": {
      post: {
        tags: ["Student - Lessons"],
        summary: "Book a lesson",
        description: "Books a lesson for the authenticated student",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  timeSlotId: { type: "string" },
                  lessonType: { type: "string", enum: ["PRIVATE", "SEMI_PRIVATE", "GROUP"] },
                },
                required: ["timeSlotId", "lessonType"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Lesson booked successfully",
          },
        },
      },
    },
    "/api/trpc/notifications.notifications.getNotifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get user notifications",
        description: "Returns all notifications for the authenticated user",
        responses: {
          "200": {
            description: "List of notifications",
          },
        },
      },
    },
    "/api/trpc/notifications.notifications.markAsRead": {
      post: {
        tags: ["Notifications"],
        summary: "Mark notification as read",
        description: "Marks a specific notification as read",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  notificationId: { type: "string" },
                },
                required: ["notificationId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Notification marked as read",
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionAuth: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "NextAuth session cookie authentication",
      },
    },
    schemas: {
      LessonType: {
        type: "string",
        enum: ["PRIVATE", "SEMI_PRIVATE", "GROUP"],
      },
      LessonStatus: {
        type: "string",
        enum: ["SCHEDULED", "COMPLETED", "CANCELLED"],
      },
      PaymentStatus: {
        type: "string",
        enum: ["PENDING", "COMPLETED", "FAILED"],
      },
      RinkArea: {
        type: "string",
        enum: ["FULL_RINK", "HALF_RINK", "QUARTER_RINK"],
      },
      Error: {
        type: "object",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
  security: [
    {
      sessionAuth: [],
    },
  ],
};
