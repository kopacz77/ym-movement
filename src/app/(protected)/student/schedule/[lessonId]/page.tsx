// app/(protected)/student/schedule/[lessonId]/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRinkTime } from "@/lib/timezone";
import { formatUtcDate } from "@/lib/date-utils";
import { TimezoneAwareLessonTime } from "@/components/TimezoneAwareLessonTime";

export const metadata: Metadata = {
  title: "Lesson Details",
  description: "View details about your scheduled lesson",
};

// Helper function to format time with timezone awareness
function formatLessonTime(date: Date, timezone: string): string {
  return formatRinkTime(date, timezone, "h:mm a");
}

// The key change: params is a Promise that must be awaited
export default async function LessonDetailsPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  // Await the params - this is critical for Next.js 15.2
  const { lessonId } = await params;

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return notFound();
  }

  if (!lessonId) {
    return notFound();
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        Student: {
          include: {
            User: true,
          },
        },
        Rink: true,
        Payment: true,
      },
    });

    if (!lesson) {
      return notFound();
    }

    // Ensure the logged-in user can only see their own lessons
    if (session.user.role !== "ADMIN" && lesson.Student.userId !== session.user.id) {
      return notFound();
    }

    const startTime = new Date(lesson.startTime);
    const endTime = new Date(lesson.endTime);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Format times in the rink's timezone
    const startTimeFormatted = formatLessonTime(startTime, lesson.Rink.timezone);
    const endTimeFormatted = formatLessonTime(endTime, lesson.Rink.timezone);

    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/student/schedule" className="text-sm text-blue-600 hover:underline">
            &larr; Back to Schedule
          </Link>
        </div>

        <h1 className="text-2xl font-bold">Lesson Details</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold text-lg mb-4">Lesson Information</h2>
            <div className="space-y-3">
              <TimezoneAwareLessonTime
                startTime={startTime}
                endTime={endTime}
                rinkTimezone={lesson.Rink.timezone}
                rinkName={lesson.Rink.name}
                duration={duration}
              />

              <div>
                <h3 className="font-medium">Location</h3>
                <p className="text-gray-600">
                  {lesson.Rink.name}, {lesson.area}
                </p>
                <p className="text-gray-600 text-sm">{lesson.Rink.address}</p>
              </div>

              <div>
                <h3 className="font-medium">Lesson Type</h3>
                <p className="text-gray-600">{lesson.type}</p>
              </div>

              <div>
                <h3 className="font-medium">Status</h3>
                <p className="text-gray-600">{lesson.status}</p>
                {lesson.cancellationReason && (
                  <p className="text-sm text-gray-600">Reason: {lesson.cancellationReason}</p>
                )}
              </div>

              {lesson.notes && (
                <div>
                  <h3 className="font-medium">Notes</h3>
                  <p className="text-gray-600">{lesson.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="font-semibold text-lg mb-4">Payment Information</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-medium">Amount</h3>
                <p className="text-gray-600">${lesson.price.toFixed(2)}</p>
              </div>

              {lesson.Payment && (
                <>
                  <div>
                    <h3 className="font-medium">Payment Status</h3>
                    <p className="text-gray-600">{lesson.Payment.status}</p>
                  </div>

                  <div>
                    <h3 className="font-medium">Payment Method</h3>
                    <p className="text-gray-600">{lesson.Payment.method}</p>
                  </div>

                  <div>
                    <h3 className="font-medium">Reference Code</h3>
                    <p className="text-gray-600 font-mono">{lesson.Payment.referenceCode}</p>
                  </div>
                </>
              )}

              {!lesson.Payment && (
                <p className="text-gray-600">No payment information available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching lesson details:", error);
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold">Error</h1>
        <p>Unable to load lesson details. Please try again later.</p>
      </div>
    );
  }
}
