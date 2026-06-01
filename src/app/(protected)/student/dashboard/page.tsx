// src/app/(protected)/student/dashboard/page.tsx
//
// Server Component shell that prefetches the dashboard's most-visible data
// (the next lesson, shown by NextLessonHero — the LCP element students see
// on first paint) so the page renders WITH data immediately instead of
// showing a loading spinner that gets replaced once the client TRPC call
// returns. Eliminates the ~300-500ms "shimmer → data" flash on cold loads.
//
// Auth check + studentId resolution also happens server-side (via `auth()`),
// which means:
//   - No client round-trip to derive isApproved (was useSession() before)
//   - One fewer reason the dashboard needs JS to do anything meaningful
//   - The Book button renders correctly from the very first HTML byte
//
// Below-the-fold widgets (UpcomingLessons, OutstandingPayments,
// StudentProgress) still fetch client-side via their own useQuery. That's
// fine — students see the hero immediately and the rest streams in by the
// time their eye scrolls down.

import { LessonStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "./DashboardContent";

export default async function StudentDashboardPage() {
  const session = await auth();
  const studentId = session?.user?.studentId ?? null;
  const isApproved = session?.user?.isApproved ?? false;

  // Server-fetch the soonest upcoming SCHEDULED lesson for this student.
  // Shape matches what getStudentLessons[0] returns so NextLessonHero can
  // consume it as initialData without prop munging.
  const nextLesson = studentId
    ? await prisma.lesson.findFirst({
        where: {
          studentId,
          status: LessonStatus.SCHEDULED,
          startTime: { gte: new Date() },
        },
        include: {
          Rink: true,
          Payment: true,
          Coach: { include: { User: { select: { name: true } } } },
        },
        orderBy: { startTime: "asc" },
      })
    : null;

  return <DashboardContent isApproved={isApproved} initialNextLesson={nextLesson} />;
}
