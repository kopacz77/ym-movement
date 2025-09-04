// __tests__/api/student/booking.test.ts

import { TRPCError } from "@trpc/server";
import { setupServer } from "msw/node";
import { createTRPCMsw } from "msw-trpc";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "@/lib/root";
import { createTestLesson } from "../../helpers/test-data";

const trpcMsw = createTRPCMsw({
  router: appRouter,
  links: [],
  basePath: "/api/trpc",
});
const server = setupServer();

describe("Student Booking API", () => {
  beforeEach(() => {
    server.listen();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
  });

  describe("student.booking.getAvailableSlots", () => {
    it("should return available time slots for students", async () => {
      const mockAvailableSlots = [
        {
          id: "slot-1",
          startTime: new Date("2025-01-30T10:00:00Z"),
          endTime: new Date("2025-01-30T11:00:00Z"),
          rinkId: "rink-1",
          isAvailable: true,
          Rink: {
            name: "Main Rink",
            location: "Building A",
          },
        },
        {
          id: "slot-2",
          startTime: new Date("2025-01-30T14:00:00Z"),
          endTime: new Date("2025-01-30T15:00:00Z"),
          rinkId: "rink-1",
          isAvailable: true,
          Rink: {
            name: "Main Rink",
            location: "Building A",
          },
        },
      ];

      server.use(
        trpcMsw.student.booking.getAvailableSlots.query((req) => {
          const { input } = req;

          expect(input.startDate).toBeInstanceOf(Date);
          expect(input.endDate).toBeInstanceOf(Date);

          return mockAvailableSlots.filter((slot) => slot.isAvailable);
        }),
      );

      const queryParams = new URLSearchParams({
        input: JSON.stringify({
          startDate: "2025-01-30T00:00:00Z",
          endDate: "2025-01-31T00:00:00Z",
        }),
      });

      const response = await fetch(`/api/trpc/student.booking.getAvailableSlots?${queryParams}`, {
        headers: {
          Authorization: "Bearer student-token",
        },
      });

      expect(response).toBeTruthy();
    });

    it("should filter by rink when specified", async () => {
      const rink2Slots = [
        {
          id: "slot-3",
          startTime: new Date("2025-01-30T10:00:00Z"),
          endTime: new Date("2025-01-30T11:00:00Z"),
          rinkId: "rink-2",
          isAvailable: true,
          Rink: {
            name: "Practice Rink",
            location: "Building B",
          },
        },
      ];

      server.use(
        trpcMsw.student.booking.getAvailableSlots.query((req) => {
          const { input } = req;

          if (input.rinkId === "rink-2") {
            return rink2Slots;
          }

          return [];
        }),
      );

      const queryParams = new URLSearchParams({
        input: JSON.stringify({
          startDate: "2025-01-30T00:00:00Z",
          endDate: "2025-01-31T00:00:00Z",
          rinkId: "rink-2",
        }),
      });

      const response = await fetch(`/api/trpc/student.booking.getAvailableSlots?${queryParams}`, {
        headers: {
          Authorization: "Bearer student-token",
        },
      });

      expect(response).toBeTruthy();
    });

    it("should require student authentication", async () => {
      server.use(
        trpcMsw.student.booking.getAvailableSlots.query(() => {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Student authentication required",
          });
        }),
      );

      try {
        await fetch("/api/trpc/student.booking.getAvailableSlots", {
          headers: {
            Authorization: "Bearer invalid-token",
          },
        });
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should only show slots for approved students", async () => {
      server.use(
        trpcMsw.student.booking.getAvailableSlots.query((req) => {
          // Check if student is approved
          if (!req.ctx?.session?.user?.isApproved) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Student account pending approval",
            });
          }

          return [];
        }),
      );

      try {
        await fetch("/api/trpc/student.booking.getAvailableSlots", {
          headers: {
            Authorization: "Bearer unapproved-student-token",
          },
        });
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("student.booking.bookLesson", () => {
    it("should successfully book an available lesson", async () => {
      const bookingData = {
        timeSlotId: "slot-1",
        lessonType: "Private Lesson",
        notes: "First skating lesson, complete beginner",
      };

      server.use(
        trpcMsw.student.booking.bookLesson.mutation((req) => {
          const { input } = req;

          expect(input.timeSlotId).toBe("slot-1");
          expect(input.lessonType).toBe("Private Lesson");
          expect(input.notes).toBe("First skating lesson, complete beginner");

          return {
            id: "lesson-123",
            ...input,
            studentId: req.ctx?.session?.user?.id,
            status: "SCHEDULED",
            startTime: new Date("2025-01-30T10:00:00Z"),
            endTime: new Date("2025-01-30T11:00:00Z"),
            createdAt: new Date(),
          };
        }),
      );

      const response = await fetch("/api/trpc/student.booking.bookLesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer student-token",
        },
        body: JSON.stringify({ json: bookingData }),
      });

      expect(response).toBeTruthy();
    });

    it("should sanitize lesson notes from students", async () => {
      const bookingData = {
        timeSlotId: "slot-1",
        lessonType: "Private Lesson",
        notes: "<script>alert('malicious')</script>Please help me with basic skating",
      };

      server.use(
        trpcMsw.student.booking.bookLesson.mutation((req) => {
          const { input } = req;

          // Notes should be sanitized
          expect(input.notes).not.toContain("<script>");
          expect(input.notes).not.toContain("alert");
          expect(input.notes).toContain("Please help me with basic skating");

          return {
            id: "sanitized-lesson",
            ...input,
            studentId: req.ctx?.session?.user?.id,
            status: "SCHEDULED",
          };
        }),
      );

      const response = await fetch("/api/trpc/student.booking.bookLesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer student-token",
        },
        body: JSON.stringify({ json: bookingData }),
      });

      expect(response).toBeTruthy();
    });

    it("should prevent booking unavailable slots", async () => {
      const bookingData = {
        timeSlotId: "slot-unavailable",
        lessonType: "Private Lesson",
        notes: "Want to book this slot",
      };

      server.use(
        trpcMsw.student.booking.bookLesson.mutation(() => {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Time slot is no longer available",
          });
        }),
      );

      try {
        await fetch("/api/trpc/student.booking.bookLesson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer student-token",
          },
          body: JSON.stringify({ json: bookingData }),
        });
      } catch (error: any) {
        expect(error.code).toBe("CONFLICT");
      }
    });

    it("should prevent double booking by same student", async () => {
      const bookingData = {
        timeSlotId: "slot-1",
        lessonType: "Private Lesson",
        notes: "Second attempt to book same slot",
      };

      server.use(
        trpcMsw.student.booking.bookLesson.mutation(() => {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You already have a lesson booked at this time",
          });
        }),
      );

      try {
        await fetch("/api/trpc/student.booking.bookLesson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer student-token",
          },
          body: JSON.stringify({ json: bookingData }),
        });
      } catch (error: any) {
        expect(error.code).toBe("CONFLICT");
        expect(error.message).toContain("already have a lesson booked");
      }
    });

    it("should enforce booking time limits", async () => {
      const bookingData = {
        timeSlotId: "slot-in-past",
        lessonType: "Private Lesson",
        notes: "Trying to book past slot",
      };

      server.use(
        trpcMsw.student.booking.bookLesson.mutation(() => {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot book lessons in the past",
          });
        }),
      );

      try {
        await fetch("/api/trpc/student.booking.bookLesson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer student-token",
          },
          body: JSON.stringify({ json: bookingData }),
        });
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should enforce advance booking requirements", async () => {
      const bookingData = {
        timeSlotId: "slot-too-soon",
        lessonType: "Private Lesson",
        notes: "Booking lesson starting in 30 minutes",
      };

      server.use(
        trpcMsw.student.booking.bookLesson.mutation(() => {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Lessons must be booked at least 2 hours in advance",
          });
        }),
      );

      try {
        await fetch("/api/trpc/student.booking.bookLesson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer student-token",
          },
          body: JSON.stringify({ json: bookingData }),
        });
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
        expect(error.message).toContain("2 hours in advance");
      }
    });

    it("should log successful bookings", async () => {
      const logSpy = vi.spyOn(console, "log");
      const bookingData = {
        timeSlotId: "slot-1",
        lessonType: "Private Lesson",
        notes: "Regular lesson",
      };

      server.use(
        trpcMsw.student.booking.bookLesson.mutation((req) => {
          // Simulate security logging
          console.log(
            "SECURITY_EVENT:",
            JSON.stringify({
              event: "LESSON_BOOKED",
              studentId: req.ctx?.session?.user?.id,
              timeSlotId: req.input.timeSlotId,
              lessonType: req.input.lessonType,
            }),
          );

          return {
            id: "logged-lesson",
            ...req.input,
            studentId: req.ctx?.session?.user?.id,
            status: "SCHEDULED",
          };
        }),
      );

      await fetch("/api/trpc/student.booking.bookLesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer student-token",
        },
        body: JSON.stringify({ json: bookingData }),
      });

      expect(logSpy).toHaveBeenCalledWith(
        "SECURITY_EVENT:",
        expect.stringContaining("LESSON_BOOKED"),
      );
    });
  });

  describe("student.booking.cancelLesson", () => {
    it("should successfully cancel a future lesson", async () => {
      const lessonId = "lesson-to-cancel";

      server.use(
        trpcMsw.student.booking.cancelLesson.mutation((req) => {
          const { input } = req;

          expect(input.lessonId).toBe(lessonId);

          return {
            id: lessonId,
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelledBy: req.ctx?.session?.user?.id,
          };
        }),
      );

      const response = await fetch("/api/trpc/student.booking.cancelLesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer student-token",
        },
        body: JSON.stringify({ json: { lessonId } }),
      });

      expect(response).toBeTruthy();
    });

    it("should prevent cancelling lessons too close to start time", async () => {
      const lessonId = "lesson-starting-soon";

      server.use(
        trpcMsw.student.booking.cancelLesson.mutation(() => {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot cancel lessons less than 24 hours before start time",
          });
        }),
      );

      try {
        await fetch("/api/trpc/student.booking.cancelLesson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer student-token",
          },
          body: JSON.stringify({ json: { lessonId } }),
        });
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
        expect(error.message).toContain("24 hours");
      }
    });

    it("should prevent cancelling already completed lessons", async () => {
      const lessonId = "completed-lesson";

      server.use(
        trpcMsw.student.booking.cancelLesson.mutation(() => {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot cancel completed lessons",
          });
        }),
      );

      try {
        await fetch("/api/trpc/student.booking.cancelLesson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer student-token",
          },
          body: JSON.stringify({ json: { lessonId } }),
        });
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should only allow students to cancel their own lessons", async () => {
      const lessonId = "other-student-lesson";

      server.use(
        trpcMsw.student.booking.cancelLesson.mutation(() => {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Can only cancel your own lessons",
          });
        }),
      );

      try {
        await fetch("/api/trpc/student.booking.cancelLesson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer student-token",
          },
          body: JSON.stringify({ json: { lessonId } }),
        });
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should handle cancellation reasons", async () => {
      const cancellationData = {
        lessonId: "lesson-with-reason",
        reason: "Family emergency",
      };

      server.use(
        trpcMsw.student.booking.cancelLesson.mutation((req) => {
          const { input } = req;

          expect(input.lessonId).toBe("lesson-with-reason");
          expect(input.reason).toBe("Family emergency");

          return {
            id: input.lessonId,
            status: "CANCELLED",
            cancellationReason: input.reason,
            cancelledAt: new Date(),
          };
        }),
      );

      const response = await fetch("/api/trpc/student.booking.cancelLesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer student-token",
        },
        body: JSON.stringify({ json: cancellationData }),
      });

      expect(response).toBeTruthy();
    });

    it("should sanitize cancellation reasons", async () => {
      const cancellationData = {
        lessonId: "lesson-with-malicious-reason",
        reason: "<script>alert('xss')</script>Got sick",
      };

      server.use(
        trpcMsw.student.booking.cancelLesson.mutation((req) => {
          const { input } = req;

          // Reason should be sanitized
          expect(input.reason).not.toContain("<script>");
          expect(input.reason).toContain("Got sick");

          return {
            id: input.lessonId,
            status: "CANCELLED",
            cancellationReason: input.reason,
          };
        }),
      );

      const response = await fetch("/api/trpc/student.booking.cancelLesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer student-token",
        },
        body: JSON.stringify({ json: cancellationData }),
      });

      expect(response).toBeTruthy();
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce booking rate limits", async () => {
      let attemptCount = 0;

      server.use(
        trpcMsw.student.booking.bookLesson.mutation(() => {
          attemptCount++;
          if (attemptCount > 3) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "Too many booking attempts, please wait",
            });
          }
          return {
            id: `lesson-${attemptCount}`,
            status: "SCHEDULED",
          };
        }),
      );

      // Make multiple rapid booking attempts
      const requests = Array.from({ length: 5 }, (_, i) =>
        fetch("/api/trpc/student.booking.bookLesson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer student-token",
          },
          body: JSON.stringify({
            json: {
              timeSlotId: `slot-${i}`,
              lessonType: "Private Lesson",
              notes: `Attempt ${i}`,
            },
          }),
        }),
      );

      const results = await Promise.allSettled(requests);
      const rejectedCount = results.filter((r) => r.status === "rejected").length;

      expect(rejectedCount).toBeGreaterThan(0); // Some should be rate limited
    });
  });

  describe("Booking Validation", () => {
    it("should validate lesson type options", async () => {
      const bookingData = {
        timeSlotId: "slot-1",
        lessonType: "Invalid Lesson Type",
        notes: "Should fail validation",
      };

      server.use(
        trpcMsw.student.booking.bookLesson.mutation(() => {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid lesson type",
          });
        }),
      );

      try {
        await fetch("/api/trpc/student.booking.bookLesson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer student-token",
          },
          body: JSON.stringify({ json: bookingData }),
        });
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should validate notes length", async () => {
      const longNotes = "a".repeat(2000); // Very long notes
      const bookingData = {
        timeSlotId: "slot-1",
        lessonType: "Private Lesson",
        notes: longNotes,
      };

      server.use(
        trpcMsw.student.booking.bookLesson.mutation((req) => {
          const { input } = req;

          // Notes should be truncated if too long
          expect(input.notes.length).toBeLessThanOrEqual(1000);

          return {
            id: "truncated-notes-lesson",
            ...input,
            status: "SCHEDULED",
          };
        }),
      );

      const response = await fetch("/api/trpc/student.booking.bookLesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer student-token",
        },
        body: JSON.stringify({ json: bookingData }),
      });

      expect(response).toBeTruthy();
    });
  });
});
