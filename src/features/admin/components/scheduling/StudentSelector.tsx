// src/features/admin/components/scheduling/StudentSelector.tsx
"use client";

import type React from "react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

// Define a type for the student object
interface Student {
  id: string;
  User: {
    name: string | null;
    email?: string;
  };
}

export const StudentSelector: React.FC = () => {
  // Fix: Change getStudents to student.getStudents to use the namespaced procedure
  const { data: students, isLoading } = api.admin.student.getStudents.useQuery({ active: true });

  // Local state for the selected student id.
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  if (isLoading) {
    return <div>Loading students…</div>;
  }

  return (
    <div className="space-y-2">
      <label htmlFor="student-select" className="block text-sm font-medium text-foreground">
        Select Student
      </label>
      <Select value={selectedStudent} onValueChange={setSelectedStudent}>
        <SelectTrigger id="student-select" className="w-full">
          <SelectValue placeholder="Select a student" />
        </SelectTrigger>
        <SelectContent>
          {students?.students?.map((student: Student) => (
            <SelectItem key={student.id} value={student.id}>
              {student.User?.name || "Unnamed Student"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
