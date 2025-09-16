// src/features/student/components/schedule/LessonCard.tsx
"use client";
import { LessonStatus } from "@prisma/client";
import { Calendar, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonStatusBadge, LessonStatusIndicator } from "@/components/ui/lesson-status";
import { AdaptiveTimeRange } from "@/components/AdaptiveTime";
import type { LessonWithDetails } from "@/features/student/types";
import { formatUtcDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface LessonCardProps {
  lesson: LessonWithDetails;
  showActions?: boolean;
}

export function LessonCard({ lesson, showActions = true }: LessonCardProps) {
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
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="break-words">{lesson.Rink.name}</span>
          </div>
        </div>

        {showActions && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/student/schedule/${lesson.id}`}>View Details</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
