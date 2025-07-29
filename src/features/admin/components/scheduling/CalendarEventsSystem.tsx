import { format, parse } from "date-fns";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Calendar, Views } from "react-big-calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { localizer } from "@/lib/calendar/calendarLocalizer";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { toast } from "sonner";

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

// React-Big-Calendar type for slot selection
interface SelectSlotInfo {
  start: Date;
  end: Date;
  slots: Date[] | string[];
  action: "select" | "click" | "doubleClick";
}

type ViewType = "day" | "week" | "month";

// Form state for the event edit modal
interface EventFormState {
  id: string;
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  maxStudents: number;
}

export const CalendarEventsSystem = () => {
  const [selectedRink, setSelectedRink] = useState<string>("MAIN_RINK");
  const [viewMode, setViewMode] = useState<ViewType>("week");
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // State for modal dialog
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>({
    id: "",
    title: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    maxStudents: 1,
  });

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
      setIsEditModalOpen(false);
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
      setIsDeleteModalOpen(false);
    },
    onError: (err) => {
      toast.error("Deletion failed", {
        description: err.message,
      });
    },
  });

  // This method checks for business hours and minimum duration
  const validateEventTimes = (start: Date, end: Date): { isValid: boolean; message?: string } => {
    // Simple validation - check for business hours and minimum duration
    const businessStartHour = 5; // 5 AM
    const businessEndHour = 18; // 6 PM

    const startHour = start.getHours();
    const endHour = end.getHours();

    if (startHour < businessStartHour || endHour > businessEndHour) {
      return {
        isValid: false,
        message: "Events must be scheduled between 5 AM and 6 PM.",
      };
    }

    // Check minimum duration (15 minutes)
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 15) {
      return {
        isValid: false,
        message: "Events must be at least 15 minutes long.",
      };
    }

    return { isValid: true };
  };

  // Handle event selection (click)
  const handleEventSelect = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);

    // Format dates for the form
    const startDate = format(event.start, "yyyy-MM-dd");
    const startTime = format(event.start, "HH:mm");
    const endDate = format(event.end, "yyyy-MM-dd");
    const endTime = format(event.end, "HH:mm");

    setEventForm({
      id: event.id,
      title: event.title,
      startDate,
      startTime,
      endDate,
      endTime,
      maxStudents: event.maxStudents,
    });

    setIsEditModalOpen(true);
  }, []);

  // Handle slot selection (creating new events)
  const handleSlotSelect = useCallback((slotInfo: SelectSlotInfo) => {
    // Create a new event with default values
    const startDate = format(slotInfo.start, "yyyy-MM-dd");
    const startTime = format(slotInfo.start, "HH:mm");
    const endDate = format(slotInfo.end, "yyyy-MM-dd");
    const endTime = format(slotInfo.end, "HH:mm");

    setEventForm({
      id: `new-${Date.now()}`,
      title: "New Event",
      startDate,
      startTime,
      endDate,
      endTime,
      maxStudents: 1,
    });

    setSelectedEvent(null); // No existing event
    setIsEditModalOpen(true);
  }, []);

  // Handle form updates
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEventForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmitForm = () => {
    // Parse the form dates
    const startDateTime = parse(
      `${eventForm.startDate} ${eventForm.startTime}`,
      "yyyy-MM-dd HH:mm",
      new Date(),
    );

    const endDateTime = parse(
      `${eventForm.endDate} ${eventForm.endTime}`,
      "yyyy-MM-dd HH:mm",
      new Date(),
    );

    // Validate the times
    const validation = validateEventTimes(startDateTime, endDateTime);
    if (!validation.isValid) {
      toast.error("Invalid event time", {
        description: validation.message,
      });
      return;
    }

    if (selectedEvent) {
      // Updating existing event
      updateTimeSlot.mutate({
        id: eventForm.id,
        startTime: startDateTime,
        endTime: endDateTime,
      });
    } else {
      // Creating new event
      createTimeSlot.mutate({
        rinkId: selectedRink,
        startTime: startDateTime,
        endTime: endDateTime,
        maxStudents: eventForm.maxStudents,
        isActive: true,
      });
      setIsEditModalOpen(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = () => {
    if (selectedEvent) {
      setIsEditModalOpen(false);
      setIsDeleteModalOpen(true);
    }
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedEvent) {
      deleteTimeSlot.mutate({
        id: selectedEvent.id,
      });
    }
  };

  // Custom event styling
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color,
        borderColor: event.color,
      },
    };
  }, []);

  // Map view types between FullCalendar and react-big-calendar
  const mapViewType = (type: ViewType) => {
    switch (type) {
      case "day":
        return Views.DAY;
      case "month":
        return Views.MONTH;
      default:
        return Views.WEEK;
    }
  };

  // Handle view change
  const handleViewChange = (newView: ViewType) => {
    setViewMode(newView);
  };

  return (
    <>
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

            <Select value={viewMode} onValueChange={(value: ViewType) => handleViewChange(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day View</SelectItem>
                <SelectItem value="week">Week View</SelectItem>
                <SelectItem value="month">Month View</SelectItem>
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
              <Calendar
                localizer={localizer}
                events={events}
                view={mapViewType(viewMode)}
                onView={(view) =>
                  setViewMode(view === Views.DAY ? "day" : view === Views.MONTH ? "month" : "week")
                }
                views={[Views.DAY, Views.WEEK, Views.MONTH]}
                selectable
                onSelectEvent={handleEventSelect}
                onSelectSlot={handleSlotSelect}
                eventPropGetter={eventPropGetter}
                step={15}
                timeslots={4}
                min={new Date(0, 0, 0, 5, 0, 0)} // 5 AM
                max={new Date(0, 0, 0, 18, 0, 0)} // 6 PM
                showMultiDayTimes
                getNow={() => new Date()}
                style={{ height: "100%" }}
                popup
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Event Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? "Edit Event" : "Create Event"}</DialogTitle>
            <DialogDescription>
              {selectedEvent
                ? "Update the event details below."
                : "Fill in the details to create a new event."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                name="title"
                value={eventForm.title}
                onChange={handleFormChange}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={eventForm.startDate}
                onChange={handleFormChange}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">
                Start Time
              </Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                value={eventForm.startTime}
                onChange={handleFormChange}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                End Date
              </Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={eventForm.endDate}
                onChange={handleFormChange}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">
                End Time
              </Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                value={eventForm.endTime}
                onChange={handleFormChange}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxStudents" className="text-right">
                Max Students
              </Label>
              <Input
                id="maxStudents"
                name="maxStudents"
                type="number"
                min="1"
                max="10"
                value={eventForm.maxStudents}
                onChange={handleFormChange}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {selectedEvent && (
              <Button variant="destructive" onClick={handleDeleteClick}>
                Delete
              </Button>
            )}
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleSubmitForm}>
                {selectedEvent ? "Save Changes" : "Create Event"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
