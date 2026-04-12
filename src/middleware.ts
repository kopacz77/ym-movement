import { type NextRequest, NextResponse } from "next/server";

// Cookie name used by next-auth v5 over HTTPS
const SESSION_COOKIE = "__Secure-authjs.session-token";
const SESSION_COOKIE_HTTP = "authjs.session-token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/coach");

  if (!isProtected) return NextResponse.next();

  // Check for session cookie existence only. Role-based access control
  // is enforced by server components (auth()) and the TRPC layer.
  // We avoid getToken() here because JWE decryption is incompatible
  // with Edge Runtime in next-auth v5 beta.
  const hasSession =
    req.cookies.has(SESSION_COOKIE) || req.cookies.has(SESSION_COOKIE_HTTP);

  if (!hasSession) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/coach/:path*"],
};
