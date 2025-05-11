import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ScheduleManager } from "@/features/admin/components/scheduling/ScheduleManager";
// src/app/(protected)/admin/schedule/page.tsx
import { Suspense } from "react";

export default function AdminSchedulePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
      </div>
      <Suspense fallback={<LoadingSkeleton />}>
        <ScheduleManager />
      </Suspense>
    </div>
  );
}
