// src/types/index.ts
export interface User {
    id: string;
    email: string;
    name?: string;
    role: 'ADMIN' | 'COACH' | 'STUDENT';
    emailVerified?: Date;
  }
  
  export interface TimeSlot {
    id: string;
    rinkId: string;
    startTime: Date;
    endTime: Date;
    maxStudents: number;
    currentStudents: number;
    isActive: boolean;
    recurringId?: string;
  }
  
  export interface Lesson {
    id: string;
    studentId: string;
    timeSlotId: string;
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    startTime: Date;
    endTime: Date;
    cancellationReason?: string;
    cancellationTime?: Date;
  }
  
  export interface Payment {
    id: string;
    lessonId: string;
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'REFUNDED';
    createdAt: Date;
    updatedAt: Date;
  }
  