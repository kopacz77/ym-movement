// src/features/student/components/dashboard/NextLessonHero.tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import { Calendar, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import { formatRinkTime } from "@/lib/timezone";

// Loose shape for the server-prefetched lesson. We accept anything that
// satisfies the fields rendered below — exact Prisma types vary between the
// page.tsx Prisma findFirst and the TRPC procedure's select shape.
type NextLessonShape = {
  startTime: string | Date;
  endTime: string | Date;
  type?: string | null;
  Rink?: { timezone?: string | null; name?: string | null } | null;
  RinkTimeSlot?: {
    startTime?: string | Date;
    endTime?: string | Date;
    Rink?: { timezone?: string | null; name?: string | null } | null;
  } | null;
} | null;

export interface NextLessonHeroProps {
  /**
   * Server-prefetched next lesson. When provided, the hero renders with
   * content from first paint instead of showing a loading skeleton.
   * Pass `null` to opt out (e.g., from Storybook or tests). Omit entirely
   * to fall back to client-side TRPC fetch.
   */
  initialNextLesson?: NextLessonShape;
}

export function NextLessonHero({ initialNextLesson }: NextLessonHeroProps = {}) {
  const { id: studentId } = useCurrentUser();
  const hasServerData = initialNextLesson !== undefined;
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
    {
      // Don't refetch if the server already gave us the answer — saves one
      // round-trip per page load. React Query will refetch on focus / mount
      // per Providers config (refetchOnWindowFocus: false, staleTime: 5min).
      enabled: isReady && !!studentId && !hasServerData,
      retry: false,
    },
  );

  // Server data wins if provided; otherwise use the client-fetched list.
  const nextLesson = hasServerData ? initialNextLesson : (lessons as any[])[0];

  // Only show the loading skeleton when we have NO server data AND the client
  // fetch is still in flight. With server prefetch enabled, this branch is
  // skipped entirely — first paint shows real content.
  if (!hasServerData && (!isReady || isLoading)) {
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
  // Fallback to UTC if rink timezone isn't on the payload; formatRinkTime
  // logs and degrades cleanly. Real path always supplies a rink.
  const rinkTimezone =
    nextLesson.Rink?.timezone || nextLesson.RinkTimeSlot?.Rink?.timezone || "UTC";
  const timeUntil = formatDistanceToNow(lessonDate, { addSuffix: true });
  const lessonType = nextLesson.type || "PRIVATE";

  return (
    <Card className="border-cyan-200/60 bg-gradient-to-br from-cyan-50/80 via-white to-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-100">
              <Calendar className="h-4 w-4 text-cyan-700" />
            </div>
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Next Lesson</p>
          </div>
          <Badge variant="outline" className="bg-white border-cyan-200 text-cyan-700 font-medium">
            {timeUntil}
          </Badge>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-800">
              {formatRinkTime(lessonDate, rinkTimezone, "EEEE, MMMM d")}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">
              {formatRinkTime(lessonDate, rinkTimezone, "h:mm a")} -{" "}
              {formatRinkTime(endDate, rinkTimezone, "h:mm a")}
            </span>
          </div>
          {nextLesson.RinkTimeSlot?.Rink?.name && (
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">{nextLesson.RinkTimeSlot.Rink.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-cyan-100/60">
          <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200/60">
            {lessonType.replace("_", " ")}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="bg-white hover:bg-cyan-50 border-cyan-200/60 text-cyan-700"
            asChild
          >
            <Link href="/student/book">Book Another</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
