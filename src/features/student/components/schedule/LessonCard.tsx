// src/features/student/components/schedule/LessonCard.tsx
"use client";
import { LessonStatus } from "@prisma/client";
import { Calendar, Clock, MapPin, User, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdaptiveTimeRange } from "@/components/AdaptiveTime";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonStatusBadge, LessonStatusIndicator } from "@/components/ui/lesson-status";
import type { LessonWithDetails } from "@/features/student/types";
import { formatUtcDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { CancellationDialog } from "./CancellationDialog";

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

  return (
    <Card
      className={cn("overflow-hidden", lesson.status === LessonStatus.CANCELLED && "opacity-75")}
    >
      <LessonStatusIndicator status={lesson.status as any} />

      <CardHeader>
        <CardTitle className="text-base">{lesson.type.replace("_", " ")} Lesson</CardTitle>
        <CardAction>
          <LessonStatusBadge status={lesson.status as any} />
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatUtcDate(lesson.startTime)}</span>
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
            {lesson.Rink.isVirtual ? (
              <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="break-words">{lesson.Rink.name}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{lesson.Coach?.User?.name || "Instructor"}</span>
          </div>
        </div>

        {showActions && (
          <div className="mt-4 flex justify-end gap-2">
            {isUpcoming && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setCancelDialogOpen(true)}
              >
                Cancel
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
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
