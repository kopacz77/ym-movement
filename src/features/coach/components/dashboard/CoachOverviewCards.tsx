"use client";

import { Calendar, CheckCircle, DollarSign, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export function CoachOverviewCards() {
  const { data: stats, isLoading } = api.coach.dashboard.getDashboardStats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Students",
      value: stats?.totalStudents ?? 0,
      icon: Users,
      iconBg: "bg-cyan-50",
      iconColor: "text-cyan-600",
    },
    {
      title: "Upcoming Lessons",
      value: stats?.upcomingLessons ?? 0,
      icon: Calendar,
      iconBg: "bg-cyan-50/70",
      iconColor: "text-cyan-600",
    },
    {
      title: "Completed This Month",
      value: stats?.completedThisMonth ?? 0,
      icon: CheckCircle,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Monthly Earnings",
      value: `$${(stats?.earningsThisMonth ?? 0).toFixed(2)}`,
      icon: DollarSign,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="group hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)] transition-all duration-200"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">
                  {card.title}
                </p>
                <div className="text-3xl font-bold tracking-tight">{card.value}</div>
              </div>
              <div
                className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}
              >
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
