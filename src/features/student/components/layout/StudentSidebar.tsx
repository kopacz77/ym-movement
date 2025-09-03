// src/features/student/components/layout/StudentSidebar.tsx
"use client";

import { Calendar, Clock, CreditCard, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/student/dashboard", icon: Clock },
  { name: "Book Lessons", href: "/student/book", icon: Calendar },
  { name: "My Schedule", href: "/student/schedule", icon: Calendar },
  { name: "Payments", href: "/student/payments", icon: CreditCard },
  { name: "Profile", href: "/student/profile", icon: User },
  { name: "Settings", href: "/student/settings", icon: Settings },
];

export function StudentSidebar() {
  const isMobile = useIsMobile();
  const { isApproved } = useCurrentUser();

  // Using React 19 compatible hooks
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
          const isBookingItem = item.href === "/student/book";
          const isDisabled = isBookingItem && !isApproved;

          return (
            <Link
              key={item.name}
              href={isDisabled ? "#" : item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isDisabled 
                  ? "text-zinc-400 cursor-not-allowed" 
                  : isActive 
                    ? "bg-sky-50 text-sky-600" 
                    : "text-zinc-700 hover:bg-zinc-100",
              )}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                }
              }}
            >
              <Icon className="h-5 w-5" />
              <span>{isBookingItem && !isApproved ? "Book Lessons (Pending)" : item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
