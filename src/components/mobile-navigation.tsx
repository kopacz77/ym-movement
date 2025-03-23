// src/components/mobile-navigation.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Calendar, Home, User, CreditCard, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/useMediaQuery";

type NavigationType = "student" | "admin" | null;

// Define navigation items for each type
const studentNavigation = [
  { name: "Home", href: "/student/dashboard", icon: Home },
  { name: "Book", href: "/student/book", icon: Calendar },
  { name: "Schedule", href: "/student/schedule", icon: Clock },
  { name: "Payments", href: "/student/payments", icon: CreditCard },
  { name: "Profile", href: "/student/profile", icon: User },
];

const adminNavigation = [
  { name: "Home", href: "/admin/dashboard", icon: Home },
  { name: "Schedule", href: "/admin/schedule", icon: Calendar },
  { name: "Students", href: "/admin/students", icon: User },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Reports", href: "/admin/reports", icon: Clock },
];

export function MobileNavigation() {
  const pathname = usePathname() ?? "";
  const [navigationType, setNavigationType] = useState<NavigationType>(null);
  const isMobile = useIsMobile();

  // Determine which navigation to show based on pathname
  useEffect(() => {
    if (pathname.includes("/student")) {
      setNavigationType("student");
    } else if (pathname.includes("/admin")) {
      setNavigationType("admin");
    } else {
      setNavigationType(null);
    }
  }, [pathname]);

  // Don't show on desktop or if navigationType is null
  if (!isMobile || !navigationType) {
    return null;
  }

  const navigationItems = navigationType === "student" ? studentNavigation : adminNavigation;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t safe-bottom">
      <div className="flex justify-around items-center">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-2",
                isActive ? "text-primary" : "text-gray-600 hover:text-gray-900",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
