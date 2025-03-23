import React from "react";
import { Card } from "@/components/ui/card";
import { BookingDialog } from "./BookingDialog";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";


interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  rink: {
    name: string;
  };
}


export const CalendarInteractions = () => {
  const [selectedSlot, setSelectedSlot] = React.useState<TimeSlot | null>(null);
  const [showBookingDialog, setShowBookingDialog] = React.useState(false);

  // Hardcoded student ID for this demo/admin flow
  const demoStudentId = "demo-student-1";

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

  const handleEventClick = () => {
    // Handle existing event click
  };

  const handleDragEvent = () => {
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
          endTime: "20:00",
        }}
      />
      {showBookingDialog && selectedSlot && (
        <BookingDialog
          slot={selectedSlot}
          studentId={demoStudentId}
          onCloseAction={() => setShowBookingDialog(false)}
        />
      )}
    </Card>
  );
};
