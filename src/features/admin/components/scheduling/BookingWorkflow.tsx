import React from "react";
import { Calendar } from "react-big-calendar";
import { Card } from "@/components/ui/card";
import { localizer } from "@/lib/calendar/calendarLocalizer";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { BookingDialog } from "./BookingDialog";

// Local narrow type for demo slot construction (differs from canonical TimeSlot)
interface BookingSlot {
  id: string;
  startTime: string;
  endTime: string;
  rink: {
    name: string;
  };
}

interface SlotInfo {
  start: Date;
  end: Date;
  slots: Date[];
  action: "select" | "click" | "doubleClick";
}

export const CalendarInteractions = () => {
  const [selectedSlot, setSelectedSlot] = React.useState<BookingSlot | null>(null);
  const [showBookingDialog, setShowBookingDialog] = React.useState(false);

  // Hardcoded student ID for this demo/admin flow
  const demoStudentId = "demo-student-1";

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    // Convert SlotInfo to TimeSlot format
    const timeSlot: BookingSlot = {
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

  return (
    <Card className="p-4">
      <Calendar
        localizer={localizer}
        events={[]}
        defaultView="week"
        views={["week", "day"]}
        selectable={true}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleEventClick}
        step={15}
        timeslots={4}
        min={new Date(0, 0, 0, 5, 0, 0)} // 5 AM
        max={new Date(0, 0, 0, 20, 0, 0)} // 8 PM
        style={{ height: 600 }}
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
