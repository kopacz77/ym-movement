// src/features/scheduling/components/calendar/FCEventContent.tsx
"use client";

import type { EventContentArg } from "@fullcalendar/core";
import { cn } from "@/lib/utils";

/**
 * Custom event content for FullCalendar.
 * Shows rink name, student names, capacity, and coach.
 *
 * Font sizes are UNIFORM across all event cards — they scale with the
 * calendar column width (via container-query-like cqi units), not with
 * individual event duration. Short slots simply clip overflow gracefully.
 */
export function FCEventContent({ event, timeText }: EventContentArg) {
  const props = event.extendedProps;
  const isDraft = props.isDraft;
  const lessonCount = props.lessonCount ?? 0;
  const maxStudents = props.maxStudents ?? 1;
  const textClass = (props.textClass as string) || "text-slate-800";

  return (
    <div
      className={cn(
        "fc-event-scaled px-2 py-1 h-full overflow-hidden flex flex-col gap-0.5",
        textClass,
      )}
    >
      {/* Time display */}
      <div className="fc-ev-time font-medium leading-tight opacity-70">{timeText}</div>

      {/* Rink name + draft badge */}
      <div className="fc-ev-primary font-semibold leading-tight truncate">
        {isDraft && <span className="fc-ev-badge uppercase mr-1 font-bold opacity-60">Draft</span>}
        {props.rinkName || "Blocked"}
      </div>

      {/* Capacity indicator */}
      <div className="fc-ev-secondary leading-tight opacity-70">
        {lessonCount}/{maxStudents} students
      </div>

      {/* Coach name (when multi-coach view) */}
      {props.coachName && (
        <div className="fc-ev-secondary leading-tight opacity-60 truncate">{props.coachName}</div>
      )}
    </div>
  );
}
