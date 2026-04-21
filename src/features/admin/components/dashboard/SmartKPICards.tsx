// src/features/admin/components/dashboard/SmartKPICards.tsx
"use client";

import { AlertCircle, Calendar, CreditCard, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

export function SmartKPICards() {
  const { data: overview, isLoading } = api.admin.analytics.getOverview.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Today's Schedule",
      value: `${overview.activeLessons || 0} lessons`,
      subtitle: "scheduled today",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      shadowColor: "shadow-blue-200/50",
      href: "/admin/schedule",
    },
    {
      title: "Revenue This Month",
      value: `$${(overview.monthlyRevenue || 0).toLocaleString()}`,
      subtitle: "this month",
      icon: CreditCard,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      shadowColor: "shadow-emerald-200/50",
      href: "/admin/payments",
    },
    {
      title: "Active Students",
      value: `${overview.totalStudents || 0}`,
      subtitle: "enrolled students",
      icon: Users,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      shadowColor: "shadow-violet-200/50",
      href: "/admin/students",
    },
    {
      title: "Pending Actions",
      value: `${overview.pendingPayments || 0}`,
      subtitle: "need attention",
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      shadowColor: "shadow-amber-200/50",
      href: "/admin/students",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${card.shadowColor}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
                </div>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
