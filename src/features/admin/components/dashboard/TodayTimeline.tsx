// src/features/admin/components/dashboard/TodayTimeline.tsx
"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export function TodayTimeline() {
  const today = useMemo(() => new Date(), []);
  const { data: timeSlots = [], isLoading } = api.admin.schedule.getTimeSlots.useQuery({
    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
  });

  // Filter to only slots with lessons (scheduled today)
  const todayLessons = useMemo(() => {
    return (timeSlots as any[])
      .filter((slot) => (slot.Lesson || []).length > 0)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [timeSlots]);

  // Calculate timeline bounds (6am to 10pm default, expand if needed)
  const timelineBounds = useMemo(() => {
    let startHour = 6;
    let endHour = 22;
    for (const slot of todayLessons) {
      const h = new Date(slot.startTime).getHours();
      const eh = new Date(slot.endTime).getHours();
      if (h < startHour) {
        startHour = h;
      }
      if (eh > endHour) {
        endHour = eh + 1;
      }
    }
    return { startHour, endHour };
  }, [todayLessons]);

  const totalMinutes = (timelineBounds.endHour - timelineBounds.startHour) * 60;

  // Current time position
  const now = new Date();
  const nowMinutes = (now.getHours() - timelineBounds.startHour) * 60 + now.getMinutes();
  const nowPercent = Math.max(0, Math.min(100, (nowMinutes / totalMinutes) * 100));

  // Lesson type colors
  const typeColors: Record<string, string> = {
    PRIVATE: "bg-blue-500",
    CHOREOGRAPHY: "bg-purple-500",
    GROUP: "bg-green-500",
    COMPETITION_PREP: "bg-orange-500",
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Today&apos;s Schedule — {format(today, "EEEE, MMM d")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todayLessons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No lessons scheduled today.</p>
        ) : (
          <div className="relative">
            {/* Hour markers */}
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              {Array.from(
                { length: timelineBounds.endHour - timelineBounds.startHour + 1 },
                (_, i) => (
                  <span key={i}>
                    {format(new Date(2000, 0, 1, timelineBounds.startHour + i), "ha")}
                  </span>
                ),
              )}
            </div>

            {/* Timeline bar */}
            <div className="relative h-12 bg-muted/50 rounded-lg overflow-hidden">
              {/* Current time indicator */}
              {nowPercent > 0 && nowPercent < 100 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: `${nowPercent}%` }}
                />
              )}

              {/* Lesson blocks */}
              {todayLessons.map((slot: any) => {
                const lessons = slot.Lesson || [];
                const startMin =
                  (new Date(slot.startTime).getHours() - timelineBounds.startHour) * 60 +
                  new Date(slot.startTime).getMinutes();
                const endMin =
                  (new Date(slot.endTime).getHours() - timelineBounds.startHour) * 60 +
                  new Date(slot.endTime).getMinutes();
                const leftPercent = (startMin / totalMinutes) * 100;
                const widthPercent = ((endMin - startMin) / totalMinutes) * 100;
                const lessonType = lessons[0]?.type || "PRIVATE";
                const studentName = lessons[0]?.Student?.User?.name || "Unknown";

                return (
                  <div
                    key={slot.id}
                    className={`absolute top-1 bottom-1 rounded ${typeColors[lessonType] || "bg-blue-500"} text-white px-1.5 flex items-center overflow-hidden`}
                    style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    title={`${studentName} - ${format(new Date(slot.startTime), "h:mm a")} to ${format(new Date(slot.endTime), "h:mm a")}`}
                  >
                    <span className="text-[10px] font-medium truncate">{studentName}</span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Private
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Choreo
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Group
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Comp
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
