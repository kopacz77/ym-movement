import React from 'react';
import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { Card } from '@/components/ui/card';
import { BookingDialog } from './BookingDialog';

const localizer = momentLocalizer(moment);

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

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedSlot(slotInfo);
    setShowBookingDialog(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    // Handle existing event click
  };

  const handleDragEvent = (event: CalendarEvent, start: Date, end: Date) => {
    // Handle event drag and drop
  };

  return (
    <Card className="p-4">
      <Calendar
        localizer={localizer}
        events={[]}
        views={['month', 'week', 'day']}
        selectable
        resizable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleEventClick}
        onEventDrop={handleDragEvent}
        className="h-[600px]"
      />
      {showBookingDialog && (
        <BookingDialog slot={selectedSlot} onClose={() => setShowBookingDialog(false)} />
      )}
    </Card>
  );
};
