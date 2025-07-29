import { Plus } from "lucide-react";
import React, { useState } from "react";
import { Calendar, type SlotInfo, type View, Views } from "react-big-calendar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localizer } from "@/lib/calendar/calendarLocalizer";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { TimeSlotList } from "./TimeSlotList";

// Define interface for calendar events
interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
}

// Create ViewOptions component inline since it's missing
const ViewOptions = ({
  view,
  onViewChange,
}: {
  view: string;
  onViewChange: (view: string) => void;
}) => {
  return (
    <Select value={view} onValueChange={onViewChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Select view" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={Views.DAY}>Day</SelectItem>
        <SelectItem value={Views.WEEK}>Week</SelectItem>
        <SelectItem value={Views.MONTH}>Month</SelectItem>
      </SelectContent>
    </Select>
  );
};

export const ScheduleCalendarView = () => {
  const [calendarView, setCalendarView] = useState<string>(Views.WEEK);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Sample events - replace with your actual events from API
  React.useEffect(() => {
    // Example events - replace with your data fetching logic
    const sampleEvents: CalendarEvent[] = [
      {
        id: 1,
        title: "Sample Event",
        start: new Date(2025, 4, 10, 10, 0), // May 10, 2025, 10:00 AM
        end: new Date(2025, 4, 10, 12, 0), // May 10, 2025, 12:00 PM
      },
      {
        id: 2,
        title: "Another Event",
        start: new Date(2025, 4, 11, 14, 0), // May 11, 2025, 2:00 PM
        end: new Date(2025, 4, 11, 16, 0), // May 11, 2025, 4:00 PM
      },
    ];
    setEvents(sampleEvents);
  }, []);

  // Update calendar view when selection changes
  const handleViewChange = (view: string) => {
    setCalendarView(view);
  };

  // Handle navigation (changing dates)
  const handleNavigate = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle event selection
  const handleSelectEvent = (event: CalendarEvent) => {
    console.log("Selected event:", event);
    // Implement your event selection logic here
  };

  // Handle slot selection
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    console.log("Selected slot:", slotInfo);
    // Implement your slot selection logic here
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <ViewOptions view={calendarView} onViewChange={handleViewChange} />
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Time Slot
        </Button>
      </div>
      <div className="flex-1 grid grid-cols-7 gap-4">
        <div className="col-span-5">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            view={calendarView as View}
            onView={handleViewChange}
            date={selectedDate}
            onNavigate={handleNavigate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            popup
            components={{
              toolbar: () => null, // Disable the default toolbar
            }}
          />
        </div>
        <div className="col-span-2">
          <TimeSlotList />
        </div>
      </div>
    </div>
  );
};
