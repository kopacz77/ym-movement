import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const LOGIN_URL = "/auth/login";

const PROTECTED_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN", "SUPER_ADMIN"],
  "/student": ["STUDENT"],
  "/coach": ["COACH", "ADMIN", "SUPER_ADMIN"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const matchedPrefix = Object.keys(PROTECTED_ROUTES).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!matchedPrefix) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL(LOGIN_URL, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const allowedRoles = PROTECTED_ROUTES[matchedPrefix];
  const userRole = token.role as string | undefined;

  // If role is missing from token (stale session), allow through and let
  // the TRPC/API layer handle authorization. This prevents blocking users
  // who have valid sessions from before the role field was added to JWT.
  if (userRole && !allowedRoles.includes(userRole)) {
    const loginUrl = new URL(LOGIN_URL, request.url);
    loginUrl.searchParams.set("error", "AccessDenied");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/coach/:path*"],
};
