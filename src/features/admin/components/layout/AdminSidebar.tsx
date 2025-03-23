// src/features/admin/components/layout/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Calendar, Users, CreditCard, Settings, BarChart2 } from "lucide-react";
import { useIsMobile } from "@/hooks/useMediaQuery";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Schedule", href: "/admin/schedule", icon: Calendar },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Reports", href: "/admin/reports", icon: BarChart2 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export const AdminSidebar = () => {
  const isMobile = useIsMobile();

  // Added null coalescing operator for React 19 compatibility
  const pathname = usePathname() ?? "";

  // For mobile, we won't show the sidebar at all
  if (isMobile) {
    return null;
  }

  return (
    <div className="sticky top-16 h-[calc(100vh-4rem)] z-40 w-64 bg-white border-r overflow-y-auto">
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
