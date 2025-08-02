"use client";

import { Calendar, CheckCircle, Clock, CreditCard, TrendingUp, Users } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export const OverviewCards = () => {
  const { data, error, isLoading } = api.admin.analytics.getOverview.useQuery(undefined, {
    refetchInterval: 30000,
    retry: 3,
  });

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast.error("Error loading overview", {
        description: error.message,
      });
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 animate-pulse" />
            <CardHeader className="relative p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-slate-200 rounded-lg animate-pulse shrink-0" />
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="h-3 sm:h-4 bg-slate-200 rounded w-20 sm:w-24 animate-pulse" />
                  <div className="h-6 sm:h-8 bg-slate-200 rounded w-12 sm:w-16 animate-pulse" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative p-4 sm:p-6 pt-0">
              <div className="h-3 bg-slate-200 rounded w-full animate-pulse mb-3" />
              <div className="h-6 bg-slate-200 rounded w-20 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load dashboard data</p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      title: "Total Students",
      value: data?.totalStudents ?? 0,
      icon: Users,
      description: "Active students in the system",
      change: "+2 this month",
      changeType: "positive" as const,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
      iconBg: "bg-blue-500",
    },
    {
      title: "Active Lessons",
      value: data?.activeLessons ?? 0,
      icon: Calendar,
      description: "Currently scheduled lessons",
      change: "5 today",
      changeType: "neutral" as const,
      gradient: "from-emerald-500 to-emerald-600",
      bgGradient: "from-emerald-50 to-emerald-100",
      iconBg: "bg-emerald-500",
    },
    {
      title: "Pending Payments",
      value: data?.pendingPayments ?? 0,
      icon: CreditCard,
      description: "Payments awaiting processing",
      change: data?.pendingPayments ? "Review needed" : "All clear",
      changeType:
        data?.pendingPayments && data.pendingPayments > 0
          ? ("warning" as const)
          : ("positive" as const),
      gradient: "from-amber-500 to-amber-600",
      bgGradient: "from-amber-50 to-amber-100",
      iconBg: "bg-amber-500",
    },
  ];

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
        >
          {/* Background gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50`} />

          {/* Content */}
          <CardHeader className="relative p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                <div
                  className={`p-2 sm:p-3 rounded-xl ${stat.iconBg} shadow-lg group-hover:scale-110 transition-transform duration-300 shrink-0`}
                >
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide truncate">
                    {stat.title}
                  </CardTitle>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative pt-0 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">{stat.description}</p>

            <div className="flex items-center justify-between">
              <Badge
                variant={
                  stat.changeType === "positive"
                    ? "default"
                    : stat.changeType === "warning"
                      ? "destructive"
                      : "secondary"
                }
                className="text-xs font-medium flex items-center gap-1"
              >
                {stat.changeType === "positive" && <TrendingUp className="h-3 w-3" />}
                {stat.changeType === "warning" && <Clock className="h-3 w-3" />}
                {stat.changeType === "neutral" && <CheckCircle className="h-3 w-3" />}
                <span className="truncate">{stat.change}</span>
              </Badge>
            </div>
          </CardContent>

          {/* Decorative accent */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`}
          />
        </Card>
      ))}
    </div>
  );
};
