"use client";

import { Plus } from "lucide-react";
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
      <div className="h-24 px-6 border-b border-white/10 flex items-center">
        <div className="flex flex-col items-center gap-1 w-full">
          <Image
            src="/ym-logo-full.svg"
            alt="YM Movement"
            width={160}
            height={96}
            className="h-14 w-auto brightness-0 invert"
          />
          <span className="text-xs text-white/50">
            {role === "admin"
              ? "Elite Coaching Platform"
              : role === "coach"
                ? "Coach Portal"
                : "Student Portal"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-4 flex flex-col">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "border-l-[3px] border-cyan-500 bg-white/10 text-white font-semibold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* New Session Button */}
        {(role === "admin" || role === "coach") && (
          <div className="mt-auto pt-4">
            <Link
              href={role === "admin" ? "/admin/schedule" : "/coach/schedule"}
              className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-500 text-white rounded-lg font-medium hover:scale-[1.02] transition-transform duration-200 shadow-md"
            >
              <Plus className="h-5 w-5" />
              <span>New Session</span>
            </Link>
          </div>
        )}

        {/* Role Switch Link */}
        {role === "admin" && coachId && (
          <div className="pt-4 border-t border-white/10">
            <Link
              href="/coach/dashboard"
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <ArrowLeftRight className="h-5 w-5 shrink-0" />
              <span>Coach View</span>
            </Link>
          </div>
        )}
        {role === "coach" && isAdmin && (
          <div className="pt-4 border-t border-white/10">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <ArrowLeftRight className="h-5 w-5 shrink-0" />
              <span>Admin View</span>
            </Link>
          </div>
        )}
        {/* Sign Out */}
        <div className={`${role === "student" ? "mt-auto" : ""} pt-4 border-t border-white/10`}>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-white/60 hover:bg-white/10 hover:text-red-400 transition-all duration-200 w-full"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="w-full h-full bg-slate-900 border-r border-white/10 flex flex-col shadow-2xl shadow-black/50">
      {SidebarContent}
    </div>
  );
}
