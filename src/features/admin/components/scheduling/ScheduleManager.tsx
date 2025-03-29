// src/features/admin/components/scheduling/ScheduleManager.tsx
"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeSlotForm } from "./TimeSlotForm";
import { BulkTimeSlotForm } from "./BulkTimeSlotForm";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { format, addDays } from "date-fns";
import { useIsMobile } from "@/hooks/useMediaQuery";

// Define proper types for our data
interface TimeSlotFormData {
  startTime: Date | null;
  endTime: Date | null;
  rinkId?: string;
}

interface Lesson {
  id: string;
  student: {
    id: string;
    user: {
      name: string | null; // Allow name to be null to fix type error
    };
  };
}

interface TimeSlot {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  maxStudents: number;
  rinkId: string;
  rink: {
    id: string;
    name: string;
  };
  lessons?: Lesson[];
}

export function ScheduleManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [timeSlotFormData, setTimeSlotFormData] = useState<TimeSlotFormData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const utils = api.useUtils();

  // Get rinks data - removed unused isLoadingRinks
  const { data: rinks } = api.admin.schedule.getRinks.useQuery();

  // Get students data
  const { data: students } = api.admin.student.getStudents.useQuery();

  // Get time slots data - removed unused isLoadingSlots
  const { data: timeSlots } = api.admin.schedule.getTimeSlots.useQuery({});

  // Convert time slots to FullCalendar events
  const events =
    timeSlots?.map((slot) => {
      const studentCount = slot.lessons?.length || 0;
      const studentNames = slot.lessons?.map((lesson) => lesson.student.user.name).join(", ");
      const title = `${studentCount}/${slot.maxStudents} students${
        studentNames ? ` (${studentNames})` : ""
      }
      } - ${slot.rink.name}`;
      return {
        id: slot.id,
        title,
        start: slot.startTime,
        end: slot.endTime,
        extendedProps: {
          ...slot,
          currentStudents: studentCount,
        },
      };
    }) || [];

  // Delete time slot mutation
  const deleteTimeSlot = api.admin.schedule.deleteTimeSlot.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Time slot deleted successfully",
      });
      setIsManageDialogOpen(false);
      setSelectedEvent(null);
      setSelectedSlot(null);
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message,
      });
    },
  });

  // Assign student mutation
  const assignStudent = api.admin.schedule.assignStudentToTimeSlot.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Student assigned successfully",
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message,
      });
    },
  });

  // Unassign student mutation
  const unassignStudent = api.admin.schedule.unassignStudent.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Student unassigned successfully",
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message,
      });
    },
  });

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    setTimeSlotFormData({
      startTime: selectInfo.start,
      endTime: selectInfo.end,
      rinkId: undefined, // We'll need to select the rink manually in the form
    });
    setIsCreateDialogOpen(true);
  }, []);

  const handleCreateTimeSlotClick = useCallback(() => {
    setTimeSlotFormData({
      startTime: null,
      endTime: null,
    });
    setIsCreateDialogOpen(true);
  }, []);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo);
    setIsManageDialogOpen(true);
  }, []);

  const handleEventDrop = useCallback(
    (dropInfo: EventDropArg) => {
      // For updateTimeSlot, we need to get the actual mutation function
      const updateTimeSlot = api.admin.schedule.updateTimeSlot.useMutation({
        onSuccess: () => {
          toast("Success", {
            description: "Time slot updated successfully",
          });
          utils.admin.schedule.getTimeSlots.invalidate();
        },
        onError: () => {
          toast.error("Error", {
            description: "Failed to update time slot",
          });
          dropInfo.revert();
        },
      });

      // Now call the mutation
      if (dropInfo.event.start && dropInfo.event.end) {
        updateTimeSlot.mutate({
          id: dropInfo.event.id,
          startTime: dropInfo.event.start,
          endTime: dropInfo.event.end,
        });
      } else {
        toast.error("Error", {
          description: "Invalid event times",
        });
        dropInfo.revert();
      }
    },
    [utils.admin.schedule],
  );

  // Navigate to the previous week
  const goToPrevWeek = () => {
    setCurrentDate((prev) => addDays(prev, -7));
  };

  // Navigate to the next week
  const goToNextWeek = () => {
    setCurrentDate((prev) => addDays(prev, 7));
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format the date range for display (e.g., "Mar 16 - 22, 2025")
  const dateRangeText = () => {
    const endDate = addDays(currentDate, 6);
    const startMonth = format(currentDate, "MMM");
    const endMonth = format(endDate, "MMM");

    if (startMonth === endMonth) {
      return `${startMonth} ${format(currentDate, "d")} - ${format(endDate, "d")}, ${format(
        currentDate,
        "yyyy",
      )}`;
    }

    return `${startMonth} ${format(currentDate, "d")} - ${endMonth} ${format(
      endDate,
      "d",
    )}, ${format(currentDate, "yyyy")}`;
  };

  // Process events for display in the custom list view
  const processEventsForCustomList = () => {
    if (!timeSlots) {
      return [];
    }

    // Group events by day
    const groupedEvents = timeSlots.reduce(
      (groups, slot) => {
        const date = format(new Date(slot.startTime), "yyyy-MM-dd");

        if (!groups[date]) {
          groups[date] = {
            date: new Date(slot.startTime),
            slots: [],
          };
        }

        groups[date].slots.push(slot);
        return groups;
      },
      {} as Record<string, { date: Date; slots: TimeSlot[] }>,
    );

    // Convert to array and sort by date
    return Object.values(groupedEvents).sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  // Handle clicking a slot in the custom mobile list
  const handleMobileSlotClick = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setIsManageDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Schedule Management</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          {/* Create Time Slot Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateTimeSlotClick} className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Create Time Slot
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {timeSlotFormData?.startTime
                    ? "Create Time Slot for Selected Time"
                    : "Create New Time Slot"}
                </DialogTitle>
              </DialogHeader>
              {timeSlotFormData && (
                <TimeSlotForm
                  initialStartTime={timeSlotFormData.startTime}
                  initialEndTime={timeSlotFormData.endTime}
                  initialRinkId={timeSlotFormData.rinkId}
                  rinks={rinks || []}
                  onSubmitAction={() => {
                    setIsCreateDialogOpen(false);
                    setTimeSlotFormData(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Bulk Create Slots Dialog */}
          <Dialog open={isBulkCreateOpen} onOpenChange={setIsBulkCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Bulk Create Slots
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Bulk Create Time Slots</DialogTitle>
              </DialogHeader>
              <BulkTimeSlotForm
                rinks={rinks || []}
                onSubmitAction={() => setIsBulkCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Manage Time Slot Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Time Slot</DialogTitle>
          </DialogHeader>
          {(selectedEvent || selectedSlot) && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Start Time</p>
                  {selectedEvent ? (
                    <p>
                      {selectedEvent.event.start &&
                        `${selectedEvent.event.start.getUTCHours()}:${String(
                          selectedEvent.event.start.getUTCMinutes(),
                        ).padStart(2, "0")}`}
                    </p>
                  ) : (
                    <p>
                      {selectedSlot &&
                        `${new Date(selectedSlot.startTime).getUTCHours()}:${String(
                          new Date(selectedSlot.startTime).getUTCMinutes(),
                        ).padStart(2, "0")}`}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-medium">End Time</p>
                  {selectedEvent ? (
                    <p>
                      {selectedEvent.event.end &&
                        `${selectedEvent.event.end.getUTCHours()}:${String(
                          selectedEvent.event.end.getUTCMinutes(),
                        ).padStart(2, "0")}`}
                    </p>
                  ) : (
                    <p>
                      {selectedSlot &&
                        `${new Date(selectedSlot.endTime).getUTCHours()}:${String(
                          new Date(selectedSlot.endTime).getUTCMinutes(),
                        ).padStart(2, "0")}`}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Students</p>
                  <p>
                    {selectedEvent
                      ? `${selectedEvent.event.extendedProps.currentStudents} / ${selectedEvent.event.extendedProps.maxStudents}`
                      : selectedSlot &&
                        `${selectedSlot.lessons?.length || 0} / ${selectedSlot.maxStudents}`}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Rink</p>
                  <p>
                    {selectedEvent
                      ? selectedEvent.event.extendedProps.rink?.name
                      : selectedSlot?.rink?.name}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-medium">Assign Student</p>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(studentId: string) => {
                      assignStudent.mutate({
                        timeSlotId: selectedEvent ? selectedEvent.event.id : selectedSlot?.id || "",
                        studentId,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students?.students?.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.user.name || "Unnamed Student"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-medium">Assigned Students</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(selectedEvent
                    ? selectedEvent.event.extendedProps.lessons
                    : selectedSlot?.lessons
                  )?.map((lesson: Lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span>{lesson.student.user.name || "Unnamed Student"}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Remove this student from the time slot?")) {
                            unassignStudent.mutate({ lessonId: lesson.id });
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={() => {
                    setSelectedEvent(null);
                    setSelectedSlot(null);
                    setIsManageDialogOpen(false);
                  }}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={() => {
                    const slotData = selectedEvent
                      ? {
                          startTime: selectedEvent.event.start || new Date(),
                          endTime: selectedEvent.event.end || new Date(),
                          rinkId: selectedEvent.event.extendedProps.rinkId,
                        }
                      : {
                          startTime: selectedSlot ? new Date(selectedSlot.startTime) : new Date(),
                          endTime: selectedSlot ? new Date(selectedSlot.endTime) : new Date(),
                          rinkId: selectedSlot?.rinkId,
                        };

                    setTimeSlotFormData(slotData);
                    setIsCreateDialogOpen(true);
                    setIsManageDialogOpen(false);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  className="w-full md:w-auto"
                  onClick={() => {
                    const slotId = selectedEvent ? selectedEvent.event.id : selectedSlot?.id || "";
                    if (confirm("Are you sure you want to delete this time slot?")) {
                      deleteTimeSlot.mutate({ id: slotId });
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isMobile ? (
            // Custom mobile list view
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <Button variant="outline" size="sm" onClick={goToPrevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <span className="font-medium">{dateRangeText()}</span>
                </div>
                <Button variant="outline" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="w-full mb-4" onClick={goToToday}>
                Today
              </Button>

              {/* Custom list view for mobile */}
              <div className="space-y-4">
                {processEventsForCustomList().map((day) => (
                  <div key={format(day.date, "yyyy-MM-dd")} className="mb-4">
                    {/* Day header */}
                    <div className="py-2 px-3 bg-slate-100 rounded-t-md">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{format(day.date, "EEEE")}</span>
                        <span>{format(day.date, "MMMM d, yyyy")}</span>
                      </div>
                    </div>

                    {/* Time slots for this day */}
                    <div className="border border-slate-200 rounded-b-md">
                      {day.slots
                        .sort(
                          (a, b) =>
                            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
                        )
                        .map((slot) => {
                          const studentCount = slot.lessons?.length || 0;
                          const studentNames = slot.lessons
                            ?.map((lesson: Lesson) => lesson.student.user.name || "Unnamed Student")
                            .join(", ");

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              className="p-3 border-b last:border-0 cursor-pointer hover:bg-slate-50 w-full text-left"
                              onClick={() => handleMobileSlotClick(slot)}
                              aria-label={`Time slot from ${new Date(
                                slot.startTime,
                              ).getUTCHours()}:${String(
                                new Date(slot.startTime).getUTCMinutes(),
                              ).padStart(2, "0")} to ${new Date(
                                slot.endTime,
                              ).getUTCHours()}:${String(
                                new Date(slot.endTime).getUTCMinutes(),
                              ).padStart(2, "0")}`}
                            >
                              <div className="flex justify-between">
                                <div className="font-medium">
                                  {`${new Date(slot.startTime).getUTCHours()}:${String(
                                    new Date(slot.startTime).getUTCMinutes(),
                                  ).padStart(2, "0")} - 
                                  ${new Date(slot.endTime).getUTCHours()}:${String(
                                    new Date(slot.endTime).getUTCMinutes(),
                                  ).padStart(2, "0")}`}
                                </div>
                                <div>{`${studentCount}/${slot.maxStudents}`}</div>
                              </div>
                              <div className="text-sm text-gray-600 flex justify-between">
                                <div>{slot.rink.name}</div>
                                {studentNames && <div className="italic">{studentNames}</div>}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Desktop calendar view
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              events={events}
              timeZone="UTC"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "timeGridWeek,dayGridMonth",
              }}
              slotDuration="00:30:00"
              slotMinTime="05:00:00" // Start at 5am
              slotMaxTime="18:00:00" // End at 6pm
              defaultTimedEventDuration="01:00:00"
              allDaySlot={false}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              height="700px"
              displayEventTime={true}
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                omitZeroMinute: false,
                hour12: false,
              }}
              eventContent={(arg) => {
                const start = new Date(arg.event.startStr);
                const end = new Date(arg.event.endStr);

                // Use UTC hours to avoid timezone conversion
                const startFormatted = `${start.getUTCHours()}:${String(
                  start.getUTCMinutes(),
                ).padStart(2, "0")}`;
                const endFormatted = `${end.getUTCHours()}:${String(end.getUTCMinutes()).padStart(
                  2,
                  "0",
                )}`;

                return {
                  html: `
                    <div class="fc-event-main-frame p-1">
                      <div class="fc-event-time font-medium">${startFormatted} - ${endFormatted}</div>
                      <div class="fc-event-title text-sm whitespace-normal">${arg.event.title}</div>
                      <div class="fc-event-subtitle text-xs whitespace-normal">${arg.event.extendedProps.rinkName || ""}</div>
                    </div>
                  `,
                };
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}