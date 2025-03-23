import React from "react";
import { Card } from "@/components/ui/card";
import { BookingDialog } from "./BookingDialog";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";

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

  const handleSelectSlot = (slotInfo: DateSelectArg) => {
    // Convert DateSelectArg to TimeSlot format
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

  const handleEventClick = (event: EventClickArg) => {
    // Handle existing event click
  };

  const handleDragEvent = (dropInfo: EventDropArg) => {
    // Handle event drag and drop
    console.log("Event dragged:", dropInfo);
    // Access event info: dropInfo.event.id, dropInfo.event.start, dropInfo.event.end
    // Access delta info: dropInfo.delta.days, dropInfo.delta.milliseconds
    // Revert if needed: dropInfo.revert()
  };

  return (
    <Card className="p-4">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        events={[]}
        selectable={true}
        select={handleSelectSlot}
        eventClick={handleEventClick}
        eventDrop={handleDragEvent}
        businessHours={{
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          startTime: "05:00",
          endTime: "18:00",
        }}
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
