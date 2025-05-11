import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { OverviewCards } from "@/features/admin/components/analytics/OverviewCards";
import { RevenueChart } from "@/features/admin/components/analytics/RevenueChart";
import { StudentActivityChart } from "@/features/admin/components/analytics/StudentActivityChart";
import { PendingApprovals } from "@/features/admin/components/management/PendingApprovals";
// src/app/(protected)/admin/dashboard/page.tsx
import { Suspense } from "react";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <Suspense fallback={<LoadingSkeleton />}>
            <OverviewCards />
          </Suspense>
        </div>

        <div className="md:col-span-4">
          <Suspense fallback={<LoadingSkeleton />}>
            <PendingApprovals />
          </Suspense>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <Suspense fallback={<LoadingSkeleton />}>
            <RevenueChart />
          </Suspense>
        </div>

        <div className="md:col-span-4">
          <Suspense fallback={<LoadingSkeleton />}>
            <StudentActivityChart />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
