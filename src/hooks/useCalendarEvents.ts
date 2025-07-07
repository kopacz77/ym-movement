import type { TimeSlot } from "@/features/admin/components/scheduling/calendarUtils";
import { DateTime } from "luxon";
// src/hooks/useCalendarEvents.ts
import { useMemo } from "react";

// Extended calendar event type for our specific needs
export interface ExtendedCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: string;
  allDay: boolean;
  backgroundColor: string;
  slot: TimeSlot;
}

interface ProcessedEvents {
  formattedDate: string;
  slots: TimeSlot[];
}

export function useCalendarEvents(timeSlots: TimeSlot[] | undefined) {
  // Convert time slots to React Big Calendar events
  const events = useMemo<ExtendedCalendarEvent[]>(() => {
    if (!timeSlots) {
      return [];
    }

    return timeSlots.map((slot) => {
      // Convert startTime and endTime to Date objects
      const start = typeof slot.startTime === "string" ? new Date(slot.startTime) : slot.startTime;

      const end = typeof slot.endTime === "string" ? new Date(slot.endTime) : slot.endTime;

      // Get associated lessons
      const associatedLessons = slot.lessons || [];

      // Build event title
      const title = `${slot.Rink.name} (${associatedLessons.length}/${slot.maxStudents})`;

      // Determine color based on slot status
      let backgroundColor = "#22c55e"; // green-500 (default/available)

      if (!slot.isActive) {
        backgroundColor = "#94a3b8"; // slate-400 (inactive)
      } else if (associatedLessons.length >= slot.maxStudents) {
        backgroundColor = "#3b82f6"; // blue-500 (full)
      } else if (associatedLessons.length > 0) {
        backgroundColor = "#fbbf24"; // amber-400 (partially filled)
      }

      // Create the event object for React Big Calendar
      return {
        id: slot.id,
        title,
        start,
        end,
        resourceId: slot.Rink.id,
        allDay: false,
        backgroundColor,
        slot, // Store the original slot for reference
      };
    });
  }, [timeSlots]);

  // Process events for the mobile list view
  const processedEvents = useMemo<ProcessedEvents[]>(() => {
    if (!timeSlots) {
      return [];
    }

    // For now, manually group the time slots by day
    const groupedMap = new Map<string, TimeSlot[]>();

    // Use for...of instead of forEach
    for (const slot of timeSlots) {
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

      // Convert Date objects to strings for startTime and endTime
      const startTimeStr =
        typeof slot.startTime === "string" ? slot.startTime : slot.startTime.toISOString();

      const endTimeStr =
        typeof slot.endTime === "string" ? slot.endTime : slot.endTime.toISOString();

      const groupSlots = groupedMap.get(dateKey);
      if (groupSlots) {
        groupSlots.push({
          id: slot.id,
          startTime: startTimeStr,
          endTime: endTimeStr,
          maxStudents: slot.maxStudents,
          isActive: slot.isActive,
          lessons: slot.lessons,
          rink: slot.rink,
        });
      }
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
          const startA = typeof a.startTime === "string" ? new Date(a.startTime).getTime() : 0;
          const startB = typeof b.startTime === "string" ? new Date(b.startTime).getTime() : 0;
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
  }, [timeSlots]);

  return {
    events,
    processedEvents,
  };
}
