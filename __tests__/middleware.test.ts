import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next-auth/jwt
vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";
import { middleware } from "../src/middleware";

// Helper to create a NextRequest
const createMockRequest = (path: string) => {
  return new NextRequest(new URL(path, "http://localhost:3000"));
};

describe("Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "test-secret";
  });

  describe("Protected routes - unauthenticated", () => {
    it("redirects unauthenticated user from admin route to login", async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const response = await middleware(createMockRequest("/admin/dashboard"));

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/auth/login");
      expect(location).toContain("callbackUrl");
    });

    it("redirects unauthenticated user from student route to login", async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const response = await middleware(createMockRequest("/student/dashboard"));

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/auth/login");
    });
  });

  describe("Role-based access control", () => {
    it("allows admin access to admin routes", async () => {
      vi.mocked(getToken).mockResolvedValue({ id: "test-admin", role: "ADMIN" } as any);

      const response = await middleware(createMockRequest("/admin/dashboard"));

      expect(response.status).toBe(200);
    });

    it("allows student access to student routes", async () => {
      vi.mocked(getToken).mockResolvedValue({ id: "test-student", role: "STUDENT" } as any);

      const response = await middleware(createMockRequest("/student/dashboard"));

      expect(response.status).toBe(200);
    });

    it("prevents student from accessing admin routes", async () => {
      vi.mocked(getToken).mockResolvedValue({ id: "test-student", role: "STUDENT" } as any);

      const response = await middleware(createMockRequest("/admin/dashboard"));

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/auth/login");
      expect(location).toContain("AccessDenied");
    });

    it("prevents admin from accessing student routes", async () => {
      vi.mocked(getToken).mockResolvedValue({ id: "test-admin", role: "ADMIN" } as any);

      const response = await middleware(createMockRequest("/student/dashboard"));

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/auth/login");
      expect(location).toContain("AccessDenied");
    });

    it("allows SUPER_ADMIN access to admin routes", async () => {
      vi.mocked(getToken).mockResolvedValue({ id: "test-superadmin", role: "SUPER_ADMIN" } as any);

      const response = await middleware(createMockRequest("/admin/dashboard"));

      expect(response.status).toBe(200);
    });
  });

  describe("Public routes", () => {
    it("allows access to non-protected routes", async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const response = await middleware(createMockRequest("/"));

      expect(response.status).toBe(200);
    });

    it("allows access to auth pages", async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const response = await middleware(createMockRequest("/auth/login"));

      expect(response.status).toBe(200);
    });
  });

  describe("Edge cases", () => {
    it("handles missing role in session gracefully", async () => {
      vi.mocked(getToken).mockResolvedValue({ id: "123" } as any);

      const response = await middleware(createMockRequest("/admin/dashboard"));

      // Missing role should pass through (deferred to TRPC layer)
      expect(response.status).toBe(200);
    });
  });
});
