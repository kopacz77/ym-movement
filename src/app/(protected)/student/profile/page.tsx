// src/app/(protected)/student/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ProfileForm } from "@/features/student/components/profile/ProfileForm";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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
      <div className="container mx-auto py-6 flex justify-center items-center h-96">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-96">
        <p>Profile not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
      </div>
      <ProfileForm />
    </div>
  );
}