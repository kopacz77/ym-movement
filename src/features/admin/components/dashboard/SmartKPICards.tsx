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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
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
      iconBg: "bg-cyan-50",
      iconColor: "text-cyan-600",
      href: "/admin/schedule",
    },
    {
      title: "Revenue This Month",
      value: `$${(overview.monthlyRevenue || 0).toLocaleString()}`,
      unit: "",
      icon: CreditCard,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/admin/payments",
    },
    {
      title: "Active Students",
      value: `${overview.totalStudents || 0}`,
      unit: "",
      icon: Users,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      href: "/admin/students",
    },
    {
      title: "Pending Actions",
      value: `${overview.pendingPayments || 0}`,
      unit: "need attention",
      icon: AlertCircle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      href: "/admin/students",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card className="group hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)] transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold tracking-tight text-primary">
                    {card.value}
                    {card.unit && (
                      <span className="text-base font-normal text-muted-foreground ml-1.5">
                        {card.unit}
                      </span>
                    )}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}
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
