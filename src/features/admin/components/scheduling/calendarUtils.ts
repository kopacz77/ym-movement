// src/features/admin/components/scheduling/calendarUtils.ts
import { parseISO } from "date-fns";
import { DateTime } from "luxon";
import type { TimeSlot } from "@/types/scheduling";

export type { Lesson, TimeSlot } from "@/types/scheduling";

// Define the GroupedTimeSlot interface
export interface GroupedTimeSlot {
  formattedDate: string;
  slots: TimeSlot[];
}

// Define the event type
export interface CalendarEvent {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
  allDay?: boolean;
  status?: string;
  className?: string;
}

// Define API event interface
export interface ApiEvent {
  id: string | number;
  title?: string;
  start: string | Date;
  end: string | Date;
  resourceId?: string;
  rinkId?: string;
  allDay?: boolean;
  status?: string;
}

// Group time slots by day for the mobile view
export const groupTimeSlotsByDay = (slots?: TimeSlot[]): GroupedTimeSlot[] => {
  if (!slots || slots.length === 0) {
    return [];
  }

  // Create a map to group slots by date
  const groupedMap = new Map<string, TimeSlot[]>();

  // Process each slot
  for (const slot of slots) {
    // Convert to DateTime using proper timezone
    const slotDateTime =
      typeof slot.startTime === "string"
        ? DateTime.fromISO(slot.startTime).setZone(slot.Rink.timezone)
        : DateTime.fromJSDate(slot.startTime).setZone(slot.Rink.timezone);

    // Create a key for the date (YYYY-MM-DD)
    const dateKey = slotDateTime.toFormat("yyyy-MM-dd");

    // Add to the corresponding group
    if (!groupedMap.has(dateKey)) {
      groupedMap.set(dateKey, []);
    }
    groupedMap.get(dateKey)?.push(slot);
  }

  // Convert map to array and sort by date
  return Array.from(groupedMap.entries())
    .map(([dateKey, slots]) => {
      // Get date object from the key
      const date = DateTime.fromFormat(dateKey, "yyyy-MM-dd");

      // Format the date for display
      const formattedDate = date.toFormat("EEEE, MMMM d, yyyy");

      // Sort slots by start time
      const sortedSlots = [...slots].sort((a, b) => {
        const startA =
          typeof a.startTime === "string" ? new Date(a.startTime).getTime() : a.startTime.getTime();
        const startB =
          typeof b.startTime === "string" ? new Date(b.startTime).getTime() : b.startTime.getTime();
        return startA - startB;
      });

      return {
        formattedDate,
        slots: sortedSlots,
      };
    })
    .sort((a, b) => {
      // Extract dates from formatted strings for comparison
      const dateA = DateTime.fromFormat(a.formattedDate, "EEEE, MMMM d, yyyy");
      const dateB = DateTime.fromFormat(b.formattedDate, "EEEE, MMMM d, yyyy");
      return dateA < dateB ? -1 : 1;
    });
};

// Convert API data to calendar events
export const convertToCalendarEvents = (apiEvents: ApiEvent[]): CalendarEvent[] => {
  return apiEvents.map((event) => ({
    id: event.id,
    title: event.title || "Untitled Event",
    start: typeof event.start === "string" ? parseISO(event.start) : event.start,
    end: typeof event.end === "string" ? parseISO(event.end) : event.end,
    resourceId: event.resourceId || event.rinkId,
    allDay: event.allDay || false,
    status: event.status,
    className: getEventClassName(event.status),
  }));
};

// Get CSS class based on event status using semantic design tokens
export const getEventClassName = (status?: string): string => {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-50 border-green-500 text-green-700 hover:bg-green-100";
    case "TENTATIVE":
      return "bg-yellow-50 border-yellow-500 text-yellow-700 hover:bg-yellow-100";
    case "CANCELLED":
      return "bg-red-50 border-red-500 text-red-700 hover:bg-red-100 line-through opacity-75";
    default:
      return "bg-blue-50 border-blue-500 text-blue-700 hover:bg-blue-100";
  }
};

// Format date range for display
export const formatDateRange = (date: Date, view: string): string => {
  const dateTime = DateTime.fromJSDate(date);

  switch (view) {
    case "month": {
      return dateTime.toFormat("MMMM yyyy");
    }
    case "week": {
      // Explicitly get the Monday of the current week
      // In Luxon's ISO calendar (default), Monday is weekday 1
      const currentWeekday = dateTime.weekday;
      // Calculate how many days to go back to reach Monday
      const daysToSubtract = currentWeekday === 1 ? 0 : currentWeekday - 1;
      const startOfWeek = dateTime.minus({ days: daysToSubtract });

      // End of week is 6 days later (Sunday)
      const endOfWeek = startOfWeek.plus({ days: 6 });

      // Format differently if same month or different months
      if (startOfWeek.month === endOfWeek.month) {
        return `${startOfWeek.toFormat("MMM d")} - ${endOfWeek.toFormat(
          "d",
        )}, ${startOfWeek.toFormat("yyyy")}`;
      }
      return `${startOfWeek.toFormat("MMM d")} - ${endOfWeek.toFormat(
        "MMM d",
      )}, ${startOfWeek.toFormat("yyyy")}`;
    }
    case "day": {
      return dateTime.toFormat("EEEE, MMMM d, yyyy");
    }
    default: {
      return dateTime.toFormat("MMMM yyyy");
    }
  }
};

// Get time slots for a day
export const getDayTimeSlots = (date: Date, interval = 30): Date[] => {
  const slots: Date[] = [];
  const day = new Date(date);

  // Reset to start of day
  day.setHours(0, 0, 0, 0);

  // Generate slots for the entire day
  for (let minutes = 0; minutes < 24 * 60; minutes += interval) {
    const slot = new Date(day);
    slot.setMinutes(minutes);
    slots.push(slot);
  }

  return slots;
};
