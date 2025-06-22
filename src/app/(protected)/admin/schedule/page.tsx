// src/app/(protected)/admin/schedule/page.tsx
import { ErrorBoundary } from "@/components/error-boundary";
import { CalendarSkeleton } from "@/components/ui/calendar-skeleton";
import dynamic from "next/dynamic";

const ScheduleManager = dynamic(
  () =>
    import("@/features/admin/components/scheduling/ScheduleManager").then((mod) => ({
      default: mod.ScheduleManager,
    })),
  {
    loading: () => <CalendarSkeleton />,
  },
);

export default function AdminSchedulePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
      </div>
      <ErrorBoundary>
        <ScheduleManager />
      </ErrorBoundary>
    </div>
  );
}
