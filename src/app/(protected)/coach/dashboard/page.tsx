"use client";

export const dynamic = "force-dynamic";

import { CoachOverviewCards } from "@/features/coach/components/dashboard/CoachOverviewCards";
import { CoachPastLessons } from "@/features/coach/components/dashboard/CoachPastLessons";
import { CoachUpcomingLessons } from "@/features/coach/components/dashboard/CoachUpcomingLessons";

export default function CoachDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Coach Dashboard</h1>
      <CoachOverviewCards />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CoachUpcomingLessons />
        <CoachPastLessons />
      </div>
    </div>
  );
}
