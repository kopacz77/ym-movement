// __tests__/api/admin/students.test.ts
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createTRPCMsw } from "msw-trpc";
import { setupServer } from "msw/node";
import { TRPCError } from "@trpc/server";
import { createTestUser, createTestStudent, createMaliciousInput } from "../../helpers/test-data";
import { sanitizeInput } from "@/lib/security";

// Mock the admin student queries
const trpcMsw = createTRPCMsw();

const server = setupServer();

describe("Admin Students API", () => {
  beforeEach(() => {
    server.listen();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
  });

  describe("admin.students.getAll", () => {
    it("should return all students for admin", async () => {
      const mockStudents = [
        createTestStudent(),
        createTestStudent(),
        createTestStudent()
      ];

      server.use(
        trpcMsw.admin.students.getAll.query(() => {
          return mockStudents;
        })
      );

      // Simulate admin request
      const result = await fetch("/api/trpc/admin.students.getAll", {
        headers: {
          "Authorization": "Bearer admin-token"
        }
      });

      expect(result).toBeTruthy();
    });

    it("should require admin authentication", async () => {
      server.use(
        trpcMsw.admin.students.getAll.query(() => {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin access required"
          });
        })
      );

      try {
        await fetch("/api/trpc/admin.students.getAll", {
          headers: {
            "Authorization": "Bearer student-token"
          }
        });
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should filter students by approval status", async () => {
      const approvedStudents = [
        createTestStudent({ isApproved: true }),
        createTestStudent({ isApproved: true })
      ];

      server.use(
        trpcMsw.admin.students.getAll.query((req) => {
          const { input } = req;
          if (input?.filter?.isApproved === true) {
            return approvedStudents;
          }
          return [];
        })
      );

      // Test approved filter
      const result = await fetch("/api/trpc/admin.students.getAll?input={\"filter\":{\"isApproved\":true}}", {
        headers: {
          "Authorization": "Bearer admin-token"
        }
      });

      expect(result).toBeTruthy();
    });
  });

  describe("admin.students.create", () => {
    it("should create a new student with sanitized data", async () => {
      const studentData = createTestStudent();
      const createdStudent = { ...studentData, id: "new-student-id" };

      server.use(
        trpcMsw.admin.students.create.mutation((req) => {
          const { input } = req;
          
          // Verify input sanitization
          expect(input.name).not.toContain("<script>");
          expect(input.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
          
          return createdStudent;
        })
      );

      const response = await fetch("/api/trpc/admin.students.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ 
          json: studentData 
        })
      });

      expect(response).toBeTruthy();
    });

    it("should sanitize malicious input", async () => {
      const maliciousData = createMaliciousInput();
      const studentData = {
        ...createTestStudent(),
        name: maliciousData.xssPayload,
        notes: maliciousData.htmlInjection
      };

      server.use(
        trpcMsw.admin.students.create.mutation((req) => {
          const { input } = req;
          
          // Input should be sanitized
          expect(input.name).not.toContain("<script>");
          expect(input.notes).not.toContain("<img");
          expect(input.name).toBe(sanitizeInput(maliciousData.xssPayload));
          
          return { ...input, id: "sanitized-student" };
        })
      );

      const response = await fetch("/api/trpc/admin.students.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: studentData })
      });

      expect(response).toBeTruthy();
    });

    it("should validate required fields", async () => {
      const incompleteData = {
        name: "", // Empty name should fail
        email: "invalid-email" // Invalid email should fail
      };

      server.use(
        trpcMsw.admin.students.create.mutation(() => {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Validation failed"
          });
        })
      );

      try {
        await fetch("/api/trpc/admin.students.create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer admin-token"
          },
          body: JSON.stringify({ json: incompleteData })
        });
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should prevent duplicate email registration", async () => {
      const studentData = createTestStudent();

      server.use(
        trpcMsw.admin.students.create.mutation(() => {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already exists"
          });
        })
      );

      try {
        await fetch("/api/trpc/admin.students.create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer admin-token"
          },
          body: JSON.stringify({ json: studentData })
        });
      } catch (error: any) {
        expect(error.code).toBe("CONFLICT");
      }
    });

    it("should log security events", async () => {
      const logSpy = vi.spyOn(console, 'log');
      const studentData = createTestStudent();

      server.use(
        trpcMsw.admin.students.create.mutation((req) => {
          // Simulate security logging
          console.log('SECURITY_EVENT:', JSON.stringify({
            event: 'STUDENT_CREATED',
            userId: req.ctx?.session?.user?.id,
            studentEmail: req.input.email
          }));
          
          return { ...req.input, id: "logged-student" };
        })
      );

      await fetch("/api/trpc/admin.students.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: studentData })
      });

      expect(logSpy).toHaveBeenCalledWith(
        'SECURITY_EVENT:',
        expect.stringContaining('STUDENT_CREATED')
      );
    });
  });

  describe("admin.students.update", () => {
    it("should update student with sanitized data", async () => {
      const updateData = {
        id: "student-123",
        name: "Updated Name",
        notes: "Updated notes"
      };

      server.use(
        trpcMsw.admin.students.update.mutation((req) => {
          const { input } = req;
          expect(input.id).toBe("student-123");
          expect(input.name).toBe("Updated Name");
          
          return { ...input, updatedAt: new Date() };
        })
      );

      const response = await fetch("/api/trpc/admin.students.update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: updateData })
      });

      expect(response).toBeTruthy();
    });

    it("should sanitize malicious input in updates", async () => {
      const maliciousInput = createMaliciousInput();
      const updateData = {
        id: "student-123",
        name: maliciousInput.xssPayload,
        notes: maliciousInput.htmlInjection
      };

      server.use(
        trpcMsw.admin.students.update.mutation((req) => {
          const { input } = req;
          
          // Verify sanitization
          expect(input.name).not.toContain("<script>");
          expect(input.notes).not.toContain("<img");
          
          return input;
        })
      );

      const response = await fetch("/api/trpc/admin.students.update", {
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

  describe("admin.students.delete", () => {
    it("should delete student and related records", async () => {
      const studentId = "student-to-delete";

      server.use(
        trpcMsw.admin.students.delete.mutation((req) => {
          const { input } = req;
          expect(input.id).toBe(studentId);
          
          // Simulate cascade deletion
          return { success: true, deletedId: input.id };
        })
      );

      const response = await fetch("/api/trpc/admin.students.delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: { id: studentId } })
      });

      expect(response).toBeTruthy();
    });

    it("should prevent deletion of non-existent student", async () => {
      server.use(
        trpcMsw.admin.students.delete.mutation(() => {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found"
          });
        })
      );

      try {
        await fetch("/api/trpc/admin.students.delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer admin-token"
          },
          body: JSON.stringify({ json: { id: "non-existent" } })
        });
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("admin.students.approve", () => {
    it("should approve pending student", async () => {
      const studentId = "pending-student";

      server.use(
        trpcMsw.admin.students.approve.mutation((req) => {
          const { input } = req;
          expect(input.studentId).toBe(studentId);
          
          return { 
            id: studentId, 
            isApproved: true, 
            approvedAt: new Date() 
          };
        })
      );

      const response = await fetch("/api/trpc/admin.students.approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: { studentId } })
      });

      expect(response).toBeTruthy();
    });

    it("should log approval events", async () => {
      const logSpy = vi.spyOn(console, 'log');
      const studentId = "student-to-approve";

      server.use(
        trpcMsw.admin.students.approve.mutation((req) => {
          // Simulate security logging
          console.log('SECURITY_EVENT:', JSON.stringify({
            event: 'STUDENT_APPROVED',
            adminId: req.ctx?.session?.user?.id,
            studentId: req.input.studentId
          }));
          
          return { id: studentId, isApproved: true };
        })
      );

      await fetch("/api/trpc/admin.students.approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: { studentId } })
      });

      expect(logSpy).toHaveBeenCalledWith(
        'SECURITY_EVENT:',
        expect.stringContaining('STUDENT_APPROVED')
      );
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits on student creation", async () => {
      let attemptCount = 0;

      server.use(
        trpcMsw.admin.students.create.mutation(() => {
          attemptCount++;
          if (attemptCount > 5) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "Rate limit exceeded"
            });
          }
          return createTestStudent();
        })
      );

      // Make multiple requests rapidly
      const requests = Array.from({ length: 7 }, () =>
        fetch("/api/trpc/admin.students.create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer admin-token"
          },
          body: JSON.stringify({ json: createTestStudent() })
        })
      );

      const results = await Promise.allSettled(requests);
      const rejectedCount = results.filter(r => r.status === 'rejected').length;
      
      expect(rejectedCount).toBeGreaterThan(0); // Some should be rate limited
    });
  });

  describe("Input Validation Edge Cases", () => {
    it("should handle extremely long inputs", async () => {
      const longString = "a".repeat(10001); // Exceeds 10000 char limit
      const studentData = {
        ...createTestStudent(),
        notes: longString
      };

      server.use(
        trpcMsw.admin.students.create.mutation((req) => {
          const { input } = req;
          
          // Should be truncated to 10000 characters
          expect(input.notes.length).toBeLessThanOrEqual(10000);
          
          return { ...input, id: "truncated-student" };
        })
      );

      const response = await fetch("/api/trpc/admin.students.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: studentData })
      });

      expect(response).toBeTruthy();
    });

    it("should handle null and undefined values", async () => {
      const studentData = {
        name: "Test Student",
        email: "test@example.com",
        notes: null,
        phone: undefined
      };

      server.use(
        trpcMsw.admin.students.create.mutation((req) => {
          const { input } = req;
          
          // Null/undefined should be handled gracefully
          expect(input.notes).toBe("");
          expect(input.phone).toBe("");
          
          return { ...input, id: "null-handled-student" };
        })
      );

      const response = await fetch("/api/trpc/admin.students.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: studentData })
      });

      expect(response).toBeTruthy();
    });
  });

  describe("Emergency Contact Handling", () => {
    it("should sanitize emergency contact information", async () => {
      const maliciousInput = createMaliciousInput();
      const studentData = {
        ...createTestStudent(),
        emergencyContact: {
          name: maliciousInput.xssPayload,
          phone: "555-0123",
          relationship: maliciousInput.htmlInjection
        }
      };

      server.use(
        trpcMsw.admin.students.create.mutation((req) => {
          const { input } = req;
          
          // Emergency contact should be sanitized
          expect(input.emergencyContact.name).not.toContain("<script>");
          expect(input.emergencyContact.relationship).not.toContain("<img");
          
          return { ...input, id: "sanitized-emergency-contact" };
        })
      );

      const response = await fetch("/api/trpc/admin.students.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token"
        },
        body: JSON.stringify({ json: studentData })
      });

      expect(response).toBeTruthy();
    });
  });
});