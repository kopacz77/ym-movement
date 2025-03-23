// src/features/scheduling/components/calendar/CalendarHeader.tsx
import type React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface CalendarHeaderProps {
  view: "day" | "week" | "month";
  currentDate: Date;
  onViewChange: (view: "day" | "week" | "month") => void;
  onNavigate: (direction: "prev" | "next") => void;
  onCreateSlot?: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  view,
  currentDate,
  onViewChange,
  onNavigate,
  onCreateSlot,
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onNavigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onNavigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Select value={view} onValueChange={(v: "day" | "week" | "month") => onViewChange(v)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
        {onCreateSlot && <Button onClick={onCreateSlot}>Create Time Slot</Button>}
      </div>
    </div>
  );
};
