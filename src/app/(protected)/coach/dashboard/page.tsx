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

      {/* Lessons Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-primary/20 via-accent/10 to-transparent" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Lessons
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-primary/20 via-accent/10 to-transparent" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
