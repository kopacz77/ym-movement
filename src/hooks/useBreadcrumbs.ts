"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();

  return useMemo(() => {
    if (!pathname) return [];

    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with role-based root
    if (segments[0] === "admin") {
      breadcrumbs.push({ label: "Admin", href: "/admin/dashboard" });
    } else if (segments[0] === "student") {
      breadcrumbs.push({ label: "Student", href: "/student/dashboard" });
    }

    // Map route segments to breadcrumb labels
    const routeMap: Record<string, string> = {
      // Admin routes
      dashboard: "Dashboard",
      schedule: "Schedule",
      students: "Students",
      payments: "Payments",
      reports: "Reports",
      settings: "Settings",
      skills: "Skills",

      // Student routes
      book: "Book Lessons",
      profile: "Profile",

      // Common
      login: "Login",
      signup: "Sign Up",
      "forgot-password": "Forgot Password",
      "reset-password": "Reset Password",
    };

    // Build breadcrumbs from segments
    let currentPath = "";
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;

      // Skip the role segment since we already added it
      if (i === 0 && (segment === "admin" || segment === "student")) {
        continue;
      }

      const label = routeMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

      // Last segment shouldn't have href (current page)
      if (i === segments.length - 1) {
        breadcrumbs.push({ label });
      } else {
        breadcrumbs.push({ label, href: currentPath });
      }
    }

    return breadcrumbs;
  }, [pathname]);
}
