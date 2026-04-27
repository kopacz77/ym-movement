// src/app/(protected)/student/book/page.tsx
"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ApprovalGuard } from "@/components/ApprovalGuard";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { CalendarSkeleton } from "@/components/ui/calendar-skeleton";
import { CoachBrowse } from "@/features/student/components/booking/CoachBrowse";
import type { CoachProfile } from "@/features/student/components/booking/CoachProfileCard";

const BookingCalendar = dynamic(
  () => import("@/features/student/components/booking/BookingCalendar"),
  {
    loading: () => <CalendarSkeleton />,
  },
);

export default function BookLessonPage() {
  const [selectedCoach, setSelectedCoach] = useState<CoachProfile | null>(null);

  return (
    <ApprovalGuard
      fallbackTitle="Account Approval Required"
      fallbackMessage="Your account must be approved by an administrator before you can book lessons."
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedCoach
              ? `Book a Lesson with ${selectedCoach.name || "Coach"}`
              : "Choose Your Coach"}
          </h1>
          {selectedCoach && (
            <Button variant="outline" size="sm" onClick={() => setSelectedCoach(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Change Coach
            </Button>
          )}
        </div>
        <ErrorBoundary>
          {selectedCoach ? (
            <BookingCalendar coachId={selectedCoach.id} coachName={selectedCoach.name || "Coach"} />
          ) : (
            <CoachBrowse onSelectCoach={setSelectedCoach} />
          )}
        </ErrorBoundary>
      </div>
    </ApprovalGuard>
  );
}
