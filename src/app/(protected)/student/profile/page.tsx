// src/app/(protected)/student/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProfileForm } from "@/features/student/components/profile/ProfileForm";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default function StudentProfilePage() {
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);

  // Only fetch data when studentId is available
  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  // Get student profile
  const {
    data: student,
    isLoading,
    error,
  } = api.student.profile.getStudentProfile.useQuery(
    { studentId },
    {
      enabled: isReady && !!studentId,
      retry: false,
    },
  );

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast.error("Error loading profile", {
        description: error.message,
      });
    }
  }, [error]);

  if (!isReady || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex justify-center items-center h-96">
        <p>Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Profile</h1>
      </div>
      <ProfileForm />
    </div>
  );
}
