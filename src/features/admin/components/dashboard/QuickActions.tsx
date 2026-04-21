// src/features/admin/components/dashboard/QuickActions.tsx
"use client";

import { BarChart2, Calendar, CreditCard, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActions() {
  const actions = [
    {
      label: "Create Time Slot",
      icon: Calendar,
      href: "/admin/schedule",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "View Payments",
      icon: CreditCard,
      href: "/admin/payments",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Manage Students",
      icon: UserPlus,
      href: "/admin/students",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      label: "View Reports",
      icon: BarChart2,
      href: "/admin/reports",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto py-3 flex-col gap-2 hover:bg-muted/50"
            asChild
          >
            <Link href={action.href}>
              <div className={`p-1.5 rounded-lg ${action.iconBg}`}>
                <action.icon className={`h-4 w-4 ${action.iconColor}`} />
              </div>
              <span className="text-xs">{action.label}</span>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
