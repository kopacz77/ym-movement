import { type LessonType, Level } from "@prisma/client";
// src/features/scheduling/utils/validationUtils.ts
import type { CalendarSlot, TimeRange } from "../types";

export interface ValidationResult {
  passed: boolean;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface StudentBookingConstraints {
  maxLessonsPerWeek: number;
  level: Level;
  currentWeekLessons: number;
}

export const validateTimeSlotBooking = (
  slot: CalendarSlot,
  studentConstraints: StudentBookingConstraints,
  lessonType: LessonType,
): ValidationResult[] => {
  const validations: ValidationResult[] = [];

  // Check slot capacity
  if (slot.currentStudents >= slot.maxStudents) {
    validations.push({
      passed: false,
      message: "Time slot is at full capacity",
      severity: "error",
    });
  }

  // Check student weekly limit
  if (studentConstraints.currentWeekLessons >= studentConstraints.maxLessonsPerWeek) {
    validations.push({
      passed: false,
      message: "Student has reached their weekly lesson limit",
      severity: "error",
    });
  }

  // Validate lesson type against student level
  const levelValidation = validateLessonTypeForLevel(lessonType, studentConstraints.level);
  if (!levelValidation.passed) {
    validations.push(levelValidation);
  }

  return validations;
};

export const validateLessonTypeForLevel = (
  lessonType: LessonType,
  studentLevel: Level,
): ValidationResult => {
  // Define level requirements for different lesson types
  const requirements: Record<LessonType, Level[]> = {
    PRIVATE: Object.values(Level), // All levels allowed
    GROUP: Object.values(Level), // All levels allowed
    CHOREOGRAPHY: [Level.JUVENILE, Level.INTERMEDIATE, Level.NOVICE, Level.JUNIOR, Level.SENIOR],
    COMPETITION_PREP: [Level.INTERMEDIATE, Level.NOVICE, Level.JUNIOR, Level.SENIOR],
  };

  const allowed = requirements[lessonType].includes(studentLevel);

  return {
    passed: allowed,
    message: allowed
      ? "Student level is appropriate for lesson type"
      : "Student level does not meet requirements for this lesson type",
    severity: allowed ? "info" : "error",
  };
};

export const detectTimeSlotConflicts = (
  proposedSlot: TimeRange,
  existingSlots: CalendarSlot[],
): ValidationResult[] => {
  const conflicts: ValidationResult[] = [];

  // Check for overlapping slots
  const overlapping = existingSlots.filter((slot) => {
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    const newStart = new Date(proposedSlot.startTime);
    const newEnd = new Date(proposedSlot.endTime);

    return (
      (newStart >= slotStart && newStart < slotEnd) ||
      (newEnd > slotStart && newEnd <= slotEnd) ||
      (newStart <= slotStart && newEnd >= slotEnd)
    );
  });

  if (overlapping.length > 0) {
    conflicts.push({
      passed: false,
      message: `Conflicts with ${overlapping.length} existing time slot(s)`,
      severity: "error",
    });
  }

  return conflicts;
};
