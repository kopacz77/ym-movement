// src/features/admin/components/dashboard/QuickActions.tsx
"use client";

import { BarChart2, Calendar, CreditCard, UserPlus } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActions() {
  const actions = [
    {
      label: "Add Lesson",
      icon: Calendar,
      href: "/admin/schedule",
    },
    {
      label: "View Payments",
      icon: CreditCard,
      href: "/admin/payments",
    },
    {
      label: "New Student",
      icon: UserPlus,
      href: "/admin/students",
    },
    {
      label: "Generate Report",
      icon: BarChart2,
      href: "/admin/reports",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center justify-center p-6 rounded-lg border border-border/30 bg-background hover:bg-muted/50 transition-all duration-200 hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-3">
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-foreground">{action.label}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
