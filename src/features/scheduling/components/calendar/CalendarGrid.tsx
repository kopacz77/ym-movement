"use client";
import { DateTime } from "luxon";
import type React from "react";
import type { CalendarSlot, CalendarView } from "../../types";
import { TimeSlotCell } from "./TimeSlotCell";

interface CalendarGridProps {
  view: CalendarView;
  slots: CalendarSlot[];
  rinkTimezone: string; // Add this prop to specify the rink's timezone
  onSlotClickAction: (slot: CalendarSlot) => void;
  onSlotHoverAction?: (slot: CalendarSlot) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 10 PM
const MINUTES = [0, 30]; // 30-minute intervals

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  view,
  slots,
  rinkTimezone,
  onSlotClickAction,
  onSlotHoverAction,
}) => {
  // Convert dates to Luxon DateTime objects in the rink's timezone
  const startDate = DateTime.fromJSDate(view.startDate).setZone(rinkTimezone).startOf("week");

  const getSlotForTime = (date: DateTime): CalendarSlot | undefined => {
    return slots.find((slot) => {
      const slotTime = DateTime.fromJSDate(slot.startTime).setZone(rinkTimezone);
      return slotTime.hasSame(date, "minute");
    });
  };

  // Generate array of dates for the week
  const dayDates = Array.from({ length: 7 }, (_, index) => {
    return startDate.plus({ days: index });
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
                {/* Display time in rink's timezone */}
                {DateTime.now().setZone(rinkTimezone).set({ hour, minute }).toFormat("h:mm a")}
              </div>
            )),
          )}
        </div>
        {/* Days columns */}
        {dayDates.map((date) => {
          const dayStr = date.toFormat("yyyy-MM-dd");
          return (
            <div key={dayStr} className="col-span-1 bg-white">
              {/* Day header */}
              <div className="h-12 border-b flex items-center justify-center font-medium">
                {date.toFormat("EEE M/d")}
              </div>
              {/* Time slots */}
              {HOURS.map((hour) =>
                MINUTES.map((minute) => {
                  const slotDate = date.set({ hour, minute });
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
