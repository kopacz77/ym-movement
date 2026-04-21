// src/app/(protected)/coach/dashboard/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { ErrorBoundary } from "@/components/error-boundary";
import { WarmGreeting } from "@/components/ui/warm-greeting";
import { CoachOverviewCards } from "@/features/coach/components/dashboard/CoachOverviewCards";
import { CoachPastLessons } from "@/features/coach/components/dashboard/CoachPastLessons";
import { CoachUpcomingLessons } from "@/features/coach/components/dashboard/CoachUpcomingLessons";

export default function CoachDashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <WarmGreeting name={session?.user?.name || "Coach"} />

      {/* KPI Cards */}
      <ErrorBoundary>
        <CoachOverviewCards />
      </ErrorBoundary>

      {/* Lessons grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary>
          <CoachUpcomingLessons />
        </ErrorBoundary>
        <ErrorBoundary>
          <CoachPastLessons />
        </ErrorBoundary>
      </div>
    </div>
  );
}
