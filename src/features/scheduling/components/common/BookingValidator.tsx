import { api } from "@/lib/api";
import type { LessonType } from "@prisma/client";
import { endOfWeek, startOfWeek } from "date-fns";
import React, { useEffect } from "react";
import type { CalendarSlot } from "../../types";
import { validateTimeSlotBooking } from "../../utils/ValidationUtils";
import type { StudentBookingConstraints } from "../../utils/ValidationUtils";
import { ConflictDetector } from "./ConflictDetector";

interface BookingValidatorProps {
  slot: CalendarSlot;
  studentId: string;
  lessonType: LessonType;
  onValidationComplete?: (isValid: boolean) => void;
}

export const BookingValidator: React.FC<BookingValidatorProps> = ({
  slot,
  studentId,
  lessonType,
  onValidationComplete,
}) => {
  // Fetch student data - using correct API endpoint with namespacing
  const { data: student } = api.admin.student.getStudent.useQuery(
    { studentId },
    { enabled: !!studentId },
  );

  // Fetch current week's lessons
  const startOfWeekDate = startOfWeek(new Date(slot.startTime));
  const endOfWeekDate = endOfWeek(new Date(slot.startTime));

  // Updated API endpoint with correct namespace structure
  const { data: weekLessons } = api.student.profile.getStudentLessons.useQuery(
    { studentId, startDate: startOfWeekDate, endDate: endOfWeekDate },
    { enabled: !!studentId },
  );

  const validations = React.useMemo(() => {
    if (!student || !weekLessons) {
      return [];
    }
    const constraints: StudentBookingConstraints = {
      maxLessonsPerWeek: student.maxLessonsPerWeek,
      level: student.level,
      currentWeekLessons: weekLessons.length,
    };
    return validateTimeSlotBooking(slot, constraints, lessonType);
  }, [slot, student, weekLessons, lessonType]);

  useEffect(() => {
    onValidationComplete?.(validations.every((v) => v.passed));
  }, [validations, onValidationComplete]);

  return <ConflictDetector validations={validations} showAllValidations />;
};
