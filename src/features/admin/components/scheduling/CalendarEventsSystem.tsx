// src/features/admin/components/scheduling/CalendarEventsSystem.tsx
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { EventClickArg, EventDropArg } from '@fullcalendar/core';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  rinkId: string;
  maxStudents: number;
  currentStudents: number;
  type: 'PRIVATE' | 'GROUP' | 'CHOREOGRAPHY' | 'COMPETITION_PREP';
  extendedProps?: any;
}

export const CalendarEventsSystem = () => {
  const [selectedRink, setSelectedRink] = useState<string>('MAIN_RINK');
  const [viewMode, setViewMode] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>('timeGridWeek');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { toast } = useToast();

  // This method would typically use your API to validate the event move
  const validateEventMove = async (event: CalendarEvent, start: Date, end: Date): Promise<boolean> => {
    // In a real implementation, you'd check for overlapping events, availability, etc.
    // For now, we'll just return true to allow the move
    return true;
  };

  // This method would update the event in your database via API
  const updateEventInDatabase = async (updatedEvent: CalendarEvent): Promise<void> => {
    try {
      // In a real implementation, you'd call your API
      // For example: await api.admin.schedule.updateEvent.mutate(updatedEvent);
      
      // For now, we'll just show a success toast
      toast({
        title: "Event updated",
        description: `Event "${updatedEvent.title}" has been rescheduled.`,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "There was an error updating the event.",
        variant: "destructive",
      });
    }
  };

  const handleEventDrop = async (info: EventDropArg) => {
    // Convert the FullCalendar event to our CalendarEvent type
    const droppedEvent = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start as Date,
      end: info.event.end as Date,
      rinkId: info.event.extendedProps?.rinkId || selectedRink,
      maxStudents: info.event.extendedProps?.maxStudents || 1, 
      currentStudents: info.event.extendedProps?.currentStudents || 0,
      type: info.event.extendedProps?.type || 'PRIVATE',
      extendedProps: info.event.extendedProps
    };

    // Check if the move is valid
    const isValidMove = await validateEventMove(
      droppedEvent,
      droppedEvent.start,
      droppedEvent.end
    );
    
    if (!isValidMove) {
      info.revert();
      toast({
        title: "Invalid move",
        description: "This event cannot be moved to the selected time slot.",
        variant: "destructive",
      });
      return;
    }

    // Update event in database and state
    try {
      await updateEventInDatabase(droppedEvent);
      setEvents(currentEvents => 
        currentEvents.map(e => e.id === droppedEvent.id ? droppedEvent : e)
      );
    } catch (error) {
      info.revert();
      toast({
        title: "Update failed",
        description: "There was an error updating the event.",
        variant: "destructive",
      });
    }
  };

  const handleEventResize = async (info: any) => {
    // Similar implementation to handleEventDrop
    // Would validate and update the event with the new duration
  };

  return (
    <Card>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <Select value={selectedRink} onValueChange={setSelectedRink}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select rink" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MAIN_RINK">Main Rink</SelectItem>
              <SelectItem value="PRACTICE_RINK">Practice Rink</SelectItem>
              <SelectItem value="DANCE_STUDIO">Dance Studio</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={viewMode} 
            onValueChange={(value: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth') => setViewMode(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="timeGridDay">Day View</SelectItem>
              <SelectItem value="timeGridWeek">Week View</SelectItem>
              <SelectItem value="dayGridMonth">Month View</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Calendar 
          initialView={viewMode}
          events={events}
          onEventDrop={handleEventDrop}
          onEventClick={(info: EventClickArg) => {
            // Handle event click
            console.log('Event clicked:', info.event);
          }}
          businessHours={{
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            startTime: '05:00',
            endTime: '18:00',
          }}
        />
      </CardContent>
    </Card>
  );
};