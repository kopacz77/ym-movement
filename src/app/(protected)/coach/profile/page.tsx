"use client";

import { Suspense } from "react";
import { CoachProfileForm } from "@/features/coach/components/profile/CoachProfileForm";
import { GoogleCalendarConnect } from "@/features/coach/components/profile/GoogleCalendarConnect";

export default function CoachProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
      <CoachProfileForm />
      <Suspense fallback={null}>
        <GoogleCalendarConnect />
      </Suspense>
    </div>
  );
}
