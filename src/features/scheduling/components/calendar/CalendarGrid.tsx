"use client";
import type React from "react";
import { format, addMinutes, startOfWeek, endOfWeek } from "date-fns";
import type { CalendarSlot, CalendarView } from "../../types";
import { TimeSlotCell } from "./TimeSlotCell";

interface CalendarGridProps {
  view: CalendarView;
  slots: CalendarSlot[];
  onSlotClickAction: (slot: CalendarSlot) => void; // Renamed to indicate a Server Action
  onSlotHoverAction?: (slot: CalendarSlot) => void; // Renamed to indicate a Server Action
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 10 PM
const MINUTES = [0, 30]; // 30-minute intervals

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  view,
  slots,
  onSlotClickAction,
  onSlotHoverAction,
}) => {
  const startDate = startOfWeek(view.startDate);
  const endDate = endOfWeek(view.endDate);

  const getSlotForTime = (date: Date): CalendarSlot | undefined => {
    return slots.find((slot) => slot.startTime.getTime() === date.getTime());
  };

  // Generate array of dates for the week
  const dayDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    return date;
  });

  return (
    <div className="overflow-auto">
      <div className="grid grid-cols-8 gap-px bg-gray-200">
        {/* Time labels column */}
        <div className="col-span-1 bg-white">
          <div className="h-12" /> {/* Header spacer */}
          {HOURS.map((hour) =>
            MINUTES.map((minute) => (
              <div
                key={`time-${hour}-${minute}`}
                className="h-12 border-b flex items-center justify-end pr-2 text-sm text-gray-500"
              >
                {format(new Date().setHours(hour, minute), "h:mm a")}
              </div>
            )),
          )}
        </div>
        {/* Days columns */}
        {dayDates.map((date) => {
          const dayStr = format(date, "yyyy-MM-dd");
          return (
            <div key={dayStr} className="col-span-1 bg-white">
              {/* Day header */}
              <div className="h-12 border-b flex items-center justify-center font-medium">
                {format(date, "EEE M/d")}
              </div>
              {/* Time slots */}
              {HOURS.map((hour) =>
                MINUTES.map((minute) => {
                  const slotDate = new Date(date);
                  slotDate.setHours(hour, minute, 0, 0);
                  const slot = getSlotForTime(slotDate);
                  const timeKey = `${dayStr}-${hour}-${minute}`;
                  return (
                    <TimeSlotCell
                      key={timeKey}
                      slot={slot}
                      onClick={() => slot && onSlotClickAction(slot)}
                      onHover={() => slot && onSlotHoverAction?.(slot)}
                    />
                  );
                }),
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
