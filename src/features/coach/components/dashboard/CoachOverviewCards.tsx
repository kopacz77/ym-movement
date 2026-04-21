"use client";

import { Calendar, CheckCircle, DollarSign, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export function CoachOverviewCards() {
  const { data: stats, isLoading } = api.coach.dashboard.getDashboardStats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
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
      borderColor: "border-blue-500",
      iconBg: "from-blue-50 to-indigo-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Upcoming Lessons",
      value: stats?.upcomingLessons ?? 0,
      icon: Calendar,
      borderColor: "border-green-500",
      iconBg: "from-emerald-50 to-green-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Completed This Month",
      value: stats?.completedThisMonth ?? 0,
      icon: CheckCircle,
      borderColor: "border-purple-500",
      iconBg: "from-violet-50 to-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Monthly Earnings",
      value: `$${(stats?.earningsThisMonth ?? 0).toFixed(2)}`,
      icon: DollarSign,
      borderColor: "border-amber-500",
      iconBg: "from-amber-50 to-orange-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={`border-l-4 ${card.borderColor} hover:shadow-md transition-shadow`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                <div className="text-2xl font-bold">{card.value}</div>
              </div>
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${card.iconBg} flex items-center justify-center`}
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
