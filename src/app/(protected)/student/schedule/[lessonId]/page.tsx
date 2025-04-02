// app/(protected)/student/schedule/[lessonId]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Lesson Details",
  description: "View details about your scheduled lesson",
};

// Function to format time without timezone conversion and without seconds
function formatTime(date: Date): string {
  // Use UTC hours and minutes
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  
  // Format in AM/PM
  const ampm = hours >= 12 ? 'AM' : 'AM';
  const hour12 = hours % 12 || 12; // Convert 0 to 12
  
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Function to format date
function formatDate(date: Date): string {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
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
        student: {
          include: {
            user: true,
          },
        },
        rink: true,
        payment: true,
      },
    });

    if (!lesson) {
      return notFound();
    }

    // Ensure the logged-in user can only see their own lessons
    if (session.user.role !== "ADMIN" && lesson.student.userId !== session.user.id) {
      return notFound();
    }

    const startTime = new Date(lesson.startTime);
    const endTime = new Date(lesson.endTime);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

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
              <div>
                <h3 className="font-medium">Date & Time</h3>
                <p className="text-gray-600">
                  {formatDate(startTime)}, {formatTime(startTime)} - {formatTime(endTime)} ({duration} minutes)
                </p>
              </div>

              <div>
                <h3 className="font-medium">Location</h3>
                <p className="text-gray-600">
                  {lesson.rink.name}, {lesson.area}
                </p>
                <p className="text-gray-600 text-sm">{lesson.rink.address}</p>
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

              {lesson.payment && (
                <>
                  <div>
                    <h3 className="font-medium">Payment Status</h3>
                    <p className="text-gray-600">{lesson.payment.status}</p>
                  </div>

                  <div>
                    <h3 className="font-medium">Payment Method</h3>
                    <p className="text-gray-600">{lesson.payment.method}</p>
                  </div>

                  <div>
                    <h3 className="font-medium">Reference Code</h3>
                    <p className="text-gray-600 font-mono">{lesson.payment.referenceCode}</p>
                  </div>
                </>
              )}

              {!lesson.payment && (
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