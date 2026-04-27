"use client";

import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const typeConfig: Record<
  string,
  { label: string; badgeClass: string; avatarBg: string; avatarText: string }
> = {
  PRIVATE: {
    label: "Private",
    badgeClass: "bg-blue-100 text-blue-700 border border-blue-200",
    avatarBg: "bg-blue-100",
    avatarText: "text-blue-700",
  },
  CHOREOGRAPHY: {
    label: "Choreography",
    badgeClass: "bg-violet-100 text-violet-700 border border-violet-200",
    avatarBg: "bg-violet-100",
    avatarText: "text-violet-700",
  },
  GROUP: {
    label: "Group",
    badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    avatarBg: "bg-emerald-100",
    avatarText: "text-emerald-700",
  },
  COMPETITION_PREP: {
    label: "Comp Prep",
    badgeClass: "bg-orange-100 text-orange-700 border border-orange-200",
    avatarBg: "bg-orange-100",
    avatarText: "text-orange-700",
  },
  OFF_ICE_DANCE: {
    label: "Off-Ice Dance",
    badgeClass: "bg-pink-100 text-pink-700 border border-pink-200",
    avatarBg: "bg-pink-100",
    avatarText: "text-pink-700",
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CoachUpcomingLessons() {
  const { data: lessons, isLoading } = api.coach.dashboard.getUpcomingLessons.useQuery({
    limit: 5,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">
          Upcoming
        </p>
        <h4 className="text-lg font-semibold text-foreground">Lessons</h4>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-5 bg-white rounded-lg border border-slate-200/50"
            >
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : lessons?.length ? (
        <div className="space-y-3">
          {lessons.map((lesson) => {
            const name = lesson.Student?.User?.name ?? "Unknown";
            const type = (lesson.type as string) ?? "PRIVATE";
            const config = typeConfig[type] ?? typeConfig.PRIVATE;

            return (
              <div
                key={lesson.id}
                className="bg-white rounded-lg p-5 border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] hover:-translate-y-1 transition-transform duration-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full ${config.avatarBg} flex items-center justify-center ${config.avatarText} font-bold text-sm`}
                  >
                    {getInitials(name)}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">{name}</h5>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(new Date(lesson.startTime), "MMM d")}</span>
                      <Clock className="h-3.5 w-3.5 ml-1" />
                      <span>{format(new Date(lesson.startTime), "h:mm a")}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.badgeClass}`}>
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">No upcoming lessons</p>
      )}
    </div>
  );
}
