import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Draggable } from '@/components/ui/draggable';
import { Select } from '@/components/ui/select';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  rinkId: string;
  maxStudents: number;
  currentStudents: number;
  type: 'PRIVATE' | 'GROUP' | 'CHOREOGRAPHY' | 'COMPETITION_PREP';
}

export const CalendarEventsSystem = () => {
  const [selectedRink, setSelectedRink] = React.useState<string>('');
  const [viewMode, setViewMode] = React.useState<'day' | 'week' | 'month'>('week');
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);

  const handleEventDrop = async (event: CalendarEvent, start: Date, end: Date) => {
    // Check business rules
    const isValidMove = await validateEventMove(event, start, end);
    if (!isValidMove) {
      return;
    }
    // Update event
    const updatedEvent = { ...event, start, end };
    // Update in database and state
    try {
      await updateEventInDatabase(updatedEvent);
      setEvents(currentEvents => currentEvents.map(e => e.id === event.id ? updatedEvent : e ));
    } catch (error) {
      // Handle error and show notification
    }
  };

  const handleEventResize = async (event: CalendarEvent, start: Date, end: Date) => {
    // Similar validation and update logic
  };

  return (
    <Card>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <Select
            value={selectedRink}
            onValueChange={setSelectedRink}
            items={[
              { value: 'MAIN_RINK', label: 'Main Rink' },
              { value: 'PRACTICE_RINK', label: 'Practice Rink' },
              { value: 'DANCE_STUDIO', label: 'Dance Studio' }
            ]}
          />
          <Select
            value={viewMode}
            onValueChange={setViewMode}
            items={[
              { value: 'day', label: 'Day View' },
              { value: 'week', label: 'Week View' },
              { value: 'month', label: 'Month View' }
            ]}
          />
        </div>
        <Calendar
          events={events}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          view={viewMode}
          draggableEventWrapper={Draggable}
          eventContent={(eventInfo) => (
            <div className="p-2">
              <div className="font-medium">{eventInfo.event.title}</div>
              <div className="text-sm">
                {eventInfo.event.extendedProps.currentStudents}/ {eventInfo.event.extendedProps.maxStudents} Students
              </div>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
};
