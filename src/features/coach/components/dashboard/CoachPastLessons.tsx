"use client";

import { format } from "date-fns";
import { Clock, History, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const lessonTypeConfig: Record<string, { label: string; className: string }> = {
  PRIVATE: { label: "Private", className: "bg-blue-100 text-blue-800 border-blue-200" },
  CHOREOGRAPHY: {
    label: "Choreography",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  GROUP: { label: "Group", className: "bg-green-100 text-green-800 border-green-200" },
  COMPETITION_PREP: {
    label: "Competition Prep",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  OFF_ICE_DANCE: {
    label: "Off-Ice Dance",
    className: "bg-pink-100 text-pink-800 border-pink-200",
  },
};

function getLessonTypeBadge(type: string | null | undefined) {
  const config = lessonTypeConfig[type ?? "PRIVATE"] ?? lessonTypeConfig.PRIVATE;
  return <Badge className={config.className}>{config.label}</Badge>;
}

export function CoachPastLessons() {
  const { data: lessons, isLoading } = api.coach.dashboard.getPastLessons.useQuery({ limit: 5 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-gray-500" />
          Past Lessons
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 border rounded-lg">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : lessons?.length ? (
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex flex-col gap-1.5 p-3 border rounded-lg opacity-75"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">
                    {lesson.Student?.User?.name ?? "Unknown Student"}
                  </span>
                  {getLessonTypeBadge(lesson.type)}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(lesson.startTime), "MMM d, yyyy")} at{" "}
                    {format(new Date(lesson.startTime), "h:mm a")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {lesson.Rink?.name ?? "TBD"}
                  </span>
                  <span className="font-medium">${(lesson.price ?? 0).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">No past lessons</p>
        )}
      </CardContent>
    </Card>
  );
}
