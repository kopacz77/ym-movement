// src/features/admin/components/scheduling/TimeSlotDialogAdapter.tsx
import type { FC } from "react";
import type { TimeSlot as CalendarUtilsTimeSlot } from "./calendarUtils";
import { TimeSlotDialog } from "./TimeSlotDialog";

// Define the StudentNote interface matching Prisma schema
interface StudentNote {
  id: string;
  content: string;
  createdAt: Date;
  type: string;
  User: {
    name: string | null;
  };
}

// Define the Student interface matching Prisma schema
interface Student {
  id: string;
  notes: string | null;
  StudentNote?: StudentNote[];
  User: {
    id: string;
    name: string | null;
    email: string;
  };
}

// Define the Lesson interface matching Prisma schema
interface Lesson {
  id: string;
  type: string;
  price: number;
  status: string;
  notes: string | null;
  Student: Student;
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
      Lesson: unknown[];
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
  isAssigning?: boolean;
  isUnassigning?: boolean;
}

// Helper function to safely cast unknown Lesson to Lesson[]
function castToLessons(unknownLessons: unknown[] | undefined): Lesson[] {
  if (!unknownLessons) {
    return [];
  }

  return unknownLessons.map((item) => {
    // Safely access the properties we need
    const unknownLesson = item as {
      id?: string;
      type?: string;
      price?: number;
      status?: string;
      notes?: string | null;
      student?: {
        id?: string;
        notes?: string | null;
        StudentNote?: unknown[];
        user?: { id?: string; name?: string | null; email?: string };
      };
      Student?: {
        id?: string;
        notes?: string | null;
        StudentNote?: unknown[];
        User?: { id?: string; name?: string | null; email?: string };
      };
    };
    return {
      id: unknownLesson.id || "unknown",
      type: unknownLesson.type || "PRIVATE",
      price: unknownLesson.price || 0,
      status: unknownLesson.status || "CONFIRMED",
      notes: unknownLesson.notes || null,
      Student: {
        id: unknownLesson.Student?.id || unknownLesson.student?.id || "unknown",
        notes: unknownLesson.Student?.notes || unknownLesson.student?.notes || null,
        StudentNote: (
          unknownLesson.Student?.StudentNote ||
          unknownLesson.student?.StudentNote ||
          []
        ).map((note: any) => ({
          id: note?.id || "",
          content: note?.content || "",
          createdAt: note?.createdAt ? new Date(note.createdAt) : new Date(),
          type: note?.type || "GENERAL",
          User: {
            name: note?.User?.name || null,
          },
        })),
        User: {
          id: unknownLesson.Student?.User?.id || unknownLesson.student?.user?.id || "unknown",
          name: unknownLesson.Student?.User?.name || unknownLesson.student?.user?.name || null,
          email: unknownLesson.Student?.User?.email || unknownLesson.student?.user?.email || "",
        },
      },
    };
  });
}

export const TimeSlotDialogAdapter: FC<TimeSlotDialogAdapterProps> = ({
  selectedEvent,
  selectedSlot,
  isAssigning,
  isUnassigning,
  ...props
}) => {
  // Convert ScheduleEvent to EventClickInfo format
  const adaptedEvent = selectedEvent
    ? {
        event: {
          id: selectedEvent.schedule.id,
          title: "",
          start: selectedEvent.schedule.start,
          end: selectedEvent.schedule.end,
          extendedProps: {
            Rink: selectedEvent.schedule.raw.rink,
            currentStudents: selectedEvent.schedule.raw.Lesson?.length || 0,
            maxStudents: selectedEvent.schedule.raw.maxStudents,
            // Use our helper function to safely cast
            Lesson: castToLessons(selectedEvent.schedule.raw.Lesson),
          },
        },
      }
    : null;

  // Convert slot for compatibility
  const adaptedSlot = selectedSlot
    ? {
        ...selectedSlot,
        Lesson: castToLessons(selectedSlot.Lesson),
        Rink: selectedSlot.Rink || (selectedSlot as any).rink,
      }
    : null;

  return (
    <TimeSlotDialog
      {...props}
      selectedEvent={adaptedEvent}
      selectedSlot={adaptedSlot}
      isAssigning={isAssigning}
      isUnassigning={isUnassigning}
    />
  );
};
