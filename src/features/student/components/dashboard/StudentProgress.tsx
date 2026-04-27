// src/features/student/components/dashboard/StudentProgress.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";

export function StudentProgress() {
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  const { data: stats, isLoading } = api.student.profile.getStudentLessonStats.useQuery(
    { studentId },
    { enabled: isReady && !!studentId, retry: false },
  );

  if (!isReady || isLoading || !stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const completed = stats.completed || 0;
  const upcoming = stats.upcoming || 0;
  const cancelled = stats.cancelled || 0;
  const weeklyUsed = stats.thisWeekCount || 0;
  const weeklyMax = stats.maxAllowed || 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          My Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6 pt-4">
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-cyan-50/80 border border-cyan-100 hover:-translate-y-0.5 transition-all duration-200">
            <p className="text-2xl font-bold text-cyan-700">{completed}</p>
            <p className="text-[10px] font-medium text-cyan-600/70 uppercase tracking-wide">Completed</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-100 hover:-translate-y-0.5 transition-all duration-200">
            <p className="text-2xl font-bold text-emerald-700">{upcoming}</p>
            <p className="text-[10px] font-medium text-emerald-600/70 uppercase tracking-wide">Upcoming</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-100 hover:-translate-y-0.5 transition-all duration-200">
            <p className="text-2xl font-bold text-amber-700">{cancelled}</p>
            <p className="text-[10px] font-medium text-amber-600/70 uppercase tracking-wide">Cancelled</p>
          </div>
        </div>

        {/* Weekly progress bar */}
        {weeklyMax > 0 && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium">This week</span>
              <span className="font-semibold text-slate-700">
                {weeklyUsed}/{weeklyMax} lessons
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (weeklyUsed / weeklyMax) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
