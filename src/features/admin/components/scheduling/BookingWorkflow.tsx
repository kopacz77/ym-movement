import React from 'react';
import { Card } from '@/components/ui/card';
import { BookingDialog } from './BookingDialog';
import { Calendar } from '@/components/ui/calendar';
import { DateSelectArg, EventClickArg } from '@fullcalendar/core';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
  studentId?: string;
}

export const CalendarInteractions = () => {
  const [selectedSlot, setSelectedSlot] = React.useState<any>(null);
  const [showBookingDialog, setShowBookingDialog] = React.useState(false);

  const handleSelectSlot = (slotInfo: DateSelectArg) => {
    setSelectedSlot(slotInfo);
    setShowBookingDialog(true);
  };

  const handleEventClick = (event: EventClickArg) => {
    // Handle existing event click
  };

  const handleDragEvent = (dropInfo: any) => {
    // Handle event drag and drop
  };

  return (
    <Card className="p-4">
      <Calendar
        initialView="timeGridWeek"
        events={[]}
        selectable={true}
        onDateSelect={handleSelectSlot}
        onEventClick={handleEventClick}
        onEventDrop={handleDragEvent}
        businessHours={{
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          startTime: "05:00",
          endTime: "18:00",
        }}
      />
      {showBookingDialog && (
        <BookingDialog 
          slot={selectedSlot} 
          onCloseAction={() => setShowBookingDialog(false)} 
        />
      )}
    </Card>
  );
};