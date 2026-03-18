// Next.js 16 proxy.ts (migrated from middleware.ts)

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Add environment variable control without breaking development flow

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Enforce HTTPS in production
  if (
    process.env.NODE_ENV === "production" &&
    request.headers.get("x-forwarded-proto") !== "https"
  ) {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 301);
  }

  // Immediately skip processing for static assets and API routes
  if (path.startsWith("/_next/") || path.startsWith("/api/") || path.includes(".")) {
    return NextResponse.next();
  }

  // Check if the path is a public route
  const isPublicPath =
    path === "/" ||
    path === "/auth/login" ||
    path === "/auth/signup" ||
    path === "/auth/coach-signup" ||
    path === "/auth/forgot-password" ||
    path === "/auth/reset-password" ||
    path.startsWith("/api/auth");

  // Get the token and check if the user is authenticated
  let token;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch (error) {
    // Log token verification errors for security monitoring
    console.error(
      "Token verification failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    token = null;
  }

  const isAuthenticated = !!token && token.id && token.role;

  // Redirect unauthenticated users to login
  if (!isPublicPath && !isAuthenticated) {
    // REMOVED: Development bypass for security
    // All environments must properly authenticate

    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/signup pages
  // But allow access to forgot/reset-password even when logged in
  if (
    isAuthenticated &&
    isPublicPath &&
    path !== "/" &&
    path !== "/auth/forgot-password" &&
    path !== "/auth/reset-password"
  ) {
    // Redirect to the appropriate dashboard based on role
    const role = token?.role as string;
    const redirectPath =
      role === "ADMIN" || role === "SUPER_ADMIN"
        ? "/admin/dashboard"
        : role === "COACH"
          ? "/coach/dashboard"
          : "/student/dashboard";
    const dashboardUrl = new URL(redirectPath, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Handle role-based access for admin and student routes
  if (isAuthenticated && token) {
    const role = token?.role as string;

    // Validate role is one of expected values
    if (!["ADMIN", "SUPER_ADMIN", "COACH", "STUDENT"].includes(role)) {
      console.error(`Invalid role detected: ${role} for user ${token.id}`);
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Prevent unauthorized access to admin routes
    if (path.startsWith("/admin") && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      console.warn(`User ${token.id} (role: ${role}) attempted to access admin route: ${path}`);
      const dashboard = new URL(
        role === "COACH" ? "/coach/dashboard" : "/student/dashboard",
        request.url,
      );
      return NextResponse.redirect(dashboard);
    }

    // Prevent unauthorized access to coach routes (SUPER_ADMIN can access coach routes too)
    if (
      path.startsWith("/coach") &&
      role !== "COACH" &&
      role !== "SUPER_ADMIN" &&
      role !== "ADMIN"
    ) {
      console.warn(`User ${token.id} (role: ${role}) attempted to access coach route: ${path}`);
      const dashboard = new URL("/student/dashboard", request.url);
      return NextResponse.redirect(dashboard);
    }

    // Prevent non-students from accessing student routes
    if (path.startsWith("/student") && role !== "STUDENT") {
      console.warn(`User ${token.id} (role: ${role}) attempted to access student route: ${path}`);
      const dashboard = new URL(
        role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin/dashboard" : "/coach/dashboard",
        request.url,
      );
      return NextResponse.redirect(dashboard);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match specific routes, completely avoiding static assets
    "/",
    "/admin/:path*",
    "/coach/:path*",
    "/student/:path*",
    "/auth/:path*",
    "/terms",
    "/privacy",
  ],
};
