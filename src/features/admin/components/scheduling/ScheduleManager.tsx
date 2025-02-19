"use client"
import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TimeSlotForm } from './TimeSlotForm'
import { BulkTimeSlotForm } from './BulkTimeSlotForm'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core'
import { Plus, X } from 'lucide-react'
import { format } from 'date-fns'

interface TimeSlotFormData {
  startTime: Date | null
  endTime: Date | null
  rinkId?: string
}

export const ScheduleManager = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false)
  const [timeSlotFormData, setTimeSlotFormData] = useState<TimeSlotFormData | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(null)
  const { toast } = useToast()
  const utils = api.useUtils()

  // Fetch rinks
  const { data: rinks, isLoading: isLoadingRinks } = api.admin.getRinks.useQuery(undefined, {
    onError: (err) => {
      toast({
        title: "Error loading rinks",
        description: err.message,
        variant: "destructive",
      })
    },
  })

  // Fetch students
  const { data: students } = api.admin.getStudents.useQuery(
    {},
    {
      onError: (err) => {
        toast({
          title: "Error loading students",
          description: err.message,
          variant: "destructive",
        })
      }
    }
  )

  // Fetch time slots
  const { data: timeSlots, isLoading: isLoadingSlots } = api.admin.getTimeSlots.useQuery(
    {},
    {
      onError: (err) => {
        toast({
          title: "Error loading time slots",
          description: err.message,
          variant: "destructive",
        })
      },
    }
  )

  // Convert time slots to FullCalendar events with improved display
  const events = timeSlots?.map(slot => {
    const studentCount = slot.lessons?.length || 0
    const studentNames = slot.lessons
      ?.map(lesson => lesson.student.user.name)
      .join(', ')
    // Create title with student info and rink name
    const title = `${studentCount}/${slot.maxStudents} students${ studentNames ? ` (${studentNames})` : '' } - ${slot.rink.name}`
    return {
      id: slot.id,
      title,
      start: slot.startTime,
      end: slot.endTime,
      resourceId: slot.rinkId,
      extendedProps: { ...slot, currentStudents: studentCount }
    }
  }) || []

  // Convert rinks to FullCalendar resources
  const resources = rinks?.map(rink => ({
    id: rink.id,
    title: rink.name
  })) || []

  // Delete mutation
  const deleteTimeSlot = api.admin.deleteTimeSlot.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Time slot deleted successfully",
      })
      setIsManageDialogOpen(false)
      setSelectedEvent(null)
      utils.admin.getTimeSlots.invalidate()
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    }
  })

  // Assign student mutation
  const assignStudent = api.admin.assignStudentToTimeSlot.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Student assigned successfully" })
      utils.admin.getTimeSlots.invalidate()
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  })

  // Unassign student mutation
  const unassignStudent = api.admin.unassignStudent.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Student unassigned successfully" })
      utils.admin.getTimeSlots.invalidate()
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  })

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setTimeSlotFormData({
      startTime: selectInfo.start,
      endTime: selectInfo.end,
      rinkId: selectInfo.resource?.id
    })
    setIsCreateDialogOpen(true)
  }

  const handleCreateTimeSlotClick = () => {
    setTimeSlotFormData({ startTime: null, endTime: null })
    setIsCreateDialogOpen(true)
  }

  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo)
    setIsManageDialogOpen(true)
  }

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    try {
      await api.admin.updateTimeSlot.mutate({
        id: dropInfo.event.id,
        startTime: dropInfo.event.start!,
        endTime: dropInfo.event.end!,
      })
      toast({
        title: "Success",
        description: "Time slot updated successfully",
      })
      utils.admin.getTimeSlots.invalidate()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update time slot",
        variant: "destructive",
      })
      dropInfo.revert()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Schedule Management</h1>
        <div className="flex gap-2">
          {/* Wrapper for both dialogs */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateTimeSlotClick}>
                <Plus className="mr-2 h-4 w-4" /> Create Time Slot
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {timeSlotFormData?.startTime ? "Create Time Slot for Selected Time" : "Create New Time Slot"}
                </DialogTitle>
              </DialogHeader>
              {timeSlotFormData && (
                <TimeSlotForm
                  initialStartTime={timeSlotFormData.startTime}
                  initialEndTime={timeSlotFormData.endTime}
                  initialRinkId={timeSlotFormData.rinkId}
                  rinks={rinks || []}
                  onSubmit={() => {
                    setIsCreateDialogOpen(false)
                    setTimeSlotFormData(null)
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
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
              <BulkTimeSlotForm rinks={rinks || []} onSubmit={() => setIsBulkCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
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
                  <Select
                    onValueChange={(studentId) => {
                      assignStudent.mutate({
                        timeSlotId: selectedEvent.event.id,
                        studentId,
                      })
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students?.map((student) => (
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
                    <div key={lesson.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{lesson.student.user.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Remove this student from the time slot?")) {
                            unassignStudent.mutate({ lessonId: lesson.id })
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
                    setSelectedEvent(null)
                    setIsManageDialogOpen(false)
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
                    })
                    setIsCreateDialogOpen(true)
                    setIsManageDialogOpen(false)
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this time slot?")) {
                      deleteTimeSlot.mutate({ id: selectedEvent.event.id })
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
      <Card>
        <CardContent className="p-0">
          <Calendar
            initialView="timeGridWeek"
            events={events}
            resources={resources}
            selectable={true}
            onDateSelect={handleDateSelect}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
            businessHours={{
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
              startTime: "05:00",
              endTime: "18:00",
            }}
            eventContent={(eventInfo) => (
              <div className="p-2 group relative">
                <div className="font-medium">{eventInfo.event.title}</div>
                <div className="hidden group-hover:block absolute z-50 bg-white border rounded-lg shadow-lg p-4 min-w-[200px] left-full ml-2">
                  <p className="font-medium">Time Slot Details</p>
                  <p>Start: {format(eventInfo.event.start!, "PPp")}</p>
                  <p>End: {format(eventInfo.event.end!, "PPp")}</p>
                  <p>
                    Students: {eventInfo.event.extendedProps.currentStudents} / {eventInfo.event.extendedProps.maxStudents}
                  </p>
                  <p>Rink: {eventInfo.event.extendedProps.rink?.name}</p>
                  {eventInfo.event.extendedProps.lessons?.length > 0 && (
                    <>
                      <p className="font-medium mt-2">Assigned Students:</p>
                      <ul className="list-disc list-inside">
                        {eventInfo.event.extendedProps.lessons.map((lesson: any) => (
                          <li key={lesson.id}>
                            {lesson.student.user.name}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
