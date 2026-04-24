import { describe, expect, it, vi } from "vitest";

// Mock prisma so createPasswordResetToken can run without a database connection.
// vi.hoisted makes the spies available to both the mock factory and the tests.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    passwordResetToken: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Email module is side-effect-heavy at import time; mock it away entirely so
// auth-tokens tests don't care about Resend/env.
vi.mock("@/lib/email", () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue({ id: "test" }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ id: "test" }),
}));

import { createPasswordResetToken, REGISTRATION_TOKEN_EXPIRY_HOURS } from "@/lib/auth-tokens";

describe("REGISTRATION_TOKEN_EXPIRY_HOURS", () => {
  // This constant is the single source of truth for both the DB expiry (see
  // createPasswordResetToken below) and the "expires in X hours" text in every
  // registration-related email template. Changing one without updating the
  // other has already shipped a broken user-facing promise once — don't do it
  // again. The matching email-template test lives at
  // __tests__/lib/email-base-url.test.ts.
  it("is long enough for a realistic approve-to-click window", () => {
    expect(REGISTRATION_TOKEN_EXPIRY_HOURS).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(REGISTRATION_TOKEN_EXPIRY_HOURS)).toBe(true);
  });

  it("is currently set to 24 hours", () => {
    // Guard against an accidental revert to the old 1-hour value that caused
    // student-approval emails to expire before users could act on them.
    expect(REGISTRATION_TOKEN_EXPIRY_HOURS).toBe(24);
  });
});

describe("createPasswordResetToken", () => {
  it("stores an expiry REGISTRATION_TOKEN_EXPIRY_HOURS from now", async () => {
    prismaMock.passwordResetToken.create.mockImplementation(async ({ data }) => data);

    const before = Date.now();
    await createPasswordResetToken("user-1", "u@example.com", "User", false, false);
    const after = Date.now();

    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledOnce();
    const createdExpires = (
      prismaMock.passwordResetToken.create.mock.calls[0][0].data as { expires: Date }
    ).expires.getTime();

    const hour = 60 * 60 * 1000;
    // The expiry should sit within [before + Nh, after + Nh], with a small
    // buffer to absorb clock jitter between `before` and the addHours call.
    expect(createdExpires).toBeGreaterThanOrEqual(
      before + REGISTRATION_TOKEN_EXPIRY_HOURS * hour - 1000,
    );
    expect(createdExpires).toBeLessThanOrEqual(
      after + REGISTRATION_TOKEN_EXPIRY_HOURS * hour + 1000,
    );
  });
});
