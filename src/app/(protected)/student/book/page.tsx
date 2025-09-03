// src/app/(protected)/student/book/page.tsx
"use client";

import dynamic from "next/dynamic";
import { ApprovalGuard } from "@/components/ApprovalGuard";
import { ErrorBoundary } from "@/components/error-boundary";
import { CalendarSkeleton } from "@/components/ui/calendar-skeleton";

const BookingCalendar = dynamic(
  () => import("@/features/student/components/booking/BookingCalendar"),
  {
    loading: () => <CalendarSkeleton />,
  },
);

export default function BookLessonPage() {
  return (
    <ApprovalGuard 
      fallbackTitle="Account Approval Required" 
      fallbackMessage="Your account must be approved by an administrator before you can book lessons."
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Book a Lesson</h1>
        </div>
        <ErrorBoundary>
          <BookingCalendar />
        </ErrorBoundary>
      </div>
    </ApprovalGuard>
  );
}
