// src/features/scheduling/utils/fullcalendar-transforms.ts
import type { EventInput } from "@fullcalendar/core";
import type { TimeSlot } from "@/types/scheduling";

/**
 * Determines event background color based on slot state.
 * - Draft (unpublished): slate shades
 * - Full (booked to capacity): blue
 * - Partial (some students booked): amber
 * - Available (no students, published): green
 */
function getSlotColor(slot: TimeSlot): string {
  const lessons = slot.Lesson || [];
  if (!slot.isActive) {
    return lessons.length > 0 ? "#64748b" : "#94a3b8"; // slate-500 / slate-400
  }
  if (lessons.length >= slot.maxStudents) {
    return "#3b82f6"; // blue-500 (full)
  }
  if (lessons.length > 0) {
    return "#fbbf24"; // amber-400 (partial)
  }
  return "#22c55e"; // green-500 (available)
}

/**
 * Builds the event title string from a time slot.
 * Format: "[DRAFT] RinkName - StudentNames (filled/max) [CoachName]"
 */
function buildEventTitle(slot: TimeSlot): string {
  const lessons = slot.Lesson || [];
  let title = slot.Rink?.name || "Unknown Rink";

  if (lessons.length > 0) {
    const names = lessons
      .map((l) => l.Student?.User?.name || "Unknown")
      .filter((n) => n !== "Unknown")
      .join(", ");
    if (names) {
      title += ` - ${names}`;
    }
  }

  title += ` (${lessons.length}/${slot.maxStudents})`;

  if (slot.Coach?.User?.name) {
    title += ` [${slot.Coach.User.name}]`;
  }

  if (!slot.isActive) {
    title = `[DRAFT] ${title}`;
  }

  return title;
}

/**
 * Convert database TimeSlot[] to FullCalendar EventInput[].
 * No timezone hacks — FullCalendar handles timezone display natively
 * when you pass ISO 8601 strings and set the calendar's timeZone prop.
 */
export function timeSlotsToEvents(timeSlots: TimeSlot[]): EventInput[] {
  return timeSlots.map((slot) => ({
    id: slot.id,
    title: buildEventTitle(slot),
    start: typeof slot.startTime === "string" ? slot.startTime : slot.startTime.toISOString(),
    end: typeof slot.endTime === "string" ? slot.endTime : slot.endTime.toISOString(),
    backgroundColor: getSlotColor(slot),
    borderColor: getSlotColor(slot),
    extendedProps: {
      slot, // full slot data for dialog access
      rinkId: slot.rinkId,
      rinkName: slot.Rink?.name,
      rinkTimezone: slot.Rink?.timezone,
      lessonCount: (slot.Lesson || []).length,
      maxStudents: slot.maxStudents,
      isActive: slot.isActive,
      coachName: slot.Coach?.User?.name,
      isDraft: !slot.isActive,
    },
  }));
}

/**
 * Convert blocked date ranges to FullCalendar background events.
 * These show as colored backgrounds (not clickable regular events).
 */
export function blockedDatesToBackgroundEvents(
  blockedRanges: Array<{
    id: string;
    startDate: string | Date;
    endDate: string | Date;
    type: string;
    description?: string | null;
  }>,
): EventInput[] {
  return blockedRanges.map((range) => ({
    id: `blocked-${range.id}`,
    start: typeof range.startDate === "string" ? range.startDate : range.startDate.toISOString(),
    end: typeof range.endDate === "string" ? range.endDate : range.endDate.toISOString(),
    display: "background",
    backgroundColor:
      range.type === "COMPETITION" ? "rgba(239, 68, 68, 0.15)" : "rgba(148, 163, 184, 0.2)",
    extendedProps: {
      isBlocked: true,
      blockedRange: range,
      type: range.type,
      description: range.description,
    },
  }));
}
