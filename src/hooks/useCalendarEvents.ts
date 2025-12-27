import { DateTime } from "luxon";
// src/hooks/useCalendarEvents.ts
import { useMemo } from "react";
import type { TimeSlot } from "@/features/admin/components/scheduling/calendarUtils";

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

/**
 * Convert a UTC time to a "fake" local Date that displays as rink local time
 * React Big Calendar displays Date objects in the browser's local timezone.
 * To show times in the rink's timezone, we create a Date where the local
 * hours/minutes match what the time would be in the rink's timezone.
 */
function convertToRinkLocalDisplay(utcTime: Date | string, rinkTimezone: string): Date {
  // Parse the UTC time and convert to rink timezone
  const dt =
    typeof utcTime === "string"
      ? DateTime.fromISO(utcTime, { zone: "utc" }).setZone(rinkTimezone)
      : DateTime.fromJSDate(utcTime, { zone: "utc" }).setZone(rinkTimezone);

  // Create a new Date using the rink-local components
  // This "fakes" the local time so React Big Calendar displays it correctly
  return new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second);
}

/**
 * Hook to convert time slots to calendar events
 * @param timeSlots - Array of time slots from the database
 * @param displayTimezoneOverride - Optional timezone to display ALL slots in (used for "All Rinks" view)
 *                                  If not provided, each slot displays in its own rink's timezone
 */
export function useCalendarEvents(
  timeSlots: TimeSlot[] | undefined,
  displayTimezoneOverride?: string
) {
  // Convert time slots to React Big Calendar events
  const events = useMemo<ExtendedCalendarEvent[]>(() => {
    if (!timeSlots) {
      return [];
    }

    return timeSlots.map((slot) => {
      // Use the override timezone if provided, otherwise use the slot's rink timezone
      // This allows "All Rinks" view to display all slots in a consistent timezone
      const displayTimezone = displayTimezoneOverride || slot.Rink?.timezone || "America/Los_Angeles";

      // Convert times to display in the chosen timezone
      // This creates "fake" Date objects where the local time matches the display timezone
      const start = convertToRinkLocalDisplay(slot.startTime, displayTimezone);
      const end = convertToRinkLocalDisplay(slot.endTime, displayTimezone);

      // Get associated lessons (use PascalCase to match database relations)
      const associatedLessons = slot.Lesson || [];

      // Build event title with rink name, student names, and count
      let title = slot.Rink.name;

      // Add student names if any lessons are assigned
      if (associatedLessons.length > 0) {
        const studentNames = associatedLessons
          .map((lesson) => lesson.Student?.User?.name || "Unknown")
          .filter((name) => name !== "Unknown")
          .join(", ");

        if (studentNames) {
          title += ` - ${studentNames}`;
        }
      }

      // Add student count
      title += ` (${associatedLessons.length}/${slot.maxStudents})`;

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
  }, [timeSlots, displayTimezoneOverride]);

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
          Lesson: slot.Lesson,
          Rink: slot.Rink,
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
