// src/features/scheduling/types/index.ts
import type { Lesson, LessonType, RinkArea } from "@prisma/client";

export interface CalendarSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  maxStudents: number;
  currentStudents: number;
  isActive: boolean;
  rinkId: string;
  rinkArea: RinkArea;
  status: "available" | "booked" | "partial" | "cancelled";
  lessons?: Lesson[];
}

export interface CalendarView {
  startDate: Date;
  endDate: Date;
  view: "day" | "week" | "month";
  rinkId?: string;
  rinkArea?: RinkArea;
}

export interface TimeRange {
  startTime: Date;
  endTime: Date;
}

export interface BookingConstraints {
  maxLessonsPerWeek: number;
  allowedLessonTypes: LessonType[];
  allowedRinkAreas: RinkArea[];
}