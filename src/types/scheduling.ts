// src/types/scheduling.ts
import type { LessonStatus, LessonType } from "@prisma/client";

/**
 * Represents a lesson for a student
 */
export interface Lesson {
  id: string;
  type: LessonType;
  price: number;
  status: LessonStatus;
  notes: string | null;
  Student: {
    id: string;
    User: {
      id: string;
      name: string | null;
      email: string;
    };
  };
}

/**
 * Represents a time slot for the rink
 */
export interface TimeSlot {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  maxStudents: number;
  rinkId: string;
  Rink: {
    id: string;
    name: string;
    timezone: string;
    address?: string;
  };
  Lesson?: Lesson[];
  isActive: boolean;
}

/**
 * Represents a rink
 */
export interface Rink {
  id: string;
  name: string;
  timezone: string;
  address: string;
  maxCapacity?: number;
}

/**
 * Represents a break during slot creation
 */
export interface Break {
  startTime: string;
  duration: number;
}

/**
 * Represents a form for bulk time slot creation
 */
export interface BulkTimeSlotFormValues {
  rinkId: string;
  startDate: string;
  endDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  slotDuration: number;
  breaks: Break[];
  maxStudents: number;
  daysOfWeek: number[];
}

/**
 * Represents a day with slots for accordion display
 */
export interface DayWithSlots {
  date: Date;
  slots: TimeSlot[];
}
