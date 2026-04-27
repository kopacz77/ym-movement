// src/app/(protected)/coach/dashboard/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { ErrorBoundary } from "@/components/error-boundary";
import { CoachOverviewCards } from "@/features/coach/components/dashboard/CoachOverviewCards";
import { CoachPastLessons } from "@/features/coach/components/dashboard/CoachPastLessons";
import { CoachUpcomingLessons } from "@/features/coach/components/dashboard/CoachUpcomingLessons";

export default function CoachDashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] || "Coach";

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Welcome back, {firstName}
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s a look at your schedule and performance today.
        </p>
      </div>

      {/* KPI Cards */}
      <ErrorBoundary>
        <CoachOverviewCards />
      </ErrorBoundary>

      {/* Lessons Section */}
      <div className="space-y-6">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Lessons
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ErrorBoundary>
            <CoachUpcomingLessons />
          </ErrorBoundary>
          <ErrorBoundary>
            <CoachPastLessons />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
