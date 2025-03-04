// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Add environment variable control without breaking development flow
const bypassAuthInDev = process.env.NODE_ENV === 'development' && process.env.ENABLE_AUTH_BYPASS === 'true';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check if the path is a public route
  const isPublicPath = path === "/" || 
                      path === "/auth/login" || 
                      path === "/auth/signup" || 
                      path.startsWith("/api/auth");

  // Get the token and check if the user is authenticated
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  const isAuthenticated = !!token;

  // Redirect unauthenticated users to login
  if (!isPublicPath && !isAuthenticated) {
    // Development bypass option for easier testing
    if (bypassAuthInDev) {
      console.warn('⚠️ Authentication bypassed in development mode. Set ENABLE_AUTH_BYPASS=false to test auth flow.');
      return NextResponse.next();
    }
    
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Redirect authenticated users away from login/signup pages
  if (isAuthenticated && isPublicPath && path !== "/") {
    // Redirect to the appropriate dashboard based on role
    const role = token.role as string;
    const redirectPath = role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // Handle role-based access for admin and student routes
  if (isAuthenticated) {
    const role = token.role as string;
    
    // Prevent students from accessing admin routes
    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
    
    // Prevent admins from accessing student routes
    if (path.startsWith("/student") && role !== "STUDENT") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
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