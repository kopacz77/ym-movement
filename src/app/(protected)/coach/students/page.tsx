"use client";

import { CoachStudentList } from "@/features/coach/components/students/CoachStudentList";

export default function CoachStudentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">My Students</h1>
      <CoachStudentList />
    </div>
  );
}
