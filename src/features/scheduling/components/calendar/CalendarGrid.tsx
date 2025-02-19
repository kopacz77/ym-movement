// src/features/scheduling/components/calendar/CalendarGrid.tsx
"use client";
import React from 'react';
import { format, addMinutes, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarSlot, CalendarView } from '../../types';
import { TimeSlotCell } from './TimeSlotCell';

interface CalendarGridProps {
  view: CalendarView;
  slots: CalendarSlot[];
  onSlotClick: (slot: CalendarSlot) => void;
  onSlotHover?: (slot: CalendarSlot) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 10 PM
const MINUTES = [0, 30]; // 30-minute intervals

export const CalendarGrid: React.FC<CalendarGridProps> = ({ view, slots, onSlotClick, onSlotHover }) => {
  const startDate = startOfWeek(view.startDate);
  const endDate = endOfWeek(view.endDate);

  const getSlotForTime = (date: Date): CalendarSlot | undefined => {
    return slots.find(slot => slot.startTime.getTime() === date.getTime());
  };

  return (
    <div className="overflow-auto">
      <div className="grid grid-cols-8 gap-px bg-gray-200">
        {/* Time labels column */}
        <div className="col-span-1 bg-white">
          <div className="h-12"></div> {/* Header spacer */}
          {HOURS.map(hour => MINUTES.map((minute) => (
            <div key={`${hour}-${minute}`} className="h-12 border-b flex items-center justify-end pr-2 text-sm text-gray-500">
              {format(new Date().setHours(hour, minute), 'h:mm a')}
            </div>
          )))}
        </div>
        {/* Days columns */}
        {Array.from({ length: 7 }).map((_, dayIndex) => (
          <div key={dayIndex} className="col-span-1 bg-white">
            {/* Day header */}
            <div className="h-12 border-b flex items-center justify-center font-medium">
              {format(addMinutes(startDate, dayIndex * 24 * 60), 'EEE M/d')}
            </div>
            {/* Time slots */}
            {HOURS.map(hour => MINUTES.map((minute) => {
              const slotDate = new Date(startDate);
              slotDate.setDate(slotDate.getDate() + dayIndex);
              slotDate.setHours(hour, minute, 0, 0);
              const slot = getSlotForTime(slotDate);
              return (
                <TimeSlotCell
                  key={`${dayIndex}-${hour}-${minute}`}
                  slot={slot}
                  onClick={() => slot && onSlotClick(slot)}
                  onHover={() => slot && onSlotHover?.(slot)}
                />
              );
            }))}
          </div>
        ))}
      </div>
    </div>
  );
};
