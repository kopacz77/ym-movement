// src/features/admin/components/scheduling/TimeSlotDialogAdapter.tsx
import { FC } from "react";
import { TimeSlotDialog } from "./TimeSlotDialog";
import { TimeSlot as CalendarUtilsTimeSlot } from "./calendarUtils";

// Define the Student interface matching Prisma schema
interface Student {
  id: string;
  user: {
    name: string | null;
  };
}

// Define the Lesson interface matching Prisma schema
interface Lesson {
  id: string;
  student: Student;
  // Other fields can be added if needed
}

// Schedule event structure from the calendar
interface ScheduleEvent {
  schedule: {
    id: string;
    start: Date;
    end: Date;
    raw: {
      rinkId: string;
      rink: {
        id: string;
        name: string;
        timezone: string;
      };
      maxStudents: number;
      isActive: boolean;
      lessons: unknown[];
      timeDisplay: string;
      timezone: string;
    };
  };
}

interface TimeSlotDialogAdapterProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectedEvent: ScheduleEvent | null;
  selectedSlot: CalendarUtilsTimeSlot | null;
  students: Student[];
  onAssignStudent: (studentId: string) => void;
  onUnassignStudent: (lessonId: string) => void;
}

// Helper function to safely cast unknown lessons to Lesson[]
function castToLessons(unknownLessons: unknown[] | undefined): Lesson[] {
  if (!unknownLessons) { return []; }
  
  return unknownLessons.map(item => {
    // Safely access the properties we need
    const unknownLesson = item as { id?: string; student?: { id?: string; user?: { name?: string | null } } };
    return {
      id: unknownLesson.id || 'unknown',
      student: {
        id: unknownLesson.student?.id || 'unknown',
        user: {
          name: unknownLesson.student?.user?.name || null
        }
      }
    };
  });
}

export const TimeSlotDialogAdapter: FC<TimeSlotDialogAdapterProps> = ({
  selectedEvent,
  selectedSlot,
  ...props
}) => {
  // Convert ScheduleEvent to EventClickInfo format
  const adaptedEvent = selectedEvent ? {
    event: {
      id: selectedEvent.schedule.id,
      title: '',
      start: selectedEvent.schedule.start,
      end: selectedEvent.schedule.end,
      extendedProps: {
        rink: selectedEvent.schedule.raw.rink,
        currentStudents: selectedEvent.schedule.raw.lessons?.length || 0,
        maxStudents: selectedEvent.schedule.raw.maxStudents,
        // Use our helper function to safely cast
        lessons: castToLessons(selectedEvent.schedule.raw.lessons)
      }
    }
  } : null;

  // Convert slot for compatibility
  const adaptedSlot = selectedSlot ? {
    ...selectedSlot,
    lessons: castToLessons(selectedSlot.lessons)
  } : null;

  return <TimeSlotDialog 
    {...props} 
    selectedEvent={adaptedEvent}
    selectedSlot={adaptedSlot}
  />;
};