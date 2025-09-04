// src/features/scheduling/components/calendar/TimeSlotCell.tsx

import type React from "react";
import { cn } from "@/lib/utils";
import type { CalendarSlot } from "../../types";

interface TimeSlotCellProps {
  slot?: CalendarSlot;
  onClick: () => void;
  onHover?: () => void;
}

export const TimeSlotCell: React.FC<TimeSlotCellProps> = ({ slot, onClick, onHover }) => {
  const getSlotColor = (slotData?: CalendarSlot): string => {
    if (!slotData) {
      return "bg-gray-50";
    }
    if (!slotData.isActive) {
      return "bg-gray-100";
    }
    switch (slotData.status) {
      case "booked":
        return "bg-blue-100";
      case "partial":
        return "bg-yellow-100";
      case "cancelled":
        return "bg-red-100";
      default:
        return "bg-green-100";
    }
  };

  return (
    <button
      type="button"
      disabled={!slot?.isActive}
      className={cn(
        "h-12 border-b border-r relative transition-colors w-full text-left p-0 m-0 rounded-none appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50",
        getSlotColor(slot),
        slot?.isActive && "hover:bg-opacity-80 cursor-pointer",
      )}
      onClick={onClick}
      onMouseEnter={onHover}
    >
      {slot && (
        <div className="absolute inset-0 p-1">
          <div className="text-xs">
            {slot.currentStudents}/{slot.maxStudents}
          </div>
          {slot.lessons && slot.lessons.length > 0 && (
            <div className="text-xs truncate">
              {slot.lessons.length} lesson{slot.lessons.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}
    </button>
  );
};
