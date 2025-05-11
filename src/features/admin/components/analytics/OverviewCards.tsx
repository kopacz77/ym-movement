"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Calendar, CreditCard, Users } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

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
    // Define static placeholders without relying on array indices
    const loadingPlaceholders = [
      { id: "loading-students", title: "Students" },
      { id: "loading-lessons", title: "Lessons" },
      { id: "loading-payments", title: "Payments" },
    ];

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loadingPlaceholders.map((placeholder) => (
          <Card key={placeholder.id} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16" />
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
    },
    {
      title: "Active Lessons",
      value: data?.activeLessons ?? 0,
      icon: Calendar,
      description: "Currently scheduled lessons",
    },
    {
      title: "Pending Payments",
      value: data?.pendingPayments ?? 0,
      icon: CreditCard,
      description: "Payments awaiting processing",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title} className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
