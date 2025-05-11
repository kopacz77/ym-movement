// src/features/student/components/booking/BookingCalendar.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { api } from "@/lib/api";
import { displayInRinkLocalTime } from "@/lib/timezone";
import { Calendar, Views } from "react-big-calendar";
import { localizer } from "@/lib/calendar/calendarLocalizer";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { endOfDay, startOfDay } from "date-fns";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookingDialog } from "./BookingDialog";
import { TimezoneNotice, formatTimeWithTimezone } from "@/components/TimezoneNotice";

// Define types for the rinks and time slots
interface Rink {
  id: string;
  name: string;
  address: string;
  timezone: string;
}

interface ApiRink {
  id?: string;
  name: string;
  address: string;
  timezone?: string;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  currentStudents?: number;
  lessons?: unknown[];
  isActive: boolean;
  rink: Rink;
  interactive?: boolean;
}

interface ApiTimeSlot {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  maxStudents: number;
  currentStudents?: number;
  lessons?: unknown[];
  isActive: boolean;
  isAvailable?: boolean;
  rink: ApiRink;
  [key: string]: unknown;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: unknown;
  interactive?: boolean;
  rinkName?: string;
  timezone?: string;
  timeDisplay?: string;
  status?: string;
  maxStudents?: number;
  currentStudents?: number;
}

// Define a type for view
type View = typeof Views.WEEK | typeof Views.MONTH;

export const BookingCalendar = () => {
  const { id: studentId } = useCurrentUser();
  const isMobile = useIsMobile();

  // Create a stable initial date
  const initialDate = useMemo(() => new Date(), []);

  // State initialization
  const [date, setDate] = useState(initialDate);
  const [selectedRink, setSelectedRink] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [calendarView, setCalendarView] = useState<View>(Views.WEEK);

  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  // Calculate date range based on month for efficient data loading
  const dateRange = useMemo(() => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);

    return {
      start: startOfDay(firstDay),
      end: endOfDay(lastDay),
    };
  }, [date]);

  // Generate a stable cache key
  const cacheKey = useMemo(() => {
    const hashStr = `${dateRange.start.getTime()}-${dateRange.end.getTime()}-${selectedRink}`;
    return hashStr.split("").reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
  }, [dateRange.start, dateRange.end, selectedRink]);

  // Fetch rinks
  const { data: rinks } = api.student.availability.getRinks.useQuery(undefined, {
    enabled: isReady,
  });

  // Set the first rink as default if not already set
  // biome-ignore lint/correctness/useExhaustiveDependencies: rinks fully covers any changes to rinks[0].id
  useEffect(() => {
    // Safely access the first rink ID within the effect body
    const firstRinkId = rinks?.[0]?.id;
    
    if (firstRinkId && !selectedRink) {
      setSelectedRink(firstRinkId);
    }
  }, [rinks, selectedRink]);

  // Get current rink timezone
  const rinkTimezone = useMemo(() => {
    if (selectedRink && rinks) {
      const selectedRinkData = rinks.find((rink: Rink) => rink.id === selectedRink);
      return selectedRinkData?.timezone || 'America/Los_Angeles';
    }
    // Default timezone if no rink is selected
    return 'America/Los_Angeles';
  }, [selectedRink, rinks]);

  // Fetch time slots - only enable when a rink is selected
  const { data: availableSlots, isLoading } =
    api.student.availability.getAvailableTimeSlots.useQuery(
      {
        startDate: dateRange.start,
        endDate: dateRange.end,
        rinkId: selectedRink,
        _cache: cacheKey,
      },
      {
        enabled: isReady && !!selectedRink,
        refetchOnWindowFocus: false,
        staleTime: 30000,
      },
    );

  // Format the date range for display
  const dateRangeText = useMemo(() => {
    if (!selectedRink) { return ""; }
    
    // Use Luxon for proper timezone handling
    const startDate = DateTime.fromJSDate(date).setZone(rinkTimezone);
    
    if (calendarView === Views.WEEK) {
      const endDate = startDate.plus({ days: 6 });
      if (startDate.month === endDate.month) {
        return `${startDate.toFormat('MMM d')} - ${endDate.toFormat('d')}, ${startDate.toFormat('yyyy')}`;
      }
      return `${startDate.toFormat('MMM d')} - ${endDate.toFormat('MMM d')}, ${startDate.toFormat('yyyy')}`;
    }
    
    return startDate.toFormat('MMMM yyyy');
  }, [date, calendarView, rinkTimezone, selectedRink]);

  // Convert slots to calendar events
  const events = useMemo(() => {
    if (!availableSlots || !selectedRink) {
      return [];
    }

    return availableSlots.map((slot): CalendarEvent => {
      const isAvailable = slot.isAvailable === true;
      const isYuraSlot = slot.isActive === true;
      const studentCount = slot.currentStudents || 0;
      const timezone = slot.rink.timezone || rinkTimezone;
      
      // Format times in the rink's timezone
      const startTimeInfo = displayInRinkLocalTime(slot.startTime, timezone);
      const endTimeInfo = displayInRinkLocalTime(slot.endTime, timezone);
      
      const timeDisplay = `${startTimeInfo.formattedTime} - ${endTimeInfo.formattedTime}`;
      
      const title = `${studentCount}/${slot.maxStudents} students${
        isAvailable ? " - Available" : " - Full"
      }`;

      return {
        id: slot.id,
        title,
        start: startTimeInfo.dateTime.toJSDate(),
        end: endTimeInfo.dateTime.toJSDate(),
        interactive: isYuraSlot && isAvailable,
        rinkName: slot.rink?.name || "",
        timezone,
        timeDisplay,
        status: isAvailable && isYuraSlot ? "available" : "unavailable",
        maxStudents: slot.maxStudents,
        currentStudents: studentCount
      };
    });
  }, [availableSlots, selectedRink, rinkTimezone]);

  // Process events for list view
  const processEventsForCustomList = useCallback(() => {
    if (!availableSlots || !selectedRink) {
      return [];
    }

    // Group events by day in the rink's timezone
    const groupedEvents = availableSlots.reduce(
      (groups, slot) => {
        // Get the date in the rink's timezone
        const slotDateTime = DateTime.fromISO(slot.startTime.toString()).setZone(rinkTimezone);
        const dateKey = slotDateTime.toFormat('yyyy-MM-dd');

        if (!groups[dateKey]) {
          groups[dateKey] = {
            date: slotDateTime.toJSDate(),
            slots: [],
          };
        }

        groups[dateKey].slots.push(slot);
        return groups;
      },
      {} as Record<string, { date: Date; slots: ApiTimeSlot[] }>,
    );

    // Convert to array and sort by date
    return Object.values(groupedEvents).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [availableSlots, selectedRink, rinkTimezone]);

  // Format time in the rink's timezone
  const formatTimeInRinkTimezone = useCallback((timeStr: string | Date) => {
    const dateTime = DateTime.fromISO(timeStr.toString()).setZone(rinkTimezone);
    return dateTime.toFormat('h:mm a');
  }, [rinkTimezone]);

  // Handle events
  const handleEventClick = useCallback((event: CalendarEvent) => {
    if (!event.interactive) {
      toast("Non-bookable time slot", {
        description: "This time slot is not available for booking.",
      });
      return;
    }

    const currentStudents = event.currentStudents || 0;
    if (currentStudents >= (event.maxStudents || 0)) {
      toast.error("Time slot unavailable", {
        description: "This time slot is already fully booked.",
      });
      return;
    }

    // Convert event to TimeSlot format
    const slot: TimeSlot = {
      id: event.id,
      startTime: event.start.toISOString(),
      endTime: event.end.toISOString(),
      maxStudents: event.maxStudents || 0,
      currentStudents: event.currentStudents,
      isActive: true,
      rink: {
        id: selectedRink,
        name: event.rinkName || "",
        address: "",
        timezone: event.timezone || rinkTimezone
      },
      interactive: event.interactive
    };

    setSelectedSlot(slot);
    setIsBookingDialogOpen(true);
  }, [selectedRink, rinkTimezone]);

  // Handle clicking a slot in the custom list view
  const handleCustomSlotClick = useCallback((rawSlot: ApiTimeSlot) => {
    // Ensure startTime and endTime are strings
    const stringifiedStartTime = rawSlot.startTime.toString();
    const stringifiedEndTime = rawSlot.endTime.toString();

    // Create a properly typed TimeSlot
    const processedSlot: TimeSlot = {
      id: rawSlot.id,
      startTime: stringifiedStartTime,
      endTime: stringifiedEndTime,
      maxStudents: rawSlot.maxStudents,
      currentStudents: rawSlot.currentStudents,
      lessons: rawSlot.lessons,
      isActive: rawSlot.isActive,
      rink: {
        name: rawSlot.rink.name,
        address: rawSlot.rink.address,
        id: rawSlot.rink.id || "unknown",
        timezone: rawSlot.rink.timezone || rinkTimezone,
      },
      interactive: rawSlot.isAvailable,
    };

    if (!processedSlot.isActive) {
      toast("Non-bookable time slot", {
        description: "This time slot is not available for booking.",
      });
      return;
    }

    const currentStudents = processedSlot.currentStudents || processedSlot.lessons?.length || 0;
    if (currentStudents >= processedSlot.maxStudents) {
      toast.error("Time slot unavailable", {
        description: "This time slot is already fully booked.",
      });
      return;
    }

    setSelectedSlot(processedSlot);
    setIsBookingDialogOpen(true);
  }, [rinkTimezone]);

  // Navigation handlers
  const handleNavigate = useCallback((action: 'PREV' | 'NEXT' | 'TODAY' | Date) => {
    if (action === 'PREV') {
      const newDate = new Date(date);
      if (calendarView === Views.MONTH) {
        newDate.setMonth(date.getMonth() - 1);
      } else {
        newDate.setDate(date.getDate() - 7);
      }
      setDate(newDate);
    } else if (action === 'NEXT') {
      const newDate = new Date(date);
      if (calendarView === Views.MONTH) {
        newDate.setMonth(date.getMonth() + 1);
      } else {
        newDate.setDate(date.getDate() + 7);
      }
      setDate(newDate);
    } else if (action === 'TODAY') {
      setDate(new Date());
    } else if (action instanceof Date) {
      setDate(action);
    }
  }, [date, calendarView]);

  // Event styling based on status
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const isAvailable = event.status === "available";
    const backgroundColor = isAvailable ? "#22c55e" : "#ef4444";
    
    return {
      style: {
        backgroundColor,
        borderColor: isAvailable ? "#16a34a" : "#dc2626",
        color: "#ffffff"
      }
    };
  }, []);

  // Custom slot styling
  const slotPropGetter = useCallback(() => {
    return {
      className: 'rbc-time-slot'
    };
  }, []);

  // Custom event component
  const EventComponent = useCallback(({ event }: { event: CalendarEvent }) => {
    const timezone = event.timezone || rinkTimezone;
    
    // Get both local and rink formatted times
    const startTimeObj = formatTimeWithTimezone(event.start, timezone, "h:mm a");
    const endTimeObj = formatTimeWithTimezone(event.end, timezone, "h:mm a");
    
    // Format the times for display
    const localTimeStr = `${startTimeObj.localTime} - ${endTimeObj.localTime}`;
    const rinkTimeStr = `${startTimeObj.rinkTime} - ${endTimeObj.rinkTime}`;
    
    const showBothTimes = timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return (
      <div className="p-1">
        <div className="font-medium text-sm whitespace-normal">{event.title}</div>
        <div className="text-xs whitespace-normal">{localTimeStr}</div>
        {showBothTimes && (
          <div className="text-xs whitespace-normal opacity-80">
            ({rinkTimeStr} rink time)
          </div>
        )}
        <div className="text-xs whitespace-normal">{event.rinkName} ({event.timezone?.split('/').pop()?.replace('_', ' ')})</div>
      </div>
    );
  }, [rinkTimezone]);

  // When no rink is selected yet
  if (!selectedRink && rinks && rinks.length > 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Book a Lesson</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6">
            <h3 className="text-lg font-medium mb-4">Please select a rink to view available times</h3>
            <Select value={selectedRink} onValueChange={setSelectedRink}>
              <SelectTrigger className="w-[280px] mx-auto">
                <SelectValue placeholder="Select a Rink" />
              </SelectTrigger>
              <SelectContent>
                {rinks.map((rink: Rink) => (
                  <SelectItem key={rink.id} value={rink.id}>
                    {rink.name} ({rink.timezone.split('/').pop()?.replace('_', ' ')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Book a Lesson</CardTitle>
        <Select value={selectedRink} onValueChange={setSelectedRink}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a Rink" />
          </SelectTrigger>
          <SelectContent>
            {rinks?.map((rink: Rink) => (
              <SelectItem key={rink.id} value={rink.id}>
                {rink.name} ({rink.timezone.split('/').pop()?.replace('_', ' ')})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      
      <CardContent>
        {/* Timezone Notice Banner */}
        {selectedRink && (
          <TimezoneNotice 
            rinkTimezone={rinkTimezone}
            rinkName={rinks?.find((rink: Rink) => rink.id === selectedRink)?.name || "the rink"}
            className="mb-4"
          />
        )}
        
        {isLoading || !isReady ? (
          <div className="flex justify-center items-center h-[600px]">
            <p>Loading calendar...</p>
          </div>
        ) : isMobile ? (
          // Custom mobile list view
          <div className="h-[600px] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigate('PREV')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <span className="font-medium">{dateRangeText}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigate('NEXT')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-4"
              onClick={() => handleNavigate('TODAY')}
            >
              Today
            </Button>

            {processEventsForCustomList().map((day) => {
              // Format the date in the rink's timezone
              const dayDate = DateTime.fromJSDate(day.date).setZone(rinkTimezone);
              return (
                <div key={dayDate.toFormat('yyyy-MM-dd')} className="mb-4">
                  {/* Day header */}
                  <div className="py-2 px-3 bg-slate-100 rounded-t-md">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{dayDate.toFormat('EEEE')}</span>
                      <span>{dayDate.toFormat('MMMM d, yyyy')}</span>
                    </div>
                  </div>

                  {/* Time slots for the day */}
                  <div className="border border-slate-200 rounded-b-md">
                    {day.slots
                      .sort(
                        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
                      )
                      .map((slot) => {
                        const currentStudents = slot.currentStudents || 0;
                        const isAvailable = slot.isAvailable === true;
                        const isSlotActive = slot.isActive === true;
                        const isSlotBookable = isSlotActive && isAvailable;
                        
                        // Format time in rink's timezone
                        const startTime = formatTimeInRinkTimezone(slot.startTime);
                        const endTime = formatTimeInRinkTimezone(slot.endTime);

                        // Add local time if timezone differs from user's timezone
                        const timezone = slot.rink.timezone || rinkTimezone;
                        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                        const showLocalTime = timezone !== userTimezone;
                        
                        let localStartTime = "";
                        let localEndTime = "";
                        
                        if (showLocalTime) {
                          const startTimeObj = formatTimeWithTimezone(slot.startTime, timezone);
                          const endTimeObj = formatTimeWithTimezone(slot.endTime, timezone);
                          localStartTime = startTimeObj.localTime;
                          localEndTime = endTimeObj.localTime;
                        }

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            className={`p-3 border-b last:border-0 cursor-pointer transition-colors w-full text-left ${
                              isSlotBookable ? "hover:bg-green-50" : "hover:bg-red-50"
                            }`}
                            onClick={() => handleCustomSlotClick(slot)}
                            disabled={!isSlotBookable}
                          >
                            <div className="flex justify-between">
                              <div className="font-medium">
                                {`${startTime} - ${endTime}`}
                              </div>
                              <div className={isSlotBookable ? "text-green-600" : "text-red-600"}>
                                {`${currentStudents}/${slot.maxStudents} students`}
                              </div>
                            </div>
                            {showLocalTime && (
                              <div className="text-xs text-gray-500">
                                Your time: {localStartTime} - {localEndTime}
                              </div>
                            )}
                            <div className="text-sm text-gray-600">
                              {slot.rink.name} {isSlotBookable ? "- Available" : "- Not Available"}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Desktop calendar view with React Big Calendar
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleNavigate('PREV')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleNavigate('TODAY')}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleNavigate('NEXT')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center">
                <span className="font-medium">{dateRangeText}</span>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant={calendarView === Views.WEEK ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView(Views.WEEK)}
                >
                  Week
                </Button>
                <Button 
                  variant={calendarView === Views.MONTH ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView(Views.MONTH)}
                >
                  Month
                </Button>
              </div>
            </div>

            <Calendar
              localizer={localizer}
              events={events}
              step={30}
              defaultView={Views.WEEK}
              views={[Views.WEEK, Views.MONTH]}
              view={calendarView}
              onView={(view) => setCalendarView(view as View)}
              date={date}
              onNavigate={handleNavigate}
              components={{
                event: EventComponent,
                toolbar: () => null // Disable the default toolbar
              }}
              eventPropGetter={eventPropGetter}
              slotPropGetter={slotPropGetter}
              min={new Date(date.getFullYear(), date.getMonth(), date.getDate(), 5, 0)} // 5 AM
              max={new Date(date.getFullYear(), date.getMonth(), date.getDate(), 22, 0)} // 10 PM
              onSelectEvent={handleEventClick}
              popup
              style={{ height: 600 }}
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