// src/features/admin/components/dashboard/QuickActions.tsx
"use client";

import { BarChart2, Calendar, CreditCard, UserPlus } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActions() {
  const actions = [
    {
      label: "Create Time Slot",
      icon: Calendar,
      href: "/admin/schedule",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      hoverBg: "hover:bg-blue-50",
    },
    {
      label: "View Payments",
      icon: CreditCard,
      href: "/admin/payments",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      hoverBg: "hover:bg-emerald-50",
    },
    {
      label: "Manage Students",
      icon: UserPlus,
      href: "/admin/students",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      hoverBg: "hover:bg-violet-50",
    },
    {
      label: "View Reports",
      icon: BarChart2,
      href: "/admin/reports",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      hoverBg: "hover:bg-amber-50",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`flex flex-col items-center justify-center p-4 bg-muted/30 ${action.hoverBg} border border-border/50 rounded-lg transition-colors group`}
          >
            <div
              className={`w-10 h-10 rounded-full ${action.iconBg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}
            >
              <action.icon className={`h-5 w-5 ${action.iconColor}`} />
            </div>
            <span className="text-xs font-medium text-center">{action.label}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
