// src/features/scheduling/components/calendar/FCEventContent.tsx
"use client";

import type { EventContentArg } from "@fullcalendar/core";
import { cn } from "@/lib/utils";

/**
 * Custom event content for FullCalendar.
 * Shows rink name, student names, capacity, and coach.
 * Adapts display based on event height (time grid vs month grid).
 */
export function FCEventContent({ event, timeText }: EventContentArg) {
  const props = event.extendedProps;
  const isDraft = props.isDraft;
  const lessonCount = props.lessonCount ?? 0;
  const maxStudents = props.maxStudents ?? 1;

  return (
    <div className={cn("px-1 py-0.5 h-full overflow-hidden text-white", isDraft && "opacity-75")}>
      {/* Time display */}
      <div className="text-[10px] font-medium leading-tight">{timeText}</div>

      {/* Rink name */}
      <div className="text-xs font-semibold leading-tight truncate">
        {isDraft && <span className="text-[9px] uppercase mr-1">Draft</span>}
        {props.rinkName || "Unknown"}
      </div>

      {/* Capacity indicator */}
      <div className="text-[10px] leading-tight opacity-90">
        {lessonCount}/{maxStudents} students
      </div>

      {/* Coach name (when multi-coach view) */}
      {props.coachName && (
        <div className="text-[10px] leading-tight opacity-80 truncate">{props.coachName}</div>
      )}
    </div>
  );
}
