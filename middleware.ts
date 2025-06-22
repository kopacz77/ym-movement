// Updated middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Add environment variable control without breaking development flow

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if the path is a public route
  const isPublicPath =
    path === "/" ||
    path === "/auth/login" ||
    path === "/auth/signup" ||
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
    console.error("Token verification failed:", error instanceof Error ? error.message : "Unknown error");
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
  if (isAuthenticated && isPublicPath && path !== "/") {
    // Redirect to the appropriate dashboard based on role
    const role = token.role as string;
    const redirectPath =
      role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard";
    const dashboardUrl = new URL(redirectPath, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Handle role-based access for admin and student routes
  if (isAuthenticated && token) {
    const role = token.role as string;

    // Validate role is one of expected values
    if (!["ADMIN", "STUDENT"].includes(role)) {
      console.error(`Invalid role detected: ${role} for user ${token.id}`);
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Prevent students from accessing admin routes
    if (path.startsWith("/admin") && role !== "ADMIN") {
      console.warn(`Student ${token.id} attempted to access admin route: ${path}`);
      const studentDashboard = new URL("/student/dashboard", request.url);
      return NextResponse.redirect(studentDashboard);
    }

    // Prevent admins from accessing student routes
    if (path.startsWith("/student") && role !== "STUDENT") {
      console.warn(`Admin ${token.id} attempted to access student route: ${path}`);
      const adminDashboard = new URL("/admin/dashboard", request.url);
      return NextResponse.redirect(adminDashboard);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files, api routes that are not auth
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
