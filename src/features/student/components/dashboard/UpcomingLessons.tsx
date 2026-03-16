"use client";

import { format } from "date-fns";
import { Calendar, Clock, MapPin, User } from "lucide-react";
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
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/30">
      <CardHeader className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-b border-blue-100/50">
        <CardTitle className="text-xl flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          Your Upcoming Adventures ✨
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" asChild className="hover:bg-blue-50">
            <Link href="/student/schedule">View All</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="p-6">
        {showLoading ? (
          <DelightfulLoading message="Loading your exciting lessons..." />
        ) : upcomingLessons?.length ? (
          <div className="space-y-4">
            {upcomingLessons.map((lesson) => (
              <Card key={lesson.id} className="border rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {lesson.type ? lesson.type.replace("_", " ") : "Private"} Lesson
                  </CardTitle>
                  <CardAction>
                    <LessonStatusBadge status={lesson.status as any} />
                  </CardAction>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(lesson.startTime), "EEE, MMM d")}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <AdaptiveTimeRange
                        startTime={lesson.startTime}
                        endTime={lesson.endTime}
                        rinkTimezone={lesson.Rink.timezone}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="break-words">{lesson.Rink.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{(lesson as any).Coach?.User?.name || "Instructor"}</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" asChild>
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
