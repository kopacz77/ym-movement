// src/app/(protected)/student/book/page.tsx
"use client";

import { BookingCalendar } from "@/features/student/components/booking/BookingCalendar";

export default function BookLessonPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Book a Lesson</h1>
      </div>
      <BookingCalendar />
    </div>
  );
}
