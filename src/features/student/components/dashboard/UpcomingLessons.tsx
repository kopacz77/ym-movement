"use client";

import { Clock, MapPin, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdaptiveTimeRange } from "@/components/AdaptiveTime";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DelightfulLoading } from "@/components/ui/delightful-loading";
import { EncouragingEmptyState } from "@/components/ui/encouraging-empty-state";
import { LessonStatusBadge } from "@/components/ui/lesson-status";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import { formatRinkTime } from "@/lib/timezone";

export function UpcomingLessons() {
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);

  // Only fetch data when studentId is available
  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  // Use useMemo to create a stable date reference
  const currentDate = useMemo(() => new Date(), []);

  // Fetch upcoming lessons for the student
  const {
    data: lessons,
    isLoading,
    error,
  } = api.student.profile.getStudentLessons.useQuery(
    {
      studentId,
      status: "SCHEDULED",
      startDate: currentDate,
    },
    {
      enabled: isReady && !!studentId,
      retry: false,
    },
  );

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Error loading lessons:", error);
      toast.error("Error loading lessons", {
        description: error.message || "Failed to load lesson data",
      });
    }
  }, [error]);

  // Only show the next 3 lessons
  const upcomingLessons = lessons?.slice(0, 3);

  // Show loading state when either:
  // 1. We don't have a studentId yet
  // 2. We're fetching the data
  const showLoading = !isReady || isLoading || !studentId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Upcoming Lessons
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" asChild className="hover:bg-muted/50">
            <Link href="/student/schedule">View All</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="p-6">
        {showLoading ? (
          <DelightfulLoading message="Loading lessons..." />
        ) : upcomingLessons?.length ? (
          <div className="space-y-4">
            {upcomingLessons.map((lesson) => (
              <Card
                key={lesson.id}
                className="border border-border/30 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)] transition-all duration-200"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    {lesson.type ? lesson.type.replace("_", " ") : "Private"} Lesson
                  </CardTitle>
                  <CardAction>
                    <LessonStatusBadge status={lesson.status as any} />
                  </CardAction>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 mb-4">
                    <div className="text-sm font-medium text-slate-700">
                      {formatRinkTime(lesson.startTime, lesson.Rink.timezone, "EEE, MMM d")}
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <AdaptiveTimeRange
                        startTime={lesson.startTime}
                        endTime={lesson.endTime}
                        rinkTimezone={lesson.Rink.timezone}
                      />
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="break-words">{lesson.Rink.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <User className="h-4 w-4 text-slate-400" />
                      <span>{(lesson as any).Coach?.User?.name || "Instructor"}</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200"
                      asChild
                    >
                      <Link href={`/student/schedule/${lesson.id}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EncouragingEmptyState
            type="lessons"
            userRole="student"
            onAction={() => (window.location.href = "/student/book")}
          />
        )}
      </CardContent>
    </Card>
  );
}
