import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { api } from "@/lib/api";
import type { TimeSlot } from "@/types/scheduling";

// Define a date range type for the hook
export interface DateRange {
  start: Date;
  end: Date;
}

interface Event {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: TimeSlot & {
    currentStudents: number;
    isBooked: boolean;
  };
}

interface ProcessedEventsList {
  date: Date;
  slots: TimeSlot[];
}

interface UseTimeSlotsResult {
  rinks: any;
  students: any;
  timeSlots: TimeSlot[] | undefined;
  events: Event[];
  processedEventsList: ProcessedEventsList[];
}

export function useTimeSlots(
  dateRange: DateRange,
  selectedRink?: string,
  selectedCoachId?: string,
): UseTimeSlotsResult {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  // Get rinks data with error handling - only when authenticated
  const { data: rinks } = api.admin.schedule.getRinks.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
    enabled: isAuthenticated,
  } as any);

  // Get students data with error handling - fetch approved students for assignment
  const { data: studentsResponse } = api.admin.student.getStudents.useQuery(
    {
      limit: 100, // Get up to 100 students
      approved: true, // Only approved students can be assigned
    },
    {
      retry: 2,
      retryDelay: 1000,
      enabled: isAuthenticated,
    } as any,
  );

  // Extract students array from paginated response
  const students = studentsResponse?.students;

  // Get time slots data with error handling - only when authenticated
  const { data: timeSlots } = api.admin.schedule.getTimeSlots.useQuery(
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
      rinkId: selectedRink,
      ...(selectedCoachId && { coachId: selectedCoachId }),
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: 2,
      retryDelay: 1000,
      enabled: isAuthenticated,
    } as any,
  );

  // Convert time slots to FullCalendar events
  const events = useMemo(
    () =>
      timeSlots?.map((slot) => {
        const studentCount = slot.Lesson?.length || 0;
        const studentNames = slot.Lesson?.filter((lesson) => lesson?.Student?.User)
          ?.map((lesson) => lesson.Student.User.name || "Unnamed Student")
          .join(", ");
        const title = `${studentCount}/${slot.maxStudents} students${
          studentNames ? ` (${studentNames})` : ""
        } - ${slot.Rink.name}`;

        // Determine if the slot is booked (has at least one student)
        const isBooked = studentCount > 0;

        return {
          id: slot.id,
          title,
          start: slot.startTime,
          end: slot.endTime,
          backgroundColor: isBooked ? "#10b981" : undefined, // Green color for booked slots
          borderColor: isBooked ? "#059669" : undefined, // Slightly darker green border for booked slots
          extendedProps: {
            ...slot,
            currentStudents: studentCount,
            isBooked,
          },
        };
      }) || [],
    [timeSlots],
  );

  // Process events for display in the custom list view
  const processedEventsList = useMemo(() => {
    if (!timeSlots) {
      return [];
    }

    // Group events by day
    const groupedEvents = timeSlots.reduce(
      (groups, slot) => {
        const dateStr = new Date(slot.startTime).toISOString().split("T")[0];

        if (!groups[dateStr]) {
          groups[dateStr] = {
            date: new Date(slot.startTime),
            slots: [],
          };
        }

        groups[dateStr].slots.push(slot);
        return groups;
      },
      {} as Record<string, { date: Date; slots: TimeSlot[] }>,
    );

    // Convert to array and sort by date
    return Object.values(groupedEvents).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [timeSlots]);

  return {
    rinks,
    students,
    timeSlots,
    events,
    processedEventsList,
  };
}
