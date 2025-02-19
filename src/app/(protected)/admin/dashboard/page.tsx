// src/app/(protected)/admin/dashboard/page.tsx
import { Suspense } from 'react';
import { OverviewCards } from '@/features/admin/components/analytics/OverviewCards';
import { RevenueChart } from '@/features/admin/components/analytics/RevenueChart';
import { StudentActivityChart } from '@/features/admin/components/analytics/StudentActivityChart';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { PendingApprovals } from '@/features/admin/components/management/PendingApprovals';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      {/* Overview Cards */}
      <Suspense fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 bg-gray-100 rounded-lg animate-pulse h-32" />
          ))}
        </div>
      }>
        <OverviewCards />
      </Suspense>
      
      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<div className="h-[400px] bg-gray-100 rounded-lg animate-pulse" />}>
          <RevenueChart />
        </Suspense>
        <Suspense fallback={<div className="h-[400px] bg-gray-100 rounded-lg animate-pulse" />}>
          <StudentActivityChart />
        </Suspense>
      </div>
      
      {/* Pending Approvals Section */}
      <div className="mt-6">
        <Suspense fallback={<div className="h-[300px] bg-gray-100 rounded-lg animate-pulse" />}>
          <PendingApprovals />
        </Suspense>
      </div>
    </div>
  );
}