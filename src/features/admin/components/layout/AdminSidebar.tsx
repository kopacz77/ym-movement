"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Calendar, Users, CreditCard, Settings, ChartBar } from "lucide-react";

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Schedule', href: '/admin/schedule', icon: Calendar },
  { name: 'Students', href: '/admin/students', icon: Users },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Reports', href: '/admin/reports', icon: ChartBar },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export const AdminSidebar = () => {
  const pathname = usePathname();
  return (
    <div className="w-64 bg-white border-r h-full">
      <nav className="space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
