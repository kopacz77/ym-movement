// src/features/scheduling/utils/fullcalendar-transforms.ts
import type { EventInput } from "@fullcalendar/core";
import type { TimeSlot } from "@/types/scheduling";

/**
 * Determines event colors based on lesson type (Stitch-style transparent tinted blocks).
 * Returns bg (rgba background), border (rgba border), and textClass (Tailwind text color).
 *
 * Color mapping by lesson type:
 * - Private: blue tint
 * - Choreography: purple tint
 * - Group: green tint
 * - Competition Prep: orange tint
 * - Available (no lessons): subtle green
 * - Draft: reduced opacity or slate
 */
function getSlotColors(slot: TimeSlot): { bg: string; border: string; textClass: string } {
  const lessons = slot.Lesson || [];
  const primaryType = lessons[0]?.type as string | undefined;

  // Lesson-type color map
  const typeColors: Record<string, { bg: string; border: string; textClass: string }> = {
    PRIVATE: {
      bg: "rgba(59, 130, 246, 0.30)",
      border: "rgba(59, 130, 246, 0.6)",
      textClass: "text-blue-900",
    },
    CHOREOGRAPHY: {
      bg: "rgba(168, 85, 247, 0.30)",
      border: "rgba(168, 85, 247, 0.6)",
      textClass: "text-purple-900",
    },
    GROUP: {
      bg: "rgba(34, 197, 94, 0.30)",
      border: "rgba(34, 197, 94, 0.6)",
      textClass: "text-green-900",
    },
    COMPETITION_PREP: {
      bg: "rgba(249, 115, 22, 0.30)",
      border: "rgba(249, 115, 22, 0.6)",
      textClass: "text-orange-900",
    },
  };

  // Draft with lessons: same lesson-type color but more subtle
  const draftTypeColors: Record<string, { bg: string; border: string; textClass: string }> = {
    PRIVATE: {
      bg: "rgba(59, 130, 246, 0.15)",
      border: "rgba(59, 130, 246, 0.4)",
      textClass: "text-blue-800",
    },
    CHOREOGRAPHY: {
      bg: "rgba(168, 85, 247, 0.15)",
      border: "rgba(168, 85, 247, 0.4)",
      textClass: "text-purple-800",
    },
    GROUP: {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "rgba(34, 197, 94, 0.4)",
      textClass: "text-green-800",
    },
    COMPETITION_PREP: {
      bg: "rgba(249, 115, 22, 0.15)",
      border: "rgba(249, 115, 22, 0.4)",
      textClass: "text-orange-800",
    },
  };

  if (!slot.isActive) {
    // Draft slot
    if (lessons.length > 0 && primaryType && draftTypeColors[primaryType]) {
      return draftTypeColors[primaryType];
    }
    // Draft without lessons
    return {
      bg: "rgba(148, 163, 184, 0.20)",
      border: "rgba(148, 163, 184, 0.45)",
      textClass: "text-slate-600",
    };
  }

  // Active slot with lessons
  if (lessons.length > 0 && primaryType && typeColors[primaryType]) {
    return typeColors[primaryType];
  }

  // Available slot (no lessons, published)
  return {
    bg: "rgba(34, 197, 94, 0.25)",
    border: "rgba(34, 197, 94, 0.55)",
    textClass: "text-green-800",
  };
}

/**
 * Builds the event title string from a time slot.
 * Format: "[DRAFT] RinkName - StudentNames (filled/max) [CoachName]"
 */
function buildEventTitle(slot: TimeSlot): string {
  const lessons = slot.Lesson || [];
  let title = slot.Rink?.name || "Blocked";

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
  return timeSlots.map((slot) => {
    const colors = getSlotColors(slot);
    const lessons = slot.Lesson || [];

    return {
      id: slot.id,
      title: buildEventTitle(slot),
      start: typeof slot.startTime === "string" ? slot.startTime : slot.startTime.toISOString(),
      end: typeof slot.endTime === "string" ? slot.endTime : slot.endTime.toISOString(),
      backgroundColor: colors.bg,
      borderColor: colors.border,
      extendedProps: {
        slot, // full slot data for dialog access
        rinkId: slot.rinkId,
        rinkName: slot.Rink?.name,
        rinkTimezone: slot.Rink?.timezone,
        lessonCount: lessons.length,
        maxStudents: slot.maxStudents,
        isActive: slot.isActive,
        coachName: slot.Coach?.User?.name,
        isDraft: !slot.isActive,
        textClass: colors.textClass,
        lessonType: lessons[0]?.type || null,
      },
    };
  });
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
