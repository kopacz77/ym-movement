"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonSummary } from "@/features/student/components/dashboard/LessonSummary";
import { UpcomingLessons } from "@/features/student/components/dashboard/UpcomingLessons";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import Link from "next/link";

export default function StudentDashboardPage() {
  const user = useCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Link href="/student/book">
          <Button>Book a Lesson</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <UpcomingLessons />
        </div>
        <div className="md:col-span-4">
          <LessonSummary />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p>
              We accept payments via Venmo and Zelle. Please make payments within 24 hours of
              booking your lesson to avoid automatic cancellation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium">Venmo</h3>
                <p className="text-sm mt-1">@yura-min</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium">Zelle</h3>
                <p className="text-sm mt-1">+1 (714) 743-7071</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
