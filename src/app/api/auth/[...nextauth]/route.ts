import { type NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { authRateLimiter, logSecurityEvent } from "@/lib/security";

const handler = NextAuth(authOptions);

// Wrap POST requests (which include signin) with rate limiting
// biome-ignore lint/suspicious/noExplicitAny: NextAuth context type is not exported
export async function POST(req: NextRequest, context: any) {
  // Rate limiting for authentication requests
  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  // Check if this is a signin request
  const url = new URL(req.url);
  if (url.pathname.includes("signin")) {
    if (!authRateLimiter.isAllowed(clientIP)) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        endpoint: "/api/auth/signin",
        ip: clientIP,
      });
      return NextResponse.json(
        { error: "Too many authentication attempts. Please try again later." },
        { status: 429 },
      );
    }
  }

  return handler(req, context);
}

export { handler as GET };
