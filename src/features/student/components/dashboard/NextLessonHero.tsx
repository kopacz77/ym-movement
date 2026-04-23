// src/features/student/components/dashboard/NextLessonHero.tsx
"use client";

import { format, formatDistanceToNow } from "date-fns";
import { Calendar, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";

export function NextLessonHero() {
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  const currentDate = useMemo(() => new Date(), []);

  const { data: lessons = [], isLoading } = api.student.profile.getStudentLessons.useQuery(
    {
      studentId,
      status: "SCHEDULED",
      startDate: currentDate,
    },
    { enabled: isReady && !!studentId, retry: false },
  );

  const nextLesson = (lessons as any[])[0];

  if (!isReady || isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="h-20 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!nextLesson) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-3">No upcoming lessons scheduled</p>
          <Button asChild>
            <Link href="/student/book">Book a Lesson</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lessonDate = new Date(nextLesson.startTime || nextLesson.RinkTimeSlot?.startTime);
  const endDate = new Date(nextLesson.endTime || nextLesson.RinkTimeSlot?.endTime);
  const timeUntil = formatDistanceToNow(lessonDate, { addSuffix: true });
  const lessonType = nextLesson.type || "PRIVATE";

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-semibold text-primary">Next Lesson</p>
          </div>
          <Badge variant="outline" className="bg-white/80">
            {timeUntil}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{format(lessonDate, "EEEE, MMMM d")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(lessonDate, "h:mm a")} - {format(endDate, "h:mm a")}
            </span>
          </div>
          {nextLesson.RinkTimeSlot?.Rink?.name && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{nextLesson.RinkTimeSlot.Rink.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <Badge className="bg-primary/10 text-primary border-primary/20">
            {lessonType.replace("_", " ")}
          </Badge>
          <Button size="sm" variant="outline" className="bg-white/80" asChild>
            <Link href="/student/book">Book Another</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
