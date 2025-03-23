// src/app/(protected)/admin/schedule/page.tsx
import { Suspense } from "react";
import { ScheduleManager } from "@/features/admin/components/scheduling/ScheduleManager";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function AdminSchedulePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Schedule Management</h1>
      </div>
      <Suspense fallback={<LoadingSkeleton />}>
        <ScheduleManager />
      </Suspense>
    </div>
  );
}
