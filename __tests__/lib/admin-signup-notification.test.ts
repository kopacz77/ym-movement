import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture the HTML of every email the module tries to send (mirrors the
// approach used in __tests__/lib/email-base-url.test.ts).
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

vi.hoisted(() => {
  process.env.RESEND_API_KEY = "re_test_key";
  // Clean slate: tests that care about these vars set them explicitly.
  delete process.env.ADMIN_NOTIFICATION_EMAIL;
  delete process.env.INSTRUCTOR_EMAIL;
});

import { sendAdminSignupNotification } from "@/lib/email";

describe("sendAdminSignupNotification", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "test-id" }, error: null });
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    delete process.env.INSTRUCTOR_EMAIL;
  });

  it("sends to ADMIN_NOTIFICATION_EMAIL when set", async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = "alerts@example.com";

    const result = await sendAdminSignupNotification({
      name: "Reina Lee",
      email: "reina@example.com",
      level: "PRE_PRELIMINARY",
    });

    expect(result).toEqual({ sent: true });
    expect(sendMock).toHaveBeenCalledOnce();
    const args = sendMock.mock.calls[0][0];
    expect(args.to).toBe("alerts@example.com");
    expect(args.subject).toContain("Reina Lee");
    expect(args.html).toContain("reina@example.com");
    expect(args.html).toContain("PRE PRELIMINARY");
  });

  it("falls back to INSTRUCTOR_EMAIL when ADMIN_NOTIFICATION_EMAIL is unset", async () => {
    process.env.INSTRUCTOR_EMAIL = "yura@example.com";

    const result = await sendAdminSignupNotification({
      name: "Student",
      email: "student@example.com",
      level: "JUVENILE",
    });

    expect(result).toEqual({ sent: true });
    expect(sendMock.mock.calls[0][0].to).toBe("yura@example.com");
  });

  it("returns sent:false (does NOT throw) when neither env var is set", async () => {
    // Sign-up must keep working in dev / misconfigured environments. A missing
    // admin email is not a blocking error — we log it and move on.
    const result = await sendAdminSignupNotification({
      name: "Student",
      email: "student@example.com",
      level: "JUVENILE",
    });

    expect(result.sent).toBe(false);
    expect(result.skippedReason).toMatch(/not configured/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("includes a link to the admin pending-approvals page built from resolveBaseUrl", async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = "alerts@example.com";
    // No NEXT_PUBLIC_BASE_URL / NEXTAUTH_URL set — should fall back to the
    // canonical production URL via resolveBaseUrl.
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.NEXTAUTH_URL;

    await sendAdminSignupNotification({
      name: "Student",
      email: "student@example.com",
      level: "NOVICE",
    });

    const html = sendMock.mock.calls[0][0].html as string;
    expect(html).toContain("https://ym-movement.com/admin/pending-approvals");
  });

  it("includes phone in the admin email when provided, omits the row when not", async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = "alerts@example.com";

    await sendAdminSignupNotification({
      name: "With Phone",
      email: "phone@example.com",
      level: "JUVENILE",
      phone: "(555) 123-4567",
    });
    expect(sendMock.mock.calls[0][0].html).toContain("(555) 123-4567");

    sendMock.mockClear();
    await sendAdminSignupNotification({
      name: "No Phone",
      email: "nophone@example.com",
      level: "JUVENILE",
    });
    expect(sendMock.mock.calls[0][0].html).not.toMatch(/<strong>Phone:<\/strong>/);
  });

  it("propagates sendEmail errors so the caller can track them", async () => {
    // The signup route uses Promise.allSettled, so this function is free to
    // throw — the caller will record it as a rejected result and still create
    // the user record.
    process.env.ADMIN_NOTIFICATION_EMAIL = "alerts@example.com";
    sendMock.mockRejectedValueOnce({ message: "resend-api-down" });

    await expect(
      sendAdminSignupNotification({
        name: "Student",
        email: "student@example.com",
        level: "JUVENILE",
      }),
    ).rejects.toThrow(/resend-api-down/);
  });
});
