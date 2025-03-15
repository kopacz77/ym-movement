"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, addDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { BookingDialog } from './BookingDialog';
import { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const BookingCalendar = () => {
  const [date, setDate] = useState(new Date());
  const [selectedRink, setSelectedRink] = useState<string>("all_rinks");
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);
  const isMobile = useIsMobile();

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
  }, [error]);

  // Format the date range for display (e.g., "Mar 16 - 22, 2025")
  const dateRangeText = () => {
    const endDate = addDays(date, 6);
    const startMonth = format(date, 'MMM');
    const endMonth = format(endDate, 'MMM');
    
    if (startMonth === endMonth) {
      return `${startMonth} ${format(date, 'd')} - ${format(endDate, 'd')}, ${format(date, 'yyyy')}`;
    } else {
      return `${startMonth} ${format(date, 'd')} - ${endMonth} ${format(endDate, 'd')}, ${format(date, 'yyyy')}`;
    }
  };

  // Navigate to previous week
  const goToPrevWeek = () => {
    setDate(prev => addDays(prev, -7));
  };

  // Navigate to next week
  const goToNextWeek = () => {
    setDate(prev => addDays(prev, 7));
  };

  // Go to today
  const goToToday = () => {
    setDate(startOfDay(new Date()));
  };

  // Convert slots to FullCalendar events with an interactive flag
  const events = availableSlots?.map((slot: any) => {
    const studentCount = slot.currentStudents;
    const isAvailable = studentCount < slot.maxStudents;
    const isYuraSlot = slot.isActive;

    return {
      id: slot.id,
      title: `${studentCount}/${slot.maxStudents} students${isAvailable ? ' - Available' : ' - Full'}`,
      start: slot.startTime,
      end: slot.endTime,
      color: isAvailable ? 'rgb(74 222 128)' : 'rgb(239 68 68)',
      interactive: isYuraSlot && isAvailable,
      className: !isYuraSlot ? 'non-interactive-slot' : '',
      extendedProps: {
        ...slot,
        interactive: isYuraSlot && isAvailable,
      },
    };
  }) || [];

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setDate(selectInfo.start);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const slot = clickInfo.event.extendedProps;

    if (!slot.interactive) {
      toast("Non-bookable time slot", {
        description: "This time slot is not available for booking."
      });
      return;
    }

    if (slot.currentStudents >= slot.maxStudents) {
      toast.error("Time slot unavailable", {
        description: "This time slot is already fully booked."
      });
      return;
    }

    setSelectedSlot(slot);
    setIsBookingDialogOpen(true);
  };

  // Process events for display in the custom list view
  const processEventsForCustomList = () => {
    if (!availableSlots) return [];
    
    // Group events by day
    const groupedEvents = availableSlots.reduce((groups, slot) => {
      const date = format(new Date(slot.startTime), 'yyyy-MM-dd');
      
      if (!groups[date]) {
        groups[date] = {
          date: new Date(slot.startTime),
          slots: []
        };
      }
      
      groups[date].slots.push(slot);
      return groups;
    }, {} as Record<string, { date: Date; slots: any[] }>);
    
    // Convert to array and sort by date
    return Object.values(groupedEvents)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  // Format time for display (24h format, no timezone conversion)
  const formatTimeDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getUTCHours()}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  };

  // Handle clicking a slot in the custom list view
  const handleCustomSlotClick = (slot: any) => {
    if (!slot.isActive) {
      toast("Non-bookable time slot", {
        description: "This time slot is not available for booking."
      });
      return;
    }

    const currentStudents = slot.lessons?.length || 0;
    if (currentStudents >= slot.maxStudents) {
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
        ) : isMobile ? (
          // Custom mobile list view
          <div className="h-[600px] overflow-y-auto">
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
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mb-4"
              onClick={goToToday}
            >
              Today
            </Button>
            
            {processEventsForCustomList().map((day) => (
              <div key={format(day.date, 'yyyy-MM-dd')} className="mb-4">
                {/* Day header */}
                <div className="py-2 px-3 bg-slate-100 rounded-t-md">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{format(day.date, 'EEEE')}</span>
                    <span>{format(day.date, 'MMMM d, yyyy')}</span>
                  </div>
                </div>
                
                {/* Time slots for the day */}
                <div className="border border-slate-200 rounded-b-md">
                  {day.slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map((slot) => {
                    const currentStudents = slot.lessons?.length || 0;
                    const isAvailable = currentStudents < slot.maxStudents;
                    
                    return (
                      <div 
                        key={slot.id}
                        className={`p-3 border-b last:border-0 cursor-pointer transition-colors ${
                          isAvailable ? 'hover:bg-green-50' : 'hover:bg-red-50'
                        }`}
                        onClick={() => handleCustomSlotClick(slot)}
                      >
                        <div className="flex justify-between">
                          <div className="font-medium">
                            {`${formatTimeDisplay(slot.startTime)} - ${formatTimeDisplay(slot.endTime)}`}
                          </div>
                          <div className={isAvailable ? 'text-green-600' : 'text-red-600'}>
                            {`${currentStudents}/${slot.maxStudents} students`}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {slot.rink.name} {isAvailable ? '- Available' : '- Full'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop calendar view
          <div className="h-[600px]">
            <FullCalendar
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              events={events}
              timeZone="UTC" // Keep this as UTC to maintain exact times
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'timeGridWeek,dayGridMonth'
              }}
              selectable={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              slotMinTime="05:00:00"  // Start at 5am
              slotMaxTime="18:00:00"  // End at 6pm
              businessHours={{
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                startTime: "05:00",
                endTime: "18:00",
              }}
              allDaySlot={false} 
              height="100%"
              displayEventTime={true}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                omitZeroMinute: false,
                hour12: false
              }}
              eventContent={(arg) => {
                const start = new Date(arg.event.startStr);
                const end = new Date(arg.event.endStr);
                
                // Use UTC hours to avoid timezone conversion
                const startFormatted = `${start.getUTCHours()}:${String(start.getUTCMinutes()).padStart(2, '0')}`;
                const endFormatted = `${end.getUTCHours()}:${String(end.getUTCMinutes()).padStart(2, '0')}`;
                
                return {
                  html: `
                    <div class="fc-event-main-frame">
                      <div class="fc-event-time">${startFormatted} - ${endFormatted}</div>
                      <div class="fc-event-title">${arg.event.title}</div>
                    </div>
                  `
                };
              }}
            />
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