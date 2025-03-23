// src/features/admin/components/scheduling/ScheduleCalendarView.tsx
import React from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid"; // Added for month view
import { TimeSlotList } from "./TimeSlotList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Create ViewOptions component inline since it's missing
const ViewOptions = () => {
  const [view, setView] = React.useState("timeGridWeek");

  return (
    <Select value={view} onValueChange={(value) => setView(value)}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Select view" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="timeGridDay">Day</SelectItem>
        <SelectItem value="timeGridWeek">Week</SelectItem>
        <SelectItem value="dayGridMonth">Month</SelectItem>
      </SelectContent>
    </Select>
  );
};

export const ScheduleCalendarView = () => {
  const [calendarView, setCalendarView] = React.useState("timeGridWeek");

  // Update calendar view when selection changes
  const handleViewChange = (view: string) => {
    setCalendarView(view);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <ViewOptions />
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Time Slot
        </Button>
      </div>
      <div className="flex-1 grid grid-cols-7 gap-4">
        <div className="col-span-5">
          {/* Changed Calendar to FullCalendar with required plugins */}
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false} // Hide the built-in header since we have custom controls
            height="100%"
          />
        </div>
        <div className="col-span-2">
          <TimeSlotList />
        </div>
      </div>
    </div>
  );
};
