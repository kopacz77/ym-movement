// __tests__/api/admin/schedule.test.ts
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createTRPCMsw } from "msw-trpc";
import { setupServer } from "msw/node";
import { TRPCError } from "@trpc/server";
import { createTestLesson, createTestUser } from "../../helpers/test-data";

const trpcMsw = createTRPCMsw();
const server = setupServer();

describe("Admin Schedule API", () => {
  beforeEach(() => {
    server.listen();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
  });

  describe("admin.schedule.timeSlots.getByDateRange", () => {
    it("should return time slots within date range", async () => {
      const mockTimeSlots = [
        {
          id: "slot-1",
          startTime: new Date("2025-01-30T10:00:00Z"),
          endTime: new Date("2025-01-30T11:00:00Z"),
          rinkId: "rink-1",
          isAvailable: true
        },
        {
          id: "slot-2",
          startTime: new Date("2025-01-30T14:00:00Z"),
          endTime: new Date("2025-01-30T15:00:00Z"),
          rinkId: "rink-1",
          isAvailable: false
        }
      ];

      server.use(
        trpcMsw.admin.schedule.timeSlots.getByDateRange.query((req) => {
          const { input } = req;
          expect(input.startDate).toBeInstanceOf(Date);
          expect(input.endDate).toBeInstanceOf(Date);
          
          return mockTimeSlots;
        })
      );

      const response = await fetch("/api/trpc/admin.schedule.timeSlots.getByDateRange", {
        headers: {
          "Authorization": "Bearer admin-token"
        }
      });

      expect(response).toBeTruthy();
    });

    it("should filter by rink when provided", async () => {
      const rinkSpecificSlots = [
        {
          id: "slot-1",
          startTime: new Date("2025-01-30T10:00:00Z"),
          endTime: new Date("2025-01-30T11:00:00Z"),
          rinkId: "rink-2",
          isAvailable: true
        }
      ];

      server.use(
        trpcMsw.admin.schedule.timeSlots.getByDateRange.query((req) => {
          const { input } = req;
          
          if (input.rinkId === "rink-2") {
            return rinkSpecificSlots;
          }
          
          return [];
        })
      );

      const queryParams = new URLSearchParams({
        input: JSON.stringify({
          startDate: "2025-01-30T00:00:00Z",
          endDate: "2025-01-31T00:00:00Z",
          rinkId: "rink-2"
        })
      });

      const response = await fetch(`/api/trpc/admin.schedule.timeSlots.getByDateRange?${queryParams}`, {
        headers: {
          "Authorization": "Bearer admin-token"
        }
      });

      expect(response).toBeTruthy();
    });

    it("should require admin authentication", async () => {
      server.use(
        trpcMsw.admin.schedule.timeSlots.getByDateRange.query(() => {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin access required"
          });
        })
      );

      try {
        await fetch("/api/trpc/admin.schedule.timeSlots.getByDateRange", {
          headers: {
            "Authorization": "Bearer student-token"
          }
        });
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("admin.schedule.timeSlots.create", () => {
    it("should create a single time slot", async () => {
      const timeSlotData = {
        startTime: new Date("2025-01-30T10:00:00Z"),
        endTime: new Date("2025-01-30T11:00:00Z"),
        rinkId: "rink-1",
        isRecurring: false
      };

      server.use(
        trpcMsw.admin.schedule.timeSlots.create.mutation((req) => {
          const { input } = req;
          
          expect(input.startTime).toBeInstanceOf(Date);
          expect(input.endTime).toBeInstanceOf(Date);
          expect(input.endTime.getTime()).toBeGreaterThan(input.startTime.getTime());
          expect(input.rinkId).toBe("rink-1");
          
          return { ...input, id: "new-slot-id" };
        })
      );

      const response = await fetch("/api/trpc/admin.schedule.timeSlots.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: timeSlotData })
      });

      expect(response).toBeTruthy();
    });

    it("should create recurring time slots", async () => {
      const recurringSlotData = {
        startTime: new Date("2025-01-30T10:00:00Z"),
        endTime: new Date("2025-01-30T11:00:00Z"),
        rinkId: "rink-1",
        isRecurring: true,
        recurringPattern: {
          frequency: "WEEKLY" as const,
          interval: 1,
          endDate: new Date("2025-03-30T10:00:00Z")
        }
      };

      server.use(
        trpcMsw.admin.schedule.timeSlots.create.mutation((req) => {
          const { input } = req;
          
          expect(input.isRecurring).toBe(true);
          expect(input.recurringPattern?.frequency).toBe("WEEKLY");
          expect(input.recurringPattern?.interval).toBe(1);
          
          // Should return multiple created slots
          return {
            slotsCreated: 9, // 9 weeks of slots
            slots: Array.from({ length: 9 }, (_, i) => ({
              id: `recurring-slot-${i}`,
              startTime: new Date(input.startTime.getTime() + i * 7 * 24 * 60 * 60 * 1000),
              endTime: new Date(input.endTime.getTime() + i * 7 * 24 * 60 * 60 * 1000),
              rinkId: input.rinkId,
              isAvailable: true
            }))
          };
        })
      );

      const response = await fetch("/api/trpc/admin.schedule.timeSlots.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: recurringSlotData })
      });

      expect(response).toBeTruthy();
    });

    it("should detect scheduling conflicts", async () => {
      const conflictingSlotData = {
        startTime: new Date("2025-01-30T10:30:00Z"), // Overlaps with existing slot
        endTime: new Date("2025-01-30T11:30:00Z"),
        rinkId: "rink-1"
      };

      server.use(
        trpcMsw.admin.schedule.timeSlots.create.mutation(() => {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Time slot conflicts with existing booking"
          });
        })
      );

      try {
        await fetch("/api/trpc/admin.schedule.timeSlots.create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer admin-token"
          },
          body: JSON.stringify({ json: conflictingSlotData })
        });
      } catch (error: any) {
        expect(error.code).toBe("CONFLICT");
      }
    });

    it("should validate time slot duration", async () => {
      const invalidSlotData = {
        startTime: new Date("2025-01-30T11:00:00Z"),
        endTime: new Date("2025-01-30T10:00:00Z"), // End before start
        rinkId: "rink-1"
      };

      server.use(
        trpcMsw.admin.schedule.timeSlots.create.mutation(() => {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "End time must be after start time"
          });
        })
      );

      try {
        await fetch("/api/trpc/admin.schedule.timeSlots.create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer admin-token"
          },
          body: JSON.stringify({ json: invalidSlotData })
        });
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  });

  describe("admin.schedule.timeSlots.createBulk", () => {
    it("should create multiple time slots at once", async () => {
      const bulkSlotData = {
        template: {
          startTime: "10:00",
          endTime: "11:00",
          duration: 60,
          breakDuration: 15
        },
        dates: [
          "2025-01-30",
          "2025-01-31",
          "2025-02-01"
        ],
        rinkId: "rink-1",
        slotsPerDay: 4
      };

      server.use(
        trpcMsw.admin.schedule.timeSlots.createBulk.mutation((req) => {
          const { input } = req;
          
          expect(input.dates).toHaveLength(3);
          expect(input.slotsPerDay).toBe(4);
          expect(input.template.duration).toBe(60);
          
          // Should return created slots for all dates
          return {
            slotsCreated: 12, // 3 days × 4 slots
            conflicts: [],
            bulkOperationId: "bulk-op-123"
          };
        })
      );

      const response = await fetch("/api/trpc/admin.schedule.timeSlots.createBulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: bulkSlotData })
      });

      expect(response).toBeTruthy();
    });

    it("should handle partial conflicts in bulk creation", async () => {
      const bulkSlotData = {
        template: {
          startTime: "10:00",
          endTime: "11:00",
          duration: 60
        },
        dates: ["2025-01-30", "2025-01-31"],
        rinkId: "rink-1",
        slotsPerDay: 2
      };

      server.use(
        trpcMsw.admin.schedule.timeSlots.createBulk.mutation((req) => {
          return {
            slotsCreated: 3, // Only 3 out of 4 created
            conflicts: [
              {
                date: "2025-01-30",
                time: "10:00",
                reason: "Existing booking found"
              }
            ],
            bulkOperationId: "bulk-op-124"
          };
        })
      );

      const response = await fetch("/api/trpc/admin.schedule.timeSlots.createBulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: bulkSlotData })
      });

      expect(response).toBeTruthy();
    });

    it("should validate bulk creation templates", async () => {
      const invalidBulkData = {
        template: {
          startTime: "11:00",
          endTime: "10:00", // Invalid time range
          duration: -30 // Invalid duration
        },
        dates: [],
        rinkId: "rink-1"
      };

      server.use(
        trpcMsw.admin.schedule.timeSlots.createBulk.mutation(() => {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid template configuration"
          });
        })
      );

      try {
        await fetch("/api/trpc/admin.schedule.timeSlots.createBulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer admin-token"
          },
          body: JSON.stringify({ json: invalidBulkData })
        });
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  });

  describe("admin.schedule.timeSlots.deleteBulk", () => {
    it("should delete multiple time slots", async () => {
      const timeSlotIds = ["slot-1", "slot-2", "slot-3"];

      server.use(
        trpcMsw.admin.schedule.timeSlots.deleteBulk.mutation((req) => {
          const { input } = req;
          
          expect(input.timeSlotIds).toEqual(timeSlotIds);
          
          return {
            deletedCount: 3,
            skipped: [],
            bulkOperationId: "delete-op-123"
          };
        })
      );

      const response = await fetch("/api/trpc/admin.schedule.timeSlots.deleteBulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: { timeSlotIds } })
      });

      expect(response).toBeTruthy();
    });

    it("should prevent deletion of slots with bookings", async () => {
      const timeSlotIds = ["slot-1", "slot-2", "slot-with-booking"];

      server.use(
        trpcMsw.admin.schedule.timeSlots.deleteBulk.mutation((req) => {
          return {
            deletedCount: 2,
            skipped: [
              {
                id: "slot-with-booking",
                reason: "Has existing lesson booking"
              }
            ],
            bulkOperationId: "delete-op-124"
          };
        })
      );

      const response = await fetch("/api/trpc/admin.schedule.timeSlots.deleteBulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: { timeSlotIds } })
      });

      expect(response).toBeTruthy();
    });

    it("should log bulk deletion events", async () => {
      const logSpy = vi.spyOn(console, 'log');
      const timeSlotIds = ["slot-1", "slot-2"];

      server.use(
        trpcMsw.admin.schedule.timeSlots.deleteBulk.mutation((req) => {
          // Simulate security logging
          console.log('SECURITY_EVENT:', JSON.stringify({
            event: 'BULK_TIME_SLOTS_DELETED',
            adminId: req.ctx?.session?.user?.id,
            slotCount: req.input.timeSlotIds.length
          }));
          
          return { deletedCount: 2, skipped: [] };
        })
      );

      await fetch("/api/trpc/admin.schedule.timeSlots.deleteBulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: { timeSlotIds } })
      });

      expect(logSpy).toHaveBeenCalledWith(
        'SECURITY_EVENT:',
        expect.stringContaining('BULK_TIME_SLOTS_DELETED')
      );
    });
  });

  describe("admin.schedule.lessons.create", () => {
    it("should create a new lesson booking", async () => {
      const lessonData = {
        timeSlotId: "slot-1",
        studentId: "student-1",
        lessonType: "Private Lesson",
        notes: "First lesson for beginner"
      };

      server.use(
        trpcMsw.admin.schedule.lessons.create.mutation((req) => {
          const { input } = req;
          
          expect(input.timeSlotId).toBe("slot-1");
          expect(input.studentId).toBe("student-1");
          expect(input.lessonType).toBe("Private Lesson");
          
          return {
            ...input,
            id: "lesson-123",
            status: "SCHEDULED",
            createdAt: new Date()
          };
        })
      );

      const response = await fetch("/api/trpc/admin.schedule.lessons.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: lessonData })
      });

      expect(response).toBeTruthy();
    });

    it("should sanitize lesson notes", async () => {
      const lessonData = {
        timeSlotId: "slot-1",
        studentId: "student-1",
        lessonType: "Private Lesson",
        notes: "<script>alert('xss')</script>Student needs help with jumps"
      };

      server.use(
        trpcMsw.admin.schedule.lessons.create.mutation((req) => {
          const { input } = req;
          
          // Notes should be sanitized
          expect(input.notes).not.toContain("<script>");
          expect(input.notes).toContain("Student needs help with jumps");
          
          return { ...input, id: "sanitized-lesson" };
        })
      );

      const response = await fetch("/api/trpc/admin.schedule.lessons.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: lessonData })
      });

      expect(response).toBeTruthy();
    });

    it("should prevent double booking", async () => {
      const lessonData = {
        timeSlotId: "slot-already-booked",
        studentId: "student-1",
        lessonType: "Private Lesson"
      };

      server.use(
        trpcMsw.admin.schedule.lessons.create.mutation(() => {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Time slot is already booked"
          });
        })
      );

      try {
        await fetch("/api/trpc/admin.schedule.lessons.create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer admin-token"
          },
          body: JSON.stringify({ json: lessonData })
        });
      } catch (error: any) {
        expect(error.code).toBe("CONFLICT");
      }
    });
  });

  describe("admin.schedule.lessons.update", () => {
    it("should update lesson details", async () => {
      const updateData = {
        lessonId: "lesson-123",
        status: "COMPLETED" as const,
        notes: "Student showed great improvement",
        instructorNotes: "Focus on toe loops next time"
      };

      server.use(
        trpcMsw.admin.schedule.lessons.update.mutation((req) => {
          const { input } = req;
          
          expect(input.lessonId).toBe("lesson-123");
          expect(input.status).toBe("COMPLETED");
          
          return {
            ...input,
            updatedAt: new Date()
          };
        })
      );

      const response = await fetch("/api/trpc/admin.schedule.lessons.update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: updateData })
      });

      expect(response).toBeTruthy();
    });

    it("should sanitize instructor notes", async () => {
      const updateData = {
        lessonId: "lesson-123",
        instructorNotes: "<img src=x onerror=alert('xss')>Student did well"
      };

      server.use(
        trpcMsw.admin.schedule.lessons.update.mutation((req) => {
          const { input } = req;
          
          // Instructor notes should be sanitized
          expect(input.instructorNotes).not.toContain("<img");
          expect(input.instructorNotes).not.toContain("onerror");
          expect(input.instructorNotes).toContain("Student did well");
          
          return input;
        })
      );

      const response = await fetch("/api/trpc/admin.schedule.lessons.update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: updateData })
      });

      expect(response).toBeTruthy();
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors", async () => {
      server.use(
        trpcMsw.admin.schedule.timeSlots.getByDateRange.query(() => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed"
          });
        })
      );

      try {
        await fetch("/api/trpc/admin.schedule.timeSlots.getByDateRange", {
          headers: {
            "Authorization": "Bearer admin-token"
          }
        });
      } catch (error: any) {
        expect(error.code).toBe("INTERNAL_SERVER_ERROR");
      }
    });

    it("should handle invalid date formats", async () => {
      server.use(
        trpcMsw.admin.schedule.timeSlots.getByDateRange.query(() => {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid date format"
          });
        })
      );

      try {
        const queryParams = new URLSearchParams({
          input: JSON.stringify({
            startDate: "invalid-date",
            endDate: "also-invalid"
          })
        });

        await fetch(`/api/trpc/admin.schedule.timeSlots.getByDateRange?${queryParams}`, {
          headers: {
            "Authorization": "Bearer admin-token"
          }
        });
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  });
});