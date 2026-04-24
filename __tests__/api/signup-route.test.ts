import { beforeEach, describe, expect, it, vi } from "vitest";

// Everything the signup route imports gets mocked. We exercise the POST handler
// end-to-end (rate-limiter → zod → prisma transaction → email fanout → response
// shape) so the key regression — silent welcome-email failure, which is the bug
// that hid Reina Lee's signup on 2026-04-23 — stays locked in.

const { mocks } = vi.hoisted(() => ({
  mocks: {
    sendWelcomeEmail: vi.fn(),
    sendAdminSignupNotification: vi.fn(),
    prismaUserFindUnique: vi.fn(),
    prismaQueryRaw: vi.fn(),
    prismaTransaction: vi.fn(),
    isAllowed: vi.fn(),
    markUsed: vi.fn(),
    isUsed: vi.fn(),
  },
}));

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: mocks.sendWelcomeEmail,
  sendAdminSignupNotification: mocks.sendAdminSignupNotification,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.prismaUserFindUnique },
    $queryRaw: mocks.prismaQueryRaw,
    $transaction: mocks.prismaTransaction,
  },
}));

vi.mock("@/lib/security", () => ({
  authRateLimiter: { isAllowed: mocks.isAllowed },
  getClientIP: () => "127.0.0.1",
  logSecurityEvent: vi.fn(),
  turnstileTokenTracker: {
    isUsed: mocks.isUsed,
    markUsed: mocks.markUsed,
  },
}));

vi.mock("@/lib/utils", () => ({
  formatEmail: (s: string) => s.trim().toLowerCase(),
  formatPhoneNumber: (s: string) => s,
  toProperCase: (s: string) => s,
}));

import { POST } from "@/app/api/auth/signup/route";

// Minimal NextRequest shim. The route uses `.headers`, `.json()`, and nothing
// else, so a plain Request satisfies the contract after a cast.
function makeRequest(body: unknown): Parameters<typeof POST>[0] {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

const VALID_SIGNUP = {
  name: "Reina Lee",
  email: "reina@example.com",
  phone: "555-123-4567",
  level: "PRE_PRELIMINARY",
  maxLessonsPerWeek: 3,
  parentConsent: false,
  // No turnstileToken — route skips the check when NODE_ENV !== "production".
};

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) m.mockReset();

    // Defaults: rate limiter lets through, no token replay, no existing user,
    // DB transaction returns a fresh user+student, both emails succeed.
    mocks.isAllowed.mockReturnValue(true);
    mocks.isUsed.mockReturnValue(false);
    mocks.markUsed.mockReturnValue(true);
    mocks.prismaUserFindUnique.mockResolvedValue(null);
    mocks.prismaQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mocks.prismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        user: {
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "user-1",
            ...data,
          })),
        },
        student: {
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
            id: "student-1",
            ...data,
          })),
        },
      };
      return fn(tx);
    });
    mocks.sendWelcomeEmail.mockResolvedValue({ id: "welcome-id" });
    mocks.sendAdminSignupNotification.mockResolvedValue({ sent: true });
  });

  it("returns 201 with welcomeEmailSent=true and adminNotified=true when both emails succeed", async () => {
    const res = await POST(makeRequest(VALID_SIGNUP));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.welcomeEmailSent).toBe(true);
    expect(body.welcomeEmailError).toBeNull();
    expect(body.adminNotified).toBe(true);
    expect(mocks.sendWelcomeEmail).toHaveBeenCalledWith("reina@example.com", "Reina Lee");
    expect(mocks.sendAdminSignupNotification).toHaveBeenCalledOnce();
  });

  it("still creates the user AND notifies admin when the welcome email fails", async () => {
    // The regression: pre-fix, this case silently returned 201 with no signal
    // that the student never got their confirmation. Now the response must
    // tell the client, and the admin must still be notified on a separate
    // code path so the failure doesn't disappear.
    mocks.sendWelcomeEmail.mockRejectedValueOnce(new Error("resend-429-rate-limited"));

    const res = await POST(makeRequest(VALID_SIGNUP));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.welcomeEmailSent).toBe(false);
    expect(body.welcomeEmailError).toContain("resend-429-rate-limited");
    expect(body.adminNotified).toBe(true);
    expect(mocks.prismaTransaction).toHaveBeenCalledOnce();
    expect(mocks.sendAdminSignupNotification).toHaveBeenCalledOnce();
  });

  it("returns adminNotified=false but still welcomeEmailSent=true when admin email fails", async () => {
    mocks.sendAdminSignupNotification.mockRejectedValueOnce(
      new Error("admin-smtp-down"),
    );

    const res = await POST(makeRequest(VALID_SIGNUP));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.welcomeEmailSent).toBe(true);
    expect(body.adminNotified).toBe(false);
  });

  it("treats 'no admin address configured' (sent:false) as adminNotified=false, not an error", async () => {
    mocks.sendAdminSignupNotification.mockResolvedValueOnce({
      sent: false,
      skippedReason: "not configured",
    });

    const res = await POST(makeRequest(VALID_SIGNUP));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.adminNotified).toBe(false);
    expect(body.welcomeEmailSent).toBe(true);
  });

  it("rejects duplicate emails with DUPLICATE_EMAIL code and an actionable message", async () => {
    // Reina would have hit this on her second attempt if her first signup
    // partially completed. The new message must point her at approvals /
    // support, not just say 'Email already in use'.
    mocks.prismaUserFindUnique.mockResolvedValueOnce({
      id: "existing",
      email: "reina@example.com",
    });

    const res = await POST(makeRequest(VALID_SIGNUP));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("DUPLICATE_EMAIL");
    expect(body.message).toMatch(/already registered/i);
    expect(body.message).toMatch(/info@ym-movement\.com/);
    expect(mocks.prismaTransaction).not.toHaveBeenCalled();
    expect(mocks.sendWelcomeEmail).not.toHaveBeenCalled();
  });
});
