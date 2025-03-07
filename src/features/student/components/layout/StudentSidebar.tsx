// src/features/student/components/layout/StudentSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Calendar, Clock, CreditCard, Settings, User } from "lucide-react";

const navigation = [
  { name: 'Dashboard', href: '/student/dashboard', icon: Clock },
  { name: 'Book Lessons', href: '/student/book', icon: Calendar },
  { name: 'My Schedule', href: '/student/schedule', icon: Calendar },
  { name: 'Payments', href: '/student/payments', icon: CreditCard },
  { name: 'Profile', href: '/student/profile', icon: User },
  { name: 'Settings', href: '/student/settings', icon: Settings },
];

export const StudentSidebar = () => {
  // Using React 19 compatible hooks
  const pathname = usePathname() ?? '';

  return (
    <div className="w-64 bg-white border-r h-full overflow-y-auto">
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
                isActive ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
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