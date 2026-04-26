"use client";

import { Clock, DollarSign, Percent, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export function EarningsOverview() {
  const { data: summary, isLoading } = api.coach.earnings.getEarningsSummary.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Earnings",
      value: `$${(summary?.totalEarnings ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      subtitle: "All time (after split)",
    },
    {
      title: "This Month",
      value: `$${(summary?.monthEarnings ?? 0).toFixed(2)}`,
      icon: TrendingUp,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      subtitle: "After split",
    },
    {
      title: "Pending Payments",
      value: `$${(summary?.pendingAmount ?? 0).toFixed(2)}`,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      subtitle: `${summary?.pendingCount ?? 0} payment(s)`,
    },
    {
      title: "Revenue Split",
      value: `${summary?.revenueSplitPercent ?? 0}%`,
      icon: Percent,
      color: "text-violet-600",
      bg: "bg-violet-50",
      subtitle: "Your share",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className={`rounded-md p-1.5 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
