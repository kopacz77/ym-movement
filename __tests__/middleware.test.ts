import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module before importing middleware
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Import after mocking
import { auth } from "@/lib/auth";

// The middleware is the default export from src/middleware.ts
// In v5, auth() wraps our callback. We need to test the behavior
// by invoking the middleware directly.
import middleware from "../src/middleware";

// Helper to create mock request with nextUrl and url
const createMockRequest = (url: string) => {
  const fullUrl = new URL(url, "http://localhost:3000");
  return new Request(fullUrl.toString(), {
    headers: new Headers(),
  });
};

describe("Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.ENABLE_AUTH_BYPASS;
    (process.env as any).NODE_ENV = "test";
  });

  // Note: In v5, the middleware is wrapped by auth() which handles
  // session injection via req.auth. We mock auth() to return a
  // middleware function that simulates the v5 behavior.

  describe("Protected routes - unauthenticated", () => {
    it("redirects unauthenticated user from admin route to login", async () => {
      // Configure auth mock to simulate unauthenticated middleware
      (auth as any).mockImplementation((cb: any) => {
        return async (req: any) => {
          // Simulate v5 auth wrapper: no session
          const nextUrl = new URL(req.url);
          const mockReq = {
            ...req,
            nextUrl,
            url: req.url,
            auth: null,
          };
          return cb(mockReq);
        };
      });

      // Re-import to pick up new mock
      vi.resetModules();
      vi.doMock("@/lib/auth", () => ({
        auth: (auth as any),
      }));
      const { default: mw } = await import("../src/middleware");

      const request = createMockRequest("/admin/dashboard");
      const response = await (mw as any)(request);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("/auth/login");
      expect(location).toContain("callbackUrl");
    });

    it("redirects unauthenticated user from student route to login", async () => {
      (auth as any).mockImplementation((cb: any) => {
        return async (req: any) => {
          const nextUrl = new URL(req.url);
          const mockReq = {
            ...req,
            nextUrl,
            url: req.url,
            auth: null,
          };
          return cb(mockReq);
        };
      });

      vi.resetModules();
      vi.doMock("@/lib/auth", () => ({
        auth: (auth as any),
      }));
      const { default: mw } = await import("../src/middleware");

      const request = createMockRequest("/student/dashboard");
      const response = await (mw as any)(request);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("/auth/login");
    });
  });

  describe("Role-based access control", () => {
    it("allows admin access to admin routes", async () => {
      (auth as any).mockImplementation((cb: any) => {
        return async (req: any) => {
          const nextUrl = new URL(req.url);
          const mockReq = {
            ...req,
            nextUrl,
            url: req.url,
            auth: { user: { id: "test-admin", role: "ADMIN" } },
          };
          return cb(mockReq);
        };
      });

      vi.resetModules();
      vi.doMock("@/lib/auth", () => ({
        auth: (auth as any),
      }));
      const { default: mw } = await import("../src/middleware");

      const request = createMockRequest("/admin/dashboard");
      const response = await (mw as any)(request);

      // Should return undefined (pass through) for allowed access
      expect(response).toBeUndefined();
    });

    it("allows student access to student routes", async () => {
      (auth as any).mockImplementation((cb: any) => {
        return async (req: any) => {
          const nextUrl = new URL(req.url);
          const mockReq = {
            ...req,
            nextUrl,
            url: req.url,
            auth: { user: { id: "test-student", role: "STUDENT" } },
          };
          return cb(mockReq);
        };
      });

      vi.resetModules();
      vi.doMock("@/lib/auth", () => ({
        auth: (auth as any),
      }));
      const { default: mw } = await import("../src/middleware");

      const request = createMockRequest("/student/dashboard");
      const response = await (mw as any)(request);

      expect(response).toBeUndefined();
    });

    it("prevents student from accessing admin routes", async () => {
      (auth as any).mockImplementation((cb: any) => {
        return async (req: any) => {
          const nextUrl = new URL(req.url);
          const mockReq = {
            ...req,
            nextUrl,
            url: req.url,
            auth: { user: { id: "test-student", role: "STUDENT" } },
          };
          return cb(mockReq);
        };
      });

      vi.resetModules();
      vi.doMock("@/lib/auth", () => ({
        auth: (auth as any),
      }));
      const { default: mw } = await import("../src/middleware");

      const request = createMockRequest("/admin/dashboard");
      const response = await (mw as any)(request);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("/auth/login");
      expect(location).toContain("AccessDenied");
    });

    it("prevents admin from accessing student routes", async () => {
      (auth as any).mockImplementation((cb: any) => {
        return async (req: any) => {
          const nextUrl = new URL(req.url);
          const mockReq = {
            ...req,
            nextUrl,
            url: req.url,
            auth: { user: { id: "test-admin", role: "ADMIN" } },
          };
          return cb(mockReq);
        };
      });

      vi.resetModules();
      vi.doMock("@/lib/auth", () => ({
        auth: (auth as any),
      }));
      const { default: mw } = await import("../src/middleware");

      const request = createMockRequest("/student/dashboard");
      const response = await (mw as any)(request);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("/auth/login");
      expect(location).toContain("AccessDenied");
    });

    it("allows SUPER_ADMIN access to admin routes", async () => {
      (auth as any).mockImplementation((cb: any) => {
        return async (req: any) => {
          const nextUrl = new URL(req.url);
          const mockReq = {
            ...req,
            nextUrl,
            url: req.url,
            auth: { user: { id: "test-superadmin", role: "SUPER_ADMIN" } },
          };
          return cb(mockReq);
        };
      });

      vi.resetModules();
      vi.doMock("@/lib/auth", () => ({
        auth: (auth as any),
      }));
      const { default: mw } = await import("../src/middleware");

      const request = createMockRequest("/admin/dashboard");
      const response = await (mw as any)(request);

      expect(response).toBeUndefined();
    });
  });

  describe("Public routes", () => {
    it("allows access to non-protected routes", async () => {
      (auth as any).mockImplementation((cb: any) => {
        return async (req: any) => {
          const nextUrl = new URL(req.url);
          const mockReq = {
            ...req,
            nextUrl,
            url: req.url,
            auth: null,
          };
          return cb(mockReq);
        };
      });

      vi.resetModules();
      vi.doMock("@/lib/auth", () => ({
        auth: (auth as any),
      }));
      const { default: mw } = await import("../src/middleware");

      const request = createMockRequest("/");
      const response = await (mw as any)(request);

      // Non-protected routes return undefined (pass through)
      expect(response).toBeUndefined();
    });

    it("allows access to auth pages", async () => {
      (auth as any).mockImplementation((cb: any) => {
        return async (req: any) => {
          const nextUrl = new URL(req.url);
          const mockReq = {
            ...req,
            nextUrl,
            url: req.url,
            auth: null,
          };
          return cb(mockReq);
        };
      });

      vi.resetModules();
      vi.doMock("@/lib/auth", () => ({
        auth: (auth as any),
      }));
      const { default: mw } = await import("../src/middleware");

      const request = createMockRequest("/auth/login");
      const response = await (mw as any)(request);

      expect(response).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("handles missing role in session gracefully", async () => {
      (auth as any).mockImplementation((cb: any) => {
        return async (req: any) => {
          const nextUrl = new URL(req.url);
          const mockReq = {
            ...req,
            nextUrl,
            url: req.url,
            auth: { user: { id: "123" } }, // No role
          };
          return cb(mockReq);
        };
      });

      vi.resetModules();
      vi.doMock("@/lib/auth", () => ({
        auth: (auth as any),
      }));
      const { default: mw } = await import("../src/middleware");

      const request = createMockRequest("/admin/dashboard");
      const response = await (mw as any)(request);

      // Missing role should pass through (deferred to TRPC layer)
      expect(response).toBeUndefined();
    });
  });
});
