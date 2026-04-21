// src/features/admin/components/dashboard/QuickActions.tsx
"use client";

import { BarChart2, Calendar, CreditCard, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActions() {
  const actions = [
    { label: "Create Time Slot", icon: Calendar, href: "/admin/schedule" },
    { label: "View Payments", icon: CreditCard, href: "/admin/payments" },
    { label: "Manage Students", icon: UserPlus, href: "/admin/students" },
    { label: "View Reports", icon: BarChart2, href: "/admin/reports" },
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
            className="h-auto py-3 flex-col gap-1"
            asChild
          >
            <Link href={action.href}>
              <action.icon className="h-5 w-5" />
              <span className="text-xs">{action.label}</span>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
