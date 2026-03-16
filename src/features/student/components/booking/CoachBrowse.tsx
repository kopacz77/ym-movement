// src/features/student/components/booking/CoachBrowse.tsx
"use client";

import { api } from "@/lib/api";
import { CoachProfileCard } from "./CoachProfileCard";
import type { CoachProfile } from "./CoachProfileCard";

interface CoachBrowseProps {
  onSelectCoach: (coach: CoachProfile) => void;
}

export function CoachBrowse({ onSelectCoach }: CoachBrowseProps) {
  const { data: coaches, isLoading } = api.student.coachBrowse.getBrowsableCoaches.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Finding available coaches...</p>
      </div>
    );
  }

  if (!coaches || coaches.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No coaches are currently available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {coaches.map((coach) => (
        <CoachProfileCard key={coach.id} coach={coach} onSelect={onSelectCoach} />
      ))}
    </div>
  );
}
