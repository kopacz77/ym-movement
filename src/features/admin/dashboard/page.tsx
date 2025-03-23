import { Suspense } from "react";
import { OverviewCards } from "@/features/admin/components/analytics/OverviewCards";
import { RevenueChart } from "@/features/admin/components/analytics/RevenueChart";
import { StudentActivityChart } from "@/features/admin/components/analytics/StudentActivityChart";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function AdminDashboardPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <Suspense fallback={<LoadingSkeleton />}>
        <OverviewCards />
      </Suspense>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<LoadingSkeleton />}>
          <RevenueChart />
        </Suspense>
        <Suspense fallback={<LoadingSkeleton />}>
          <StudentActivityChart />
        </Suspense>
      </div>
    </div>
  );
}
