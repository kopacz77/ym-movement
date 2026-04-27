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

  // Lesson type colors — transparent tinted blocks with borders matching calendar events
  const typeStyles: Record<string, { bg: string; border: string; text: string }> = {
    PRIVATE: { bg: "bg-blue-100", border: "border border-blue-300", text: "text-blue-900" },
    CHOREOGRAPHY: {
      bg: "bg-purple-100",
      border: "border border-purple-300",
      text: "text-purple-900",
    },
    GROUP: { bg: "bg-emerald-100", border: "border border-emerald-300", text: "text-emerald-900" },
    COMPETITION_PREP: {
      bg: "bg-orange-100",
      border: "border border-orange-300",
      text: "text-orange-900",
    },
  };
  const defaultStyle = typeStyles.PRIVATE as { bg: string; border: string; text: string };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Today&apos;s Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Today&apos;s Timeline
        </p>
      </CardHeader>
      <CardContent>
        {todayLessons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No lessons scheduled today.</p>
        ) : (
          <div className="relative">
            {/* Timeline bar */}
            <div className="relative h-16 bg-muted/30 rounded-lg overflow-hidden">
              {/* Current time indicator — cyan glow */}
              {nowPercent > 0 && nowPercent < 100 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10 flex flex-col items-center shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                  style={{ left: `${nowPercent}%` }}
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-400 -mt-1 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                </div>
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
                const style = typeStyles[lessonType] || defaultStyle;

                return (
                  <div
                    key={slot.id}
                    className={`absolute top-2 bottom-2 rounded-md ${style.bg} ${style.border} ${style.text} hover:-translate-y-1 px-2 flex items-center overflow-hidden cursor-pointer transition-all duration-200`}
                    style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    title={`${studentName} - ${format(new Date(slot.startTime), "h:mm a")} to ${format(new Date(slot.endTime), "h:mm a")}`}
                  >
                    <span className="text-[10px] font-bold truncate">{studentName}</span>
                  </div>
                );
              })}
            </div>

            {/* Hour markers — every 2 hours for clean spacing */}
            <div className="flex justify-between mt-3 text-xs text-muted-foreground">
              {Array.from(
                { length: timelineBounds.endHour - timelineBounds.startHour + 1 },
                (_, i) => {
                  const hour = timelineBounds.startHour + i;
                  // Show every 2 hours for cleaner look
                  if (hour % 2 !== 0) {
                    return null;
                  }
                  return <span key={i}>{format(new Date(2000, 0, 1, hour), "h a")}</span>;
                },
              ).filter(Boolean)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
