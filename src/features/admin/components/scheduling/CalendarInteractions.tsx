import React from "react";
import { Calendar, type SlotInfo, type View, Views } from "react-big-calendar";
import { Card } from "@/components/ui/card";
import { localizer } from "@/lib/calendar/calendarLocalizer";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { BookingDialog } from "./BookingDialog";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
  studentId?: string;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  rink: {
    name: string;
  };
}

interface CalendarInteractionsProps {
  selectedStudentId: string; // Add a prop to receive the student ID
}

export const CalendarInteractions = ({ selectedStudentId }: CalendarInteractionsProps) => {
  const [selectedSlot, setSelectedSlot] = React.useState<TimeSlot | null>(null);
  const [showBookingDialog, setShowBookingDialog] = React.useState(false);
  const [calendarView, setCalendarView] = React.useState<View>(Views.WEEK);
  const [events] = React.useState<CalendarEvent[]>([]);

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    // Convert SlotInfo to TimeSlot format
    const timeSlot: TimeSlot = {
      id: `new-slot-${Date.now()}`, // Generate a temporary ID
      startTime: slotInfo.start.toISOString(),
      endTime: slotInfo.end.toISOString(),
      rink: {
        name: "Main Rink", // Default rink name
      },
    };

    setSelectedSlot(timeSlot);
    setShowBookingDialog(true);
  };

  const handleEventClick = (_event: CalendarEvent) => {
    // Handle existing event click
  };

  const handleViewChange = (view: string) => {
    setCalendarView(view as View);
  };

  return (
    <Card className="p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        view={calendarView}
        onView={handleViewChange}
        onSelectEvent={handleEventClick}
        onSelectSlot={handleSelectSlot}
        selectable
        popup
        min={new Date(0, 0, 0, 5, 0)} // 5 AM
        max={new Date(0, 0, 0, 18, 0)} // 6 PM
      />
      {showBookingDialog && selectedSlot && (
        <BookingDialog
          slot={selectedSlot}
          studentId={selectedStudentId} // Pass the student ID
          onCloseAction={() => setShowBookingDialog(false)}
        />
      )}
    </Card>
  );
};
