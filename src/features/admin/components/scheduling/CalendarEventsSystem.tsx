// src/features/admin/components/scheduling/CalendarEventsSystem.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeStopArg } from "@fullcalendar/interaction";
import { Button } from "@/components/ui/button";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  rinkId: string;
  maxStudents: number;
  currentStudents: number;
  color?: string;
  type: "PRIVATE" | "GROUP" | "CHOREOGRAPHY" | "COMPETITION_PREP";
  extendedProps?: Record<string, unknown>;
}

// Define TimeSlot interface based on your schema
interface TimeSlot {
  id: string;
  rinkId: string;
  startTime: Date;
  endTime: Date;
  maxStudents: number;
  isActive: boolean;
  lessons?: Record<string, unknown>[];
  rink?: {
    id: string;
    name: string;
  };
  title?: string | null;
  [key: string]: unknown;
}

export const CalendarEventsSystem = () => {
  const [selectedRink, setSelectedRink] = useState<string>("MAIN_RINK");
  const [viewMode, setViewMode] = useState<"timeGridDay" | "timeGridWeek" | "dayGridMonth">(
    "timeGridWeek",
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const utils = api.useContext();

  // Get events from the API
  const {
    data,
    isLoading: eventsLoading,
    error,
  } = api.admin.schedule.getTimeSlots.useQuery({ rinkId: selectedRink });

  // Process data when it changes
  useEffect(() => {
    if (data) {
      // Convert time slots to calendar events format
      const calendarEvents = data.map((slot: TimeSlot) => {
        const bookedStudents = slot.lessons?.length || 0;
        const isBooked = bookedStudents > 0;
        
        return {
          id: slot.id,
          title: (slot.title as string) || `${bookedStudents}/${slot.maxStudents} Students`,
          start: new Date(slot.startTime),
          end: new Date(slot.endTime),
          rinkId: slot.rinkId,
          maxStudents: slot.maxStudents,
          currentStudents: bookedStudents,
          // Set color to green if booked, blue if available
          color: isBooked ? "rgb(74 222 128)" : "rgb(59 130 246)", // green : blue
          type: "PRIVATE" as const,
          extendedProps: slot,
        };
      });

      setEvents(calendarEvents as CalendarEvent[]);
    }
  }, [data]);

  // Handle query errors
  useEffect(() => {
    if (error) {
      toast.error("Failed to load events", {
        description: error.message,
      });
    }
  }, [error]);

  // Update event mutation
  const updateTimeSlot = api.admin.schedule.updateTimeSlot.useMutation({
    onSuccess: () => {
      toast("Event updated", {
        description: "The event has been updated successfully.",
      });
      utils.admin.schedule.getTimeSlots.invalidate({ rinkId: selectedRink });
    },
    onError: (err) => {
      toast.error("Update failed", {
        description: err.message,
      });
    },
  });

  // Create event mutation
  const createTimeSlot = api.admin.schedule.createTimeSlot.useMutation({
    onSuccess: () => {
      toast("Event created", {
        description: "New event has been scheduled successfully.",
      });
      utils.admin.schedule.getTimeSlots.invalidate({ rinkId: selectedRink });
    },
    onError: (err) => {
      toast.error("Creation failed", {
        description: err.message,
      });
    },
  });

  // Delete event mutation
  const deleteTimeSlot = api.admin.schedule.deleteTimeSlot.useMutation({
    onSuccess: () => {
      toast("Event deleted", {
        description: "The event has been removed from the schedule.",
      });
      utils.admin.schedule.getTimeSlots.invalidate({ rinkId: selectedRink });
    },
    onError: (err) => {
      toast.error("Deletion failed", {
        description: err.message,
      });
    },
  });

  // This method checks for business hours and minimum duration
  const validateEventMove = (start: Date, end: Date): boolean => {
    // Simple validation - check for business hours and minimum duration
    const businessStartHour = 5; // 5 AM
    const businessEndHour = 18; // 6 PM

    const startHour = start.getHours();
    const endHour = end.getHours();

    if (startHour < businessStartHour || endHour > businessEndHour) {
      return false;
    }

    // Check minimum duration (15 minutes)
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 15) {
      return false;
    }

    return true;
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
      type: info.event.extendedProps?.type || "PRIVATE",
      extendedProps: info.event.extendedProps,
    };

    // Check if the move is valid
    const isValidMove = validateEventMove(     
      droppedEvent.start,
      droppedEvent.end,
    );

    if (!isValidMove) {
      info.revert();
      toast.error("Invalid move", {
        description:
          "This event cannot be moved to the selected time slot. Check business hours and minimum duration.",
      });
      return;
    }

    // Update event in database
    try {
      await updateTimeSlot.mutateAsync({
        id: droppedEvent.id,
        startTime: droppedEvent.start,
        endTime: droppedEvent.end,
      });
    } catch {
      info.revert();
      // Error is already handled by the mutation
    }
  };

  const handleEventResize = async (info: EventResizeStopArg) => {
    // Convert the FullCalendar event to our CalendarEvent type
    const resizedEvent = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start as Date,
      end: info.event.end as Date,
      rinkId: info.event.extendedProps?.rinkId || selectedRink,
      maxStudents: info.event.extendedProps?.maxStudents || 1,
      currentStudents: info.event.extendedProps?.currentStudents || 0,
      type: info.event.extendedProps?.type || "PRIVATE",
      extendedProps: info.event.extendedProps,
    };

    // Check if the resize is valid
    const isValidResize = validateEventMove(
      resizedEvent.start,
      resizedEvent.end,
    );

    if (!isValidResize) {
      // Since we can't use revert(), refresh the calendar to undo the change
      toast.error("Invalid duration", {
        description:
          "The event cannot be resized to this duration. Check business hours and minimum duration.",
      });

      // Refresh the events to revert the change
      utils.admin.schedule.getTimeSlots.invalidate({ rinkId: selectedRink });
      return;
    }

    // Update event in database
    try {
      await updateTimeSlot.mutateAsync({
        id: resizedEvent.id,
        startTime: resizedEvent.start,
        endTime: resizedEvent.end,
      });
    } catch {
      // Error is already handled by the mutation
      // Refresh the events to revert the change
      utils.admin.schedule.getTimeSlots.invalidate({ rinkId: selectedRink });
    }
  };

  const handleDateSelect = async (selectInfo: {
    start: Date;
    end: Date;
    view: { calendar: { unselect: () => void } };
  }) => {
    const title = prompt("Please enter a title for the new event:");
    if (!title) {
      return; // User cancelled
    }

    try {
      await createTimeSlot.mutateAsync({
        rinkId: selectedRink,
        startTime: selectInfo.start,
        endTime: selectInfo.end,
        maxStudents: 1,
        isActive: true,
      });

      selectInfo.view.calendar.unselect(); // Clear selection
    } catch {
      // Error is already handled by the mutation
    }
  };

  const handleEventClick = (info: EventClickArg) => {
    if (confirm(`Are you sure you want to delete '${info.event.title}'?`)) {
      deleteTimeSlot.mutate({
        id: info.event.id,
      });
    }
  };

  return (
    <Card>
      <CardContent>
        <div className="flex gap-4 mb-4 items-center">
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
            onValueChange={(value: "timeGridDay" | "timeGridWeek" | "dayGridMonth") =>
              setViewMode(value)
            }
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

          <Button
            onClick={() =>
              utils.admin.schedule.getTimeSlots.invalidate({
                rinkId: selectedRink,
              })
            }
            disabled={eventsLoading}
            variant="outline"
          >
            Refresh
          </Button>
        </div>

        <div className="h-[600px]">
          {eventsLoading ? (
            <div className="flex items-center justify-center h-full">Loading events...</div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={viewMode}
              events={events}
              timeZone="UTC"
              now={new Date().toISOString()}
              editable={true}
              selectable={true}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              eventClick={handleEventClick}
              select={handleDateSelect}
              businessHours={{
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                startTime: "05:00",
                endTime: "18:00",
              }}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "timeGridDay,timeGridWeek,dayGridMonth",
              }}
              height="100%"
              slotDuration="00:15:00"
              slotLabelInterval="01:00:00"
              allDaySlot={false}
              nowIndicator={true}
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                meridiem: false,
                hour12: false,
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};