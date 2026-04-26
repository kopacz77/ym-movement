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
  const textClass = (props.textClass as string) || "text-slate-800";

  return (
    <div className={cn("px-1.5 py-0.5 h-full overflow-hidden", textClass)}>
      {/* Time display */}
      <div className="text-[10px] font-medium leading-tight opacity-70">{timeText}</div>

      {/* Rink name */}
      <div className="text-xs font-semibold leading-tight truncate">
        {isDraft && <span className="text-[9px] uppercase mr-1 font-bold opacity-60">Draft</span>}
        {props.rinkName || "Unknown"}
      </div>

      {/* Capacity indicator */}
      <div className="text-[10px] leading-tight opacity-70">
        {lessonCount}/{maxStudents} students
      </div>

      {/* Coach name (when multi-coach view) */}
      {props.coachName && (
        <div className="text-[10px] leading-tight opacity-60 truncate">{props.coachName}</div>
      )}
    </div>
  );
}
