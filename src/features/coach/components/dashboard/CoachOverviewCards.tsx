"use client";

import { Calendar, CheckCircle, DollarSign, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      gradientFrom: "from-blue-500",
      gradientTo: "to-blue-600",
    },
    {
      title: "Upcoming Lessons",
      value: stats?.upcomingLessons ?? 0,
      icon: Calendar,
      borderColor: "border-green-500",
      gradientFrom: "from-green-500",
      gradientTo: "to-green-600",
    },
    {
      title: "Completed This Month",
      value: stats?.completedThisMonth ?? 0,
      icon: CheckCircle,
      borderColor: "border-purple-500",
      gradientFrom: "from-purple-500",
      gradientTo: "to-purple-600",
    },
    {
      title: "Monthly Earnings",
      value: `$${(stats?.earningsThisMonth ?? 0).toFixed(2)}`,
      icon: DollarSign,
      borderColor: "border-amber-500",
      gradientFrom: "from-amber-500",
      gradientTo: "to-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={`border-l-4 ${card.borderColor}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div
                className={`rounded-xl p-1.5 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} shadow-sm`}
              >
                <card.icon className="h-4 w-4 text-white" />
              </div>
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
