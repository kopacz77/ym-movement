// src/app/(protected)/admin/dashboard/page.tsx

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { ChartSkeleton, LineChartSkeleton } from "@/components/ui/chart-skeleton";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ActivityFeed } from "@/features/admin/components/dashboard/ActivityFeed";
import { QuickActions } from "@/features/admin/components/dashboard/QuickActions";
import { SmartKPICards } from "@/features/admin/components/dashboard/SmartKPICards";
import { TodayTimeline } from "@/features/admin/components/dashboard/TodayTimeline";

const RevenueChart = dynamic(
  () =>
    import("@/features/admin/components/analytics/RevenueChart").then((mod) => ({
      default: mod.RevenueChart,
    })),
  {
    loading: () => <LineChartSkeleton />,
  },
);

const StudentActivityChart = dynamic(
  () =>
    import("@/features/admin/components/analytics/StudentActivityChart").then((mod) => ({
      default: mod.StudentActivityChart,
    })),
  {
    loading: () => <ChartSkeleton />,
  },
);

const CoachOverviewCards = dynamic(
  () =>
    import("@/features/admin/components/analytics/CoachOverviewCards").then((mod) => ({
      default: mod.CoachOverviewCards,
    })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const RevenueBreakdownChart = dynamic(
  () =>
    import("@/features/admin/components/analytics/RevenueBreakdownChart").then((mod) => ({
      default: mod.RevenueBreakdownChart,
    })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>

      {/* Smart KPI Cards */}
      <SmartKPICards />

      {/* Today's Timeline */}
      <TodayTimeline />

      {/* Quick Actions + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickActions />
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary>
          <RevenueChart />
        </ErrorBoundary>
        <ErrorBoundary>
          <StudentActivityChart />
        </ErrorBoundary>
      </div>

      {/* Coaches + Revenue Breakdown */}
      <ErrorBoundary>
        <Suspense fallback={<LoadingSkeleton />}>
          <CoachOverviewCards />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <RevenueBreakdownChart />
      </ErrorBoundary>
    </div>
  );
}
