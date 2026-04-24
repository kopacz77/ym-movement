import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Resend so we can capture the HTML of every email the module tries to send.
// vi.hoisted runs before static imports, so by the time email.ts is evaluated
// RESEND_API_KEY is present and our Resend mock is wired in.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

vi.hoisted(() => {
  process.env.RESEND_API_KEY = "re_test_key";
});

// Imports must come after the hoisted env/mock setup above.
import { REGISTRATION_TOKEN_EXPIRY_HOURS } from "@/lib/auth-tokens";
import {
  resolveBaseUrl,
  sendApprovalEmail,
  sendCoachApprovalEmail,
  sendCoachInvitationEmail,
  sendInvitationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";

describe("resolveBaseUrl", () => {
  it("prefers NEXT_PUBLIC_BASE_URL above every other source", () => {
    expect(
      resolveBaseUrl({
        NEXT_PUBLIC_BASE_URL: "https://explicit.example.com",
        NEXTAUTH_URL: "https://next-auth.example.com",
      }),
    ).toBe("https://explicit.example.com");
  });

  it("falls back to NEXTAUTH_URL when NEXT_PUBLIC_BASE_URL is missing", () => {
    expect(resolveBaseUrl({ NEXTAUTH_URL: "https://fallback.example.com" })).toBe(
      "https://fallback.example.com",
    );
  });

  it("falls back to the canonical production URL when nothing is set", () => {
    expect(resolveBaseUrl({})).toBe("https://ym-movement.com");
  });

  it("ignores VERCEL_URL completely (regression: 2026-04-23 student-signup bug)", () => {
    // VERCEL_URL is a scheme-less preview hostname sitting behind Vercel's
    // deployment-auth wall. Using it produced broken, auth-gated email links.
    // Never put it back in the fallback chain.
    expect(resolveBaseUrl({ VERCEL_URL: "ym-movement-xyz.vercel.app" })).toBe(
      "https://ym-movement.com",
    );
  });

  it("ignores NETLIFY_URL for the same reason", () => {
    expect(resolveBaseUrl({ NETLIFY_URL: "something.netlify.app" })).toBe(
      "https://ym-movement.com",
    );
  });

  it("prepends https:// when the configured value has no scheme", () => {
    expect(resolveBaseUrl({ NEXT_PUBLIC_BASE_URL: "ym-movement.com" })).toBe(
      "https://ym-movement.com",
    );
  });

  it("preserves an explicit http:// scheme (for localhost dev)", () => {
    expect(resolveBaseUrl({ NEXT_PUBLIC_BASE_URL: "http://localhost:3100" })).toBe(
      "http://localhost:3100",
    );
  });

  it("strips trailing slashes so callers can safely append a path", () => {
    expect(resolveBaseUrl({ NEXT_PUBLIC_BASE_URL: "https://example.com/" })).toBe(
      "https://example.com",
    );
    expect(resolveBaseUrl({ NEXT_PUBLIC_BASE_URL: "https://example.com///" })).toBe(
      "https://example.com",
    );
  });

  it("treats empty and whitespace-only values as unset", () => {
    expect(
      resolveBaseUrl({
        NEXT_PUBLIC_BASE_URL: "",
        NEXTAUTH_URL: "https://fallback.example.com",
      }),
    ).toBe("https://fallback.example.com");
    expect(
      resolveBaseUrl({
        NEXT_PUBLIC_BASE_URL: "   ",
        NEXTAUTH_URL: "https://fallback.example.com",
      }),
    ).toBe("https://fallback.example.com");
  });

  it("never returns a scheme-less URL under any input", () => {
    // A scheme-less href in an HTML email is interpreted as a relative path by
    // email clients, which is exactly what broke registration links in prod.
    const inputs: Array<Partial<NodeJS.ProcessEnv>> = [
      {},
      { NEXT_PUBLIC_BASE_URL: "example.com" },
      { NEXTAUTH_URL: "example.com" },
      { VERCEL_URL: "preview.vercel.app" },
      { NETLIFY_URL: "preview.netlify.app" },
    ];
    for (const env of inputs) {
      expect(resolveBaseUrl(env)).toMatch(/^https?:\/\//);
    }
  });
});

describe("email templates reference the token expiry constant", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "test-id" }, error: null });
  });

  const captureHtml = async (fn: () => Promise<unknown>): Promise<string> => {
    await fn();
    expect(sendMock).toHaveBeenCalledOnce();
    return sendMock.mock.calls[0][0].html as string;
  };

  // The constant itself is the source of truth for the email copy. If someone
  // changes the constant without updating the templates (or vice versa), the
  // email will lie to users about how long they have. Lock them together.
  it("sendApprovalEmail mentions the exact expiry duration and no stale durations", async () => {
    const html = await captureHtml(() => sendApprovalEmail("s@example.com", "Student", "tok"));
    expect(html).toContain(`${REGISTRATION_TOKEN_EXPIRY_HOURS} hours`);
    expect(html).not.toMatch(/\bexpires in 1 hour\b/i);
  });

  it("sendCoachInvitationEmail mentions the exact expiry duration", async () => {
    const html = await captureHtml(() => sendCoachInvitationEmail("c@example.com", "Coach", "tok"));
    expect(html).toContain(`${REGISTRATION_TOKEN_EXPIRY_HOURS} hours`);
    expect(html).not.toMatch(/\bexpires in 1 hour\b/i);
  });

  it("sendCoachApprovalEmail mentions the exact expiry duration", async () => {
    const html = await captureHtml(() => sendCoachApprovalEmail("c@example.com", "Coach", "tok"));
    expect(html).toContain(`${REGISTRATION_TOKEN_EXPIRY_HOURS} hours`);
    expect(html).not.toMatch(/\bexpires in 1 hour\b/i);
  });

  it("sendInvitationEmail mentions the exact expiry duration", async () => {
    const html = await captureHtml(() => sendInvitationEmail("u@example.com", "User", "tok"));
    expect(html).toContain(`${REGISTRATION_TOKEN_EXPIRY_HOURS} hours`);
  });

  it("sendPasswordResetEmail mentions the exact expiry duration", async () => {
    const html = await captureHtml(() => sendPasswordResetEmail("u@example.com", "User", "tok"));
    expect(html).toContain(`${REGISTRATION_TOKEN_EXPIRY_HOURS} hours`);
  });
});

describe("email links are absolute and contain the expected token", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "test-id" }, error: null });
  });

  // Regression test for the class of bug that broke student signup on 2026-04-23:
  // a scheme-less BASE_URL silently produced relative <a href="..."> links that
  // email clients couldn't route anywhere useful.
  it("sendApprovalEmail builds an absolute https link carrying the token", async () => {
    await sendApprovalEmail("s@example.com", "Student", "abc123");
    const html = sendMock.mock.calls[0][0].html as string;
    const match = html.match(/href="([^"]*\/auth\/complete-registration[^"]*)"/);
    expect(match, "approval email must link to /auth/complete-registration").toBeTruthy();
    const href = match![1];
    expect(href, `href must have a scheme — got: ${href}`).toMatch(/^https?:\/\//);
    expect(href).toContain("token=abc123");
  });

  it("sendCoachInvitationEmail builds an absolute https link carrying the token", async () => {
    await sendCoachInvitationEmail("c@example.com", "Coach", "xyz789");
    const html = sendMock.mock.calls[0][0].html as string;
    const match = html.match(/href="([^"]*\/auth\/complete-registration[^"]*)"/);
    expect(match).toBeTruthy();
    const href = match![1];
    expect(href).toMatch(/^https?:\/\//);
    expect(href).toContain("token=xyz789");
  });
});
