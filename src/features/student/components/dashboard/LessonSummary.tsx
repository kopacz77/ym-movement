// src/features/student/components/dashboard/LessonSummary.tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const LessonSummary = () => {
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);

  // Only fetch data when studentId is available
  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  const {
    data: stats,
    isLoading,
    error,
  } = api.student.profile.getStudentLessonStats.useQuery(
    { studentId },
    {
      enabled: isReady && !!studentId,
      retry: false,
    },
  );

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast.error("Error loading lesson stats", {
        description: error.message,
      });
    }
  }, [error]);

  const weeklyProgressPercentage = stats ? (stats.thisWeekCount / stats.maxAllowed) * 100 : 0;

  // Show loading state when either:
  // 1. We don't have a studentId yet
  // 2. We're fetching the data
  const showLoading = !isReady || isLoading || !studentId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lesson Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {showLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">{stats?.upcoming || 0}</span>
                <span className="text-sm text-muted-foreground">Upcoming</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">{stats?.completed || 0}</span>
                <span className="text-sm text-muted-foreground">Completed</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">{stats?.cancelled || 0}</span>
                <span className="text-sm text-muted-foreground">Cancelled</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Weekly Lessons</span>
                <span>
                  {stats?.thisWeekCount || 0} / {stats?.maxAllowed || 0}
                </span>
              </div>
              <Progress value={weeklyProgressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                You have {Math.max(0, (stats?.maxAllowed || 0) - (stats?.thisWeekCount || 0))}{" "}
                lessons remaining this week
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
