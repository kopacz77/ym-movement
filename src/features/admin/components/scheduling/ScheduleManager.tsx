// src/features/admin/components/scheduling/ScheduleManager.tsx
"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeSlotForm } from './TimeSlotForm';
import { BulkTimeSlotForm } from './BulkTimeSlotForm';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

interface TimeSlotFormData {
  startTime: Date | null;
  endTime: Date | null;
  rinkId?: string;
}

export function ScheduleManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [timeSlotFormData, setTimeSlotFormData] = useState<TimeSlotFormData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(null);
  const utils = api.useUtils();

  // Get rinks data
  const { data: rinks, isLoading: isLoadingRinks } = api.admin.schedule.getRinks.useQuery();

  // Get students data
  const { data: students } = api.admin.student.getStudents.useQuery();

  // Get time slots data
  const { data: timeSlots, isLoading: isLoadingSlots } = api.admin.schedule.getTimeSlots.useQuery({});

  // Convert time slots to FullCalendar events
  const events = timeSlots?.map((slot) => {
    const studentCount = slot.lessons?.length || 0;
    const studentNames = slot.lessons
      ?.map((lesson) => lesson.student.user.name)
      .join(', ');
    const title = `${studentCount}/${slot.maxStudents} students${studentNames ? ` (${studentNames})` : ''
      } - ${slot.rink.name}`;
    return {
      id: slot.id,
      title,
      start: slot.startTime,
      end: slot.endTime,
      resourceId: slot.rinkId,
      extendedProps: {
        ...slot,
        currentStudents: studentCount,
      },
    };
  }) || [];

  // Convert rinks to FullCalendar resources
  const resources = rinks?.map((rink) => ({
    id: rink.id,
    title: rink.name,
  })) || [];

  // Delete time slot mutation
  const deleteTimeSlot = api.admin.schedule.deleteTimeSlot.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Time slot deleted successfully"
      });
      setIsManageDialogOpen(false);
      setSelectedEvent(null);
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message
      });
    },
  });

  // Assign student mutation
  const assignStudent = api.admin.schedule.assignStudentToTimeSlot.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Student assigned successfully"
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message
      });
    },
  });

  // Unassign student mutation
  const unassignStudent = api.admin.schedule.unassignStudent.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Student unassigned successfully"
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message
      });
    },
  });

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    setTimeSlotFormData({
      startTime: selectInfo.start,
      endTime: selectInfo.end,
      // Don't try to access resource property as it doesn't exist on DateSelectArg
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

  const handleEventDrop = useCallback((dropInfo: EventDropArg) => {
    // For updateTimeSlot, we need to get the actual mutation function
    const updateTimeSlot = api.admin.schedule.updateTimeSlot.useMutation({
      onSuccess: () => {
        toast("Success", {
          description: "Time slot updated successfully"
        });
        utils.admin.schedule.getTimeSlots.invalidate();
      },
      onError: (error) => {
        toast.error("Error", {
          description: "Failed to update time slot"
        });
        dropInfo.revert();
      }
    });

    // Now call the mutation
    updateTimeSlot.mutate({
      id: dropInfo.event.id,
      startTime: dropInfo.event.start!,
      endTime: dropInfo.event.end!,
    });
  }, [utils.admin.schedule]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Schedule Management</h1>
        <div className="flex gap-2">
          {/* Create Time Slot Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateTimeSlotClick}>
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
              <Button variant="outline">
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
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Start Time</p>
                  <p>{format(selectedEvent.event.start!, "PPp")}</p>
                </div>
                <div>
                  <p className="font-medium">End Time</p>
                  <p>{format(selectedEvent.event.end!, "PPp")}</p>
                </div>
                <div>
                  <p className="font-medium">Students</p>
                  <p>
                    {selectedEvent.event.extendedProps.currentStudents} /{" "}
                    {selectedEvent.event.extendedProps.maxStudents}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Rink</p>
                  <p>{selectedEvent.event.extendedProps.rink?.name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-medium">Assign Student</p>
                <div className="flex gap-2">
                  <Select onValueChange={(studentId: string) => {
                    assignStudent.mutate({
                      timeSlotId: selectedEvent.event.id,
                      studentId,
                    });
                  }}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students?.students?.map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-medium">Assigned Students</p>
                <div className="space-y-1">
                  {selectedEvent.event.extendedProps.lessons?.map((lesson: any) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span>{lesson.student.user.name}</span>
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

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedEvent(null);
                    setIsManageDialogOpen(false);
                  }}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTimeSlotFormData({
                      startTime: selectedEvent.event.start!,
                      endTime: selectedEvent.event.end!,
                      rinkId: selectedEvent.event.extendedProps.rinkId,
                    });
                    setIsCreateDialogOpen(true);
                    setIsManageDialogOpen(false);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this time slot?")) {
                      deleteTimeSlot.mutate({ id: selectedEvent.event.id });
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
          {/* Replace Calendar component with FullCalendar */}
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin, resourceTimeGridPlugin]}
            initialView="resourceTimeGridWeek"  // Use resource-specific view
            events={events}
            resources={resources}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            businessHours={{
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
              startTime: "05:00",
              endTime: "18:00",
            }}
            height="auto"
          />
        </CardContent>
      </Card>
    </div>
  );
}