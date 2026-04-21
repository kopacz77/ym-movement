"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ArrowLeftRight, getNavigationForRole, LogOut } from "@/lib/navigation-config";

interface AppSidebarProps {
  role: "admin" | "student" | "coach";
  coachId?: string;
  isAdmin?: boolean;
}

export function AppSidebar({ role, coachId, isAdmin }: AppSidebarProps) {
  const pathname = usePathname() ?? "";
  const navigation = getNavigationForRole(role);

  const SidebarContent = (
    <>
      {/* Header */}
      <div className="h-24 px-6 border-b flex items-center bg-white">
        <div className="flex flex-col items-center gap-1 w-full">
          <Image
            src="/ym-logo-full.svg"
            alt="YM Movement"
            width={160}
            height={96}
            className="h-14 w-auto"
          />
          <span className="text-xs text-muted-foreground">
            {role === "admin"
              ? "Admin Dashboard"
              : role === "coach"
                ? "Coach Portal"
                : "Student Portal"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-4 bg-white flex flex-col">
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

        {/* Role Switch Link */}
        {role === "admin" && coachId && (
          <div className="mt-auto pt-4 border-t border-gray-200">
            <Link
              href="/coach/dashboard"
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
            >
              <ArrowLeftRight className="h-5 w-5 shrink-0" />
              <span>Coach View</span>
            </Link>
          </div>
        )}
        {role === "coach" && isAdmin && (
          <div className="mt-auto pt-4 border-t border-gray-200">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
            >
              <ArrowLeftRight className="h-5 w-5 shrink-0" />
              <span>Admin View</span>
            </Link>
          </div>
        )}
        {/* Sign Out */}
        <div
          className={`${!(role === "admin" && coachId) && !(role === "coach" && isAdmin) ? "mt-auto" : ""} pt-4 border-t border-gray-200`}
        >
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200 w-full"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
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
