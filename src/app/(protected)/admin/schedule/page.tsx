// src/app/(protected)/admin/schedule/page.tsx
"use client";

import dynamic from "next/dynamic";
import { CalendarSkeleton } from "@/components/ui/calendar-skeleton";

const NewScheduleManager = dynamic(
  () =>
    import("@/features/admin/components/scheduling/NewScheduleManager").then((mod) => ({
      default: mod.NewScheduleManager,
    })),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  },
);

export default function AdminSchedulePage() {
  return (
    <div className="flex flex-col gap-4">
      <NewScheduleManager />
    </div>
  );
}
