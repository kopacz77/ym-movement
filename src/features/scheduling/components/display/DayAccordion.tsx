// src/features/scheduling/components/DayAccordion.tsx
import { format } from "date-fns";
import type { TimeSlot } from "@/types/scheduling";
import { TimeSlotListItem } from "../display/TimeSlotListItem";

interface DayWithSlots {
  date: Date;
  slots: TimeSlot[];
}

interface DayAccordionProps {
  days: DayWithSlots[];
  onSlotClick: (slot: TimeSlot) => void;
}

export function DayAccordion({ days, onSlotClick }: DayAccordionProps) {
  if (days.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">No time slots available for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <div key={format(day.date, "yyyy-MM-dd")} className="mb-4">
          {/* Day header */}
          <div className="py-2 px-3 bg-slate-100 rounded-t-md">
            <div className="flex justify-between items-center">
              <span className="font-bold">{format(day.date, "EEEE")}</span>
              <span>{format(day.date, "MMMM d, yyyy")}</span>
            </div>
          </div>

          {/* Time slots for this day */}
          <div className="border border-slate-200 rounded-b-md">
            {day.slots
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map((slot) => (
                <TimeSlotListItem key={slot.id} slot={slot} onClick={onSlotClick} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
