import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next-auth/jwt
vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

// Import proxy after mocking (renamed from middleware in Next.js 16 migration)
import { proxy as middleware } from "../proxy";

// Helper to create mock request
const createMockRequest = (url: string) => {
  return new NextRequest(new URL(url, "http://localhost:3000"));
};

describe("Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.ENABLE_AUTH_BYPASS;
    (process.env as any).NODE_ENV = "test";
  });

  describe("Public routes", () => {
    it("allows access to home page", async () => {
      (getToken as any).mockResolvedValue(null);

      const request = createMockRequest("/");
      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(307); // Not a redirect
    });

    it("allows access to login page", async () => {
      (getToken as any).mockResolvedValue(null);

      const request = createMockRequest("/auth/login");
      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(307);
    });

    it("allows access to signup page", async () => {
      (getToken as any).mockResolvedValue(null);

      const request = createMockRequest("/auth/signup");
      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(307);
    });

    it("allows access to auth API routes", async () => {
      (getToken as any).mockResolvedValue(null);

      const request = createMockRequest("/api/auth/signin");
      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(307);
    });
  });

  describe("Protected routes - unauthenticated", () => {
    it("redirects unauthenticated user from admin route to login", async () => {
      (getToken as any).mockResolvedValue(null);

      const request = createMockRequest("/admin/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login");
    });

    it("redirects unauthenticated user from student route to login", async () => {
      (getToken as any).mockResolvedValue(null);

      const request = createMockRequest("/student/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login");
    });
  });

  describe("Security enforcement", () => {
    it("always requires authentication regardless of environment", async () => {
      (process.env as any).NODE_ENV = "development";
      process.env.ENABLE_AUTH_BYPASS = "true";
      (getToken as any).mockResolvedValue(null);

      const request = createMockRequest("/admin/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login");
    });

    it("does not bypass auth in production", async () => {
      (process.env as any).NODE_ENV = "production";
      process.env.ENABLE_AUTH_BYPASS = "true";
      (getToken as any).mockResolvedValue(null);

      const request = createMockRequest("/admin/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login");
    });
  });

  describe("Authenticated users", () => {
    it("redirects authenticated user from login to appropriate dashboard", async () => {
      (getToken as any).mockResolvedValue({ id: "test-admin", role: "ADMIN" });

      const request = createMockRequest("/auth/login");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin/dashboard");
    });

    it("redirects authenticated student from login to student dashboard", async () => {
      (getToken as any).mockResolvedValue({ id: "test-student", role: "STUDENT" });

      const request = createMockRequest("/auth/login");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/student/dashboard");
    });

    it("allows admin access to admin routes", async () => {
      (getToken as any).mockResolvedValue({ id: "test-admin", role: "ADMIN" });

      const request = createMockRequest("/admin/dashboard");
      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(307);
    });

    it("allows student access to student routes", async () => {
      (getToken as any).mockResolvedValue({ id: "test-student", role: "STUDENT" });

      const request = createMockRequest("/student/dashboard");
      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(307);
    });
  });

  describe("Role-based access control", () => {
    it("prevents student from accessing admin routes", async () => {
      (getToken as any).mockResolvedValue({ id: "test-student", role: "STUDENT" });

      const request = createMockRequest("/admin/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/student/dashboard");
    });

    it("prevents admin from accessing student routes", async () => {
      (getToken as any).mockResolvedValue({ id: "test-admin", role: "ADMIN" });

      const request = createMockRequest("/student/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin/dashboard");
    });

    it("handles coach role appropriately", async () => {
      (getToken as any).mockResolvedValue({ id: "test-coach", role: "COACH" });

      const request = createMockRequest("/admin/dashboard");
      const response = await middleware(request);

      // Invalid roles should redirect to login
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login");
    });
  });

  describe("Edge cases", () => {
    it("handles missing role in token", async () => {
      (getToken as any).mockResolvedValue({ id: "123" }); // No role

      const request = createMockRequest("/admin/dashboard");
      const response = await middleware(request);

      // Should redirect to login or handle gracefully
      expect(response.status).toBe(307);
    });

    it("handles malformed token", async () => {
      (getToken as any).mockResolvedValue("invalid-token");

      const request = createMockRequest("/admin/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      // Malformed token (string without id/role properties) should redirect to login
      expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login");
    });

    it("handles token verification error", async () => {
      (getToken as any).mockRejectedValue(new Error("Token verification failed"));

      const request = createMockRequest("/admin/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login");
    });
  });
});
