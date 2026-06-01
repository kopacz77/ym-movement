// src/features/student/components/schedule/LessonCard.tsx
"use client";
import { LessonStatus } from "@prisma/client";
import { Calendar, Clock, MapPin, User, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdaptiveTimeRange } from "@/components/AdaptiveTime";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LessonStatusBadge } from "@/components/ui/lesson-status";
import type { LessonWithDetails } from "@/features/student/types";
import { formatRinkTime } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { CancellationDialog } from "./CancellationDialog";

const typeConfig: Record<string, { label: string; badgeClass: string }> = {
  PRIVATE: {
    label: "Private",
    badgeClass: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  CHOREOGRAPHY: {
    label: "Choreography",
    badgeClass: "bg-violet-100 text-violet-700 border border-violet-200",
  },
  GROUP: {
    label: "Group",
    badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  COMPETITION_PREP: {
    label: "Comp Prep",
    badgeClass: "bg-orange-100 text-orange-700 border border-orange-200",
  },
  OFF_ICE_DANCE: {
    label: "Off-Ice Dance",
    badgeClass: "bg-pink-100 text-pink-700 border border-pink-200",
  },
};

interface LessonCardProps {
  lesson: LessonWithDetails;
  showActions?: boolean;
}

export function LessonCard({ lesson, showActions = true }: LessonCardProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const now = new Date();
  const isUpcoming = lesson.startTime > now && lesson.status === "SCHEDULED";
  const hoursUntilLesson = (lesson.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLateCancellation = hoursUntilLesson < 24;

  const type = (lesson.type as string) ?? "PRIVATE";
  const config = typeConfig[type] ?? typeConfig.PRIVATE;

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)] transition-all duration-200",
        lesson.status === LessonStatus.CANCELLED && "opacity-60",
      )}
    >
      <CardContent className="p-5">
        {/* Header: lesson type badge + status badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium", config.badgeClass)}>
            {config.label}
          </span>
          <LessonStatusBadge status={lesson.status as any} />
        </div>

        {/* Details */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-700">
              {formatRinkTime(lesson.startTime, lesson.Rink.timezone, "EEEE, MMMM d, yyyy")}
            </span>
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
            {lesson.Rink.isVirtual ? (
              <Video className="h-4 w-4 text-slate-400 flex-shrink-0" />
            ) : (
              <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
            )}
            <span className="break-words">{lesson.Rink.name}</span>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-slate-600">
            <User className="h-4 w-4 text-slate-400" />
            <span>{lesson.Coach?.User?.name || "Instructor"}</span>
          </div>
        </div>

        {showActions && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end gap-2">
            {isUpcoming && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => setCancelDialogOpen(true)}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200"
              asChild
            >
              <Link href={`/student/schedule/${lesson.id}`}>View Details</Link>
            </Button>
          </div>
        )}

        {isUpcoming && (
          <CancellationDialog
            lessonId={lesson.id}
            open={cancelDialogOpen}
            onCloseAction={() => setCancelDialogOpen(false)}
            isLateCancellation={isLateCancellation}
            lessonPrice={lesson.price}
          />
        )}
      </CardContent>
    </Card>
  );
}
