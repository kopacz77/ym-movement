// src/types/index.ts
export interface User {
  id: string;
  email: string;
  name?: string;
  role: "SUPER_ADMIN" | "ADMIN" | "COACH" | "STUDENT";
  emailVerified?: Date;
}

export type { TimeSlot } from "./scheduling";

export interface Lesson {
  id: string;
  studentId: string;
  timeSlotId: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  startTime: Date;
  endTime: Date;
  cancellationReason?: string;
  cancellationTime?: Date;
}

export interface Payment {
  id: string;
  lessonId: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "REFUNDED";
  createdAt: Date;
  updatedAt: Date;
}
