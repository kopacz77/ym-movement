// src/app/(protected)/student/profile/page.tsx
"use client";

import { useEffect } from 'react';
import { ProfileForm } from '@/features/student/components/profile/ProfileForm';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { StudentProfile } from '@/features/student/types';

export default function StudentProfilePage() {
  const { toast } = useToast();
  const { id: studentId } = useCurrentUser();

  // Get student profile
  const { data: student, isLoading, error } = api.student.profile.getStudentProfile.useQuery({
    studentId,
  });

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p>Loading profile...</p>
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

  // Type assertion to match StudentProfile interface exactly
  const typedStudent = {
    ...student,
    user: {
      ...student.user,
      // Convert null to empty string to satisfy the StudentProfile type
      name: student.user.name || "",
      email: student.user.email
    },
    // Convert null to undefined for notes if needed
    notes: student.notes === null ? undefined : student.notes
  } as StudentProfile;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
      </div>
      <ProfileForm student={typedStudent} />
    </div>
  );
}