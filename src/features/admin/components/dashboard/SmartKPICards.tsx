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
      value: `${overview.activeLessons || 0}`,
      unit: "lessons",
      icon: Calendar,
      borderColor: "border-cyan-500",
      iconBg: "from-cyan-50 to-blue-100",
      iconColor: "text-cyan-600",
      href: "/admin/schedule",
    },
    {
      title: "Revenue This Month",
      value: `$${(overview.monthlyRevenue || 0).toLocaleString()}`,
      unit: "",
      icon: CreditCard,
      borderColor: "border-emerald-500",
      iconBg: "from-emerald-50 to-green-100",
      iconColor: "text-emerald-600",
      href: "/admin/payments",
    },
    {
      title: "Active Students",
      value: `${overview.totalStudents || 0}`,
      unit: "",
      icon: Users,
      borderColor: "border-violet-500",
      iconBg: "from-violet-50 to-purple-100",
      iconColor: "text-violet-600",
      href: "/admin/students",
    },
    {
      title: "Pending Actions",
      value: `${overview.pendingPayments || 0}`,
      unit: "need attention",
      icon: AlertCircle,
      borderColor: "border-amber-500",
      iconBg: "from-amber-50 to-orange-100",
      iconColor: "text-amber-600",
      href: "/admin/students",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card
            className={`hover:shadow-md transition-all cursor-pointer border-l-4 ${card.borderColor} hover:-translate-y-0.5`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                  <h3 className="text-2xl font-bold">
                    {card.value}
                    {card.unit && (
                      <span className="text-base font-normal text-muted-foreground ml-1">
                        {card.unit}
                      </span>
                    )}
                  </h3>
                </div>
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${card.iconBg} flex items-center justify-center`}
                >
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
