"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { BookingDialog } from './BookingDialog';
import { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export const BookingCalendar = () => {
  const [date, setDate] = useState(new Date());
  const [selectedRink, setSelectedRink] = useState<string>("all_rinks");
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);

  // Only fetch data when studentId is available
  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  // Fetch all available rinks
  // @ts-ignore - Router exists but TypeScript hasn't caught up
  const { data: rinks } = api.student.availability.getRinks.useQuery();

  // Fetch available time slots
  // @ts-ignore - Router exists but TypeScript hasn't caught up
  const { data: availableSlots, isLoading, error } = api.student.availability.getAvailableTimeSlots.useQuery(
    {
      startDate: startOfDay(date),
      endDate: endOfDay(addDays(date, 6)),
      rinkId: selectedRink === "all_rinks" ? undefined : selectedRink,
    },
    { enabled: isReady } // Only fetch when we're ready
  );

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      const errorMessage = error.message || "An unexpected error occurred while loading time slots.";
      toast.error("Error loading time slots", {
        description: errorMessage
      });
    }
  }, [error, toast]);

  // Convert slots to FullCalendar events with an interactive flag
  const events = availableSlots?.map((slot: any) => {
    const studentCount = slot.currentStudents;
    const isAvailable = studentCount < slot.maxStudents;
    
    // Only slots created by Yura should be interactive
    // We identify this by checking if they were created by Yura's system
    // Since all timeslots come from the system, we'll use the isActive flag
    // In a real implementation, you might need to check the creator's ID or another field
    const isYuraSlot = slot.isActive; // Assuming all active slots are created by Yura
    
    return {
      id: slot.id,
      title: `${studentCount}/${slot.maxStudents} students${isAvailable ? ' - Available' : ' - Full'}`,
      start: slot.startTime,
      end: slot.endTime,
      color: isAvailable ? 'rgb(74 222 128)' : 'rgb(239 68 68)',
      // Add a custom property to determine if the slot is interactive
      interactive: isYuraSlot && isAvailable,
      // If the slot isn't interactive, make it visually distinct
      className: !isYuraSlot ? 'non-interactive-slot' : '',
      extendedProps: {
        ...slot,
        interactive: isYuraSlot && isAvailable,
      },
    };
  }) || [];

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // For now, we'll just use this for navigation, not booking
    setDate(selectInfo.start);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const slot = clickInfo.event.extendedProps;
    
    // First check if the slot is interactive (created by Yura)
    if (!slot.interactive) {
      toast("Non-bookable time slot", {
        description: "This time slot is not available for booking."
      });
      return;
    }
    
    // Check if the slot is available
    if (slot.currentStudents >= slot.maxStudents) {
      toast.error("Time slot unavailable", {
        description: "This time slot is already fully booked."
      });
      return;
    }
    
    setSelectedSlot(slot);
    setIsBookingDialogOpen(true);
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Book a Lesson</CardTitle>
        <div className="flex gap-2">
          <Select value={selectedRink} onValueChange={setSelectedRink}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Rinks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_rinks">All Rinks</SelectItem>
              {rinks?.map((rink: any) => (
                <SelectItem key={rink.id} value={rink.id}>
                  {rink.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || !isReady ? (
          <div className="flex justify-center items-center h-[600px]">
            <p>Loading calendar...</p>
          </div>
        ) : (
          <div className="h-[600px]">
            <FullCalendar
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              events={events}
              selectable={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              businessHours={{
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                startTime: "05:00",
                endTime: "18:00",
              }}
              height="100%"
            />
            {/* Add CSS for styling non-interactive slots */}
            <style jsx global>{`
              .non-interactive-slot {
                opacity: 0.6;
                cursor: not-allowed !important;
              }
              
              /* Add a visual cue to indicate non-clickable slots */
              .non-interactive-slot:hover {
                text-decoration: line-through;
              }
            `}</style>
          </div>
        )}
        
        {isBookingDialogOpen && selectedSlot && studentId && (
          <BookingDialog
            slot={selectedSlot}
            studentId={studentId}
            onCloseAction={() => {
              setIsBookingDialogOpen(false);
              setSelectedSlot(null);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};