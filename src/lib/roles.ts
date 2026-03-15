/**
 * Centralized role helper utility
 *
 * Provides role hierarchy checks and dashboard routing for the multi-role system.
 * Used by TRPC middleware, auth callbacks, and UI components.
 *
 * Role hierarchy:
 *   SUPER_ADMIN > ADMIN > COACH > STUDENT
 */

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "COACH" | "STUDENT";

/**
 * Check if a role has admin-level access (ADMIN or SUPER_ADMIN).
 * Used in TRPC adminProcedure middleware to accept both roles.
 */
export function isAdminRole(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/**
 * Check if a role has coach-level access (COACH, ADMIN, or SUPER_ADMIN).
 * Admin roles implicitly have coach access in the role hierarchy.
 */
export function isCoachRole(role: string): boolean {
  return role === "COACH" || role === "ADMIN" || role === "SUPER_ADMIN";
}

/**
 * Return the appropriate dashboard path for a given role.
 * Used for post-login redirects and navigation.
 */
export function dashboardForRole(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return "/admin/dashboard";
    case "COACH":
      return "/coach/dashboard";
    case "STUDENT":
      return "/student/dashboard";
    default:
      return "/auth/login";
  }
}
