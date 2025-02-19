// src/features/scheduling/components/bookings/BookingValidator.tsx
import React, { useEffect } from 'react';
import { CalendarSlot } from '../../types';
import { Level, LessonType } from '@prisma/client';
import { validateTimeSlotBooking, StudentBookingConstraints } from '../../utils/validationUtils';
import { ConflictDetector } from '../scheduling/ConflictDetector';
import { api } from '@/lib/api';

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
  onValidationComplete
}) => {
  // Fetch student data
  const { data: student } = api.admin.getStudent.useQuery(
    { studentId },
    { enabled: !!studentId }
  );

  // Fetch current week's lessons
  const startOfWeekDate = startOfWeek(new Date(slot.startTime));
  const endOfWeekDate = endOfWeek(new Date(slot.startTime));
  const { data: weekLessons } = api.admin.getStudentLessons.useQuery(
    { studentId, startDate: startOfWeekDate, endDate: endOfWeekDate },
    { enabled: !!studentId }
  );

  const validations = React.useMemo(() => {
    if (!student || !weekLessons) return [];
    const constraints: StudentBookingConstraints = {
      maxLessonsPerWeek: student.maxLessonsPerWeek,
      level: student.level,
      currentWeekLessons: weekLessons.length
    };
    return validateTimeSlotBooking(slot, constraints, lessonType);
  }, [slot, student, weekLessons, lessonType]);

  useEffect(() => {
    onValidationComplete?.(validations.every(v => v.passed));
  }, [validations, onValidationComplete]);

  return <ConflictDetector validations={validations} showAllValidations />;
};
