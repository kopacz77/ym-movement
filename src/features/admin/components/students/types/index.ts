// src/features/admin/components/students/types/index.ts
import type { Lesson, Level, User } from "@prisma/client";

export interface Student {
  id: string;
  userId: string;
  level: Level;
  phone?: string | null;
  maxLessonsPerWeek: number;
  notes?: string | null;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  } | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  totalLessons?: number;
}

export interface StudentFormData {
  name: string;
  email: string;
  phone?: string;
  level: Level;
  maxLessonsPerWeek: number;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  notes?: string;
  active?: boolean;
}

export interface StudentStats {
  totalLessons: number;
  completedLessons: number;
  upcomingLessons: number;
  attendanceRate: number;
  lastLesson?: Date;
  nextLesson?: Date;
}

export interface LessonNote {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: { name: string };
}

export interface StudentProgress {
  date: string;
  skillProgress: number;
  attendance: number;
}

export interface AttendanceData {
  total: number;
  attended: number;
  cancelled: number;
  attendanceRate: number;
  lessons: Array<{ date: Date; status: string; cancellationReason?: string }>;
}

// Omit the 'notes' property from Lesson before redefining it as LessonNote[]
export interface LessonDetails extends Omit<Lesson, "notes"> {
  notes: LessonNote[];
  duration: number;
}
