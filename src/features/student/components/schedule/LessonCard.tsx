// src/features/student/components/schedule/LessonCard.tsx
"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LessonWithDetails } from "@/features/student/types";
import { formatUtcDate, formatUtcTime12h } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { LessonStatus } from "@prisma/client";
import { Calendar, Clock, MapPin } from "lucide-react";
import Link from "next/link";

interface LessonCardProps {
  lesson: LessonWithDetails;
  showActions?: boolean;
}

export const LessonCard = ({ lesson, showActions = true }: LessonCardProps) => {
  const getStatusBadge = () => {
    switch (lesson.status) {
      case LessonStatus.SCHEDULED:
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case LessonStatus.COMPLETED:
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case LessonStatus.CANCELLED:
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge>{lesson.status}</Badge>;
    }
  };

  return (
    <Card
      className={cn("overflow-hidden", lesson.status === LessonStatus.CANCELLED && "opacity-75")}
    >
      <div
        className={cn(
          "h-2",
          lesson.status === LessonStatus.SCHEDULED && "bg-blue-500",
          lesson.status === LessonStatus.COMPLETED && "bg-green-500",
          lesson.status === LessonStatus.CANCELLED && "bg-red-500",
        )}
      />
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-medium">{lesson.type.replace("_", " ")} Lesson</h3>
          <div className="flex flex-col gap-1 items-end">{getStatusBadge()}</div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatUtcDate(lesson.startTime)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatUtcTime12h(lesson.startTime)} - {formatUtcTime12h(lesson.endTime)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{lesson.rink.name}</span>
          </div>
        </div>

        {showActions && (
          <div className="mt-4 flex justify-end">
            <Link href={`/student/schedule/${lesson.id}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
