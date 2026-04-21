// src/app/(protected)/admin/schedule/page.tsx
"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/error-boundary";
import { CalendarSkeleton } from "@/components/ui/calendar-skeleton";
import { BulkOperationsProvider } from "@/contexts/BulkOperationsContext";

const ScheduleManager = dynamic(
  () =>
    import("@/features/admin/components/scheduling/ScheduleManager").then((mod) => ({
      default: mod.ScheduleManager,
    })),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  },
);

export default function AdminSchedulePage() {
  return (
    <div className="flex flex-col gap-6">
      <BulkOperationsProvider>
        <ErrorBoundary>
          <ScheduleManager />
        </ErrorBoundary>
      </BulkOperationsProvider>
    </div>
  );
}
