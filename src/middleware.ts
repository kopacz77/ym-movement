import { auth } from "@/lib/auth";

const PROTECTED_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN", "SUPER_ADMIN"],
  "/student": ["STUDENT"],
  "/coach": ["COACH", "ADMIN", "SUPER_ADMIN"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const matchedPrefix = Object.keys(PROTECTED_ROUTES).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!matchedPrefix) return;

  const session = req.auth;

  if (!session?.user) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  const allowedRoles = PROTECTED_ROUTES[matchedPrefix];
  const userRole = (session.user as any).role as string | undefined;

  // If role is missing from token (stale session), allow through and let
  // the TRPC/API layer handle authorization. This prevents blocking users
  // who have valid sessions from before the role field was added to JWT.
  if (userRole && !allowedRoles.includes(userRole)) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("error", "AccessDenied");
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/coach/:path*"],
};
