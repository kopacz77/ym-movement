// src/features/student/types/index.ts
import type { LessonStatus, LessonType, Level, PaymentStatus } from "@prisma/client";

export interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  maxStudents: number;
  currentStudents: number;
  isActive: boolean;
  rinkId: string;
  Rink: {
    name: string;
    address: string;
    timezone: string;
  };
}

export interface LessonWithDetails {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  type: LessonType;
  status: LessonStatus;
  price: number;
  notes?: string;
  timeSlot?: {
    id: string;
  };
  Rink: {
    name: string;
    address: string;
    timezone: string;
  };
  Payment?: {
    id: string;
    status: PaymentStatus;
    amount: number;
    method: string;
    referenceCode: string;
  };
}

export interface StudentProfile {
  id: string;
  userId: string;
  User: {
    name: string;
    email: string;
  };
  phone?: string;
  maxLessonsPerWeek: number;
  level: Level;
  isApproved: boolean;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  } | null;
  notes?: string;
}

export interface BookingRequest {
  timeSlotId: string;
  type: LessonType;
  paymentMethod: string;
}

export interface CancellationRequest {
  lessonId: string;
  reason: string;
}

export interface AvailabilityFilters {
  startDate?: Date;
  endDate?: Date;
  rinkId?: string;
}

export interface LessonStats {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  thisWeekCount: number;
  maxAllowed: number;
}
