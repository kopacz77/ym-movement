// src/app/(protected)/admin/dashboard/page.tsx

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { ChartSkeleton, LineChartSkeleton } from "@/components/ui/chart-skeleton";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { OverviewCards } from "@/features/admin/components/analytics/OverviewCards";
import { PendingApprovals } from "@/features/admin/components/management/PendingApprovals";

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
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">
              Welcome back! Here's what's happening with YM Movement today.
            </p>
          </div>
          <div className="text-left sm:text-right text-sm text-muted-foreground shrink-0">
            <span className="hidden sm:inline">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="sm:hidden">
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Overview Cards Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<LoadingSkeleton />}>
            <OverviewCards />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Revenue Overview</h2>
          </div>
          <div className="p-2 bg-gradient-to-br from-indigo-100/60 via-blue-50/70 to-slate-100/60 rounded-xl border border-indigo-200/50 shadow-lg">
            <ErrorBoundary>
              <RevenueChart />
            </ErrorBoundary>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Quick Actions</h2>
          </div>

          <div className="p-2 bg-gradient-to-br from-indigo-100/60 via-blue-50/70 to-slate-100/60 rounded-xl border border-indigo-200/50 shadow-lg">
            <ErrorBoundary>
              <Suspense fallback={<LoadingSkeleton />}>
                <PendingApprovals />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Student Activity Chart - Centered below Revenue Overview */}
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          <h2 className="text-2xl font-semibold tracking-tight">Student Activity</h2>
        </div>
        <div className="flex justify-center">
          <div className="w-full max-w-4xl p-2 bg-gradient-to-br from-indigo-100/60 via-blue-50/70 to-slate-100/60 rounded-xl border border-indigo-200/50 shadow-lg">
            <ErrorBoundary>
              <StudentActivityChart />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Coaches Overview Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Coaches</h2>
        </div>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSkeleton />}>
            <CoachOverviewCards />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Revenue Breakdown Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Revenue Breakdown</h2>
        </div>
        <div className="p-2 bg-gradient-to-br from-indigo-100/60 via-blue-50/70 to-slate-100/60 rounded-xl border border-indigo-200/50 shadow-lg">
          <ErrorBoundary>
            <RevenueBreakdownChart />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
