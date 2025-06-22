// src/app/(protected)/admin/dashboard/page.tsx
import { ErrorBoundary } from "@/components/error-boundary";
import { ChartSkeleton, LineChartSkeleton } from "@/components/ui/chart-skeleton";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { OverviewCards } from "@/features/admin/components/analytics/OverviewCards";
import { PendingApprovals } from "@/features/admin/components/management/PendingApprovals";
import dynamic from "next/dynamic";
import { Suspense } from "react";

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

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <ErrorBoundary>
            <Suspense fallback={<LoadingSkeleton />}>
              <OverviewCards />
            </Suspense>
          </ErrorBoundary>
        </div>

        <div className="md:col-span-4">
          <ErrorBoundary>
            <Suspense fallback={<LoadingSkeleton />}>
              <PendingApprovals />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <ErrorBoundary>
            <RevenueChart />
          </ErrorBoundary>
        </div>

        <div className="md:col-span-4">
          <ErrorBoundary>
            <StudentActivityChart />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
