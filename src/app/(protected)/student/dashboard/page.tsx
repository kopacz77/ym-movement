// src/app/(protected)/student/dashboard/page.tsx
"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WarmGreeting } from "@/components/ui/warm-greeting";
import { NextLessonHero } from "@/features/student/components/dashboard/NextLessonHero";
import { StudentProgress } from "@/features/student/components/dashboard/StudentProgress";
import { UpcomingLessons } from "@/features/student/components/dashboard/UpcomingLessons";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function StudentDashboardPage() {
  const user = useCurrentUser();
  const { data: session } = useSession();

  return (
    <div className="flex flex-col gap-6">
      {/* Header with greeting */}
      <div className="flex justify-between items-center">
        <div>
          <WarmGreeting name={session?.user?.name || "Student"} role="student" />
        </div>
        {user.isApproved ? (
          <Button asChild>
            <Link href="/student/book">Book a Lesson</Link>
          </Button>
        ) : (
          <Button disabled variant="outline">
            Pending Approval
          </Button>
        )}
      </div>

      {/* Next Lesson Hero */}
      <ErrorBoundary>
        <NextLessonHero />
      </ErrorBoundary>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              <CardTitle className="text-lg">Payment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venmo</span>
                <span className="font-medium">@yura-min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zelle</span>
                <span className="font-medium">(714) 743-7071</span>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                <Link href="/student/payments">View Payment History</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
