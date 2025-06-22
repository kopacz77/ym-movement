// src/app/(protected)/student/book/page.tsx
"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import { CalendarSkeleton } from "@/components/ui/calendar-skeleton";
import dynamic from "next/dynamic";

const BookingCalendar = dynamic(
  () =>
    import("@/features/student/components/booking/BookingCalendar").then((mod) => ({
      default: mod.BookingCalendar,
    })),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false,
  },
);

export default function BookLessonPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Book a Lesson</h1>
      </div>
      <ErrorBoundary>
        <BookingCalendar />
      </ErrorBoundary>
    </div>
  );
}
