// src/features/scheduling/components/display/MobileTimeSlotList.tsx
import { Button } from "@/components/ui/button";
import { type TimeSlot } from "@/types/scheduling";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayAccordion } from "./DayAccordion";

interface DayWithSlots {
  date: Date;
  slots: TimeSlot[];
}

interface MobileTimeSlotListProps {
  dateRangeText: string;
  processedEvents: DayWithSlots[];
  onSlotClick: (slot: TimeSlot) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  calendarView: "timeGridWeek" | "dayGridMonth";
  onViewChange: (view: "timeGridWeek" | "dayGridMonth") => void;
}

export function MobileTimeSlotList({
  dateRangeText,
  processedEvents,
  onSlotClick,
  onPrev,
  onNext,
  onToday,
  calendarView,
  onViewChange,
}: MobileTimeSlotListProps) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="sm" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <span className="font-medium">{dateRangeText}</span>
        </div>
        <Button variant="outline" size="sm" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button variant="outline" size="sm" className="w-full mb-4" onClick={onToday}>
        Today
      </Button>

      <div className="flex gap-2 mb-4">
        <Button
          variant={calendarView === "timeGridWeek" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => onViewChange("timeGridWeek")}
        >
          Week
        </Button>
        <Button
          variant={calendarView === "dayGridMonth" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => onViewChange("dayGridMonth")}
        >
          Month
        </Button>
      </div>

      {/* Day accordion for mobile */}
      <DayAccordion days={processedEvents} onSlotClick={onSlotClick} />
    </div>
  );
}