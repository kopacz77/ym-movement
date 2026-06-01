// src/app/(protected)/student/dashboard/DashboardContent.tsx
//
// Client island for the student dashboard. The parent server component
// (page.tsx) hands us:
//   - isApproved: pre-resolved from the server session, no client wait
//   - initialNextLesson: server-fetched lesson row used by NextLessonHero
//                        as initialData so the hero renders with content
//                        from first paint
//
// The other dashboard widgets (OutstandingPayments, UpcomingLessons,
// StudentProgress) keep fetching client-side. They're below the fold and
// don't need server prefetch to feel fast.

"use client";

import Link from "next/link";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NextLessonHero,
  type NextLessonHeroProps,
} from "@/features/student/components/dashboard/NextLessonHero";
import { OutstandingPayments } from "@/features/student/components/dashboard/OutstandingPayments";
import { StudentProgress } from "@/features/student/components/dashboard/StudentProgress";
import { UpcomingLessons } from "@/features/student/components/dashboard/UpcomingLessons";

interface DashboardContentProps {
  isApproved: boolean;
  initialNextLesson: NextLessonHeroProps["initialNextLesson"];
}

export function DashboardContent({ isApproved, initialNextLesson }: DashboardContentProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        {isApproved ? (
          <Button asChild>
            <Link href="/student/book">Book a Lesson</Link>
          </Button>
        ) : (
          <Button disabled variant="outline">
            Pending Approval
          </Button>
        )}
      </div>

      {/* Outstanding Payments Alert */}
      <ErrorBoundary>
        <OutstandingPayments />
      </ErrorBoundary>

      {/* Next Lesson Hero — receives server-prefetched data; renders instantly */}
      <ErrorBoundary>
        <NextLessonHero initialNextLesson={initialNextLesson} />
      </ErrorBoundary>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming lessons (2/3 width) */}
        <div className="lg:col-span-2">
          <ErrorBoundary>
            <UpcomingLessons />
          </ErrorBoundary>
        </div>

        {/* Sidebar (1/3 width) */}
        <div className="space-y-6">
          <ErrorBoundary>
            <StudentProgress />
          </ErrorBoundary>

          {/* Payment info */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Payment Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm p-6 pt-4">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-cyan-50/50">
                <span className="text-muted-foreground">Venmo</span>
                <span className="font-semibold text-cyan-700">@yura-min</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-emerald-50/50">
                <span className="text-muted-foreground">Zelle</span>
                <span className="font-semibold text-emerald-700">(714) 743-7071</span>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                <Link href="/student/payments">View Payment History</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
