import { api } from "@/lib/api";
import { type TimeSlot } from "@/types/scheduling";
import { useMemo } from "react";

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
  // biome-ignore lint/suspicious/noExplicitAny: API response type is complex
  rinks: any;
  // biome-ignore lint/suspicious/noExplicitAny: API response type is complex
  students: any;
  timeSlots: TimeSlot[] | undefined;
  events: Event[];
  processedEventsList: ProcessedEventsList[];
}

export function useTimeSlots(dateRange: DateRange, selectedRink?: string): UseTimeSlotsResult {
  // Get rinks data with error handling
  const { data: rinks, error: rinksError } = api.admin.schedule.getRinks.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Failed to fetch rinks:', error.message);
    }
  });

  // Get students data with error handling
  const { data: students } = api.admin.student.getStudents.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Failed to fetch students:', error.message);
    }
  });

  // Get time slots data with error handling
  const { data: timeSlots } = api.admin.schedule.getTimeSlots.useQuery(
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
      rinkId: selectedRink,
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: 2,
      retryDelay: 1000,
      onError: (error) => {
        console.error('Failed to fetch time slots:', error.message);
      }
    },
  );

  // Convert time slots to FullCalendar events
  const events = useMemo(
    () =>
      timeSlots?.map((slot) => {
        const studentCount = slot.Lesson?.length || 0;
        const studentNames = slot.Lesson
          ?.filter(lesson => lesson?.Student?.User)
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
