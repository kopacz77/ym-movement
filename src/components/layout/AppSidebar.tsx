"use client";

import {
  BarChart2,
  BookOpen,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Settings,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Navigation configurations for each role
const adminNavigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Schedule", href: "/admin/schedule", icon: Calendar },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Coaches", href: "/admin/coaches", icon: GraduationCap },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Reports", href: "/admin/reports", icon: BarChart2 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
  { name: "Guide", href: "/admin/guide", icon: BookOpen },
];

const studentNavigation = [
  { name: "Dashboard", href: "/student/dashboard", icon: Clock },
  { name: "Book Lessons", href: "/student/book", icon: Calendar },
  { name: "My Schedule", href: "/student/schedule", icon: Calendar },
  { name: "Payments", href: "/student/payments", icon: CreditCard },
  { name: "Policies", href: "/student/policies", icon: FileText },
  { name: "Profile", href: "/student/profile", icon: User },
  { name: "Settings", href: "/student/settings", icon: Settings },
  { name: "Guide", href: "/student/guide", icon: BookOpen },
];

const coachNavigation = [
  { name: "Dashboard", href: "/coach/dashboard", icon: LayoutDashboard },
  { name: "Schedule", href: "/coach/schedule", icon: Calendar },
  { name: "Students", href: "/coach/students", icon: Users },
  { name: "Earnings", href: "/coach/earnings", icon: CreditCard },
  { name: "Proposals", href: "/coach/proposals", icon: Clock },
  { name: "Profile", href: "/coach/profile", icon: User },
];

interface AppSidebarProps {
  role: "admin" | "student" | "coach";
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname() ?? "";
  const navigation =
    role === "admin" ? adminNavigation : role === "coach" ? coachNavigation : studentNavigation;

  const SidebarContent = (
    <>
      {/* Header */}
      <div className="h-24 px-6 border-b flex items-center bg-white">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-lg">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl text-foreground">YM Movement</span>
            <span className="text-xs text-muted-foreground">
              {role === "admin"
                ? "Admin Dashboard"
                : role === "coach"
                  ? "Coach Portal"
                  : "Student Portal"}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-4 bg-white">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );

  // For desktop: return simple div with beautiful fixed layout
  // For mobile: return the Radix sidebar components
  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
      {SidebarContent}
    </div>
  );
}
