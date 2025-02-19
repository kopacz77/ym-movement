// middleware.ts
/**
 * DEVELOPMENT ONLY MIDDLEWARE
 *
 * This is a temporary middleware setup to facilitate rapid development
 * of core features without authentication overhead. This should NOT be
 * used in production.
 *
 * TODO: Before production deployment, this needs to be replaced with proper authentication:
 * - Implement NextAuth with proper session management
 * - Add role-based access control (RBAC)
 * - Secure all admin routes
 * - Add proper error handling for unauthorized access
 * - Implement proper JWT token validation
 * - Add rate limiting and security headers
 *
 * WARNING: Current setup bypasses all security checks for development speed.
 * This is acceptable for local development but must be replaced before
 * deploying to any public environment.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Development-only bypass of authentication
  // This allows us to:
  // 1. Develop and test features without auth overhead
  // 2. Access all API endpoints freely during development
  // 3. Focus on core functionality before implementing security
  return NextResponse.next();
}

// Route matchers
// These will be important when we implement proper auth later
// Currently marking which routes will need protection in production
export const config = {
  matcher: [
    // Admin routes that will need protection
    "/admin/:path*",
    // API routes that will need protection
    "/api/trpc/:path*",
  ],
};