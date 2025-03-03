// src/features/student/components/booking/BookingCalendar.tsx
"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { BookingDialog } from './BookingDialog';
import { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { TRPCClientError } from '@trpc/client';

interface BookingCalendarProps {
  studentId: string;
}

export const BookingCalendar = ({ studentId }: BookingCalendarProps) => {
  const [date, setDate] = useState(new Date());
  const [selectedRink, setSelectedRink] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  
  const { toast } = useToast();
  
  // Fetch all available rinks
  const { data: rinks } = api.student.availability.getRinks.useQuery();
  
  // Fetch available time slots
  const { data: availableSlots, isLoading } = api.student.availability.getAvailableTimeSlots.useQuery({
    startDate: startOfDay(date),
    endDate: endOfDay(addDays(date, 6)),
    rinkId: selectedRink || undefined,
  }, {
    onError: (error: TRPCClientError<any>) => {
      toast({
        title: "Error loading time slots",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Convert slots to FullCalendar events
  const events = availableSlots?.map((slot: any) => {
    const studentCount = slot.currentStudents;
    const isAvailable = studentCount < slot.maxStudents;
    
    return {
      id: slot.id,
      title: `${studentCount}/${slot.maxStudents} students${isAvailable ? ' - Available' : ' - Full'}`,
      start: slot.startTime,
      end: slot.endTime,
      color: isAvailable ? '#4ade80' : '#ef4444',
      extendedProps: {
        ...slot,
      },
    };
  }) || [];
  
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // For now, we'll just use this for navigation, not booking
    setDate(selectInfo.start);
  };
  
  const handleEventClick = (clickInfo: EventClickArg) => {
    const slot = clickInfo.event.extendedProps;
    
    // Check if the slot is available
    if (slot.currentStudents >= slot.maxStudents) {
      toast({
        title: "Time slot unavailable",
        description: "This time slot is already fully booked.",
        variant: "destructive",
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
              <SelectItem value="">All Rinks</SelectItem>
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
        {isLoading ? (
          <div className="flex justify-center items-center h-[600px]">
            <p>Loading calendar...</p>
          </div>
        ) : (
          <div className="h-[600px]">
            <Calendar
              initialView="timeGridWeek"
              events={events}
              selectable={true}
              onDateSelect={handleDateSelect}
              onEventClick={handleEventClick}
              businessHours={{
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                startTime: "05:00",
                endTime: "18:00",
              }}
            />
          </div>
        )}
        
        {isBookingDialogOpen && selectedSlot && (
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